export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cloudflareStream } from '@/lib/cloudflare'

function dbFingerprint() {
  return {
    url: process.env.SUPABASE_URL,
    project_ref: process.env.SUPABASE_URL?.split('https://')[1]?.split('.')[0],
    using_service_key: !!process.env.SUPABASE_SERVICE_KEY,
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[DB FINGERPRINT]', dbFingerprint())
    
    const body = await request.json()
    const { channelId, title, description, denomination, addressId, tags, serviceDate } = body

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      )
    }

    let actualChannelId = channelId

    // If no channelId provided, create a default channel for testing
    if (!channelId || channelId === 'temp-channel-id') {
      // Check if default channel exists
      const { data: existingChannel } = await supabaseAdmin
        .from('channels')
        .select('id')
        .eq('slug', 'default-channel')
        .single()

      if (existingChannel) {
        actualChannelId = existingChannel.id
      } else {
        // Create default channel
        const { data: newChannel, error: channelError } = await supabaseAdmin
          .from('channels')
          .insert({
            type: 'creator',
            name: 'Default Channel',
            slug: 'default-channel',
            denomination: 'Christian'
          })
          .select()
          .single()

        if (channelError) {
          console.error('Channel creation error:', channelError)
          return NextResponse.json(
            { error: 'Failed to create default channel' },
            { status: 500 }
          )
        }

        actualChannelId = newChannel.id
      }
    }

    // Initialize Cloudflare Stream upload
    console.log('Initializing Cloudflare Stream upload...')
    
    // Check if Cloudflare credentials are configured
    if (!process.env.CLOUDFLARE_API_TOKEN || !process.env.CLOUDFLARE_ACCOUNT_ID) {
      console.error('Cloudflare credentials not configured')
      return NextResponse.json(
        { error: 'Video upload service not configured. Please contact administrator.' },
        { status: 503 }
      )
    }
    
    const upload = await cloudflareStream.createUpload(title)

    console.log('Cloudflare upload response:', JSON.stringify(upload, null, 2))
    console.log(`Upload URL: ${upload.result.uploadURL}`)
    console.log(`Video UID: ${upload.result.uid}`)

    // Create video record in database
    console.log(`Creating video record with uid: ${upload.result.uid}`)
    const { data: video, error } = await supabaseAdmin
      .from('videos')
      .insert({
        channel_id: actualChannelId,
        title,
        description,
        status: 'draft',
        playback_id: upload.result.uid // Use Cloudflare UID as playback_id
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }

    console.log(`Video record created: ${video.id} with uid: ${upload.result.uid}`)

    return NextResponse.json({
      uploadUrl: upload.result.uploadURL,
      videoId: video.id,
      assetId: upload.result.uid
    })

  } catch (error) {
    console.error('Upload init error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
