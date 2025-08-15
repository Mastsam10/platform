import { NextRequest, NextResponse } from 'next/server'
import { cloudflareStreamSigning } from '@/lib/cloudflareSigning'

export async function GET(request: NextRequest) {
  try {
    console.log('Testing Cloudflare Stream signed URL generation...')

    // Check if signing keys are configured
    if (!process.env.CLOUDFLARE_STREAM_SIGNING_KEY || !process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID) {
      return NextResponse.json({
        error: 'Cloudflare Stream signing keys not configured',
        missing: {
          signing_key: !process.env.CLOUDFLARE_STREAM_SIGNING_KEY,
          signing_key_id: !process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID
        },
        environment_variables: {
          CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ? 'Set' : 'Missing',
          CLOUDFLARE_STREAM_SIGNING_KEY: process.env.CLOUDFLARE_STREAM_SIGNING_KEY ? 'Set' : 'Missing',
          CLOUDFLARE_STREAM_SIGNING_KEY_ID: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID ? 'Set' : 'Missing'
        },
        instructions: [
          '1. Add CLOUDFLARE_STREAM_SIGNING_KEY to your environment variables',
          '2. Add CLOUDFLARE_STREAM_SIGNING_KEY_ID to your environment variables',
          '3. Redeploy to Vercel if testing on production'
        ]
      }, { status: 500 })
    }

    // Test with a sample UID (we'll use a real one later)
    const testUid = 'dd5d531a12de0c724bd1275a3b2bc9c6' // Example UID from Cloudflare docs
    
    console.log('Testing with sample UID:', testUid)

    try {
      // Generate signed download URL
      console.log('Generating signed download URL...')
      const signedDownloadUrl = cloudflareStreamSigning.generateSignedDownloadUrl(
        testUid,
        300 // 5 minutes TTL
      )
      console.log('Download URL generated successfully')

      // Generate signed playback URL
      console.log('Generating signed playback URL...')
      const signedPlaybackUrl = cloudflareStreamSigning.generateSignedPlaybackUrl(
        testUid,
        300 // 5 minutes TTL
      )
      console.log('Playback URL generated successfully')

      console.log('Generated signed download URL:', signedDownloadUrl)
      console.log('Generated signed playback URL:', signedPlaybackUrl)

      return NextResponse.json({
        success: true,
        message: 'Signed URL generation test completed',
        test_uid: testUid,
        signed_urls: {
          download: {
            url: signedDownloadUrl,
            note: 'This URL should be accessible for Deepgram transcription'
          },
          playback: {
            url: signedPlaybackUrl,
            note: 'This URL should be accessible for video playback'
          }
        },
        environment_check: {
          signing_key_configured: !!process.env.CLOUDFLARE_STREAM_SIGNING_KEY,
          signing_key_id_configured: !!process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID,
          account_id_configured: !!process.env.CLOUDFLARE_ACCOUNT_ID
        },
        next_steps: [
          '1. If URLs are generated successfully, we can test with real video UIDs',
          '2. Test URL accessibility with HEAD requests',
          '3. Update webhook handler to create transcription jobs',
          '4. Create job processing system'
        ]
      })

    } catch (signingError) {
      console.error('Signing error:', signingError)
      return NextResponse.json({
        error: 'Signing failed',
        details: signingError instanceof Error ? signingError.message : 'Unknown signing error',
        stack: signingError instanceof Error ? signingError.stack : undefined,
        environment_check: {
          signing_key_configured: !!process.env.CLOUDFLARE_STREAM_SIGNING_KEY,
          signing_key_id_configured: !!process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID,
          account_id_configured: !!process.env.CLOUDFLARE_ACCOUNT_ID,
          signing_key_length: process.env.CLOUDFLARE_STREAM_SIGNING_KEY?.length || 0,
          signing_key_id_length: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID?.length || 0
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Signed URL test error:', error)
    return NextResponse.json({
      error: 'Signed URL test failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
