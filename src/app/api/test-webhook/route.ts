import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Test webhook endpoint accessible',
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries())
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return NextResponse.json({ 
    message: 'Test webhook POST endpoint accessible',
    timestamp: new Date().toISOString(),
    receivedBody: body,
    headers: Object.fromEntries(request.headers.entries())
  })
}
