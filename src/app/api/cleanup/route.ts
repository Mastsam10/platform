import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of test videos...')
    
    // Delete videos with test titles
    const testTitles = ['1', '55', 'test1', 'test2', 'test3', 'test4', 'Test Video']
    
    let deletedCount = 0
    
    for (const title of testTitles) {
      const { data: videos, error } = await supabaseAdmin
        .from('videos')
        .delete()
        .eq('title', title)
        .select('id, title, asset_id')
      
      if (error) {
        console.error(`Error deleting videos with title "${title}":`, error)
      } else if (videos && videos.length > 0) {
        console.log(`✅ Deleted ${videos.length} video(s) with title "${title}":`)
        videos.forEach(video => {
          console.log(`  - ${video.id}: "${video.title}" (asset_id: ${video.asset_id})`)
        })
        deletedCount += videos.length
      }
    }
    
    // Also delete any videos with temp_ asset_ids (failed uploads)
    const { data: tempVideos, error: tempError } = await supabaseAdmin
      .from('videos')
      .delete()
      .like('asset_id', 'temp_%')
      .select('id, title, asset_id')
    
    if (tempError) {
      console.error('Error deleting temp videos:', tempError)
    } else if (tempVideos && tempVideos.length > 0) {
      console.log(`✅ Deleted ${tempVideos.length} temp video(s):`)
      tempVideos.forEach(video => {
        console.log(`  - ${video.id}: "${video.title}" (asset_id: ${video.asset_id})`)
      })
      deletedCount += tempVideos.length
    }
    
    console.log(`🎉 Cleanup complete! Deleted ${deletedCount} test videos total.`)
    
    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} test videos`
    })
    
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup test videos' },
      { status: 500 }
    )
  }
}
