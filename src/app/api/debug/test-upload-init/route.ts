import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cloudflareStream } from '@/lib/cloudflare'

export async function GET() {
  try {
    console.log('🧪 Testing upload initialization process...')
    
    // Test title
    const title = 'Debug Upload Test'
    
    // Initialize Cloudflare Stream upload
    console.log('Creating Cloudflare upload...')
    const upload = await cloudflareStream.createUpload(title)
    
    console.log('Cloudflare upload response:', JSON.stringify(upload, null, 2))
    console.log(`Upload URL: ${upload.result.uploadURL}`)
    console.log(`Video UID: ${upload.result.uid}`)
    
    // Get default channel
    console.log('Getting default channel...')
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id')
      .eq('slug', 'default-channel')
      .single()
    
    if (channelError) {
      console.error('Channel error:', channelError)
      return NextResponse.json(
        { error: 'Failed to get default channel', details: channelError },
        { status: 500 }
      )
    }
    
    if (!channel) {
      return NextResponse.json(
        { error: 'Default channel not found' },
        { status: 404 }
      )
    }
    
    console.log(`Found channel: ${channel.id}`)
    
    // Create video record in database
    console.log(`Creating video record with uid: ${upload.result.uid}`)
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        channel_id: channel.id,
        title,
        description: 'Debug upload test',
        status: 'draft',
        asset_id: upload.result.uid,
        upload_id: upload.result.uid
      })
      .select()
      .single()
    
    if (videoError) {
      console.error('Video creation error:', videoError)
      return NextResponse.json(
        { error: 'Failed to create video record', details: videoError },
        { status: 500 }
      )
    }
    
    console.log(`✅ Video record created: ${video.id} with uid: ${upload.result.uid}`)
    
    return NextResponse.json({
      message: 'Upload initialization test completed successfully',
      upload: {
        uploadURL: upload.result.uploadURL,
        uid: upload.result.uid
      },
      video: {
        id: video.id,
        title: video.title,
        asset_id: video.asset_id,
        status: video.status
      }
    })
    
  } catch (error) {
    console.error('Upload init test error:', error)
    return NextResponse.json(
      { error: 'Upload init test failed', details: error },
      { status: 500 }
    )
  }
}
