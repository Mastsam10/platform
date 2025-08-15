import { NextRequest, NextResponse } from 'next/server'
import { generateSignedDownloadUrl, generateSignedPlaybackUrl, verifySignedUrl } from '@/lib/cloudflareSigning'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json(
        { error: 'Missing uid parameter' },
        { status: 400 }
      )
    }

    // Check if signing keys are configured
    if (!process.env.CLOUDFLARE_STREAM_SIGNING_KEY || !process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID) {
      return NextResponse.json({
        error: 'Cloudflare Stream signing keys not configured',
        missing: {
          signingKey: !process.env.CLOUDFLARE_STREAM_SIGNING_KEY,
          signingKeyId: !process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID,
          accountId: !process.env.CLOUDFLARE_ACCOUNT_ID
        },
        instructions: [
          '1. Go to Cloudflare Dashboard > Stream > Settings > Signing Keys',
          '2. Create a new signing key',
          '3. Add to .env.local:',
          '   CLOUDFLARE_STREAM_SIGNING_KEY=your_private_key',
          '   CLOUDFLARE_STREAM_SIGNING_KEY_ID=your_key_id'
        ]
      }, { status: 500 })
    }

    // Generate signed URLs
    const downloadUrl = generateSignedDownloadUrl(uid, 300) // 5 minutes
    const playbackUrl = generateSignedPlaybackUrl(uid, 3600) // 1 hour

    // Test URL verification
    const downloadUrlValid = verifySignedUrl(downloadUrl)
    const playbackUrlValid = verifySignedUrl(playbackUrl)

    // Test URL accessibility (HEAD request)
    let downloadUrlAccessible = false
    let playbackUrlAccessible = false

    try {
      const downloadResponse = await fetch(downloadUrl, { method: 'HEAD' })
      downloadUrlAccessible = downloadResponse.ok
    } catch (error) {
      console.error('Download URL test failed:', error)
    }

    try {
      const playbackResponse = await fetch(playbackUrl, { method: 'HEAD' })
      playbackUrlAccessible = playbackResponse.ok
    } catch (error) {
      console.error('Playback URL test failed:', error)
    }

    return NextResponse.json({
      success: true,
      uid,
      urls: {
        download: {
          url: downloadUrl,
          valid: downloadUrlValid,
          accessible: downloadUrlAccessible,
          ttl: '5 minutes'
        },
        playback: {
          url: playbackUrl,
          valid: playbackUrlValid,
          accessible: playbackUrlAccessible,
          ttl: '1 hour'
        }
      },
      configuration: {
        accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
        signingKeyConfigured: !!process.env.CLOUDFLARE_STREAM_SIGNING_KEY,
        signingKeyIdConfigured: !!process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID
      }
    })

  } catch (error) {
    console.error('Signed URL test error:', error)
    return NextResponse.json(
      { error: 'Failed to generate signed URLs' },
      { status: 500 }
    )
  }
}
