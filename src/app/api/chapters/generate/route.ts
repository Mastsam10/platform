import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { generateChapters } from '@/lib/chapters'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoId, srtUrl } = body

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing required field: videoId' },
        { status: 400 }
      )
    }

    // Get video and transcript from database
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { error: 'Video not found' },
        { status: 404 }
      )
    }

    // Get transcript from transcripts table instead of srt_url
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .select('lines, raw_vtt')
      .eq('video_id', videoId)
      .eq('lang', 'en')
      .eq('status', 'ready')
      .single()

    if (transcriptError || !transcriptData) {
      return NextResponse.json(
        { error: 'No transcript available for this video' },
        { status: 400 }
      )
    }

    // Extract plain text from transcript lines
    const lines = transcriptData.lines || []
    const transcript = extractTextFromTranscriptLines(Array.isArray(lines) ? lines : [])
    
    // Generate chapters
    const chapters = generateChapters(transcript)

    // Store chapters as video tags
    const videoTags = chapters.map(chapter => ({
      video_id: videoId,
      type: chapter.type,
      value: chapter.value,
      start_s: chapter.start_s
    }))

    // Insert video tags
    if (videoTags.length > 0) {
      const { error: tagError } = await supabase
        .from('video_tags')
        .insert(videoTags)

      if (tagError) {
        console.error('Failed to insert video tags:', tagError)
        return NextResponse.json(
          { error: 'Failed to save chapters' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      chapters,
      count: chapters.length
    })

  } catch (error) {
    console.error('Chapter generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function extractTextFromTranscriptLines(lines: Array<{ startMs: number; endMs: number; text: string }>): string {
  if (!Array.isArray(lines) || lines.length === 0) return ''
  
  // Extract just the text from transcript lines
  return lines
    .map(line => line.text)
    .join(' ')
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

