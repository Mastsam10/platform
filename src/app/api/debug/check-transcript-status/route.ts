import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { videoTitle } = body

    if (!videoTitle) {
      return NextResponse.json({ 
        error: 'Missing videoTitle' 
      }, { status: 400 })
    }

    // Find video by title
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('title', videoTitle)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ 
        error: `Video not found: ${videoTitle}` 
      }, { status: 404 })
    }

    // Get video tags (chapters) for this video
    const { data: videoTags, error: tagError } = await supabase
      .from('video_tags')
      .select('*')
      .eq('video_id', video.id as string)
      .order('start_s', { ascending: true })

    // Check environment variables
    const hasDeepgramKey = !!process.env.DEEPGRAM_API_KEY
    const hasSiteUrl = !!process.env.NEXT_PUBLIC_SITE_URL

    // Analyze the video status
    const analysis = {
      video: {
        id: video.id as string,
        title: video.title as string,
        status: video.status as string,
        playback_id: video.playback_id as string | undefined,
        asset_id: video.asset_id as string | undefined,
        srt_url: video.srt_url as string | undefined,
        duration_s: video.duration_s as number | undefined,
        aspect_ratio: video.aspect_ratio as string | undefined
      },
      transcriptStatus: {
        hasSrtUrl: !!(video.srt_url as string | undefined),
        srtUrlLength: (video.srt_url as string | undefined) ? (video.srt_url as string).length : 0,
        hasDeepgramKey,
        hasSiteUrl
      },
      chaptersStatus: {
        hasVideoTags: !!videoTags && Array.isArray(videoTags) && videoTags.length > 0,
        videoTagsCount: Array.isArray(videoTags) ? videoTags.length : 0,
        videoTags: Array.isArray(videoTags) ? videoTags : []
      },
      potentialIssues: [] as string[]
    }

    // Identify potential issues
    if (!(video.playback_id as string | undefined)) {
      analysis.potentialIssues.push('No playback_id - video may not be ready')
    }
    
    if (!(video.srt_url as string | undefined)) {
      analysis.potentialIssues.push('No SRT URL - transcript generation may have failed')
    }
    
    if (!hasDeepgramKey) {
      analysis.potentialIssues.push('No Deepgram API key configured')
    }
    
    if (!hasSiteUrl) {
      analysis.potentialIssues.push('No NEXT_PUBLIC_SITE_URL configured')
    }
    
    if ((video.status as string) !== 'ready') {
      analysis.potentialIssues.push(`Video status is '${video.status as string}' instead of 'ready'`)
    }

    return NextResponse.json({
      success: true,
      analysis,
      recommendations: analysis.potentialIssues.length > 0 ? [
        'Check Vercel logs for webhook processing errors',
        'Verify Deepgram API key is set in environment variables',
        'Ensure video has completed processing in Mux',
        'Manually trigger transcript generation if needed'
      ] : ['Video appears to be properly configured']
    })

  } catch (error) {
    console.error('Check transcript status error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
