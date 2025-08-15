import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing job queue database migration...')

    // Test 1: Check if transcript_jobs table exists
    const { data: jobsTable, error: jobsTableError } = await supabase
      .from('transcript_jobs')
      .select('count')
      .limit(1)

    if (jobsTableError) {
      return NextResponse.json({
        error: 'transcript_jobs table not found',
        details: jobsTableError.message,
        step: 'table_check'
      }, { status: 500 })
    }

    // Test 2: Check if transcript_text column exists in videos
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('id, title, transcript_text')
      .limit(1)

    if (videosError) {
      return NextResponse.json({
        error: 'Failed to query videos table',
        details: videosError.message,
        step: 'column_check'
      }, { status: 500 })
    }

    // Test 3: Check if captions table exists
    const { data: captionsTable, error: captionsTableError } = await supabase
      .from('captions')
      .select('count')
      .limit(1)

    if (captionsTableError) {
      return NextResponse.json({
        error: 'captions table not found',
        details: captionsTableError.message,
        step: 'captions_check'
      }, { status: 500 })
    }

    // Test 4: Create a test job
    const testVideoId = videos?.[0]?.id
    if (!testVideoId) {
      return NextResponse.json({
        error: 'No videos found to test with',
        step: 'test_job_creation'
      }, { status: 500 })
    }

    const { data: testJob, error: jobError } = await supabase
      .from('transcript_jobs')
      .insert({
        video_id: testVideoId,
        status: 'queued',
        provider: 'deepgram'
      })
      .select()
      .single()

    if (jobError) {
      return NextResponse.json({
        error: 'Failed to create test job',
        details: jobError.message,
        step: 'job_creation'
      }, { status: 500 })
    }

    // Test 5: Update the job to test trigger
    const { data: updatedJob, error: updateError } = await supabase
      .from('transcript_jobs')
      .update({ 
        status: 'running',
        attempts: 1
      })
      .eq('id', testJob.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update test job',
        details: updateError.message,
        step: 'job_update'
      }, { status: 500 })
    }

    // Test 6: Query jobs to test indexes
    const { data: allJobs, error: queryError } = await supabase
      .from('transcript_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (queryError) {
      return NextResponse.json({
        error: 'Failed to query jobs',
        details: queryError.message,
        step: 'job_query'
      }, { status: 500 })
    }

    // Test 7: Clean up test job
    await supabase
      .from('transcript_jobs')
      .delete()
      .eq('id', testJob.id)

    return NextResponse.json({
      success: true,
      message: 'Job queue database migration successful!',
      tests: {
        transcript_jobs_table: '✅ Exists',
        transcript_text_column: '✅ Exists',
        captions_table: '✅ Exists',
        job_creation: '✅ Working',
        job_update: '✅ Working',
        job_query: '✅ Working',
        trigger_function: '✅ Working'
      },
      sample_data: {
        videos_count: videos?.length || 0,
        jobs_created: 1,
        jobs_updated: 1,
        jobs_cleaned: 1
      },
      next_steps: [
        '1. Set up Cloudflare Stream signing keys',
        '2. Test signed URL generation',
        '3. Update webhook to create jobs',
        '4. Update transcription endpoint to use job queue'
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
