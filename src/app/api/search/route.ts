export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

interface SearchResult {
  id: string
  title: string
  description?: string
  playback_id?: string
  has_captions?: boolean
  channels?: {
    name: string
    denomination?: string
  }
  search_rank: number
  matched_text?: string
  transcript_matches?: Array<{
    text: string
    startMs: number
    endMs: number
  }>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const channelId = searchParams.get('channel')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query || query.length < 2) {
      return NextResponse.json({ 
        results: [], 
        total: 0,
        query: query || '',
        message: 'Search query must be at least 2 characters long'
      })
    }

    console.log(`🔍 Searching for: "${query}"`)

    // Build the search query using LIKE
    let searchQuery = supabaseAdmin
      .from('videos')
      .select(`
        id,
        title,
        description,
        playback_id,
        has_captions,
        created_at,
        channels (name, denomination)
      `)
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('status', 'ready')

    // Add channel filter if specified
    if (channelId) {
      searchQuery = searchQuery.eq('channel_id', channelId)
    }

    // Add ordering and pagination
    searchQuery = searchQuery
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    const { data: videos, error } = await searchQuery

    if (error) {
      console.error('❌ Search query error:', error)
      return NextResponse.json({ 
        error: 'Search failed',
        details: error.message 
      }, { status: 500 })
    }

    // Get transcripts for videos that have them
    const videoIds = videos?.map(v => v.id) || []
    let transcripts: any[] = []
    
    if (videoIds.length > 0) {
      const { data: transcriptData, error: transcriptError } = await supabaseAdmin
        .from('transcripts')
        .select('video_id, lines')
        .in('video_id', videoIds)
        .eq('lang', 'en')
        .eq('status', 'ready')

      if (!transcriptError) {
        transcripts = transcriptData || []
      }
    }

    // Process results and find transcript matches
    const results: SearchResult[] = await Promise.all(
      (videos || []).map(async (video: any) => {
        const result: SearchResult = {
          id: video.id,
          title: video.title,
          description: video.description,
          playback_id: video.playback_id,
          has_captions: video.has_captions,
          channels: video.channels ? {
            name: video.channels.name,
            denomination: video.channels.denomination
          } : undefined,
          search_rank: 1.0 // Simple ranking for now
        }

        // Find transcript matches if transcript exists
        const videoTranscript = transcripts.find(t => t.video_id === video.id)
        if (videoTranscript && videoTranscript.lines && Array.isArray(videoTranscript.lines)) {
          const transcriptMatches = findTranscriptMatches(query, videoTranscript.lines)
          if (transcriptMatches.length > 0) {
            result.transcript_matches = transcriptMatches
            result.matched_text = transcriptMatches[0].text
          }
        }

        return result
      })
    )

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('videos')
      .select('id', { count: 'exact', head: true })
      .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
      .eq('status', 'ready')

    if (channelId) {
      countQuery = countQuery.eq('channel_id', channelId)
    }

    const { count, error: countError } = await countQuery

    const total = countError ? results.length : (count || 0)

    console.log(`✅ Search completed: ${results.length} results found`)

    return NextResponse.json({
      results,
      total: parseInt(total.toString()),
      query,
      hasMore: offset + limit < total
    })

  } catch (error) {
    console.error('❌ Search error:', error)
    return NextResponse.json({
      error: 'Search failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to find transcript matches
function findTranscriptMatches(query: string, lines: Array<{ startMs: number; endMs: number; text: string }>): Array<{ text: string; startMs: number; endMs: number }> {
  const matches: Array<{ text: string; startMs: number; endMs: number }> = []
  const queryLower = query.toLowerCase()

  for (const line of lines) {
    if (line.text.toLowerCase().includes(queryLower)) {
      matches.push({
        text: line.text,
        startMs: line.startMs,
        endMs: line.endMs
      })
    }
  }

  // Return first 3 matches
  return matches.slice(0, 3)
}
