import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    // The actual Cloudflare video UID that exists
    const cloudflareUid = 'c24b8db510124a21b12731304c1b2966'
    
    console.log(`🔧 Fixing video mismatch for Cloudflare UID: ${cloudflareUid}`)
    
    // Check if video already exists in database
    const { data: existingVideo } = await supabaseAdmin
      .from('videos')
      .select('id, title, asset_id')
      .eq('asset_id', cloudflareUid)
      .single()
    
    if (existingVideo) {
      console.log(`✅ Video already exists in database: ${existingVideo.id}`)
      return NextResponse.json({ 
        message: 'Video already exists', 
        video: existingVideo 
      })
    }
    
    // Get default channel
    const { data: channel } = await supabaseAdmin
      .from('channels')
      .select('id')
      .eq('slug', 'default-channel')
      .single()
    
    if (!channel) {
      return NextResponse.json(
        { error: 'Default channel not found' },
        { status: 404 }
      )
    }
    
    // Create video record with correct asset_id
    const { data: video, error } = await supabaseAdmin
      .from('videos')
      .insert({
        channel_id: channel.id,
        title: 'Test Video (Fixed)',
        description: 'Video created to fix asset_id mismatch',
        status: 'ready',
        asset_id: cloudflareUid,
        playback_id: cloudflareUid,
        upload_id: cloudflareUid,
        duration_s: 69,
        aspect_ratio: '16/9'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Failed to create video record:', error)
      return NextResponse.json(
        { error: 'Failed to create video record' },
        { status: 500 }
      )
    }
    
    console.log(`✅ Created video record: ${video.id} with correct asset_id: ${cloudflareUid}`)
    
    return NextResponse.json({
      message: 'Video record created successfully',
      video: {
        id: video.id,
        title: video.title,
        asset_id: video.asset_id,
        status: video.status
      }
    })
    
  } catch (error) {
    console.error('Fix video mismatch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
