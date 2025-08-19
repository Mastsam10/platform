import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    // The video "6" that was just uploaded - UID from the logs
    const cloudflareUid = '17eb5b5f65d9471baaddcb95fdf49fbf'
    
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
        title: '6',
        description: 'Video uploaded via website',
        status: 'ready',
        asset_id: cloudflareUid,
        playback_id: cloudflareUid,
        upload_id: cloudflareUid,
        duration_s: 0, // Will be updated by webhook
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
    
    // Immediately verify it exists
    const { data: verifyVideo } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, asset_id')
      .eq('id', video.id as string)
      .single()
    
    console.log(`🔍 Verification - Video exists: ${verifyVideo ? 'YES' : 'NO'}`)
    
    return NextResponse.json({
      message: 'Video record created successfully',
      video: {
        id: video.id,
        title: video.title,
        asset_id: video.asset_id,
        status: video.status
      },
      verification: verifyVideo ? 'Video found in database' : 'Video NOT found in database'
    })
    
  } catch (error) {
    console.error('Create video record error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}