import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    console.log('📋 Listing all videos in database...')
    
    // Get all videos with channel info
    const { data: videos, error } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        description,
        status,
        asset_id,
        playback_id,
        upload_id,
        duration_s,
        aspect_ratio,
        created_at,
        updated_at,
        channels (
          id,
          name,
          slug,
          denomination
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to fetch videos:', error)
      return NextResponse.json(
        { error: 'Failed to fetch videos', details: error },
        { status: 500 }
      )
    }
    
    console.log(`📊 Found ${videos?.length || 0} videos in database:`)
    videos?.forEach(video => {
      console.log(`  - ${video.id}: "${video.title}" (status: ${video.status}, asset_id: ${video.asset_id})`)
    })
    
    return NextResponse.json({
      message: 'Videos list retrieved successfully',
      count: videos?.length || 0,
      videos: videos
    })
    
  } catch (error) {
    console.error('List videos error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
