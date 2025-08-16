import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== DEEPGRAM WEBHOOK ENDPOINT ACCESSED ===')
    
    const payload = await request.json()
    console.log('Deepgram webhook payload:', JSON.stringify(payload, null, 2))
    
    // Extract metadata from callback
    const { job_id, video_id } = payload.metadata || {}
    
    if (!job_id || !video_id) {
      console.error('❌ Missing job_id or video_id in metadata')
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }
    
    console.log(`📝 Processing transcription for job ${job_id}, video ${video_id}`)
    
    // Convert Deepgram response to VTT and plain text
    const { vtt, plain } = toVttAndText(payload)
    
    if (!vtt || !plain) {
      console.error('❌ Failed to extract VTT or text from Deepgram response')
      return NextResponse.json({ error: 'Invalid transcription data' }, { status: 400 })
    }
    
    console.log(`📄 Generated VTT (${vtt.length} chars) and text (${plain.length} chars)`)
    
    // Store VTT file in Supabase Storage
    const path = `captions/${video_id}.vtt`
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('public')
      .upload(path, new Blob([vtt], { type: 'text/vtt' }), { 
        upsert: true,
        contentType: 'text/vtt'
      })
    
    if (uploadError) {
      console.error('❌ Failed to upload VTT to storage:', uploadError)
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }
    
    console.log(`✅ VTT file uploaded to storage: ${path}`)
    
    // Get public URL for the VTT file
    const { data: publicUrlData } = supabaseAdmin.storage
      .from('public')
      .getPublicUrl(path)
    
    const vttPublicUrl = publicUrlData.publicUrl
    console.log(`🔗 VTT public URL: ${vttPublicUrl}`)
    
    // Get video details to find playback_id
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('id, title, playback_id')
      .eq('id', video_id)
      .single()
    
    if (videoError || !video) {
      console.error('❌ Video not found:', videoError)
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }
    
    if (!video.playback_id) {
      console.error('❌ Video has no playback_id')
      return NextResponse.json({ error: 'Video not ready' }, { status: 400 })
    }
    
    // Attach caption to Cloudflare Stream using the correct API endpoint
    try {
      // Create FormData with the VTT file
      const formData = new FormData()
      const vttBlob = new Blob([vtt], { type: 'text/vtt' })
      formData.append('file', vttBlob, `${video_id}.vtt`)
      
      const attachResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${video.playback_id}/captions/en`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`
          },
          body: formData
        }
      )
      
      if (!attachResponse.ok) {
        const errorText = await attachResponse.text()
        console.error('❌ Failed to attach caption to Cloudflare Stream:', errorText)
        // Don't fail the whole process - just log the error
      } else {
        console.log('✅ Caption attached to Cloudflare Stream successfully')
      }
    } catch (attachError) {
      console.error('❌ Error attaching caption to Cloudflare Stream:', attachError)
      // Don't fail the whole process - just log the error
    }
    
    // Update video record with transcript data
    const { error: updateError } = await supabaseAdmin
      .from('videos')
      .update({
        srt_url: vttPublicUrl,
        transcript_text: plain
      })
      .eq('id', video_id)
    
    if (updateError) {
      console.error('❌ Failed to update video with transcript:', updateError)
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 })
    }
    
    // Mark job as completed
    const { error: jobUpdateError } = await supabaseAdmin
      .from('transcript_jobs')
      .update({
        status: 'done',
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id)
    
    if (jobUpdateError) {
      console.error('❌ Failed to mark job as done:', jobUpdateError)
    }
    
    console.log(`✅ Transcription completed for video ${video_id}`)
    console.log(`📊 Job ${job_id} marked as done`)
    
    // TODO: Trigger chapter generation (async)
    // fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chapters/generate`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ videoId: video_id, vttUrl: vttPublicUrl })
    // }).catch(() => {})
    
    return NextResponse.json({ 
      success: true,
      video_id,
      job_id,
      vtt_url: vttPublicUrl,
      text_length: plain.length
    })
    
  } catch (error) {
    console.error('❌ Deepgram webhook error:', error)
    return NextResponse.json({
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function toVttAndText(dg: any) {
  let vtt = 'WEBVTT\n\n', plain = ''
  
  // Extract paragraphs from Deepgram response
  const paragraphs = dg?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.paragraphs ?? []
  
  if (paragraphs.length === 0) {
    console.warn('⚠️ No paragraphs found in Deepgram response')
    return { vtt: null, plain: null }
  }
  
  paragraphs.forEach((p: any) => {
    const startTime = formatTime(p.start)
    const endTime = formatTime(p.end)
    const transcript = p.transcript.trim()
    
    vtt += `${startTime} --> ${endTime}\n${transcript}\n\n`
    plain += transcript + '\n'
  })
  
  return { vtt, plain }
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = (seconds % 60).toFixed(3)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.padStart(6, '0')}`
}
