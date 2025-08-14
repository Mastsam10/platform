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

    console.log(`Processing stuck video: ${videoTitle}`)

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

    // CRITICAL: Do not set status to "ready" without a real playback_id
    // This endpoint was causing the "Video not ready" issues
    // Instead, ensure the video is in "processing" state for webhook to handle
    
    // Only update if the video is not already in processing state
    if (video.status !== 'processing') {
      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({ 
          status: 'processing',
          playback_id: null // Clear any fake playback_ids
        })
        .eq('id', video.id)

      if (updateError) {
        console.error('Failed to update video:', updateError)
        return NextResponse.json({ 
          error: 'Failed to update video' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully reset ${videoTitle} to processing state`,
      video: {
        ...video,
        status: 'processing',
        playback_id: null
      },
      note: 'Video reset to processing state. Webhook will set real playback_id and status when ready. DO NOT manually set videos to "ready" without valid playback_id.'
    })

  } catch (error) {
    console.error('Process stuck video error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
