export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function dbFingerprint() {
  return {
    url: process.env.SUPABASE_URL,
    project_ref: process.env.SUPABASE_URL?.split('https://')[1]?.split('.')[0],
    using_service_key: !!process.env.SUPABASE_SERVICE_KEY,
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { videoId: string } }
) {
  try {
    console.log('[DB FINGERPRINT]', dbFingerprint())
    
    const { videoId } = params
    
    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching video: ${videoId}`)

    const { data: video, error } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        description,
        status,
        playback_id,
        duration_s,
        aspect_ratio,
        published_at,
        has_captions,
        created_at,
        channels (
          name,
          denomination
        )
      `)
      .eq('id', videoId)
      .single()

    if (error || !video) {
      console.error('❌ Video not found:', error)
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Found video: ${video.title}`)

    return NextResponse.json({ video })

  } catch (error) {
    console.error('❌ Error fetching video:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
