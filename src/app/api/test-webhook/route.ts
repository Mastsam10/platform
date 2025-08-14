import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { asset_id, playback_id, duration } = body

    // Simulate the video.asset.ready webhook
    const webhookPayload = {
      type: 'video.asset.ready',
      data: {
        id: asset_id,
        playback_id: playback_id,
        duration: duration || '17.161133'
      }
    }

    // Call the webhook endpoint
    const webhookResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'}/api/webhooks/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    const result = await webhookResponse.json()
    
    return NextResponse.json({
      success: webhookResponse.ok,
      result,
      webhookStatus: webhookResponse.status
    })

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
