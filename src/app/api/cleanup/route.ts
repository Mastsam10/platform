import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Use POST to cleanup test videos',
    testTitles: ['1', '55', 'test1', 'test2', 'test3', 'test4', 'Test Video']
  })
}

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting cleanup of test videos...')
    
    // Delete ALL videos (since they're all test videos)
    const { data: deletedVideos, error } = await supabaseAdmin
      .from('videos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all videos
      .select('id, title, asset_id')
    
    if (error) {
      console.error('Error deleting videos:', error)
      return NextResponse.json(
        { error: 'Failed to delete videos', details: error },
        { status: 500 }
      )
    }
    
    const deletedCount = deletedVideos?.length || 0
    console.log(`🎉 Cleanup complete! Deleted ${deletedCount} videos total.`)
    
    if (deletedVideos && deletedVideos.length > 0) {
      console.log('Deleted videos:')
      deletedVideos.forEach(video => {
        console.log(`  - ${video.id}: "${video.title}" (asset_id: ${video.asset_id})`)
      })
    }
    
    return NextResponse.json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} videos`,
      deletedVideos: deletedVideos || []
    })
    
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup videos' },
      { status: 500 }
    )
  }
}
