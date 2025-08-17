export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(request: NextRequest) {
  try {
    const { data: channels, error } = await supabaseAdmin
      .from('channels')
      .select('id, name, denomination')
      .order('name')

    if (error) {
      console.error('❌ Failed to fetch channels:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch channels',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ channels })

  } catch (error) {
    console.error('❌ Channels API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
