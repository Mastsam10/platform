import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK ENDPOINT ACCESSED ===')
    console.log('Timestamp:', new Date().toISOString())
    
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('mux-signature')
    if (signature && process.env.MUX_WEBHOOK_SECRET) {
      // TODO: Add signature verification logic here
      console.log('Webhook signature received:', signature)
    }

    const body = await request.json()
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

    // Handle video.upload.created event (when upload is first created)
    if (type === 'video.upload.created') {
      const { id: upload_id } = data
      console.log(`Upload created: ${upload_id}`)
      // No action needed - video record already created with upload_id
    }

    // Handle video.upload.asset_created event (when asset is created from upload)
    if (type === 'video.upload.asset_created') {
      const { asset_id, id: upload_id } = data
      console.log(`✅ HANDLED: Asset created from upload: ${asset_id} for upload: ${upload_id}`)

      if (asset_id && upload_id) {
        // Update video by upload_id (most reliable correlation)
        const { data: updatedVideo, error: updateError } = await supabaseAdmin
          .from('videos')
          .update({ asset_id, status: 'processing' })
          .eq('upload_id', upload_id)
          .select('id')
          .maybeSingle()

        if (updateError) {
          console.error('❌ Failed updating by upload_id:', updateError)
        } else if (updatedVideo) {
          console.log(`✅ Updated video ${updatedVideo.id} via upload_id with asset_id: ${asset_id}`)
        } else {
          console.log('❌ No video found with upload_id:', upload_id)
        }
      }
    }

    // Handle video.asset.created event (when asset is created independently)
    if (type === 'video.asset.created') {
      const { id: asset_id, playback_ids } = data
      console.log(`✅ HANDLED: Asset created: ${asset_id}`)
      
      if (playback_ids && playback_ids.length > 0) {
        const playback_id = playback_ids[0].id
        console.log(`Found playback_id: ${playback_id}`)
        
        // Update video with playback_id
        const { data: video, error: videoError } = await supabaseAdmin
          .from('videos')
          .select('id')
          .eq('asset_id', asset_id)
          .single()
          
        if (video && !videoError) {
          await supabaseAdmin
            .from('videos')
            .update({ playback_id })
            .eq('id', video.id)
          console.log(`✅ Updated video ${video.id} with playback_id: ${playback_id}`)
        }
      }
    }



    // Handle video.asset.ready event (when video is fully processed)
    if (type === 'video.asset.ready') {
      console.log('🎉 VIDEO.ASSET.READY WEBHOOK RECEIVED!')
      // The asset_id is in the 'id' field for ready events
      const asset_id = data.id
      const { duration, playback_id } = data
      
      console.log(`✅ HANDLED: Asset ready: ${asset_id}, duration: ${duration}, playback_id: ${playback_id}`)
      console.log('Full data object:', JSON.stringify(data, null, 2))
      
      // Find video by asset_id
      const { data: video, error: videoError } = await supabaseAdmin
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
      const { error } = await supabaseAdmin
        .from('videos')
        .update({
          status: 'ready',
          playback_id,
          duration_s: Math.round(parseFloat(duration)), // Convert string to integer
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

    // Log any other webhook events we're not handling
    if (type !== 'video.upload.created' && 
        type !== 'video.upload.asset_created' && 
        type !== 'video.asset.created' && 
        type !== 'video.asset.ready') {
      console.log(`Unhandled webhook event: ${type}`, data)
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
