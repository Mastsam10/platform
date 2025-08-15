import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title') || '4'
    
    console.log(`🔍 Searching for video with title: "${title}"`)
    
    // Search for video by title
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
      .ilike('title', `%${title}%`)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Failed to search videos:', error)
      return NextResponse.json(
        { error: 'Failed to search videos', details: error },
        { status: 500 }
      )
    }
    
    console.log(`📊 Found ${videos?.length || 0} videos matching "${title}":`)
    videos?.forEach(video => {
      console.log(`  - ${video.id}: "${video.title}" (status: ${video.status}, asset_id: ${video.asset_id}, playback_id: ${video.playback_id})`)
    })
    
    // Also get all videos to see what's in the database
    const { data: allVideos } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, asset_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)
    
    console.log('📋 Most recent videos in database:')
    allVideos?.forEach(video => {
      console.log(`  - ${video.id}: "${video.title}" (status: ${video.status}, asset_id: ${video.asset_id})`)
    })
    
    return NextResponse.json({
      message: 'Video search completed',
      searchTitle: title,
      foundVideos: videos,
      allVideos: allVideos,
      count: videos?.length || 0
    })
    
  } catch (error) {
    console.error('Find video error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
