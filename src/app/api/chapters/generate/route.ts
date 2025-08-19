import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { videoId } = await request.json()
    
    if (!videoId) {
      return NextResponse.json({ error: 'Video ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get video details
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    // Get transcript data
    const { data: transcriptData, error: transcriptError } = await supabase
      .from('transcripts')
      .select('*')
      .eq('video_id', videoId)
      .single()

    if (transcriptError || !transcriptData) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 })
    }

    // Extract text from transcript lines
    const lines = transcriptData.lines || []
    const transcript = extractTextFromTranscriptLines(Array.isArray(lines) ? lines : [])

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript text available' }, { status: 400 })
    }

    // Generate simple chapters based on transcript length
    const chapters = generateSimpleChapters(transcript, lines)

    // Store chapters in video_tags table
    const chapterTags = chapters.map((chapter, index) => ({
      video_id: videoId,
      type: 'passage',
      value: chapter,
      start_s: Math.floor(index * 60) // Placeholder timing
    }))

    const { error: insertError } = await supabase
      .from('video_tags')
      .insert(chapterTags)

    if (insertError) {
      console.error('Error inserting chapters:', insertError)
      return NextResponse.json({ error: 'Failed to save chapters' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      chapters: chapters,
      count: chapters.length 
    })

  } catch (error) {
    console.error('Chapter generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function extractTextFromTranscriptLines(lines: Array<{ startMs: number; endMs: number; text: string }>): string {
  if (!Array.isArray(lines) || lines.length === 0) return ''
  
  return lines.map(line => line.text).join(' ')
}

function generateSimpleChapters(transcript: string, lines: Array<{ startMs: number; endMs: number; text: string }>): string[] {
  // Simple chapter generation - split transcript into chunks
  const words = transcript.split(' ')
  const wordsPerChapter = Math.max(50, Math.floor(words.length / 5))
  const chapters: string[] = []
  
  for (let i = 0; i < words.length; i += wordsPerChapter) {
    const chapterWords = words.slice(i, i + wordsPerChapter)
    chapters.push(chapterWords.join(' '))
  }
  
  return chapters.slice(0, 5) // Limit to 5 chapters
}

