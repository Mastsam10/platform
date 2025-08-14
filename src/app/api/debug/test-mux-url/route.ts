import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'DEEPGRAM_API_KEY not found'
      })
    }

    // Test with different Mux URL formats for the new video
    const playbackId = 'XmNUJi1mvWBBzyilbPWUK2quGEVbyVJbZtqRMf6tobU'
    const urls = [
      // Stream URLs (may not be publicly accessible)
      `https://stream.mux.com/${playbackId}/high.mp4`,
      `https://stream.mux.com/${playbackId}.mp4`,
      // Download URLs (should be publicly accessible)
      `https://download.mux.com/${playbackId}/high.mp4`,
      `https://download.mux.com/${playbackId}.mp4`
    ]
    
    const results = []
    
    for (const url of urls) {
      console.log('Testing URL:', url)
      
      try {
        const response = await fetch('https://api.deepgram.com/v1/listen', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: url,
            model: 'nova-2',
            language: 'en',
            smart_format: true,
            punctuate: true,
            format: 'srt'
          })
        })

        if (response.ok) {
          const data = await response.json()
          results.push({
            url,
            success: true,
            transcript: data.results?.channels[0]?.alternatives[0]?.transcript || 'No transcript found',
            confidence: data.results?.channels[0]?.alternatives[0]?.confidence || 0
          })
        } else {
          const errorText = await response.text()
          results.push({
            url,
            success: false,
            error: errorText,
            status: response.status
          })
        }
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      playbackId,
      results
    })

  } catch (error) {
    console.error('Mux URL test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
