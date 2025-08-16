export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting comprehensive cleanup of all test data...')

    // 1. Delete all videos (this will cascade to related data)
    console.log('🗑️ Deleting all videos...')
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select('id, title, playback_id')
      .order('created_at', { ascending: false })

    if (videosError) {
      console.error('❌ Failed to fetch videos:', videosError)
      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to fetch videos' 
      }, { status: 500 })
    }

    if (videos && videos.length > 0) {
      console.log(`📋 Found ${videos.length} videos to delete:`)
      videos.forEach(video => {
        console.log(`  - ${video.id}: "${video.title}" (playback_id: ${video.playback_id})`)
      })

      const { error: deleteVideosError } = await supabaseAdmin
        .from('videos')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all videos

      if (deleteVideosError) {
        console.error('❌ Failed to delete videos:', deleteVideosError)
        return NextResponse.json({ 
          ok: false, 
          error: 'Failed to delete videos' 
        }, { status: 500 })
      }

      console.log(`✅ Deleted ${videos.length} videos`)
    } else {
      console.log('ℹ️ No videos found to delete')
    }

    // 2. Delete all transcripts (in case any remain)
    console.log('🗑️ Deleting all transcripts...')
    const { data: transcripts, error: transcriptsError } = await supabaseAdmin
      .from('transcripts')
      .select('id, video_id, status')

    if (transcriptsError) {
      console.error('❌ Failed to fetch transcripts:', transcriptsError)
    } else if (transcripts && transcripts.length > 0) {
      console.log(`📋 Found ${transcripts.length} transcripts to delete`)
      
      const { error: deleteTranscriptsError } = await supabaseAdmin
        .from('transcripts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (deleteTranscriptsError) {
        console.error('❌ Failed to delete transcripts:', deleteTranscriptsError)
      } else {
        console.log(`✅ Deleted ${transcripts.length} transcripts`)
      }
    }

    // 3. Delete all video tags (in case any remain)
    console.log('🗑️ Deleting all video tags...')
    const { data: videoTags, error: videoTagsError } = await supabaseAdmin
      .from('video_tags')
      .select('id, video_id, type, value')

    if (videoTagsError) {
      console.error('❌ Failed to fetch video tags:', videoTagsError)
    } else if (videoTags && videoTags.length > 0) {
      console.log(`📋 Found ${videoTags.length} video tags to delete`)
      
      const { error: deleteVideoTagsError } = await supabaseAdmin
        .from('video_tags')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (deleteVideoTagsError) {
        console.error('❌ Failed to delete video tags:', deleteVideoTagsError)
      } else {
        console.log(`✅ Deleted ${videoTags.length} video tags`)
      }
    }

    // 4. Delete test channels (keep only essential ones)
    console.log('🗑️ Deleting test channels...')
    const { data: channels, error: channelsError } = await supabaseAdmin
      .from('channels')
      .select('id, name, slug, type')

    if (channelsError) {
      console.error('❌ Failed to fetch channels:', channelsError)
    } else if (channels && channels.length > 0) {
      console.log(`📋 Found ${channels.length} channels:`)
      channels.forEach(channel => {
        console.log(`  - ${channel.id}: "${channel.name}" (${channel.type})`)
      })

      // Delete test channels (keep only essential ones)
      const { error: deleteChannelsError } = await supabaseAdmin
        .from('channels')
        .delete()
        .in('slug', ['default-channel', 'test-channel'])

      if (deleteChannelsError) {
        console.error('❌ Failed to delete test channels:', deleteChannelsError)
      } else {
        console.log('✅ Deleted test channels')
      }
    }

    // 5. Verify cleanup
    console.log('🔍 Verifying cleanup...')
    const { data: remainingVideos } = await supabaseAdmin
      .from('videos')
      .select('count')
      .limit(1)

    const { data: remainingTranscripts } = await supabaseAdmin
      .from('transcripts')
      .select('count')
      .limit(1)

    const { data: remainingVideoTags } = await supabaseAdmin
      .from('video_tags')
      .select('count')
      .limit(1)

    console.log('📊 Cleanup verification:')
    console.log(`  - Videos remaining: ${remainingVideos?.length || 0}`)
    console.log(`  - Transcripts remaining: ${remainingTranscripts?.length || 0}`)
    console.log(`  - Video tags remaining: ${remainingVideoTags?.length || 0}`)

    console.log('✅ Comprehensive cleanup completed successfully!')

    return NextResponse.json({
      ok: true,
      message: 'All test data cleaned up successfully',
      deleted: {
        videos: videos?.length || 0,
        transcripts: transcripts?.length || 0,
        videoTags: videoTags?.length || 0,
        testChannels: channels?.filter(c => ['default-channel', 'test-channel'].includes(c.slug)).length || 0
      }
    })

  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
