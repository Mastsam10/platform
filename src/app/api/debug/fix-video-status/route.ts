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
      (video.status === 'ready' && (!video.playback_id || video.playback_id === 'PROCESSING')) ||
      (video.status === 'processing' && video.playback_id && video.playback_id !== 'PROCESSING')
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

    // Process each video individually
    const results = []
    for (const video of videosToFix) {
      let updateData = {}
      
      if (video.status === 'ready' && (!video.playback_id || video.playback_id === 'PROCESSING')) {
        // Video marked as ready but has no valid playback_id - set to processing
        updateData = { 
          status: 'processing',
          playback_id: null
        }
      } else if (video.status === 'processing' && video.playback_id && video.playback_id !== 'PROCESSING') {
        // Video marked as processing but has valid playback_id - set to ready
        updateData = { 
          status: 'ready'
        }
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabaseAdmin
          .from('videos')
          .update(updateData)
          .eq('id', video.id)

        if (updateError) {
          console.error(`Failed to update video ${video.title}:`, updateError)
          results.push({ video: video.title, success: false, error: updateError })
        } else {
          console.log(`Updated video ${video.title}:`, updateData)
          results.push({ video: video.title, success: true, changes: updateData })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${videosToFix.length} videos`,
      results: results,
      allVideos: allVideos
    })

  } catch (error) {
    console.error('Fix video status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
