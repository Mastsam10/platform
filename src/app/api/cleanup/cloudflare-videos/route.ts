export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Starting Cloudflare Stream video cleanup...')

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN

    if (!accountId || !apiToken) {
      console.error('❌ Missing Cloudflare credentials')
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing Cloudflare credentials' 
      }, { status: 500 })
    }

    // First, list all videos to see what we have
    console.log('📋 Fetching list of videos from Cloudflare Stream...')
    const listResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      console.error('❌ Failed to list videos:', listResponse.status, errorText)
      return NextResponse.json({ 
        ok: false, 
        error: `Failed to list videos: ${listResponse.status}` 
      }, { status: 500 })
    }

    const listData = await listResponse.json()
    const videos = listData.result || []

    console.log(`📊 Found ${videos.length} videos in Cloudflare Stream:`)
    videos.forEach((video: any) => {
      console.log(`  - ${video.uid}: "${video.meta?.name || 'Untitled'}" (created: ${video.created})`)
    })

    if (videos.length === 0) {
      console.log('ℹ️ No videos found to delete')
      return NextResponse.json({
        ok: true,
        message: 'No videos found in Cloudflare Stream',
        deleted: []
      })
    }

    // Delete each video
    const deletedVideos = []
    const failedDeletions = []

    for (const video of videos) {
      try {
        console.log(`🗑️ Deleting video: ${video.uid} - "${video.meta?.name || 'Untitled'}"`)
        
        const deleteResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${video.uid}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (deleteResponse.ok) {
          console.log(`✅ Successfully deleted video: ${video.uid}`)
          deletedVideos.push({
            uid: video.uid,
            name: video.meta?.name || 'Untitled',
            created: video.created
          })
        } else {
          const errorText = await deleteResponse.text()
          console.error(`❌ Failed to delete video ${video.uid}:`, deleteResponse.status, errorText)
          failedDeletions.push({
            uid: video.uid,
            name: video.meta?.name || 'Untitled',
            error: `${deleteResponse.status}: ${errorText}`
          })
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`❌ Error deleting video ${video.uid}:`, error)
        failedDeletions.push({
          uid: video.uid,
          name: video.meta?.name || 'Untitled',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log('📊 Cloudflare Stream cleanup summary:')
    console.log(`  - Successfully deleted: ${deletedVideos.length} videos`)
    console.log(`  - Failed deletions: ${failedDeletions.length} videos`)

    if (failedDeletions.length > 0) {
      console.log('❌ Failed deletions:')
      failedDeletions.forEach(failure => {
        console.log(`  - ${failure.uid}: "${failure.name}" - ${failure.error}`)
      })
    }

    return NextResponse.json({
      ok: true,
      message: 'Cloudflare Stream cleanup completed',
      deleted: deletedVideos,
      failed: failedDeletions,
      summary: {
        total: videos.length,
        deleted: deletedVideos.length,
        failed: failedDeletions.length
      }
    })

  } catch (error) {
    console.error('❌ Cloudflare cleanup error:', error)
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
