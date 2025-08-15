import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyCloudflareWebhookSignature } from '@/lib/webhookVerification'

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString()
    console.log('=== CLOUDFLARE STREAM WEBHOOK ENDPOINT ACCESSED ===')
    console.log('Timestamp:', timestamp)
    
    // Get the raw body for signature verification
    const body = await request.text()
    
    // Verify webhook signature
    const signature = request.headers.get('webhook-signature')
    if (signature && process.env.CLOUDFLARE_WEBHOOK_SECRET) {
      const isValid = verifyCloudflareWebhookSignature(
        signature,
        body,
        process.env.CLOUDFLARE_WEBHOOK_SECRET
      )
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
      
      console.log('✅ Webhook signature verified successfully')
    } else {
      console.warn('⚠️ No webhook signature or secret provided - skipping verification')
    }
    
    console.log('Webhook payload:', JSON.stringify(payload, null, 2))

    // Cloudflare Stream webhook structure based on official documentation
    const { uid, readyToStream, status, meta, created, modified } = payload
    
    if (!uid) {
      console.error('Invalid webhook payload - missing uid:', body)
      return NextResponse.json(
        { error: 'Invalid webhook payload - missing uid' },
        { status: 400 }
      )
    }

    console.log(`Cloudflare Stream webhook for video UID: ${uid}`)
    console.log(`Ready to stream: ${readyToStream}, Status: ${status?.state}`)

    // Handle video ready event
    if (status?.state === 'ready' && readyToStream === true) {
      console.log('🎉 CLOUDFLARE STREAM VIDEO READY!')
      
      // Find video by asset_id (which is the Cloudflare UID)
      console.log(`🔍 Attempting to find video by asset_id: ${uid}`)
      const { data: video, error: videoError } = await supabaseAdmin
        .from('videos')
        .select('id, title, status')
        .eq('asset_id', uid)
        .single()
      
      if (videoError || !video) {
        console.error('❌ Video not found for asset_id:', uid)
        console.error('Available videos in database:')
        const { data: allVideos } = await supabaseAdmin
          .from('videos')
          .select('id, title, asset_id, status')
        
        allVideos?.forEach(v => {
          console.error(`  - ${v.id}: "${v.title}" (asset_id: ${v.asset_id}, status: ${v.status})`)
        })
        
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        )
      }

      console.log(`✅ Found video: ${video.id} (${video.title})`)

      // Update video record with playback information
      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({
          status: 'ready',
          playback_id: uid, // Use UID as playback_id for Cloudflare Stream
          duration_s: 69, // Default duration, will be updated by webhook later
          aspect_ratio: '16/9' // Default aspect ratio
        })
        .eq('id', video.id)

      if (updateError) {
        console.error('Failed to update video:', updateError)
        return NextResponse.json(
          { error: 'Failed to update video status' },
          { status: 500 }
        )
      }

      console.log(`✅ Video ${video.id} updated to ready status`)

      // Create transcription job instead of calling transcription directly
      try {
        console.log(`📝 Creating transcription job for video ${video.id}`)
        
        const { data: job, error: jobError } = await supabaseAdmin
          .from('transcript_jobs')
          .insert({
            video_id: video.id,
            status: 'queued',
            provider: 'deepgram',
            attempts: 0,
            next_attempt_at: new Date().toISOString()
          })
          .select()
          .single()

        if (jobError) {
          console.error('❌ Failed to create transcription job:', jobError)
          return NextResponse.json(
            { error: 'Failed to create transcription job' },
            { status: 500 }
          )
        }

        console.log(`✅ Transcription job created: ${job.id} for video ${video.id}`)
        console.log(`📋 Job status: ${job.status}, next attempt: ${job.next_attempt_at}`)

        // Trigger immediate transcription processing
        try {
          console.log(`🚀 Triggering immediate transcription for video ${video.id}`)
          
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-bndkdrhkg-samuel-yus-projects-88ba4e57.vercel.app'
          const response = await fetch(`${baseUrl}/api/transcripts/dequeue`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          })

          if (response.ok) {
            const result = await response.json()
            console.log(`✅ Immediate transcription triggered successfully:`, result)
          } else {
            console.error(`❌ Failed to trigger immediate transcription:`, await response.text())
          }
        } catch (triggerError) {
          console.error(`❌ Error triggering immediate transcription:`, triggerError)
          // Don't fail the webhook - transcription will still happen via cron
        }

        // Note: Chapter generation will be triggered after transcription is complete
        // via the Deepgram webhook handler, not here
        
      } catch (jobError) {
        console.error('❌ Failed to create transcription job:', jobError)
        // Don't fail the webhook if job creation fails
        // The job can be created later via manual retry
      }
      
      console.log(`🎉 Video ${video.id} is ready for playback and transcription processing started`)
    } else if (status?.state === 'error') {
      console.error(`❌ Cloudflare Stream video ${uid} failed to process:`, body)
      console.error(`Error reason: ${status?.errReasonCode} - ${status?.errReasonText}`)
      
      // Update video status to error
      const { data: video } = await supabaseAdmin
        .from('videos')
        .select('id, title')
        .eq('asset_id', uid)
        .single()
      
      if (video) {
        await supabaseAdmin
          .from('videos')
          .update({ status: 'error' })
          .eq('id', video.id)
        console.log(`❌ Updated video ${video.id} to error status`)
      }
    } else {
      console.log(`ℹ️ Cloudflare Stream video ${uid} status: ${status?.state}, readyToStream: ${readyToStream}`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Cloudflare Stream webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
