export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Setting up search functionality...')

    // Since we can't use exec_sql, let's create a simpler search implementation
    // that works with the standard Supabase client
    
    // First, let's test if we can access the videos table
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select('id, title, description')
      .limit(1)

    if (videosError) {
      console.error('❌ Failed to access videos table:', videosError)
      return NextResponse.json({ 
        error: 'Setup failed - cannot access videos table',
        details: videosError.message 
      }, { status: 500 })
    }

    console.log('✅ Can access videos table successfully')

    // Test a simple search query using LIKE
    const testSearchQuery = 'test'
    const { data: searchResults, error: searchError } = await supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        description,
        playback_id,
        has_captions,
        channels (name, denomination)
      `)
      .or(`title.ilike.%${testSearchQuery}%,description.ilike.%${testSearchQuery}%`)
      .eq('status', 'ready')
      .limit(5)

    if (searchError) {
      console.error('❌ Search test failed:', searchError)
      return NextResponse.json({ 
        error: 'Search test failed',
        details: searchError.message 
      }, { status: 500 })
    }

    console.log('✅ Basic search functionality works')

    // Test transcript access
    const { data: transcripts, error: transcriptsError } = await supabaseAdmin
      .from('transcripts')
      .select('id, video_id, lines')
      .limit(1)

    if (transcriptsError) {
      console.error('❌ Failed to access transcripts table:', transcriptsError)
      return NextResponse.json({ 
        error: 'Setup failed - cannot access transcripts table',
        details: transcriptsError.message 
      }, { status: 500 })
    }

    console.log('✅ Can access transcripts table successfully')

    // Test channel access
    const { data: channels, error: channelsError } = await supabaseAdmin
      .from('channels')
      .select('id, name, denomination')
      .limit(1)

    if (channelsError) {
      console.error('❌ Failed to access channels table:', channelsError)
      return NextResponse.json({ 
        error: 'Setup failed - cannot access channels table',
        details: channelsError.message 
      }, { status: 500 })
    }

    console.log('✅ Can access channels table successfully')

    return NextResponse.json({ 
      success: true, 
      message: 'Search functionality is ready (using basic text search)',
      searchResults: searchResults?.length || 0,
      videosAccessible: true,
      transcriptsAccessible: true,
      channelsAccessible: true,
      note: 'Using basic text search with LIKE queries instead of full-text search indexes'
    })

  } catch (error) {
    console.error('❌ Setup error:', error)
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
