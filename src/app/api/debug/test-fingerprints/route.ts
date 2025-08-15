import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

function dbFingerprint() {
  return {
    url: process.env.SUPABASE_URL,
    project_ref: process.env.SUPABASE_URL?.split('https://')[1]?.split('.')[0],
    using_service_key: !!process.env.SUPABASE_SERVICE_KEY,
  }
}

export async function GET() {
  try {
    console.log('[DB FINGERPRINT]', dbFingerprint())
    
    // Test database connection
    const { data: videos, error } = await supabaseAdmin
      .from('videos')
      .select('id, title, status')
      .limit(3)
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Database connection failed', details: error },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Database fingerprint test completed',
      fingerprint: dbFingerprint(),
      videos_count: videos?.length || 0,
      sample_videos: videos?.map(v => ({ id: v.id, title: v.title, status: v.status }))
    })
    
  } catch (error) {
    console.error('Fingerprint test error:', error)
    return NextResponse.json(
      { error: 'Fingerprint test failed', details: error },
      { status: 500 }
    )
  }
}
