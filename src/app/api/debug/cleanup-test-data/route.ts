export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('Starting cleanup of test data...')

    // First, get all videos to see what we're deleting
    const { data: videos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('id, title, asset_id')

    if (fetchError) {
      console.error('Failed to fetch videos:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch videos' 
      }, { status: 500 })
    }

    console.log(`Found ${videos?.length || 0} videos to delete`)

    // Delete video_tags (chapters) first (due to foreign key constraints)
    const { error: tagsError } = await supabaseAdmin
      .from('video_tags')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (tagsError) {
      console.error('Failed to delete video_tags:', tagsError)
      return NextResponse.json({ 
        error: 'Failed to delete video_tags' 
      }, { status: 500 })
    }

    console.log('Deleted all video_tags')

    // Delete captions (transcripts)
    const { error: captionsError } = await supabaseAdmin
      .from('captions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (captionsError) {
      console.error('Failed to delete captions:', captionsError)
      // Continue anyway, captions table might not exist
    } else {
      console.log('Deleted all captions')
    }

    // Delete videos
    const { error: videosError } = await supabaseAdmin
      .from('videos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (videosError) {
      console.error('Failed to delete videos:', videosError)
      return NextResponse.json({ 
        error: 'Failed to delete videos' 
      }, { status: 500 })
    }

    console.log('Deleted all videos')

    // Verify cleanup
    const { data: remainingVideos, error: verifyError } = await supabaseAdmin
      .from('videos')
      .select('count')

    if (verifyError) {
      console.error('Failed to verify cleanup:', verifyError)
    }

    return NextResponse.json({
      success: true,
      message: 'All test data cleaned up successfully',
      deletedVideos: videos || [],
      remainingVideos: remainingVideos?.length || 0
    })

  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
