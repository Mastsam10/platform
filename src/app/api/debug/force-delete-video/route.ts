import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST() {
  try {
    console.log('🗑️ Force deleting remaining video...')
    
    // Delete the specific video that's still there
    const { data: deletedVideo, error: videoError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('title', '6')
      .select('id, title, asset_id')
    
    if (videoError) {
      console.error('❌ Error deleting video:', videoError)
      return NextResponse.json({
        error: 'Failed to delete video',
        details: videoError.message
      }, { status: 500 })
    }
    
    console.log(`✅ Deleted video:`, deletedVideo)
    
    // Also delete any transcript jobs for this video
    if (deletedVideo && deletedVideo.length > 0) {
      const videoId = deletedVideo[0].id
      const { data: deletedJobs, error: jobError } = await supabaseAdmin
        .from('transcript_jobs')
        .delete()
        .eq('video_id', videoId)
        .select('id')
      
      if (!jobError) {
        console.log(`✅ Deleted ${deletedJobs?.length || 0} transcript jobs`)
      }
    }
    
    // Verify cleanup
    const { data: remainingVideos } = await supabaseAdmin
      .from('videos')
      .select('id, title')
    
    console.log(`📊 Remaining videos: ${remainingVideos?.length || 0}`)
    
    return NextResponse.json({
      success: true,
      message: 'Video force deleted',
      deletedVideo: deletedVideo || [],
      remainingVideos: remainingVideos?.length || 0
    })
    
  } catch (error) {
    console.error('❌ Force delete error:', error)
    return NextResponse.json({
      error: 'Force delete failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
