import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { uid } = body

    if (!uid) {
      return NextResponse.json({ error: 'Missing uid parameter' }, { status: 400 })
    }

    console.log(`Testing Cloudflare Stream webhook for UID: ${uid}`)

    // Find video by asset_id
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, asset_id')
      .eq('asset_id', uid)
      .single()

    if (videoError || !video) {
      console.error('Video not found for UID:', uid)
      return NextResponse.json({ error: 'Video not found' }, { status: 404 })
    }

    console.log(`Found video: ${video.id} (${video.title}) - Status: ${video.status}`)

    // Simulate the webhook payload that Cloudflare Stream would send
    const webhookPayload = {
      uid: uid,
      status: {
        state: 'ready'
      },
      duration: '69.0', // Example duration
      input: {
        width: 1920,
        height: 1080
      },
      meta: {
        name: video.title
      }
    }

    // Call our webhook endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'
    const webhookResponse = await fetch(`${baseUrl}/api/webhooks/video`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    })

    if (webhookResponse.ok) {
      const result = await webhookResponse.json()
      console.log('Webhook processed successfully:', result)
      
      // Check updated video status
      const { data: updatedVideo } = await supabaseAdmin
        .from('videos')
        .select('id, title, status, playback_id, duration_s')
        .eq('id', video.id)
        .single()

      return NextResponse.json({
        success: true,
        message: 'Webhook processed successfully',
        video: updatedVideo
      })
    } else {
      const error = await webhookResponse.text()
      console.error('Webhook failed:', error)
      return NextResponse.json({ error: 'Webhook processing failed', details: error }, { status: 500 })
    }

  } catch (error) {
    console.error('Test webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
