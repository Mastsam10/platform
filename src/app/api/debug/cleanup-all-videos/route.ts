export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cloudflareStream } from '@/lib/cloudflare'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting comprehensive video cleanup...')

    // Step 1: Get all videos from Supabase
    const { data: videos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('id, title, playback_id')

    if (fetchError) {
      console.error('❌ Failed to fetch videos:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch videos',
        details: fetchError.message 
      }, { status: 500 })
    }

    console.log(`📊 Found ${videos?.length || 0} videos to delete`)

    if (!videos || videos.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No videos found to delete',
        deletedCount: 0
      })
    }

    // Step 2: Delete videos from Cloudflare Stream
    const cloudflareResults = []
    for (const video of videos) {
      if (video.playback_id) {
        try {
          console.log(`🗑️ Deleting video from Cloudflare: ${video.title} (${video.playback_id})`)
          
          // Use Cloudflare API to delete the video
          const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${video.playback_id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            cloudflareResults.push({ 
              id: video.id, 
              playback_id: video.playback_id, 
              title: video.title, 
              cloudflare: 'deleted' 
            })
            console.log(`✅ Deleted from Cloudflare: ${video.title}`)
          } else {
            const errorData = await response.json()
            cloudflareResults.push({ 
              id: video.id, 
              playback_id: video.playback_id, 
              title: video.title, 
              cloudflare: 'failed',
              error: errorData.errors?.[0]?.message || 'Unknown error'
            })
            console.log(`❌ Failed to delete from Cloudflare: ${video.title}`)
          }
        } catch (error) {
          cloudflareResults.push({ 
            id: video.id, 
            playback_id: video.playback_id, 
            title: video.title, 
            cloudflare: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          console.log(`❌ Error deleting from Cloudflare: ${video.title}`)
        }
      } else {
        cloudflareResults.push({ 
          id: video.id, 
          playback_id: null, 
          title: video.title, 
          cloudflare: 'no_playback_id' 
        })
      }
    }

    // Step 3: Delete all videos from Supabase (this will cascade delete transcripts and video_tags)
    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all videos

    if (deleteError) {
      console.error('❌ Failed to delete videos from Supabase:', deleteError)
      return NextResponse.json({ 
        error: 'Failed to delete videos from database',
        details: deleteError.message,
        cloudflareResults
      }, { status: 500 })
    }

    console.log(`✅ Successfully deleted ${videos.length} videos from database`)

    // Step 4: Verify deletion
    const { data: remainingVideos, error: verifyError } = await supabaseAdmin
      .from('videos')
      .select('id')
      .limit(1)

    if (verifyError) {
      console.error('❌ Failed to verify deletion:', verifyError)
    } else {
      console.log(`📊 Remaining videos: ${remainingVideos?.length || 0}`)
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully deleted ${videos.length} videos`,
      deletedCount: videos.length,
      cloudflareResults,
      remainingVideos: remainingVideos?.length || 0
    })

  } catch (error) {
    console.error('❌ Cleanup error:', error)
    return NextResponse.json({
      error: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
