import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Allow webhook endpoints to bypass authentication
  if (request.nextUrl.pathname.startsWith('/api/webhooks/') || 
      request.nextUrl.pathname === '/api/test-webhook') {
    return NextResponse.next()
  }

  // For all other API routes, continue with normal processing
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/:path*'
  ]
}
