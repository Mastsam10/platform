import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoTitle } = body

    if (!videoTitle) {
      return NextResponse.json({ 
        error: 'Missing videoTitle' 
      }, { status: 400 })
    }

    console.log(`Setting video to ready: ${videoTitle}`)

    // Update the video status to ready
    const { data: video, error: updateError } = await supabaseAdmin
      .from('videos')
      .update({ status: 'ready' })
      .eq('title', videoTitle)
      .select('id, title, status, playback_id, asset_id')
      .single()

    if (updateError) {
      console.error('Failed to update video:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update video' 
      }, { status: 500 })
    }

    if (!video) {
      return NextResponse.json({ 
        error: `Video not found: ${videoTitle}` 
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: `Set ${videoTitle} to ready status`,
      video: video
    })

  } catch (error) {
    console.error('Set video ready error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
