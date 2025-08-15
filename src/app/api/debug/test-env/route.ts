import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      success: true,
      environment_variables: {
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? 'Set' : 'Missing',
        CLOUDFLARE_STREAM_SIGNING_KEY: process.env.CLOUDFLARE_STREAM_SIGNING_KEY ? 'Set' : 'Missing',
        CLOUDFLARE_STREAM_SIGNING_KEY_ID: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID ? 'Set' : 'Missing',
        NODE_ENV: process.env.NODE_ENV || 'Not set'
      },
      signing_key_length: process.env.CLOUDFLARE_STREAM_SIGNING_KEY ? process.env.CLOUDFLARE_STREAM_SIGNING_KEY.length : 0,
      signing_key_id_length: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID ? process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID.length : 0
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Environment test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
