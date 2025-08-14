import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting video status fix...')

    // First, let's see all videos to understand the current state
    const { data: allVideos, error: fetchAllError } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, playback_id, asset_id')

    if (fetchAllError) {
      console.error('Failed to fetch all videos:', fetchAllError)
      return NextResponse.json({ 
        error: 'Failed to fetch videos' 
      }, { status: 500 })
    }

    console.log('Current videos:', allVideos)

    // Find videos that need fixing
    const videosToFix = allVideos?.filter(video => 
      video.status === 'ready' && 
      (!video.playback_id || video.playback_id === 'PROCESSING')
    ) || []

    console.log(`Found ${videosToFix.length} videos with inconsistent status`)

    if (videosToFix.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos with inconsistent status found',
        fixedVideos: [],
        allVideos: allVideos
      })
    }

    // Update these videos to status 'processing' since they don't have valid playback_id
    const { error: updateError } = await supabaseAdmin
      .from('videos')
      .update({ 
        status: 'processing',
        playback_id: null // Clear any fake playback_id
      })
      .in('id', videosToFix.map(v => v.id))

    if (updateError) {
      console.error('Failed to update video status:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update video status' 
      }, { status: 500 })
    }

    console.log('Updated video statuses')

    return NextResponse.json({
      success: true,
      message: `Fixed status for ${videosToFix.length} videos`,
      fixedVideos: videosToFix,
      action: 'Changed status from "ready" to "processing" for videos without valid playback_id',
      allVideos: allVideos
    })

  } catch (error) {
    console.error('Fix video status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
