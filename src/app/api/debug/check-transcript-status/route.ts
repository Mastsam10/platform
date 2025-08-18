import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface Video {
  id: string
  title: string
  status: string
  playback_id?: string
  asset_id?: string
  srt_url?: string
  duration_s?: number
  aspect_ratio?: string
}

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

    // Type assertion to ensure video has the correct type
    const typedVideo = video as Video

    // Get video tags (chapters) for this video
    const { data: videoTags, error: tagError } = await supabase
      .from('video_tags')
      .select('*')
      .eq('video_id', typedVideo.id)
      .order('start_s', { ascending: true })

    // Check environment variables
    const hasDeepgramKey = !!process.env.DEEPGRAM_API_KEY
    const hasSiteUrl = !!process.env.NEXT_PUBLIC_SITE_URL

    // Analyze the video status
    const analysis = {
      video: {
        id: typedVideo.id,
        title: typedVideo.title,
        status: typedVideo.status,
        playback_id: typedVideo.playback_id,
        asset_id: typedVideo.asset_id,
        srt_url: typedVideo.srt_url,
        duration_s: typedVideo.duration_s,
        aspect_ratio: typedVideo.aspect_ratio
      },
      transcriptStatus: {
        hasSrtUrl: !!typedVideo.srt_url,
        srtUrlLength: typedVideo.srt_url ? typedVideo.srt_url.length : 0,
        hasDeepgramKey,
        hasSiteUrl
      },
      chaptersStatus: {
        hasVideoTags: !!videoTags && videoTags.length > 0,
        videoTagsCount: videoTags ? videoTags.length : 0,
        videoTags: videoTags || []
      },
      potentialIssues: [] as string[]
    }

    // Identify potential issues
    if (!typedVideo.playback_id) {
      analysis.potentialIssues.push('No playback_id - video may not be ready')
    }
    
    if (!typedVideo.srt_url) {
      analysis.potentialIssues.push('No SRT URL - transcript generation may have failed')
    }
    
    if (!hasDeepgramKey) {
      analysis.potentialIssues.push('No Deepgram API key configured')
    }
    
    if (!hasSiteUrl) {
      analysis.potentialIssues.push('No NEXT_PUBLIC_SITE_URL configured')
    }
    
    if (typedVideo.status !== 'ready') {
      analysis.potentialIssues.push(`Video status is '${typedVideo.status}' instead of 'ready'`)
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
