import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Check if we have the required environment variables
    const hasDeepgramKey = !!process.env.DEEPGRAM_API_KEY
    const hasSiteUrl = !!process.env.NEXT_PUBLIC_SITE_URL

    // Check if captions table exists by trying to query it
    const { data: captions, error: captionsError } = await supabase
      .from('captions')
      .select('count')
      .limit(1)

    // Get recent videos with transcript info
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, status, srt_url, playback_id')
      .order('created_at', { ascending: false })
      .limit(3)

    // Get video tags (chapters) count
    const { data: videoTags, error: tagsError } = await supabase
      .from('video_tags')
      .select('count')

    return NextResponse.json({
      systemStatus: {
        hasDeepgramKey,
        hasSiteUrl,
        captionsTableExists: !captionsError,
        videosTableWorks: !videosError,
        videoTagsTableWorks: !tagsError
      },
      recentVideos: videos || [],
      summary: {
        totalVideos: videos?.length || 0,
        videosWithTranscripts: videos?.filter(v => v.srt_url).length || 0,
        videosWithPlaybackId: videos?.filter(v => v.playback_id).length || 0,
        readyVideos: videos?.filter(v => v.status === 'ready').length || 0
      },
      issues: []
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
