import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all videos with their transcript status
    const { data: videos, error } = await supabase
      .from('videos')
      .select(`
        id,
        title,
        status,
        playback_id,
        has_captions,
        transcripts (
          id,
          status,
          lang,
          lines
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      )
    }

    // Process each video to check transcript status
    const processedVideos = videos?.map((video: any) => {
      const transcript = video.transcripts?.[0] || null
      const hasTranscript = transcript && transcript.status === 'ready'
      const hasLines = transcript && Array.isArray(transcript.lines) && transcript.lines.length > 0
      
      return {
        id: video.id as string,
        title: video.title as string,
        status: video.status as string,
        playback_id: video.playback_id as string,
        has_captions: video.has_captions as boolean,
        transcript_status: transcript?.status || 'none',
        has_transcript: hasTranscript,
        has_lines: hasLines,
        line_count: transcript?.lines?.length || 0
      }
    }) || []

    return NextResponse.json({
      videos: processedVideos,
      total: processedVideos.length,
      with_captions: processedVideos.filter(v => v.has_captions).length,
      with_transcripts: processedVideos.filter(v => v.has_transcript).length,
      with_lines: processedVideos.filter(v => v.has_lines).length
    })

  } catch (error) {
    console.error('Transcript status check error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
