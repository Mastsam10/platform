export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cloudflareStream } from '@/lib/cloudflare'

export async function POST(request: NextRequest) {
  try {
    const { videoId, playbackId } = await request.json()
    
    if (!videoId || !playbackId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing videoId/playbackId' 
      }, { status: 400 })
    }

    console.log(`🔍 Checking caption status for video ${videoId}, playback ${playbackId}`)

    // Check if Cloudflare captions are ready using the API
    try {
      const hasCaptions = await cloudflareStream.hasCaptions(playbackId)
      
      if (hasCaptions) {
        console.log(`✅ Captions are ready for video ${videoId}`)
        
        // Get the caption URL
        const captionUrl = await cloudflareStream.getCaptionUrl(playbackId, 'en')
        
        // Update video has_captions field
        const { error: updateError } = await supabaseAdmin
          .from('videos')
          .update({ has_captions: true })
          .eq('id', videoId)

        if (updateError) {
          console.error('❌ Failed to update has_captions:', updateError)
          return NextResponse.json({ 
            ok: false, 
            error: 'Database update failed' 
          }, { status: 500 })
        }

        // Update transcript status
        const { error: transcriptError } = await supabaseAdmin
          .from('transcripts')
          .update({ status: 'ready' })
          .eq('video_id', videoId)
          .eq('lang', 'en')

        if (transcriptError) {
          console.error('❌ Failed to update transcript status:', transcriptError)
        }

        return NextResponse.json({ 
          ok: true, 
          captionsReady: true,
          captionUrl
        })
      } else {
        console.log(`⏳ Captions not ready yet for video ${videoId}`)
        return NextResponse.json({ 
          ok: true, 
          captionsReady: false,
          status: 'not_ready'
        })
      }
    } catch (error) {
      console.error('❌ Error checking captions via Cloudflare API:', error)
      return NextResponse.json({ 
        ok: false, 
        error: 'Failed to check captions via Cloudflare API' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('❌ Check status error:', error)
    return NextResponse.json({ 
      ok: false, 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
