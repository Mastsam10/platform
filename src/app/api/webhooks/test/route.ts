import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    console.log('Test webhook received:', body)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook working',
      received: body 
    })
    
  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json(
      { error: 'Test webhook failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Test webhook endpoint is accessible' 
  })
}
