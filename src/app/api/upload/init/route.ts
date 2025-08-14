import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Video } from '@/lib/mux'

export async function POST(request: NextRequest) {
  try {
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
      const { data: existingChannel } = await supabase
        .from('channels')
        .select('id')
        .eq('slug', 'default-channel')
        .single()

      if (existingChannel) {
        actualChannelId = existingChannel.id
      } else {
        // Create default channel
        const { data: newChannel, error: channelError } = await supabase
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

    // Initialize Mux upload first to get asset_id
    console.log('Initializing Mux upload...')
    
    // Check if Mux credentials are configured
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      console.error('Mux credentials not configured')
      return NextResponse.json(
        { error: 'Video upload service not configured. Please contact administrator.' },
        { status: 503 }
      )
    }
    
    const upload = await Video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public']
      },
      cors_origin: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    })

    // Create video record in database with asset_id already set
    console.log(`Creating video record with asset_id: ${upload.asset_id}`)
    const { data: video, error } = await supabase
      .from('videos')
      .insert({
        channel_id: actualChannelId,
        title,
        description,
        status: 'draft',
        asset_id: upload.asset_id
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

    console.log(`Video record created: ${video.id} with asset_id: ${upload.asset_id}`)

    return NextResponse.json({
      uploadUrl: upload.url,
      videoId: video.id,
      assetId: upload.asset_id
    })

  } catch (error) {
    console.error('Upload init error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
