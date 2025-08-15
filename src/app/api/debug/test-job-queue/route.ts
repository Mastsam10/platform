import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    console.log('=== TESTING JOB QUEUE SYSTEM ===')

    // Test 1: Check if transcript_jobs table exists and has data
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('transcript_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (jobsError) {
      return NextResponse.json({
        error: 'Failed to query transcript_jobs table',
        details: jobsError.message
      }, { status: 500 })
    }

    // Test 2: Check if there are any ready videos
    const { data: readyVideos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select('id, title, status, playback_id')
      .eq('status', 'ready')
      .not('playback_id', 'is', null)
      .limit(5)

    if (videosError) {
      return NextResponse.json({
        error: 'Failed to query videos table',
        details: videosError.message
      }, { status: 500 })
    }

    // Test 3: Check captions table
    const { data: captions, error: captionsError } = await supabaseAdmin
      .from('captions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (captionsError) {
      return NextResponse.json({
        error: 'Failed to query captions table',
        details: captionsError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Job queue system test completed',
      summary: {
        total_jobs: jobs?.length || 0,
        ready_videos: readyVideos?.length || 0,
        total_captions: captions?.length || 0
      },
      jobs: jobs?.map(job => ({
        id: job.id,
        video_id: job.video_id,
        status: job.status,
        attempts: job.attempts,
        created_at: job.created_at,
        updated_at: job.updated_at
      })) || [],
      ready_videos: readyVideos?.map(video => ({
        id: video.id,
        title: video.title,
        status: video.status,
        playback_id: video.playback_id
      })) || [],
      captions: captions?.map(caption => ({
        id: caption.id,
        video_id: caption.video_id,
        provider: caption.provider,
        lang: caption.lang,
        srt_url: caption.srt_url
      })) || [],
      next_steps: [
        '1. Upload a video to trigger webhook and create a job',
        '2. Call /api/transcripts/dequeue to process jobs',
        '3. Check /api/webhooks/deepgram for callback handling',
        '4. Verify transcripts are stored in database'
      ]
    })

  } catch (error) {
    console.error('Job queue test error:', error)
    return NextResponse.json({
      error: 'Job queue test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== MANUALLY TRIGGERING JOB DEQUEUE ===')

    // Call the job dequeue endpoint
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/transcripts/dequeue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    })

    const result = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Job dequeue triggered manually',
      dequeue_result: result,
      status_code: response.status
    })

  } catch (error) {
    console.error('Manual job dequeue error:', error)
    return NextResponse.json({
      error: 'Manual job dequeue failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
