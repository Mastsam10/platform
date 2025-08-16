import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    const uid = 'DEBUG_' + Date.now()
    
    console.log(`🧪 Creating test job with UID: ${uid}`)
    
    const { data: job, error } = await supabaseAdmin
      .from('transcript_jobs')
      .insert({
        video_id: uid, // Using UID as video_id for test
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
      uid,
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
