import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, playback_id, duration_s = 17 } = body

    if (!title || !playback_id) {
      return NextResponse.json(
        { error: 'Missing title or playback_id' },
        { status: 400 }
      )
    }

    // Update the video status
    const { data, error } = await supabase
      .from('videos')
      .update({
        status: 'ready',
        playback_id,
        duration_s
      })
      .eq('title', title)
      .select()

    if (error) {
      console.error('Failed to update video:', error)
      return NextResponse.json(
        { error: 'Failed to update video' },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    console.log(`Updated video ${title} to ready status`)

    return NextResponse.json({
      success: true,
      message: `Updated ${title} to ready status`,
      video: data[0]
    })

  } catch (error) {
    console.error('Debug endpoint error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
