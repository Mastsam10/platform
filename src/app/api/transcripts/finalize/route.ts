export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function parseVtt(vtt: string) {
  // Very basic VTT parser: split by caption blocks
  // Handles:
  // 00:00:01.000 --> 00:00:04.000
  // Text...
  const blocks = vtt
    .replace(/\r/g, '')
    .split('\n\n')
    .map(b => b.trim())
    .filter(Boolean)

  const lines: Array<{ startMs: number; endMs: number; text: string }> = []

  for (const block of blocks) {
    const parts = block.split('\n')
    // Sometimes the first line is a numeric index; tolerate it.
    let timeLineIdx = 0
    if (/^\d+$/.test(parts[0])) timeLineIdx = 1

    const timeLine = parts[timeLineIdx] || ''
    const textLines = parts.slice(timeLineIdx + 1)
    const m = timeLine.match(/(\d+:\d{2}:\d{2}\.\d{3})\s*-->\s*(\d+:\d{2}:\d{2}\.\d{3})/)

    if (!m) continue

    const startMs = toMs(m[1])
    const endMs = toMs(m[2])
    const text = textLines.join(' ').trim()

    if (text) lines.push({ startMs, endMs, text })
  }

  return lines
}

function toMs(ts: string) {
  // "HH:MM:SS.mmm" -> ms
  const [h, m, rest] = ts.split(':')
  const [s, ms] = rest.split('.')
  return (Number(h) * 3600 + Number(m) * 60 + Number(s)) * 1000 + Number(ms)
}

export async function POST(request: NextRequest) {
  try {
    const { videoId, playbackId, lang = 'en' } = await request.json()
    
    if (!videoId || !playbackId) {
      return NextResponse.json({ 
        ok: false, 
        error: 'Missing videoId/playbackId' 
      }, { status: 400 })
    }

    console.log(`📝 Finalizing transcript for video ${videoId}, playback ${playbackId}`)

    // 1) Try to fetch the VTT from Cloudflare public path
    const vttUrl = `https://videodelivery.net/${playbackId}/captions/${lang}.vtt`

    console.log(`🔗 Fetching VTT from: ${vttUrl}`)
    const res = await fetch(vttUrl)
    
    if (!res.ok) {
      console.log(`❌ VTT not ready yet: ${res.status} ${res.statusText}`)
      return NextResponse.json({ 
        ok: false, 
        error: `VTT fetch ${res.status}`,
        notReady: true
      }, { status: 404 })
    }

    const vttText = await res.text()
    console.log(`✅ VTT fetched successfully (${vttText.length} chars)`)
    
    const lines = parseVtt(vttText)
    console.log(`📄 Parsed ${lines.length} transcript lines`)

    // 2) Store lines + raw_vtt; mark video.has_captions = true
    const { error: transcriptError } = await supabaseAdmin
      .from('transcripts')
      .update({
        status: 'ready',
        vtt_url: vttUrl,
        raw_vtt: vttText,
        lines,
        updated_at: new Date().toISOString()
      })
      .eq('video_id', videoId)
      .eq('lang', lang)

    if (transcriptError) {
      console.error('❌ Failed to update transcript:', transcriptError)
      return NextResponse.json({ 
        ok: false, 
        error: 'Database update failed' 
      }, { status: 500 })
    }

    const { error: videoError } = await supabaseAdmin
      .from('videos')
      .update({ has_captions: true })
      .eq('id', videoId)

    if (videoError) {
      console.error('❌ Failed to update video has_captions:', videoError)
      // Don't fail the whole process for this
    }

    console.log(`✅ Transcript finalized for video ${videoId}`)
    console.log(`📊 ${lines.length} lines stored, has_captions=true`)

    return NextResponse.json({ 
      ok: true,
      videoId,
      playbackId,
      linesCount: lines.length,
      vttUrl
    })

  } catch (error) {
    console.error('❌ Transcript finalize error:', error)
    return NextResponse.json({
      ok: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
