import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log(`🧪 Creating test job`)
    
    // First, get a valid video ID from the database
    const { data: videos, error: videoError } = await supabaseAdmin
      .from('videos')
      .select('id, title')
      .limit(1)
    
    if (videoError || !videos || videos.length === 0) {
      console.error('❌ No videos found in database:', videoError)
      return NextResponse.json({ error: 'No videos found in database' }, { status: 404 })
    }
    
    const video = videos[0]
    console.log(`📹 Using video: ${video.id} (${video.title})`)
    
    const { data: job, error } = await supabaseAdmin
      .from('transcript_jobs')
      .insert({
        video_id: video.id, // Use actual video UUID
        status: 'queued',
        provider: 'deepgram',
        attempts: 0,
        next_attempt_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Failed to create test job:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Test job created successfully: ${job.id}`)
    
    return NextResponse.json({ 
      ok: true, 
      video_id: video.id,
      video_title: video.title,
      job_id: job.id,
      status: job.status 
    })
    
  } catch (error) {
    console.error('❌ Test job creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
