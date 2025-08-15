import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET() {
  try {
    console.log('🧪 Testing database read/write operations...')
    
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
    
    // Create a test video record
    const testVideoData = {
      channel_id: channel.id,
      title: 'Test DB Video',
      description: 'Testing database operations',
      status: 'ready',
      asset_id: 'test-asset-id-' + Date.now(),
      playback_id: 'test-playback-id-' + Date.now(),
      upload_id: 'test-upload-id-' + Date.now(),
      duration_s: 60,
      aspect_ratio: '16/9'
    }
    
    console.log('Creating test video record...')
    const { data: createdVideo, error: createError } = await supabaseAdmin
      .from('videos')
      .insert(testVideoData)
      .select()
      .single()
    
    if (createError) {
      console.error('Failed to create test video:', createError)
      return NextResponse.json(
        { error: 'Failed to create test video', details: createError },
        { status: 500 }
      )
    }
    
    console.log(`✅ Created test video: ${createdVideo.id}`)
    
    // Immediately read it back
    console.log('Reading test video back...')
    const { data: readVideo, error: readError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('id', createdVideo.id)
      .single()
    
    if (readError) {
      console.error('Failed to read test video:', readError)
      return NextResponse.json(
        { error: 'Failed to read test video', details: readError },
        { status: 500 }
      )
    }
    
    console.log(`✅ Read test video back: ${readVideo.id}`)
    
    // Get all videos to see if it appears in the list
    console.log('Getting all videos...')
    const { data: allVideos, error: listError } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, asset_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (listError) {
      console.error('Failed to list videos:', listError)
      return NextResponse.json(
        { error: 'Failed to list videos', details: listError },
        { status: 500 }
      )
    }
    
    console.log(`✅ Found ${allVideos?.length || 0} videos in list`)
    
    // Clean up - delete the test video
    console.log('Cleaning up test video...')
    await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', createdVideo.id)
    
    console.log('✅ Test video deleted')
    
    return NextResponse.json({
      message: 'Database test completed successfully',
      createdVideo: {
        id: createdVideo.id,
        title: createdVideo.title,
        status: createdVideo.status
      },
      readVideo: {
        id: readVideo.id,
        title: readVideo.title,
        status: readVideo.status
      },
      allVideos: allVideos?.map(v => ({
        id: v.id,
        title: v.title,
        status: v.status,
        asset_id: v.asset_id
      }))
    })
    
  } catch (error) {
    console.error('Database test error:', error)
    return NextResponse.json(
      { error: 'Database test failed', details: error },
      { status: 500 }
    )
  }
}
