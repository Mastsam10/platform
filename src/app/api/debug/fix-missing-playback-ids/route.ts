import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoTitle, playbackId } = body

    if (!videoTitle || !playbackId) {
      return NextResponse.json({ 
        error: 'Missing videoTitle or playbackId' 
      }, { status: 400 })
    }

    // Update the video with the playback_id
    const { data, error } = await supabaseAdmin
      .from('videos')
      .update({ playback_id: playbackId })
      .eq('title', videoTitle)
      .select()

    if (error) {
      console.error('Failed to update playback_id:', error)
      return NextResponse.json({ 
        error: 'Failed to update playback_id' 
      }, { status: 500 })
    }

    if (data && data.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: `Updated ${videoTitle} with playback_id: ${playbackId}`,
        video: data[0]
      })
    } else {
      return NextResponse.json({ 
        error: `No video found with title: ${videoTitle}` 
      }, { status: 404 })
    }

  } catch (error) {
    console.error('Fix playback_id error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
