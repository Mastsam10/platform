import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoTitle } = body

    if (!videoTitle) {
      return NextResponse.json({ 
        error: 'Missing videoTitle' 
      }, { status: 400 })
    }

    console.log(`Triggering webhook for video: ${videoTitle}`)

    // Get the video details
    const { data: video, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('id, title, asset_id, status, playback_id')
      .eq('title', videoTitle)
      .single()

    if (fetchError || !video) {
      return NextResponse.json({ 
        error: `Video not found: ${videoTitle}` 
      }, { status: 404 })
    }

    console.log('Found video:', video)

    if (!video.asset_id) {
      return NextResponse.json({ 
        error: 'Video has no asset_id' 
      }, { status: 400 })
    }

    // Simulate the video.asset.ready webhook
    const webhookPayload = {
      type: 'video.asset.ready',
      data: {
        id: video.asset_id,
        duration: '69.0', // Default duration
        playback_id: 'temp_playback_id', // We'll get the real one from Mux
        aspect_ratio: '16:9' // Default aspect ratio
      }
    }

    console.log('Simulating webhook payload:', webhookPayload)

    // Call the webhook endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'
    const webhookResponse = await fetch(`${baseUrl}/api/webhooks/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    if (webhookResponse.ok) {
      const webhookResult = await webhookResponse.json()
      console.log('Webhook result:', webhookResult)
      
      // Check the updated video status
      const { data: updatedVideo, error: checkError } = await supabaseAdmin
        .from('videos')
        .select('id, title, status, playback_id')
        .eq('id', video.id)
        .single()

      return NextResponse.json({
        success: true,
        message: `Webhook triggered for ${videoTitle}`,
        webhookResult: webhookResult,
        video: updatedVideo
      })
    } else {
      const errorText = await webhookResponse.text()
      console.error('Webhook failed:', errorText)
      return NextResponse.json({
        success: false,
        message: `Webhook failed for ${videoTitle}`,
        error: errorText
      })
    }

  } catch (error) {
    console.error('Trigger webhook error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
