import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK ENDPOINT ACCESSED ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('User-Agent:', request.headers.get('user-agent'))
    console.log('Content-Type:', request.headers.get('content-type'))
    
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

    // Handle video.upload.created event (when upload is first created)
    if (type === 'video.upload.created') {
      const { id: upload_id } = data
      console.log(`Upload created: ${upload_id}`)
      // We could store upload_id in videos table for better tracking
    }

    // Handle video.upload.asset_created event (when asset is created from upload)
    if (type === 'video.upload.asset_created') {
      const { asset_id, id: upload_id } = data
      console.log(`✅ HANDLED: Asset created from upload: ${asset_id} for upload: ${upload_id}`)

      if (asset_id) {
        // Prefer correlating by upload_id if available
        if (upload_id) {
          const { data: updatedByUpload, error: updateByUploadError } = await supabaseAdmin
            .from('videos')
            .update({ asset_id, status: 'processing' })
            .eq('upload_id', upload_id)
            .select('id')
            .maybeSingle()

          if (updateByUploadError) {
            console.error('❌ Failed updating by upload_id:', updateByUploadError)
          } else if (updatedByUpload) {
            console.log(`✅ Updated video ${updatedByUpload.id} via upload_id with asset_id: ${asset_id}`)
            return NextResponse.json({ success: true })
          } else {
            console.log('No video matched upload_id; falling back to asset_id/null-asset search')
          }
        }

        // Fallback 1: update any row already having this asset_id
        const { data: videoByAsset, error: videoByAssetErr } = await supabaseAdmin
          .from('videos')
          .select('id')
          .eq('asset_id', asset_id)
          .maybeSingle()

        if (videoByAsset && !videoByAssetErr) {
          await supabaseAdmin
            .from('videos')
            .update({ status: 'processing' })
            .eq('id', videoByAsset.id)
          console.log(`Updated video ${videoByAsset.id} status to 'processing' (by asset_id)`)
          return NextResponse.json({ success: true })
        }

        // Fallback 2: find latest draft with null asset_id and set it
        console.log('Looking for latest draft with null asset_id...')
        const { data: drafts, error: draftsErr } = await supabaseAdmin
          .from('videos')
          .select('id')
          .is('asset_id', null)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1)

        if (draftsErr) {
          console.error('❌ Failed to query drafts:', draftsErr)
        } else if (drafts && drafts.length > 0) {
          const target = drafts[0]
          const { error: updateErr } = await supabaseAdmin
            .from('videos')
            .update({ asset_id, status: 'processing' })
            .eq('id', target.id)
          if (updateErr) {
            console.error('❌ Failed to assign asset_id to draft:', updateErr)
          } else {
            console.log(`✅ Successfully updated draft ${target.id} with asset_id: ${asset_id}`)
          }
        } else {
          console.log('❌ No drafts with null asset_id found')
        }
      }
    }

    // Handle video.asset.created event (when asset is created independently)
    if (type === 'video.asset.created') {
      const { id: asset_id } = data
      console.log(`Asset created: ${asset_id}`)
      
      // Find video by asset_id
      const { data: video, error: videoError } = await supabaseAdmin
        .from('videos')
        .select('id')
        .eq('asset_id', asset_id)
        .single()
        
      if (video && !videoError) {
        await supabaseAdmin
          .from('videos')
          .update({ status: 'processing' })
          .eq('id', video.id)
        console.log(`Updated video ${video.id} status to 'processing'`)
      }
    }

    // Handle video.asset.ready event (when video is fully processed)
    if (type === 'video.asset.ready') {
      // The asset_id is in the 'id' field for ready events
      const asset_id = data.id
      const { duration, playback_id } = data
      
      console.log(`✅ HANDLED: Asset ready: ${asset_id}, duration: ${duration}, playback_id: ${playback_id}`)
      
      // Find video by asset_id with retry logic for timing issues
      let video = null
      let videoError = null
      
      // Try up to 3 times with 1 second delay between attempts
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { data: videoData, error: errorData } = await supabase
          .from('videos')
          .select('id')
          .eq('asset_id', asset_id)
          .single()
        
        video = videoData
        videoError = errorData
        
        if (video && !videoError) {
          console.log(`Found video on attempt ${attempt}: ${video.id}`)
          break
        }
        
        if (attempt < 3) {
          console.log(`Video not found on attempt ${attempt}, retrying in 1 second...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
        
      if (videoError || !video) {
        console.error('Video not found for asset_id after 3 attempts:', asset_id)
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
