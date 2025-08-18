export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔐 Testing Cloudflare API authentication...')

    // Test 1: List videos to see what's actually in Cloudflare
    const listResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!listResponse.ok) {
      const errorData = await listResponse.json()
      console.error('❌ Failed to list videos from Cloudflare:', errorData)
      return NextResponse.json({ 
        error: 'Failed to list videos from Cloudflare',
        status: listResponse.status,
        details: errorData
      }, { status: 500 })
    }

    const listData = await listResponse.json()
    console.log(`📊 Found ${listData.result?.length || 0} videos in Cloudflare`)

    // Test 2: Check account details
    const accountResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    let accountData = null
    if (accountResponse.ok) {
      accountData = await accountResponse.json()
    }

    return NextResponse.json({ 
      success: true,
      message: 'Cloudflare API authentication test completed',
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
      hasApiToken: !!process.env.CLOUDFLARE_API_TOKEN,
      cloudflareVideos: listData.result || [],
      videoCount: listData.result?.length || 0,
      accountDetails: accountData?.result || null,
      listResponse: {
        success: listData.success,
        errors: listData.errors,
        messages: listData.messages
      }
    })

  } catch (error) {
    console.error('❌ Cloudflare auth test error:', error)
    return NextResponse.json({
      error: 'Cloudflare authentication test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}


