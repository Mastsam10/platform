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

    // Extract transcript data
    const results = body.results
    if (!results || !results.channels || !results.channels[0]) {
      console.error(`❌ No transcript results for job ${jobId}`)
      await markJobAsError(jobId, 'No transcript results from Deepgram')
      return NextResponse.json({ success: true })
    }

    const channel = results.channels[0]
    const alternatives = channel.alternatives
    if (!alternatives || !alternatives[0]) {
      console.error(`❌ No transcript alternatives for job ${jobId}`)
      await markJobAsError(jobId, 'No transcript alternatives from Deepgram')
      return NextResponse.json({ success: true })
    }

    const transcript = alternatives[0]
    const transcriptText = transcript.transcript || ''
    const confidence = transcript.confidence || 0.95

    console.log(`✅ Received transcript for job ${jobId}`)
    console.log(`📄 Transcript length: ${transcriptText.length} characters`)
    console.log(`🎯 Confidence: ${confidence}`)

    // Generate SRT format
    const srtContent = generateSRT(alternatives[0])

    // Store SRT file in Supabase Storage
    const srtFileName = `captions/${videoId}.srt`
    const srtBlob = new Blob([srtContent], { type: 'text/plain' })
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('public')
      .upload(srtFileName, srtBlob, {
        contentType: 'text/plain',
        upsert: true
      })

    if (uploadError) {
      console.error(`❌ Failed to upload SRT file for job ${jobId}:`, uploadError)
      await markJobAsError(jobId, `Failed to upload SRT file: ${uploadError.message}`)
      return NextResponse.json({ success: true })
    }

    // Get public URL for the SRT file
    const { data: urlData } = supabaseAdmin.storage
      .from('public')
      .getPublicUrl(srtFileName)

    const srtUrl = urlData.publicUrl

    console.log(`📁 SRT file uploaded: ${srtUrl}`)

    // Store transcript metadata in captions table
    const { error: captionError } = await supabaseAdmin
      .from('captions')
      .insert({
        video_id: videoId,
        provider: 'deepgram',
        lang: 'en',
        srt_url: srtUrl,
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
        transcript_text: transcriptText,
        srt_url: srtUrl,
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
          srtUrl: srtUrl
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

function generateSRT(alternative: any): string {
  const words = alternative.words || []
  let srtContent = ''
  let segmentIndex = 1

  // Group words into segments based on utterances or time gaps
  const segments = []
  let currentSegment = []
  let lastEndTime = 0

  for (const word of words) {
    const startTime = word.start || 0
    const endTime = word.end || 0

    // Start new segment if there's a gap > 1 second or if it's the first word
    if (currentSegment.length === 0 || (startTime - lastEndTime) > 1.0) {
      if (currentSegment.length > 0) {
        segments.push(currentSegment)
      }
      currentSegment = [word]
    } else {
      currentSegment.push(word)
    }

    lastEndTime = endTime
  }

  // Add the last segment
  if (currentSegment.length > 0) {
    segments.push(currentSegment)
  }

  // Generate SRT format
  for (const segment of segments) {
    if (segment.length === 0) continue

    const startTime = segment[0].start || 0
    const endTime = segment[segment.length - 1].end || 0
    const text = segment.map((w: any) => w.word).join(' ')

    srtContent += `${segmentIndex}\n`
    srtContent += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`
    srtContent += `${text}\n\n`

    segmentIndex++
  }

  return srtContent
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
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
