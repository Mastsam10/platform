import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface CreateChannelRequest {
  slug: string
  display_name: string
  type: 'individual' | 'church' | 'organization'
  about?: string
  denomination?: string
  address?: string
  city?: string
  state?: string
  country?: string
  postal_code?: string
  timezone?: string
  avatar_url?: string
  banner_url?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateChannelRequest = await request.json()
    
    // Validate required fields
    if (!body.slug || !body.display_name || !body.type) {
      return NextResponse.json(
        { error: 'Missing required fields: slug, display_name, type' },
        { status: 400 }
      )
    }

    // Validate slug format (alphanumeric, hyphens, underscores only)
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must contain only lowercase letters, numbers, and hyphens' },
        { status: 400 }
      )
    }

    // Check if slug is already taken
    const { data: existingChannel } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('slug', body.slug)
      .single()

    if (existingChannel) {
      return NextResponse.json(
        { error: 'Channel slug already exists' },
        { status: 409 }
      )
    }

    // For now, we'll use a default user ID since we don't have auth yet
    // TODO: Replace with actual user ID from auth context
    const defaultUserId = '11111111-1111-1111-1111-111111111111' // Use existing user

    // Prepare channel data - use minimal fields that we know work
    const channelData = {
      slug: body.slug,
      display_name: body.display_name,
      type: body.type,
      owner_id: defaultUserId
    }

    // Create the channel
    const { data: channel, error } = await supabaseAdmin
      .from('channels')
      .insert(channelData)
      .select()
      .single()

    if (error) {
      console.error('Error creating channel:', error)
      return NextResponse.json(
        { error: 'Failed to create channel', details: error.message },
        { status: 500 }
      )
    }

    // Create channel membership for the owner
    const { error: membershipError } = await supabaseAdmin
      .from('channel_members')
      .insert({
        channel_id: channel.id,
        profile_id: defaultUserId,
        role: 'owner'
      })

    if (membershipError) {
      console.error('Error creating channel membership:', membershipError)
      // Don't fail the request, but log the error
    }

    return NextResponse.json({
      success: true,
      channel
    })

  } catch (error) {
    console.error('Error in channels POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('slug')
    
    let query = supabaseAdmin
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
    
    // If slug is provided, filter by it
    if (slug) {
      query = query.eq('slug', slug)
    } else {
      query = query.order('created_at', { ascending: false })
    }
    
    const { data: channels, error } = await query

    if (error) {
      console.error('Error fetching channels:', error)
      return NextResponse.json(
        { error: 'Failed to fetch channels' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      channels: channels || []
    })

  } catch (error) {
    console.error('Error in channels GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

