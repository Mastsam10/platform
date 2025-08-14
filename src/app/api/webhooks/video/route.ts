import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString()
    console.log('=== CLOUDFLARE STREAM WEBHOOK ENDPOINT ACCESSED ===')
    console.log('Timestamp:', timestamp)
    
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('webhook-signature')
    if (signature && process.env.CLOUDFLARE_WEBHOOK_SECRET) {
      // TODO: Add signature verification logic here
      console.log('Cloudflare webhook signature received:', signature)
    }

    const body = await request.json()
    console.log('Webhook payload:', JSON.stringify(body, null, 2))

    // Cloudflare Stream webhook structure based on official documentation
    const { uid, readyToStream, status, meta, created, modified } = body
    
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

      // Trigger transcript generation
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'
        const transcriptResponse = await fetch(`${baseUrl}/api/transcripts/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId: video.id,
            provider: 'deepgram',
            lang: 'en'
          }),
        })

        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json()
          console.log(`✅ Transcript generation triggered for video ${video.id}`)
          
          // Trigger chapter generation after transcript is ready
          if (transcriptData.srt) {
            const chapterResponse = await fetch(`${baseUrl}/api/chapters/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                videoId: video.id,
                srtUrl: transcriptData.srt
              }),
            })

            if (chapterResponse.ok) {
              const chapterData = await chapterResponse.json()
              console.log(`✅ Generated ${chapterData.count} chapters for video ${video.id}`)
            }
          }
        } else {
          console.error('Failed to trigger transcript generation:', await transcriptResponse.text())
        }
      } catch (transcriptError) {
        console.error('Failed to trigger transcript generation:', transcriptError)
      }
      
      console.log(`🎉 Video ${video.id} is ready for playback`)
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
