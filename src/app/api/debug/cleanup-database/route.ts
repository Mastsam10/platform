import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    console.log('🧹 Cleaning up database - removing videos with incorrect asset_ids')
    
    // Get all videos
    const { data: allVideos } = await supabaseAdmin
      .from('videos')
      .select('id, title, asset_id, status')
    
    console.log('📋 All videos before cleanup:')
    allVideos?.forEach(v => {
      console.log(`  - ${v.id}: "${v.title}" (asset_id: ${v.asset_id}, status: ${v.status})`)
    })
    
    // Videos with correct asset_ids (that exist in Cloudflare)
    const correctAssetIds = [
      'c24b8db510124a21b12731304c1b2966', // This one exists in Cloudflare
      '998ca92a59304de5b4899a161fd8ab7d'  // This one might exist
    ]
    
    // Delete videos with incorrect asset_ids
    const { data: deletedVideos, error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .not('asset_id', 'in', `(${correctAssetIds.map(id => `'${id}'`).join(',')})`)
      .select('id, title, asset_id')
    
    if (deleteError) {
      console.error('Failed to delete videos:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete videos', details: deleteError },
        { status: 500 }
      )
    }
    
    console.log('🗑️ Deleted videos with incorrect asset_ids:')
    deletedVideos?.forEach(v => {
      console.log(`  - ${v.id}: "${v.title}" (asset_id: ${v.asset_id})`)
    })
    
    // Get remaining videos
    const { data: remainingVideos } = await supabaseAdmin
      .from('videos')
      .select('id, title, asset_id, status')
    
    console.log('✅ Remaining videos after cleanup:')
    remainingVideos?.forEach(v => {
      console.log(`  - ${v.id}: "${v.title}" (asset_id: ${v.asset_id}, status: ${v.status})`)
    })
    
    return NextResponse.json({
      message: 'Database cleanup completed',
      deleted: deletedVideos?.length || 0,
      remaining: remainingVideos?.length || 0,
      deletedVideos: deletedVideos,
      remainingVideos: remainingVideos
    })
    
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
