import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params
  try {

    if (!videoId) {
      return NextResponse.json(
        { error: 'Video ID is required' },
        { status: 400 }
      )
    }

    // Fetch video tags (chapters) for this video
    const { data: chapters, error } = await supabase
      .from('video_tags')
      .select('*')
      .eq('video_id', videoId)
      .in('type', ['passage', 'topic'])
      .order('start_s', { ascending: true })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch chapters' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      chapters: chapters || []
    })

  } catch (error) {
    console.error('Chapters API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

