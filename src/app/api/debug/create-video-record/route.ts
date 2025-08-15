import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    // The new Cloudflare video UID that was just uploaded
    const cloudflareUid = '05832a90a87c47378173c71176475163'
    
    console.log(`🔧 Creating video record for Cloudflare UID: ${cloudflareUid}`)
    
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
        title: 'test',
        description: 'New test video uploaded',
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
        { error: 'Failed to create video record', details: error },
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
    console.error('Create video record error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
