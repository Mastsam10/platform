import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('mux-signature')
    if (signature && process.env.MUX_WEBHOOK_SECRET) {
      // TODO: Add signature verification logic here
      console.log('Webhook signature received:', signature)
    }

    const body = await request.json()
    console.log('Webhook payload:', JSON.stringify(body, null, 2))
    
    // Mux webhook structure: { type, data, ... }
    const { type, data } = body
    console.log('Webhook type:', type)

    // Validate webhook
    if (!type || !data) {
      console.error('Invalid webhook payload:', body)
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Handle video.asset.created event (when asset is created but not ready)
    if (type === 'video.asset.created') {
      const { asset_id, upload_id } = data
      console.log(`Asset created: ${asset_id} for upload: ${upload_id}`)
      
      // For now, just log the asset creation
      // We'll need to add upload_id column to videos table later
      console.log(`Asset ${asset_id} created for upload ${upload_id}`)
    }

    // Handle video.asset.ready event (when video is fully processed)
    if (type === 'video.asset.ready') {
      const { asset_id, duration, playback_id } = data
      
      // Find video by asset_id since we don't have videoId in webhook
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('id')
        .eq('asset_id', asset_id)
        .single()
        
      if (videoError || !video) {
        console.error('Video not found for asset_id:', asset_id)
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        )
      }
      
      const videoId = video.id

      // Update video record with playback information
      const { error } = await supabase
        .from('videos')
        .update({
          status: 'ready',
          playback_id,
          duration_s: duration,
          aspect_ratio: '9/16' // Default for now, can be made dynamic later
        })
        .eq('id', videoId)

      if (error) {
        console.error('Failed to update video:', error)
        return NextResponse.json(
          { error: 'Failed to update video status' },
          { status: 500 }
        )
      }

      // Trigger transcript generation
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'
        const transcriptResponse = await fetch(`${baseUrl}/api/transcripts/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId,
            provider: 'deepgram',
            lang: 'en'
          }),
        })

        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json()
          console.log(`Transcript generated for video ${videoId}`)
          
          // Trigger chapter generation after transcript is ready
          if (transcriptData.srt) {
            const chapterResponse = await fetch(`${baseUrl}/api/chapters/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                videoId,
                srtUrl: transcriptData.srt
              }),
            })

            if (chapterResponse.ok) {
              const chapterData = await chapterResponse.json()
              console.log(`Generated ${chapterData.count} chapters for video ${videoId}`)
            }
          }
        }
      } catch (transcriptError) {
        console.error('Failed to trigger transcript generation:', transcriptError)
      }
      
      console.log(`Video ${videoId} is ready for playback`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
