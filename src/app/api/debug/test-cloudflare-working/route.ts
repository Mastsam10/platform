import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test the working Cloudflare Stream functionality
    console.log('Testing working Cloudflare Stream functionality...')
    
    const body = {
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      meta: {
        name: "Test Video from Working Endpoint"
      }
    }
    
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/copy`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        message: 'Cloudflare Stream copy endpoint working!',
        videoUid: data.result.uid,
        thumbnail: data.result.thumbnail,
        status: data.result.status,
        method: 'stream_copy_endpoint'
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: 'Cloudflare Stream copy failed',
        status: response.status,
        errorText,
        method: 'stream_copy_endpoint'
      })
    }
    
  } catch (error) {
    console.error('Cloudflare working test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: 'stream_copy_endpoint'
    })
  }
}
