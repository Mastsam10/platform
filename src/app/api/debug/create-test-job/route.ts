import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('=== CREATING TEST TRANSCRIPTION JOB ===')

    // Get the first ready video
    const { data: video, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('id, title, playback_id')
      .eq('status', 'ready')
      .not('playback_id', 'is', null)
      .limit(1)
      .single()

    if (videoError || !video) {
      return NextResponse.json({
        error: 'No ready videos found',
        details: videoError?.message || 'No videos with ready status and playback_id'
      }, { status: 404 })
    }

    console.log(`📝 Creating test job for video: ${video.title} (${video.id})`)

    // Create a test transcription job
    const { data: job, error: jobError } = await supabaseAdmin
      .from('transcript_jobs')
      .insert({
        video_id: video.id,
        status: 'queued',
        provider: 'deepgram',
        attempts: 0,
        next_attempt_at: new Date().toISOString()
      })
      .select()
      .single()

    if (jobError) {
      console.error('❌ Failed to create test job:', jobError)
      return NextResponse.json({
        error: 'Failed to create test job',
        details: jobError.message
      }, { status: 500 })
    }

    console.log(`✅ Test job created: ${job.id}`)

    return NextResponse.json({
      success: true,
      message: 'Test transcription job created successfully',
      job: {
        id: job.id,
        video_id: job.video_id,
        status: job.status,
        created_at: job.created_at
      },
      video: {
        id: video.id,
        title: video.title,
        playback_id: video.playback_id
      },
      next_steps: [
        '1. Call /api/debug/test-job-queue POST to process the job',
        '2. Check /api/debug/test-job-queue GET to see job status',
        '3. Monitor Vercel logs for Deepgram API calls'
      ]
    })

  } catch (error) {
    console.error('❌ Create test job error:', error)
    return NextResponse.json({
      error: 'Create test job failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
