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

    // Build the search query with weights
    const searchQuery = `'${query.replace(/'/g, "''")}':*`
    
    let sqlQuery = `
      SELECT 
        v.id,
        v.title,
        v.description,
        v.playback_id,
        v.has_captions,
        v.search_vector,
        c.name as channel_name,
        c.denomination as channel_denomination,
        ts_rank(v.search_vector, plainto_tsquery('english', $1)) as search_rank,
        t.lines as transcript_lines
      FROM videos v
      LEFT JOIN channels c ON v.channel_id = c.id
      LEFT JOIN transcripts t ON v.id = t.video_id AND t.lang = 'en' AND t.status = 'ready'
      WHERE v.status = 'ready'
        AND v.search_vector @@ plainto_tsquery('english', $1)
    `

    const params: any[] = [query]

    // Add channel filter if specified
    if (channelId) {
      sqlQuery += ` AND v.channel_id = $${params.length + 1}`
      params.push(channelId)
    }

    // Add ordering and pagination
    sqlQuery += `
      ORDER BY search_rank DESC, v.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `
    params.push(limit, offset)

    const { data: videos, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: sqlQuery,
      params: params
    })

    if (error) {
      console.error('❌ Search query error:', error)
      return NextResponse.json({ 
        error: 'Search failed',
        details: error.message 
      }, { status: 500 })
    }

    // Process results and find transcript matches
    const results: SearchResult[] = await Promise.all(
      videos.map(async (video: any) => {
        const result: SearchResult = {
          id: video.id,
          title: video.title,
          description: video.description,
          playback_id: video.playback_id,
          has_captions: video.has_captions,
          channels: video.channel_name ? {
            name: video.channel_name,
            denomination: video.channel_denomination
          } : undefined,
          search_rank: video.search_rank
        }

        // Find transcript matches if transcript exists
        if (video.transcript_lines && Array.isArray(video.transcript_lines)) {
          const transcriptMatches = findTranscriptMatches(query, video.transcript_lines)
          if (transcriptMatches.length > 0) {
            result.transcript_matches = transcriptMatches
            result.matched_text = transcriptMatches[0].text
          }
        }

        return result
      })
    )

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total
      FROM videos v
      WHERE v.status = 'ready'
        AND v.search_vector @@ plainto_tsquery('english', $1)
    `
    const countParams = [query]

    if (channelId) {
      countQuery += ` AND v.channel_id = $2`
      countParams.push(channelId)
    }

    const { data: countResult, error: countError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: countQuery,
      params: countParams
    })

    const total = countError ? results.length : (countResult[0]?.total || 0)

    console.log(`✅ Search completed: ${results.length} results found`)

    return NextResponse.json({
      results,
      total: parseInt(total),
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
