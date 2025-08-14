import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const token = process.env.CLOUDFLARE_API_TOKEN
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    
    // Show first 10 characters and last 4 characters for security
    const maskedToken = token ? `${token.substring(0, 10)}...${token.substring(token.length - 4)}` : 'NOT_SET'
    
    return NextResponse.json({
      success: true,
      tokenLength: token ? token.length : 0,
      maskedToken,
      accountId: accountId ? `${accountId.substring(0, 8)}...` : 'NOT_SET',
      hasToken: !!token,
      hasAccountId: !!accountId
    })
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
