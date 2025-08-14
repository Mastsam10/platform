import { NextRequest, NextResponse } from 'next/server'
import { cloudflareStream } from '@/lib/cloudflare'

export async function GET(request: NextRequest) {
  try {
    // Test Cloudflare configuration
    const hasAccountId = !!process.env.CLOUDFLARE_ACCOUNT_ID
    const hasApiToken = !!process.env.CLOUDFLARE_API_TOKEN
    
    console.log('Cloudflare configuration check:')
    console.log('- Account ID:', hasAccountId ? 'Set' : 'Missing')
    console.log('- API Token:', hasApiToken ? 'Set' : 'Missing')
    
    if (!hasAccountId || !hasApiToken) {
      return NextResponse.json({
        success: false,
        error: 'Cloudflare credentials not configured',
        hasAccountId,
        hasApiToken
      })
    }
    
    // Test Cloudflare API connection
    console.log('Testing Cloudflare API connection...')
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        maxDurationSeconds: 60, // Short test video
        meta: {
          name: 'Test Video'
        }
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json({
        success: true,
        message: 'Cloudflare API connection successful',
        uploadUrl: data.result.uploadURL,
        uid: data.result.uid,
        hasAccountId,
        hasApiToken
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json({
        success: false,
        error: 'Cloudflare API request failed',
        status: response.status,
        errorText,
        hasAccountId,
        hasApiToken
      })
    }
    
  } catch (error) {
    console.error('Cloudflare test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      hasAccountId: !!process.env.CLOUDFLARE_ACCOUNT_ID,
      hasApiToken: !!process.env.CLOUDFLARE_API_TOKEN
    })
  }
}
