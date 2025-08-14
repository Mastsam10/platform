import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get the most recent videos
    const { data: videos, error } = await supabase
      .from('videos')
      .select('id, title, status, playback_id, asset_id, duration_s')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      videos: videos || [],
      summary: {
        total: videos?.length || 0,
        ready: videos?.filter(v => v.status === 'ready').length || 0,
        withPlaybackId: videos?.filter(v => v.playback_id).length || 0,
        withAssetId: videos?.filter(v => v.asset_id).length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
