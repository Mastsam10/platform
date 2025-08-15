import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const { data: videos, error } = await supabaseAdmin
      .from('videos')
      .select(`
        *,
        channels (
          name,
          denomination
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
