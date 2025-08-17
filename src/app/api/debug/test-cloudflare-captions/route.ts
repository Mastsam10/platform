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
    
    // List captions using the dedicated API
    const captions = await cloudflareStream.listCaptions(playbackId)
    
    // Check if captions are available
    const hasCaptions = await cloudflareStream.hasCaptions(playbackId)
    
    // Get caption VTT content
    const captionVtt = await cloudflareStream.getCaptionVtt(playbackId, 'en')

    return NextResponse.json({
      playbackId,
      videoDetails: video.result,
      captions,
      hasCaptions,
      captionVtt: captionVtt ? captionVtt.substring(0, 200) + '...' : null,
      captionVttLength: captionVtt?.length || 0
    })

  } catch (error) {
    console.error('❌ Error testing Cloudflare captions:', error)
    return NextResponse.json({ 
      error: 'Failed to test Cloudflare captions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
