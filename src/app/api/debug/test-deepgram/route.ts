import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'DEEPGRAM_API_KEY not found in environment variables',
        hasKey: false
      })
    }

    // Test with a simple audio file (Deepgram's test URL)
    const testUrl = 'https://static.deepgram.com/examples/Bueller-Life-moves-pretty-fast.wav'
    
    console.log('Testing Deepgram API with key:', apiKey.substring(0, 8) + '...')
    
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: testUrl,
        model: 'nova-2',
        language: 'en',
        smart_format: true,
        punctuate: true,
        format: 'srt'
      })
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        hasKey: true,
        apiWorking: true,
        transcript: data.results?.channels[0]?.alternatives[0]?.transcript || 'No transcript found',
        confidence: data.results?.channels[0]?.alternatives[0]?.confidence || 0
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        hasKey: true,
        apiWorking: false,
        error: errorText,
        status: response.status
      })
    }

  } catch (error) {
    console.error('Deepgram test error:', error)
    return NextResponse.json({
      success: false,
      hasKey: !!process.env.DEEPGRAM_API_KEY,
      apiWorking: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
