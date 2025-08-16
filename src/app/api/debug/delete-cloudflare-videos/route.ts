import { NextRequest, NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('🗑️ Starting bulk deletion of all Cloudflare Stream videos...')
    
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
    const apiToken = process.env.CLOUDFLARE_API_TOKEN
    
    if (!accountId || !apiToken) {
      return NextResponse.json({
        error: 'Cloudflare credentials not configured',
        details: 'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN'
      }, { status: 500 })
    }
    
    // Step 1: List all videos
    console.log('📋 Fetching list of all videos...')
    const listResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`, {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!listResponse.ok) {
      const errorText = await listResponse.text()
      console.error('❌ Failed to list videos:', errorText)
      return NextResponse.json({
        error: 'Failed to list videos from Cloudflare',
        details: errorText
      }, { status: 500 })
    }
    
    const listData = await listResponse.json()
    const videos = listData.result || []
    
    console.log(`📹 Found ${videos.length} videos to delete`)
    
    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No videos found to delete',
        deletedCount: 0
      })
    }
    
    // Step 2: Delete each video
    const results = []
    let successCount = 0
    let errorCount = 0
    
    for (const video of videos) {
      try {
        console.log(`🗑️ Deleting video: ${video.uid} (${video.meta?.name || 'Untitled'})`)
        
        const deleteResponse = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/${video.uid}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${apiToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (deleteResponse.ok) {
          console.log(`✅ Successfully deleted: ${video.uid}`)
          results.push({
            uid: video.uid,
            name: video.meta?.name || 'Untitled',
            status: 'success'
          })
          successCount++
        } else {
          const errorText = await deleteResponse.text()
          console.error(`❌ Failed to delete ${video.uid}:`, errorText)
          results.push({
            uid: video.uid,
            name: video.meta?.name || 'Untitled',
            status: 'error',
            error: errorText
          })
          errorCount++
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (error) {
        console.error(`❌ Error deleting ${video.uid}:`, error)
        results.push({
          uid: video.uid,
          name: video.meta?.name || 'Untitled',
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        errorCount++
      }
    }
    
    console.log(`📊 Bulk deletion complete: ${successCount} successful, ${errorCount} failed`)
    
    return NextResponse.json({
      success: true,
      message: 'Bulk deletion completed',
      totalVideos: videos.length,
      deletedCount: successCount,
      errorCount: errorCount,
      results: results
    })
    
  } catch (error) {
    console.error('❌ Bulk deletion error:', error)
    return NextResponse.json({
      error: 'Bulk deletion failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
