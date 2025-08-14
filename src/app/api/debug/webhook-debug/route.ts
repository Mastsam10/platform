import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Webhook debug endpoint is working',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Webhook debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
