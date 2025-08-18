import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params
    
    if (!slug) {
      return NextResponse.json(
        { error: 'Channel slug is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Fetching channel: ${slug}`)

    // Get channel details
    const { data: channel, error: channelError } = await supabaseAdmin
      .from('channels')
      .select(`
        id,
        slug,
        display_name,
        type,
        about,
        denomination,
        city,
        state,
        avatar_url,
        banner_url,
        created_at
      `)
      .eq('slug', slug)
      .single()

    if (channelError || !channel) {
      console.error('❌ Channel not found:', channelError)
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      )
    }

    console.log(`✅ Found channel: ${channel.display_name}`)

    // Get videos for this channel
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        description,
        status,
        playback_id,
        duration_s,
        aspect_ratio,
        published_at,
        has_captions,
        created_at
      `)
      .eq('channel_id', channel.id)
      .eq('status', 'ready')
      .order('created_at', { ascending: false })

    if (videosError) {
      console.error('❌ Error fetching videos:', videosError)
      return NextResponse.json(
        { error: 'Failed to fetch channel videos' },
        { status: 500 }
      )
    }

    const videoCount = videos?.length || 0
    console.log(`✅ Found ${videoCount} videos for channel`)

    return NextResponse.json({
      channel,
      videos: videos || [],
      videoCount
    })

  } catch (error) {
    console.error('❌ Error fetching channel:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
