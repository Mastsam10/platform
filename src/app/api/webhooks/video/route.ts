import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('mux-signature')
    if (signature && process.env.MUX_WEBHOOK_SECRET) {
      // TODO: Add signature verification logic here
      console.log('Webhook signature received:', signature)
    }

    const body = await request.json()
    const { provider, type, data } = body

    // Validate webhook
    if (!provider || !type || !data) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      )
    }

    // Handle video.asset.ready event
    if (type === 'video.asset.ready') {
      const { asset_id, duration, playback_id, videoId } = data

      // Update video record with playback information
      const { error } = await supabase
        .from('videos')
        .update({
          status: 'ready',
          playback_id,
          duration_s: duration
        })
        .eq('id', videoId)

      if (error) {
        console.error('Failed to update video:', error)
        return NextResponse.json(
          { error: 'Failed to update video status' },
          { status: 500 }
        )
      }

      // Trigger transcript generation
      try {
        const transcriptResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/transcripts/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoId,
            provider: 'deepgram',
            lang: 'en'
          }),
        })

        if (transcriptResponse.ok) {
          const transcriptData = await transcriptResponse.json()
          console.log(`Transcript generated for video ${videoId}`)
          
          // Trigger chapter generation after transcript is ready
          if (transcriptData.srt) {
            const chapterResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/chapters/generate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                videoId,
                srtUrl: transcriptData.srt
              }),
            })

            if (chapterResponse.ok) {
              const chapterData = await chapterResponse.json()
              console.log(`Generated ${chapterData.count} chapters for video ${videoId}`)
            }
          }
        }
      } catch (transcriptError) {
        console.error('Failed to trigger transcript generation:', transcriptError)
      }
      
      console.log(`Video ${videoId} is ready for playback`)
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
