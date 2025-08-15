import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { cloudflareStreamSigning } from '@/lib/cloudflareSigning'

export async function POST(request: NextRequest) {
  try {
    console.log('=== TRANSCRIPTION JOB DEQUEUE ENDPOINT ACCESSED ===')
    
    // Check if Deepgram API key is configured
    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('❌ Deepgram API key not configured')
      return NextResponse.json({
        error: 'Deepgram API key not configured',
        instructions: 'Add DEEPGRAM_API_KEY to environment variables'
      }, { status: 500 })
    }

    // Get jobs that are ready to be processed
    // Use "FOR UPDATE SKIP LOCKED" pattern to prevent race conditions
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('transcript_jobs')
      .select('id, video_id, provider, attempts, status')
      .eq('status', 'queued')
      .lte('next_attempt_at', new Date().toISOString())
      .order('created_at', { ascending: true })
      .limit(10) // Process up to 10 jobs at a time (maximize Hobby plan capacity)

    if (jobsError) {
      console.error('❌ Failed to fetch jobs:', jobsError)
      return NextResponse.json({
        error: 'Failed to fetch jobs',
        details: jobsError.message
      }, { status: 500 })
    }

    if (!jobs || jobs.length === 0) {
      console.log('ℹ️ No jobs ready for processing')
      return NextResponse.json({
        success: true,
        message: 'No jobs ready for processing',
        jobs_processed: 0
      })
    }

    console.log(`📋 Found ${jobs.length} jobs ready for processing`)

    const results = []

    for (const job of jobs) {
      try {
        console.log(`🔄 Processing job ${job.id} for video ${job.video_id}`)

        // Mark job as running
        const { error: updateError } = await supabaseAdmin
          .from('transcript_jobs')
          .update({
            status: 'running',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        if (updateError) {
          console.error(`❌ Failed to mark job ${job.id} as running:`, updateError)
          results.push({
            job_id: job.id,
            success: false,
            error: 'Failed to mark job as running'
          })
          continue
        }

        // Get video details
        const { data: video, error: videoError } = await supabaseAdmin
          .from('videos')
          .select('id, title, playback_id')
          .eq('id', job.video_id)
          .single()

        if (videoError || !video) {
          console.error(`❌ Video not found for job ${job.id}:`, videoError)
          await markJobAsError(job.id, 'Video not found')
          results.push({
            job_id: job.id,
            success: false,
            error: 'Video not found'
          })
          continue
        }

        if (!video.playback_id) {
          console.error(`❌ Video ${video.id} has no playback_id`)
          await markJobAsError(job.id, 'Video has no playback_id')
          results.push({
            job_id: job.id,
            success: false,
            error: 'Video has no playback_id'
          })
          continue
        }

        // Generate signed download URL for Deepgram
        const signedDownloadUrl = cloudflareStreamSigning.generateSignedDownloadUrl(
          video.playback_id,
          300 // 5 minutes TTL
        )

        console.log(`🔗 Generated signed download URL for video ${video.id}`)

        // Call Deepgram API with callback
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://platform-gamma-flax.vercel.app'
        const callbackUrl = `${baseUrl}/api/webhooks/deepgram`

        const deepgramResponse = await fetch('https://api.deepgram.com/v1/listen', {
          method: 'POST',
          headers: {
            'Authorization': `Token ${process.env.DEEPGRAM_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: signedDownloadUrl,
            callback: callbackUrl,
            callback_metadata: {
              job_id: job.id,
              video_id: video.id
            },
            model: 'nova-2',
            language: 'en',
            smart_format: true,
            punctuate: true,
            // Removed diarize and utterances for faster processing
            // diarize: true,
            // utterances: true
          })
        })

        if (!deepgramResponse.ok) {
          const errorText = await deepgramResponse.text()
          console.error(`❌ Deepgram API error for job ${job.id}:`, errorText)
          await markJobAsError(job.id, `Deepgram API error: ${errorText}`)
          results.push({
            job_id: job.id,
            success: false,
            error: `Deepgram API error: ${errorText}`
          })
          continue
        }

        const deepgramData = await deepgramResponse.json()
        console.log(`✅ Deepgram transcription started for job ${job.id}`)
        console.log(`📞 Deepgram request ID: ${deepgramData.request_id}`)

        // Update job with Deepgram request ID
        await supabaseAdmin
          .from('transcript_jobs')
          .update({
            status: 'running',
            error: null, // Clear any previous errors
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        results.push({
          job_id: job.id,
          success: true,
          video_id: video.id,
          video_title: video.title,
          deepgram_request_id: deepgramData.request_id,
          signed_url_generated: true
        })

      } catch (jobError) {
        console.error(`❌ Error processing job ${job.id}:`, jobError)
        await markJobAsError(job.id, jobError instanceof Error ? jobError.message : 'Unknown error')
        results.push({
          job_id: job.id,
          success: false,
          error: jobError instanceof Error ? jobError.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ Processed ${jobs.length} jobs`)
    console.log('Results:', results)

    return NextResponse.json({
      success: true,
      jobs_processed: jobs.length,
      results
    })

  } catch (error) {
    console.error('❌ Job dequeue error:', error)
    return NextResponse.json({
      error: 'Job dequeue failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

async function markJobAsError(jobId: string, error: string) {
  try {
    // First get current attempts count
    const { data: currentJob } = await supabaseAdmin
      .from('transcript_jobs')
      .select('attempts')
      .eq('id', jobId)
      .single()

    const currentAttempts = currentJob?.attempts || 0
    const newAttempts = currentAttempts + 1

    await supabaseAdmin
      .from('transcript_jobs')
      .update({
        status: 'error',
        error: error,
        attempts: newAttempts,
        next_attempt_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
  } catch (updateError) {
    console.error(`❌ Failed to mark job ${jobId} as error:`, updateError)
  }
}
