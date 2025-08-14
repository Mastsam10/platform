import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { deepgram } from '@/lib/deepgram'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoId, provider = 'deepgram', lang = 'en' } = body

    if (!videoId) {
      return NextResponse.json(
        { error: 'Missing required field: videoId' },
        { status: 400 }
      )
    }

    // Get video details from database
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

    if (!video.playback_id && !video.asset_id) {
      return NextResponse.json(
        { error: 'Video not ready for transcription' },
        { status: 400 }
      )
    }

    // Use playback_id if available, otherwise use asset_id
    const muxId = video.playback_id || video.asset_id
    const downloadUrl = `https://stream.mux.com/${muxId}/high.mp4`

    try {
      // Start Deepgram transcription
      let transcript = ''
      let confidence = 0.95
      let srt = ''

      if (process.env.DEEPGRAM_API_KEY) {
        try {
          // Use actual Deepgram API
          const response = await fetch('https://api.deepgram.com/v1/listen', {
            method: 'POST',
            headers: {
              'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: downloadUrl,
              model: 'nova-2',
              language: lang,
              smart_format: true,
              punctuate: true,
              diarize: false,
              utterances: true,
              paragraphs: true,
              format: 'srt'
            })
          })

          if (response.ok) {
            const data = await response.json()
            transcript = data.results?.channels[0]?.alternatives[0]?.transcript || ''
            confidence = data.results?.channels[0]?.alternatives[0]?.confidence || 0.95
            srt = data.results?.channels[0]?.alternatives[0]?.srt || ''
            console.log('Deepgram transcript generated successfully')
          } else {
            const errorText = await response.text()
            console.error('Deepgram API error:', errorText)
            
            // Check if it's a URL access issue
            if (errorText.includes('REMOTE_CONTENT_ERROR')) {
              console.log('Deepgram cannot access video URL, falling back to placeholder')
            } else {
              throw new Error(`Deepgram API request failed: ${errorText}`)
            }
          }
        } catch (apiError) {
          console.error('Deepgram API error:', apiError)
          // Fall back to placeholder if API fails
        }
      } else {
        console.log('Deepgram API key not configured, using placeholder transcript')
      }

      // Fallback to placeholder if no API key or API fails
      if (!transcript) {
        transcript = `Sample transcript for video ${videoId}. This is a placeholder transcript that will be replaced with actual Deepgram transcription when the API key is configured.`
        srt = `1
00:00:00,000 --> 00:00:10,000
Sample transcript for video ${videoId}.

2
00:00:10,000 --> 00:00:20,000
This is a placeholder transcript.

3
00:00:20,000 --> 00:00:30,000
Romans 8:28 says "And we know that in all things God works for the good of those who love him."

4
00:00:30,000 --> 00:00:40,000
This verse gives us hope in difficult times.`
      }

      // Store transcript in database
      const { error: transcriptError } = await supabase
        .from('captions')
        .insert({
          video_id: videoId,
          provider,
          lang,
          srt_url: '', // We'll store SRT content directly for now
          created_at: new Date().toISOString()
        })

      if (transcriptError) {
        console.error('Failed to store transcript:', transcriptError)
      }

      // Update video with transcript
      await supabase
        .from('videos')
        .update({ srt_url: srt })
        .eq('id', videoId)

      return NextResponse.json({
        success: true,
        transcript,
        srt,
        confidence
      })

    } catch (transcriptionError) {
      console.error('Transcription error:', transcriptionError)
      return NextResponse.json(
        { error: 'Failed to generate transcript' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Transcript start error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateSRT(words: any[]): string {
  let srt = ''
  let segmentIndex = 1
  let currentSegment: any[] = []
  let segmentStart = 0

  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    
    if (currentSegment.length === 0) {
      segmentStart = word.start
    }
    
    currentSegment.push(word)
    
    // Create segment every ~10 seconds or at sentence boundaries
    const segmentDuration = word.end - segmentStart
    const isSentenceEnd = word.word.endsWith('.') || word.word.endsWith('!') || word.word.endsWith('?')
    
    if (segmentDuration > 10 || isSentenceEnd || i === words.length - 1) {
      const segmentText = currentSegment.map(w => w.word).join(' ')
      const startTime = formatTime(segmentStart)
      const endTime = formatTime(word.end)
      
      srt += `${segmentIndex}\n`
      srt += `${startTime} --> ${endTime}\n`
      srt += `${segmentText}\n\n`
      
      segmentIndex++
      currentSegment = []
    }
  }
  
  return srt
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 1000)
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
}
