import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoTitle } = body

    if (!videoTitle) {
      return NextResponse.json({ 
        error: 'Missing videoTitle' 
      }, { status: 400 })
    }

    // Find video by title
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('title', videoTitle)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ 
        error: `Video not found: ${videoTitle}` 
      }, { status: 404 })
    }

    console.log(`Testing transcript generation for video: ${video.id}`)

    // Step 1: Generate transcript
    const transcriptResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'}/api/transcripts/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        videoId: video.id,
        provider: 'deepgram',
        lang: 'en'
      }),
    })

    const transcriptResult = await transcriptResponse.json()
    console.log('Transcript result:', transcriptResult)

    // Step 2: Generate chapters (if transcript was successful)
    let chapterResult = null
    if (transcriptResponse.ok && transcriptResult.srt) {
      const chapterResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'}/api/chapters/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId: video.id,
          srtUrl: transcriptResult.srt
        }),
      })

      chapterResult = await chapterResponse.json()
      console.log('Chapter result:', chapterResult)
    }

    // Step 3: Get updated video data
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', video.id as string)
      .single()

    // Step 4: Get generated chapters
    const { data: chapters, error: chapterError } = await supabase
      .from('video_tags')
      .select('*')
      .eq('video_id', video.id as string)
      .order('start_s', { ascending: true })

    return NextResponse.json({
      success: true,
      video: updatedVideo,
      transcript: transcriptResult,
      chapters: chapterResult,
      videoTags: chapters,
      errors: {
        transcript: transcriptResponse.ok ? null : transcriptResult,
        chapters: chapterError,
        update: updateError
      }
    })

  } catch (error) {
    console.error('Test transcript error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
