import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing simple signing functionality...')

    // Check environment variables
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const signingKey = process.env.CLOUDFLARE_STREAM_SIGNING_KEY
    const signingKeyId = process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID

    if (!accountId || !signingKey || !signingKeyId) {
      return NextResponse.json({
        error: 'Missing environment variables',
        missing: {
          accountId: !accountId,
          signingKey: !signingKey,
          signingKeyId: !signingKeyId
        }
      }, { status: 500 })
    }

    // Test basic JWT creation
    const testUid = 'dd5d531a12de0c724bd1275a3b2bc9c6'
    const exp = Math.floor(Date.now() / 1000) + 300 // 5 minutes
    const path = `/${testUid}/downloads/default.mp4`
    
    const header = {
      alg: 'RS256',
      kid: signingKeyId
    }
    
    const payload = {
      sub: path,
      exp: exp,
      nbf: Math.floor(Date.now() / 1000) - 60,
      iss: accountId
    }

    console.log('Header:', header)
    console.log('Payload:', payload)

    // Test base64 encoding
    const encodedHeader = Buffer.from(JSON.stringify(header))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    
    const encodedPayload = Buffer.from(JSON.stringify(payload))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')

    console.log('Encoded header length:', encodedHeader.length)
    console.log('Encoded payload length:', encodedPayload.length)

    return NextResponse.json({
      success: true,
      message: 'Simple signing test completed',
      test_uid: testUid,
      encoded_parts: {
        header_length: encodedHeader.length,
        payload_length: encodedPayload.length,
        header_preview: encodedHeader.substring(0, 20) + '...',
        payload_preview: encodedPayload.substring(0, 20) + '...'
      },
      environment_check: {
        account_id_length: accountId.length,
        signing_key_length: signingKey.length,
        signing_key_id_length: signingKeyId.length
      }
    })

  } catch (error) {
    console.error('Simple signing test error:', error)
    return NextResponse.json({
      error: 'Simple signing test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
