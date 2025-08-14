import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Video } from '@/lib/mux'

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

    // Try to get the playback_id from Mux using the Video API
    try {
      const asset = await Video.assets.get(video.asset_id)
      console.log('Mux asset:', asset)
      
      if (asset && asset.playback_ids && asset.playback_ids.length > 0) {
        const playbackId = asset.playback_ids[0].id
        console.log(`Got playback_id from Mux: ${playbackId}`)

        // Update the video with the playback_id and set status to ready
        const { error: updateError } = await supabaseAdmin
          .from('videos')
          .update({ 
            playback_id: playbackId,
            status: 'ready'
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
            playback_id: playbackId,
            status: 'ready'
          }
        })
      } else {
        return NextResponse.json({
          success: false,
          message: `No playback_id found for ${videoTitle}`,
          video: video
        })
      }
    } catch (muxError) {
      console.error('Mux API error:', muxError)
      return NextResponse.json({
        success: false,
        message: `Failed to get playback_id from Mux for ${videoTitle}`,
        error: muxError,
        video: video
      })
    }

  } catch (error) {
    console.error('Process stuck video error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
