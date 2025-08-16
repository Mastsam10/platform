import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST() {
  try {
    console.log('🗑️ Deleting specific video by ID...')
    
    // First, get the video ID
    const { data: video, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('id, title, asset_id')
      .eq('title', '6')
      .single()
    
    if (fetchError || !video) {
      console.error('❌ Video not found or error:', fetchError)
      return NextResponse.json({
        error: 'Video not found',
        details: fetchError?.message
      }, { status: 404 })
    }
    
    console.log(`📹 Found video: ${video.id} (${video.title})`)
    
    // Delete any transcript jobs for this video first
    const { data: deletedJobs, error: jobError } = await supabaseAdmin
      .from('transcript_jobs')
      .delete()
      .eq('video_id', video.id)
      .select('id')
    
    if (!jobError) {
      console.log(`✅ Deleted ${deletedJobs?.length || 0} transcript jobs`)
    }
    
    // Delete any video tags (chapters) for this video
    const { data: deletedTags, error: tagError } = await supabaseAdmin
      .from('video_tags')
      .delete()
      .eq('video_id', video.id)
      .select('id')
    
    if (!tagError) {
      console.log(`✅ Deleted ${deletedTags?.length || 0} video tags`)
    }
    
    // Now delete the video itself
    const { data: deletedVideo, error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', video.id)
      .select('id, title, asset_id')
    
    if (deleteError) {
      console.error('❌ Error deleting video:', deleteError)
      return NextResponse.json({
        error: 'Failed to delete video',
        details: deleteError.message
      }, { status: 500 })
    }
    
    console.log(`✅ Successfully deleted video:`, deletedVideo)
    
    // Verify deletion
    const { data: remainingVideos } = await supabaseAdmin
      .from('videos')
      .select('id, title')
    
    console.log(`📊 Remaining videos: ${remainingVideos?.length || 0}`)
    
    return NextResponse.json({
      success: true,
      message: 'Specific video deleted successfully',
      deletedVideo: deletedVideo || [],
      deletedJobs: deletedJobs || [],
      deletedTags: deletedTags || [],
      remainingVideos: remainingVideos?.length || 0
    })
    
  } catch (error) {
    console.error('❌ Delete specific video error:', error)
    return NextResponse.json({
      error: 'Delete failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
