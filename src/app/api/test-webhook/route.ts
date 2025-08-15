import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEST WEBHOOK ENDPOINT ACCESSED ===')
    
    const body = await request.json()
    console.log('Test webhook payload:', JSON.stringify(body, null, 2))
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook received successfully',
      timestamp: new Date().toISOString(),
      received: body
    })
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Test webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  })
}
