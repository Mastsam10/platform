import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('Processing legacy videos...')

    // Find videos that have asset_id but no playback_id (legacy videos)
    const { data: legacyVideos, error: fetchError } = await supabaseAdmin
      .from('videos')
      .select('id, title, asset_id, status, playback_id')
      .not('asset_id', 'is', null)
      .is('playback_id', null)

    if (fetchError) {
      console.error('Failed to fetch legacy videos:', fetchError)
      return NextResponse.json({ 
        error: 'Failed to fetch legacy videos' 
      }, { status: 500 })
    }

    console.log(`Found ${legacyVideos?.length || 0} legacy videos to process`)

    if (!legacyVideos || legacyVideos.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No legacy videos found',
        processedVideos: []
      })
    }

    const results = []
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'

    // Process each legacy video
    for (const video of legacyVideos) {
      console.log(`Processing legacy video: ${video.title}`)

      try {
        // Simulate the video.asset.ready webhook for this video
        const webhookPayload = {
          type: 'video.asset.ready',
          data: {
            id: video.asset_id,
            duration: '69.0', // Default duration
            playback_id: `legacy_${video.asset_id.substring(0, 8)}`, // Generate a legacy playback_id
            aspect_ratio: '16:9' // Default aspect ratio
          }
        }

        console.log(`Triggering webhook for ${video.title}:`, webhookPayload)

        // Call the webhook endpoint internally
        const webhookResponse = await fetch(`${baseUrl}/api/webhooks/video`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        })

        if (webhookResponse.ok) {
          const webhookResult = await webhookResponse.json()
          console.log(`Webhook success for ${video.title}:`, webhookResult)
          
          // Check the updated video status
          const { data: updatedVideo, error: checkError } = await supabaseAdmin
            .from('videos')
            .select('id, title, status, playback_id')
            .eq('id', video.id)
            .single()

          results.push({
            video: video.title,
            success: true,
            webhookResult: webhookResult,
            updatedVideo: updatedVideo
          })
        } else {
          const errorText = await webhookResponse.text()
          console.error(`Webhook failed for ${video.title}:`, errorText)
          results.push({
            video: video.title,
            success: false,
            error: errorText
          })
        }
      } catch (error) {
        console.error(`Error processing ${video.title}:`, error)
        results.push({
          video: video.title,
          success: false,
          error: error
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${legacyVideos.length} legacy videos`,
      results: results,
      legacyVideos: legacyVideos
    })

  } catch (error) {
    console.error('Process legacy videos error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
