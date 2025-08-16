import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Running migration to create transcript_jobs table...')
    
    // Create transcript_jobs table using direct SQL
    const { error: createTableError } = await supabaseAdmin
      .from('videos')
      .select('id')
      .limit(1)
      .then(() => {
        // If we can query videos, try to create the table
        return supabaseAdmin.rpc('exec_sql', {
          sql: `
            create table if not exists transcript_jobs(
              id uuid primary key default gen_random_uuid(),
              video_id uuid references videos(id) on delete cascade,
              provider text default 'deepgram',
              status text check (status in ('queued','running','done','error','dead')) default 'queued',
              attempts int default 0,
              next_attempt_at timestamptz default now(),
              error text,
              created_at timestamptz default now(),
              updated_at timestamptz default now()
            );
          `
        })
      })

    if (createTableError) {
      console.error('❌ Failed to create transcript_jobs table:', createTableError)
      // Try alternative approach - just test if table exists
      const { data: testData, error: testError } = await supabaseAdmin
        .from('transcript_jobs')
        .select('id')
        .limit(1)
      
      if (testError) {
        return NextResponse.json({ 
          error: 'Table does not exist and cannot be created automatically. Please run the migration manually in Supabase.',
          details: createTableError.message 
        }, { status: 500 })
      }
    }

    console.log('✅ Migration check completed')
    
    return NextResponse.json({ 
      success: true, 
      message: 'transcript_jobs table is available',
      note: 'If table was missing, please run the migration manually in Supabase SQL editor'
    })
    
  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
