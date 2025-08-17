export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting comprehensive test data cleanup...')

    // Step 1: Get all videos first
    const { data: videos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('id, title, playback_id')

    if (fetchError) {
      console.error('❌ Failed to fetch videos:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch videos',
        details: fetchError.message 
      }, { status: 500 })
    }

    console.log(`📊 Found ${videos?.length || 0} videos to delete`)

    // Step 2: Delete all videos (this will cascade delete transcripts and video_tags)
    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all videos

    if (deleteError) {
      console.error('❌ Failed to delete videos:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete videos',
        details: deleteError.message 
      }, { status: 500 })
    }

    console.log(`✅ Successfully deleted ${videos?.length || 0} videos from database`)

    // Step 3: Verify deletion
    const { data: remainingVideos, error: verifyError } = await supabaseAdmin
      .from('videos')
      .select('id')
      .limit(1)

    if (verifyError) {
      console.error('❌ Failed to verify deletion:', verifyError)
    } else {
      console.log(`📊 Remaining videos: ${remainingVideos?.length || 0}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${videos?.length || 0} videos and all related data`,
      deletedCount: videos?.length || 0,
      remainingVideos: remainingVideos?.length || 0,
      note: 'Videos deleted from database. Cloudflare cleanup may be needed separately.'
    })

  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
