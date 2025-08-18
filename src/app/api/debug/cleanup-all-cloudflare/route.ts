export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧹 Starting comprehensive Cloudflare cleanup...')

    // Step 1: Get ALL videos from Cloudflare Stream
    const listResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!listResponse.ok) {
      const errorData = await listResponse.json()
      console.error('❌ Failed to list videos from Cloudflare:', errorData)
      return NextResponse.json({ 
        error: 'Failed to list videos from Cloudflare',
        status: listResponse.status,
        details: errorData
      }, { status: 500 })
    }

    const listData = await listResponse.json()
    const videos = listData.result || []
    
    console.log(`📊 Found ${videos.length} videos in Cloudflare to delete`)

    if (videos.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No videos found in Cloudflare to delete',
        deletedCount: 0
      })
    }

    // Step 2: Delete ALL videos from Cloudflare Stream
    const cloudflareResults = []
    for (const video of videos) {
      try {
        console.log(`🗑️ Deleting video from Cloudflare: ${video.meta?.name || 'Unnamed'} (${video.uid})`)
        
        // Use Cloudflare Stream API to delete the video
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream/${video.uid}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          cloudflareResults.push({ 
            uid: video.uid, 
            name: video.meta?.name || 'Unnamed',
            status: video.status?.state || 'unknown',
            cloudflare: 'deleted' 
          })
          console.log(`✅ Deleted from Cloudflare: ${video.meta?.name || 'Unnamed'}`)
        } else {
          const errorData = await response.json()
          cloudflareResults.push({ 
            uid: video.uid, 
            name: video.meta?.name || 'Unnamed',
            status: video.status?.state || 'unknown',
            cloudflare: 'failed',
            error: errorData.errors?.[0]?.message || 'Unknown error'
          })
          console.log(`❌ Failed to delete from Cloudflare: ${video.meta?.name || 'Unnamed'}`)
        }
      } catch (error) {
        cloudflareResults.push({ 
          uid: video.uid, 
          name: video.meta?.name || 'Unnamed',
          status: video.status?.state || 'unknown',
          cloudflare: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.log(`❌ Error deleting from Cloudflare: ${video.meta?.name || 'Unnamed'}`)
      }
    }

    // Step 3: Verify deletion by listing videos again
    const verifyResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/stream`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    let remainingVideos = 0
    if (verifyResponse.ok) {
      const verifyData = await verifyResponse.json()
      remainingVideos = verifyData.result?.length || 0
    }

    console.log(`✅ Successfully processed ${videos.length} videos`)
    console.log(`📊 Remaining videos in Cloudflare: ${remainingVideos}`)

    return NextResponse.json({ 
      success: true, 
      message: `Successfully processed ${videos.length} videos`,
      deletedCount: videos.length,
      cloudflareResults,
      remainingVideos,
      summary: {
        total: videos.length,
        deleted: cloudflareResults.filter(r => r.cloudflare === 'deleted').length,
        failed: cloudflareResults.filter(r => r.cloudflare === 'failed').length,
        errors: cloudflareResults.filter(r => r.cloudflare === 'error').length
      }
    })

  } catch (error) {
    console.error('❌ Cloudflare cleanup error:', error)
    return NextResponse.json({
      error: 'Cloudflare cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

