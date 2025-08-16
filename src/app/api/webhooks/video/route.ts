export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  console.log('[CF WEBHOOK] Simple test endpoint hit')
  return NextResponse.json({ success: true, message: 'Webhook endpoint is working' })
}
