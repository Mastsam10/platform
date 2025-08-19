export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyCloudflareWebhookSignature } from '@/lib/webhookVerification'

function dbFingerprint() {
  return {
    url: process.env.SUPABASE_URL,
    project_ref: process.env.SUPABASE_URL?.split('https://')[1]?.split('.')[0],
    using_service_key: !!process.env.SUPABASE_SERVICE_KEY,
  }
}

// Function to request Cloudflare caption generation
async function requestCloudflareCaptionGeneration(playbackId: string, lang = 'en') {
  const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${playbackId}/captions/${lang}/generate`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    }
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`CF captions generate failed: ${res.status} ${body}`)
  }

  return res.json()
}

export async function POST(request: NextRequest) {
  try {
    console.log('[DB FINGERPRINT]', dbFingerprint())
    
    // Get the raw body for signature verification
    const body = await request.text()
    
    // Enhanced logging as recommended
    console.log('[CF WEBHOOK] hit', {
      ts: new Date().toISOString(),
      url: request.url,
      len: body.length,
      h: Object.fromEntries(request.headers),
    });
    
    const timestamp = new Date().toISOString()
    console.log('=== CLOUDFLARE STREAM WEBHOOK ENDPOINT ACCESSED ===')
    console.log('Timestamp:', timestamp)
    
    // Verify webhook signature
    const signature = request.headers.get('webhook-signature')
    if (signature && process.env.CLOUDFLARE_WEBHOOK_SECRET) {
      const isValid = verifyCloudflareWebhookSignature(
        signature,
        body,
        process.env.CLOUDFLARE_WEBHOOK_SECRET
      )
      
      if (!isValid) {
        console.error('❌ Invalid webhook signature')
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
      
      console.log('✅ Webhook signature verified successfully')
    } else {
      console.warn('⚠️ No webhook signature or secret provided - skipping verification')
    }
    
    // Parse the body as JSON
    const payload = JSON.parse(body)
    console.log('[CF WEBHOOK] body', payload)
    console.log('Webhook payload:', JSON.stringify(payload, null, 2))

    // Cloudflare Stream webhook structure based on official documentation
    const { uid, readyToStream, status, meta, created, modified } = payload
    
    if (!uid) {
      console.error('Invalid webhook payload - missing uid:', body)
      return NextResponse.json(
        { error: 'Invalid webhook payload - missing uid' },
        { status: 400 }
      )
    }

    console.log(`Cloudflare Stream webhook for video UID: ${uid}`)
    console.log(`Ready to stream: ${readyToStream}, Status: ${status?.state}`)

    // TEMP: loosen gating to see flow (as recommended)
    const isReady = payload.type?.includes('ready') || status?.state === 'ready' || readyToStream === true;
    
    if (isReady && uid) {
      console.log('🎉 CLOUDFLARE STREAM VIDEO READY! (loosened gate)')
      
      // Find video by playback_id (which is the Cloudflare UID)
      console.log(`🔍 Attempting to find video by playback_id: ${uid}`)
      
      // First, let's see all videos in the database for debugging
      const { data: allVideos } = await supabaseAdmin
        .from('videos')
        .select('id, title, playback_id, status')
      
      console.log('📋 All videos in database:')
      allVideos?.forEach(v => {
        console.log(`  - ${v.id}: "${v.title}" (playback_id: ${v.playback_id}, status: ${v.status})`)
      })
      
      const { data: video, error: videoError } = await supabaseAdmin
        .from('videos')
        .select('id, title, playback_id, status')
        .eq('playback_id', uid)
        .single()

      if (videoError || !video) {
        console.error('❌ Video not found for playback_id:', uid)
        return NextResponse.json(
          { error: 'Video not found' },
          { status: 404 }
        )
      }

      console.log(`✅ Found video: ${video.id} - "${video.title}"`)

      // Update video with playback_id and status
      const { error: updateError } = await supabaseAdmin
        .from('videos')
        .update({
          playback_id: uid,
          status: 'ready',
          updated_at: new Date().toISOString()
        })
        .eq('id', video.id as string)

      if (updateError) {
        console.error('❌ Failed to update video status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update video status' },
          { status: 500 }
        )
      }

      console.log(`✅ Video ${video.id} marked as ready with playback_id: ${uid}`)

      // Create transcript record and request caption generation
      try {
        // Create (or upsert) transcript row
        await supabaseAdmin.from('transcripts').upsert({
          video_id: video.id,
          lang: 'en',
          status: 'pending'
        }, { onConflict: 'video_id,lang' } as any)

        console.log(`📝 Created transcript record for video ${video.id}`)

        // Request Cloudflare to generate captions
        const captionResponse = await requestCloudflareCaptionGeneration(uid, 'en')
        console.log('✅ Cloudflare caption generation requested:', captionResponse)

      } catch (captionError) {
        console.error('❌ Failed to request caption generation:', captionError)
        
        // Update transcript status to error
        await supabaseAdmin.from('transcripts')
          .update({ 
            status: 'error',
            updated_at: new Date().toISOString()
          })
          .eq('video_id', video.id as string)
          .eq('lang', 'en')

        // Don't fail the whole webhook - just log the error
        console.warn('⚠️ Caption generation failed, but video is still ready')
      }

      return NextResponse.json({ 
        success: true,
        video_id: video.id,
        playback_id: uid,
        status: 'ready'
      })

    } else {
      console.log('⏳ Video not ready yet, ignoring webhook')
      return NextResponse.json({ success: true, status: 'not_ready' })
    }

  } catch (error) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
