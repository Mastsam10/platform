import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid } = body

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 })
    }

    console.log(`Fixing Cloudflare Stream video with UID: ${uid}`)

    // Find video by asset_id
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, asset_id')
      .eq('asset_id', uid)
      .single()

    if (videoError || !video) {
      console.error('Video not found for UID:', uid)
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    console.log(`Found video: ${video.id} (${video.title}) - Current Status: ${video.status}`)

    // Update video to ready status
    const { error: updateError } = await supabaseAdmin
      .from('videos')
      .update({
        status: 'ready',
        playback_id: uid, // Use UID as playback_id for Cloudflare Stream
        duration_s: 69, // Default duration, will be updated by webhook later
        aspect_ratio: '16/9' // Default aspect ratio
      })
      .eq('id', video.id)

    if (updateError) {
      console.error('Failed to update video:', updateError)
      return NextResponse.json({ error: 'Failed to update video' }, { status: 500 })
    }

    console.log(`✅ Video ${video.id} updated to ready status`)

    // Get updated video info
    const { data: updatedVideo } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, playback_id, duration_s')
      .eq('id', video.id)
      .single()

    return NextResponse.json({
      success: true,
      message: 'Video fixed successfully',
      video: updatedVideo
    })

  } catch (error) {
    console.error('Fix video error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
