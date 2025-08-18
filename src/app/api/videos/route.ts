export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function dbFingerprint() {
  return {
    url: process.env.SUPABASE_URL,
    project_ref: process.env.SUPABASE_URL?.split('https://')[1]?.split('.')[0],
    using_service_key: !!process.env.SUPABASE_SERVICE_KEY,
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[DB FINGERPRINT]', dbFingerprint())
    
    const { data: videos, error } = await supabaseAdmin
      .from('videos')
      .select(`
        *,
        channels (
          display_name,
          denomination,
          type,
          slug
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      )
    }

    return NextResponse.json({ videos })

  } catch (error) {
    console.error('Videos API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
