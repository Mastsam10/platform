import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting video status fix...')

    // Find videos that are marked as ready but don't have valid playback_id
    const { data: videos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, playback_id, asset_id')
      .eq('status', 'ready')
      .or('playback_id.is.null,playback_id.eq.PROCESSING')

    if (fetchError) {
      console.error('Failed to fetch videos:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch videos' 
      }, { status: 500 })
    }

    console.log(`Found ${videos?.length || 0} videos with inconsistent status`)

    if (!videos || videos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos with inconsistent status found',
        fixedVideos: []
      })
    }

    // Update these videos to status 'processing' since they don't have valid playback_id
    const { error: updateError } = await supabaseAdmin
      .from('videos')
      .update({ 
        status: 'processing',
        playback_id: null // Clear any fake playback_id
      })
      .eq('status', 'ready')
      .or('playback_id.is.null,playback_id.eq.PROCESSING')

    if (updateError) {
      console.error('Failed to update video status:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update video status' 
      }, { status: 500 })
    }

    console.log('Updated video statuses')

    return NextResponse.json({
      success: true,
      message: `Fixed status for ${videos.length} videos`,
      fixedVideos: videos,
      action: 'Changed status from "ready" to "processing" for videos without valid playback_id'
    })

  } catch (error) {
    console.error('Fix video status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
