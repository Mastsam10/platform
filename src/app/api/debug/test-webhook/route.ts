import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // Simulate the Cloudflare webhook payload for the existing video
    const webhookPayload = {
      uid: "c24b8db510124a21b12731304c1b2966",
      readyToStream: true,
      status: {
        state: "ready"
      },
      meta: {},
      created: "2025-08-15T15:14:30.681071Z",
      modified: "2025-08-15T15:14:52.418373Z"
    }
    
    console.log('🧪 Testing webhook with payload:', JSON.stringify(webhookPayload, null, 2))
    
    // Call the webhook endpoint directly
    const response = await fetch('https://platform-gamma-flax.vercel.app/api/webhooks/video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload)
    })
    
    const result = await response.text()
    console.log('Webhook response status:', response.status)
    console.log('Webhook response:', result)
    
    return NextResponse.json({
      message: 'Webhook test completed',
      status: response.status,
      response: result
    })
    
  } catch (error) {
    console.error('Webhook test error:', error)
    return NextResponse.json(
      { error: 'Webhook test failed', details: error },
      { status: 500 }
    )
  }
}
