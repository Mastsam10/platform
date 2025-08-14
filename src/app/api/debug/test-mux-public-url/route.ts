import { NextRequest, NextResponse } from 'next/server'
import { Video } from '@/lib/mux'

export async function GET(request: NextRequest) {
  try {
    const assetId = 'X3UzTs68RBvgy4r1Fogbls026Ic3L5aWI9iqYgEmOoCc'
    
    console.log('Testing Mux asset access...')
    
    try {
      const asset = await Video.assets.retrieve(assetId)
      console.log('Asset retrieved successfully')
      
      return NextResponse.json({
        success: true,
        assetId: asset.id,
        status: asset.status,
        duration: asset.duration,
        playbackIds: asset.playback_ids,
        message: 'Asset details retrieved'
      })
      
    } catch (muxError) {
      console.error('Mux API error:', muxError)
      return NextResponse.json({
        success: false,
        error: muxError instanceof Error ? muxError.message : 'Unknown Mux error'
      })
    }

  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
