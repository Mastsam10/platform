export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { cloudflareStream } from '@/lib/cloudflare'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const playbackId = searchParams.get('playbackId')
    
    if (!playbackId) {
      return NextResponse.json({ 
        error: 'Missing playbackId parameter' 
      }, { status: 400 })
    }

    console.log(`🔍 Testing Cloudflare captions for playback ID: ${playbackId}`)

    // Get full video details
    const video = await cloudflareStream.getVideo(playbackId)
    
    // Check if captions are available
    const hasCaptions = await cloudflareStream.hasCaptions(playbackId)
    
    // Get caption URL
    const captionUrl = await cloudflareStream.getCaptionUrl(playbackId, 'en')

    return NextResponse.json({
      playbackId,
      videoDetails: video.result,
      hasCaptions,
      captionUrl,
      captionsArray: video.result.captions || []
    })

  } catch (error) {
    console.error('❌ Error testing Cloudflare captions:', error)
    return NextResponse.json({ 
      error: 'Failed to test Cloudflare captions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
