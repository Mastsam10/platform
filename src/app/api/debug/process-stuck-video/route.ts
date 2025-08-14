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

    // Since the video has an asset_id, we can assume it's ready
    // Update the video status to ready and set a placeholder playback_id
    const { error: updateError } = await supabaseAdmin
      .from('videos')
      .update({ 
        status: 'ready',
        playback_id: `placeholder_${video.asset_id.substring(0, 8)}`
      })
      .eq('id', video.id)

    if (updateError) {
      console.error('Failed to update video:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update video' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${videoTitle}`,
      video: {
        ...video,
        status: 'ready',
        playback_id: `placeholder_${video.asset_id.substring(0, 8)}`
      },
      note: 'Video marked as ready with placeholder playback_id. Real playback_id will be set by webhook when available.'
    })

  } catch (error) {
    console.error('Process stuck video error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
