import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoId, transcript, srt } = body

    if (!videoId || !transcript || !srt) {
      return NextResponse.json(
        { error: 'Missing required fields: videoId, transcript, srt' },
        { status: 400 }
      )
    }

    console.log('Uploading transcript for video:', videoId)

    // Store transcript in database
    const { error: transcriptError } = await supabase
      .from('captions')
      .insert({
        video_id: videoId,
        provider: 'manual',
        lang: 'en',
        srt_url: '', // We'll store SRT content directly for now
        created_at: new Date().toISOString()
      })

    if (transcriptError) {
      console.error('Failed to store transcript:', transcriptError)
      return NextResponse.json(
        { error: 'Failed to store transcript' },
        { status: 500 }
      )
    }

    // Update video with transcript
    const { error: videoError } = await supabase
      .from('videos')
      .update({ srt_url: srt })
      .eq('id', videoId)

    if (videoError) {
      console.error('Failed to update video:', videoError)
      return NextResponse.json(
        { error: 'Failed to update video' },
        { status: 500 }
      )
    }

    // Trigger chapter generation
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'
      const chapterResponse = await fetch(`${baseUrl}/api/chapters/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          srtUrl: srt
        }),
      })

      if (chapterResponse.ok) {
        const chapterData = await chapterResponse.json()
        console.log(`✅ Generated ${chapterData.count} chapters for video ${videoId}`)
      } else {
        console.error('Failed to generate chapters:', await chapterResponse.text())
      }
    } catch (chapterError) {
      console.error('Failed to trigger chapter generation:', chapterError)
    }

    console.log('✅ Transcript uploaded successfully for video:', videoId)

    return NextResponse.json({
      success: true,
      message: 'Transcript uploaded successfully',
      videoId,
      transcriptLength: transcript.length,
      srtLength: srt.length
    })

  } catch (error) {
    console.error('Transcript upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload transcript' },
      { status: 500 }
    )
  }
}
