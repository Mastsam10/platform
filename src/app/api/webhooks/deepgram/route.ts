import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEEPGRAM WEBHOOK ENDPOINT ACCESSED ===')
    
    const body = await request.json()
    console.log('Deepgram webhook payload:', JSON.stringify(body, null, 2))

    // Extract metadata from callback
    const { callback_metadata } = body
    const jobId = callback_metadata?.job_id
    const videoId = callback_metadata?.video_id

    if (!jobId || !videoId) {
      console.error('❌ Missing job_id or video_id in callback metadata')
      return NextResponse.json({
        error: 'Missing job_id or video_id in callback metadata'
      }, { status: 400 })
    }

    console.log(`📝 Processing Deepgram callback for job ${jobId}, video ${videoId}`)

    // Check if transcription was successful
    if (body.error) {
      console.error(`❌ Deepgram transcription failed for job ${jobId}:`, body.error)
      
      // Mark job as error
      await supabaseAdmin
        .from('transcript_jobs')
        .update({
          status: 'error',
          error: `Deepgram transcription failed: ${body.error}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', jobId)

      return NextResponse.json({ success: true })
    }

    // Extract transcript data and convert to VTT + plain text
    const { vtt, plain } = toVttAndText(body)
    
    if (!vtt || !plain) {
      console.error(`❌ Failed to convert transcript to VTT for job ${jobId}`)
      await markJobAsError(jobId, 'Failed to convert transcript to VTT')
      return NextResponse.json({ success: true })
    }

    console.log(`✅ Converted transcript to VTT for job ${jobId}`)
    console.log(`📄 VTT length: ${vtt.length} characters`)
    console.log(`📄 Plain text length: ${plain.length} characters`)

    // Store VTT file in Supabase Storage
    const vttFileName = `captions/${videoId}.vtt`
    const vttBlob = new Blob([vtt], { type: 'text/vtt' })
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('public')
      .upload(vttFileName, vttBlob, {
        contentType: 'text/vtt',
        upsert: true
      })

    if (uploadError) {
      console.error(`❌ Failed to upload VTT file for job ${jobId}:`, uploadError)
      await markJobAsError(jobId, `Failed to upload VTT file: ${uploadError.message}`)
      return NextResponse.json({ success: true })
    }

    // Get public URL for the VTT file
    const { data: urlData } = supabaseAdmin.storage
      .from('public')
      .getPublicUrl(vttFileName)

    const vttUrl = urlData.publicUrl

    console.log(`📁 VTT file uploaded: ${vttUrl}`)

    // Get video playback_id for Cloudflare Stream attachment
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('playback_id')
      .eq('id', videoId)
      .single()

    if (videoError || !video?.playback_id) {
      console.error(`❌ Failed to get video playback_id for ${videoId}:`, videoError)
      // Continue without Stream attachment
    } else {
      // Attach caption to Cloudflare Stream
      try {
        await attachCaptionToStream(video.playback_id, vttUrl, 'en', 'English')
        console.log(`✅ Attached caption to Cloudflare Stream for video ${videoId}`)
      } catch (attachError) {
        console.error(`❌ Failed to attach caption to Stream for video ${videoId}:`, attachError)
        // Don't fail the webhook, continue with database updates
      }
    }

    // Store transcript metadata in captions table
    const { error: captionError } = await supabaseAdmin
      .from('captions')
      .insert({
        video_id: videoId,
        provider: 'deepgram',
        lang: 'en',
        srt_url: vttUrl, // Store VTT URL in srt_url field for compatibility
        created_at: new Date().toISOString()
      })

    if (captionError) {
      console.error(`❌ Failed to store caption metadata for job ${jobId}:`, captionError)
      // Don't fail the webhook, continue with video update
    }

    // Update video with transcript data
    const { error: videoUpdateError } = await supabaseAdmin
      .from('videos')
      .update({
        transcript_text: plain,
        srt_url: vttUrl, // Store VTT URL in srt_url field for compatibility
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId)

    if (videoUpdateError) {
      console.error(`❌ Failed to update video ${videoId} with transcript:`, videoUpdateError)
      await markJobAsError(jobId, `Failed to update video: ${videoUpdateError.message}`)
      return NextResponse.json({ success: true })
    }

    // Mark job as completed
    const { error: jobUpdateError } = await supabaseAdmin
      .from('transcript_jobs')
      .update({
        status: 'done',
        error: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)

    if (jobUpdateError) {
      console.error(`❌ Failed to mark job ${jobId} as done:`, jobUpdateError)
    }

    console.log(`✅ Job ${jobId} completed successfully`)

    // Trigger chapter generation
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'
      const chapterResponse = await fetch(`${baseUrl}/api/chapters/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: videoId,
          vttUrl: vttUrl
        }),
      })

      if (chapterResponse.ok) {
        const chapterData = await chapterResponse.json()
        console.log(`✅ Generated ${chapterData.count} chapters for video ${videoId}`)
      } else {
        console.error(`❌ Failed to generate chapters for video ${videoId}:`, await chapterResponse.text())
      }
    } catch (chapterError) {
      console.error(`❌ Error generating chapters for video ${videoId}:`, chapterError)
      // Don't fail the webhook if chapter generation fails
    }

    console.log(`🎉 Transcription and chapter generation completed for video ${videoId}`)

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('❌ Deepgram webhook error:', error)
    return NextResponse.json({
      error: 'Deepgram webhook failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Convert Deepgram results to VTT and plain text (from approach.md)
function toVttAndText(dg: any) {
  let vtt = 'WEBVTT\n\n', plain = '';
  const paras = dg?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs ?? [];
  
  if (paras.length === 0) {
    // Fallback to words if no paragraphs
    const words = dg?.results?.channels?.[0]?.alternatives?.[0]?.words ?? [];
    if (words.length > 0) {
      // Group words into segments
      const segments = groupWordsIntoSegments(words);
      segments.forEach((segment, index) => {
        const startTime = segment[0].start || 0;
        const endTime = segment[segment.length - 1].end || 0;
        const text = segment.map((w: any) => w.word).join(' ');
        
        vtt += `${sec(startTime)} --> ${sec(endTime)}\n${text.trim()}\n\n`;
        plain += text.trim() + '\n';
      });
    }
  } else {
    paras.forEach(p => {
      vtt += `${sec(p.start)} --> ${sec(p.end)}\n${p.transcript.trim()}\n\n`;
      plain += p.transcript.trim() + '\n';
    });
  }
  
  return { vtt, plain };
}

function groupWordsIntoSegments(words: any[]): any[][] {
  const segments = [];
  let currentSegment = [];
  let lastEndTime = 0;

  for (const word of words) {
    const startTime = word.start || 0;
    const endTime = word.end || 0;

    // Start new segment if there's a gap > 1 second or if it's the first word
    if (currentSegment.length === 0 || (startTime - lastEndTime) > 1.0) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }
      currentSegment = [word];
    } else {
      currentSegment.push(word);
    }

    lastEndTime = endTime;
  }

  // Add the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

function sec(s: number) {
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = (s % 60).toFixed(3).padStart(6, '0');
  return `${h}:${m}:${ss}`;
}

// Attach caption to Cloudflare Stream (from approach.md)
async function attachCaptionToStream(uid: string, vttUrl: string, lang = 'en', label = 'English') {
  if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
    throw new Error('Cloudflare credentials not configured');
  }

  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${uid}/captions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      url: vttUrl, 
      lang, 
      label, 
      kind: 'subtitles', 
      default: true 
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to attach caption to Stream: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log('Caption attached to Stream:', result);
}

async function markJobAsError(jobId: string, error: string) {
  try {
    await supabaseAdmin
      .from('transcript_jobs')
      .update({
        status: 'error',
        error: error,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
  } catch (updateError) {
    console.error(`❌ Failed to mark job ${jobId} as error:`, updateError)
  }
}
