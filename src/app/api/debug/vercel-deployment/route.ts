import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      message: 'Vercel deployment test endpoint',
      timestamp: new Date().toISOString(),
      deployment_trigger: '2025-08-14 19:45',
      status: 'Deployment successful - new endpoint created'
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Deployment test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
