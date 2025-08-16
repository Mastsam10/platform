import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST() {
  try {
    console.log('🧹 Starting complete video cleanup...')
    
    // Delete all videos (this will cascade to related tables)
    const { data: deletedVideos, error: videoError } = await supabaseAdmin
      .from('videos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all videos
      .select('id, title, asset_id')
    
    if (videoError) {
      console.error('❌ Error deleting videos:', videoError)
      return NextResponse.json({
        error: 'Failed to delete videos',
        details: videoError.message
      }, { status: 500 })
    }
    
    console.log(`✅ Deleted ${deletedVideos?.length || 0} videos`)
    
    // Also clean up any orphaned transcript jobs
    const { data: deletedJobs, error: jobError } = await supabaseAdmin
      .from('transcript_jobs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id, video_id')
    
    if (jobError) {
      console.error('❌ Error deleting transcript jobs:', jobError)
    } else {
      console.log(`✅ Deleted ${deletedJobs?.length || 0} transcript jobs`)
    }
    
    // Clean up any orphaned captions in storage
    try {
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from('public')
        .list('captions')
      
      if (!listError && files && files.length > 0) {
        const fileNames = files.map(f => `captions/${f.name}`)
        const { error: deleteError } = await supabaseAdmin.storage
          .from('public')
          .remove(fileNames)
        
        if (deleteError) {
          console.error('❌ Error deleting caption files:', deleteError)
        } else {
          console.log(`✅ Deleted ${files.length} caption files`)
        }
      }
    } catch (storageError) {
      console.error('❌ Error cleaning up storage:', storageError)
    }
    
    // Verify cleanup
    const { data: remainingVideos } = await supabaseAdmin
      .from('videos')
      .select('id, title')
    
    const { data: remainingJobs } = await supabaseAdmin
      .from('transcript_jobs')
      .select('id')
    
    console.log(`📊 Cleanup complete. Remaining: ${remainingVideos?.length || 0} videos, ${remainingJobs?.length || 0} jobs`)
    
    return NextResponse.json({
      success: true,
      message: 'Complete video cleanup finished',
      deletedVideos: deletedVideos || [],
      deletedJobs: deletedJobs || [],
      remainingVideos: remainingVideos?.length || 0,
      remainingJobs: remainingJobs?.length || 0
    })
    
  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
