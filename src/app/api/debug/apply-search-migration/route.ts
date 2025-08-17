export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Applying search migration...')

    // Add search vector column to videos table
    const { error: videosError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: 'ALTER TABLE videos ADD COLUMN IF NOT EXISTS search_vector tsvector;',
      params: []
    })

    if (videosError) {
      console.error('❌ Failed to add search_vector to videos:', videosError)
      return NextResponse.json({ 
        error: 'Migration failed - videos table',
        details: videosError.message 
      }, { status: 500 })
    }

    // Add search vector column to transcripts table
    const { error: transcriptsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: 'ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS search_vector tsvector;',
      params: []
    })

    if (transcriptsError) {
      console.error('❌ Failed to add search_vector to transcripts:', transcriptsError)
      return NextResponse.json({ 
        error: 'Migration failed - transcripts table',
        details: transcriptsError.message 
      }, { status: 500 })
    }

    // Create videos search function
    const videosFunctionSQL = `
      CREATE OR REPLACE FUNCTION videos_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `

    const { error: videosFunctionError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: videosFunctionSQL,
      params: []
    })

    if (videosFunctionError) {
      console.error('❌ Failed to create videos function:', videosFunctionError)
      return NextResponse.json({ 
        error: 'Migration failed - videos function',
        details: videosFunctionError.message 
      }, { status: 500 })
    }

    // Create videos trigger
    const videosTriggerSQL = `
      DROP TRIGGER IF EXISTS videos_search_vector_update ON videos;
      CREATE TRIGGER videos_search_vector_update
        BEFORE INSERT OR UPDATE ON videos
        FOR EACH ROW EXECUTE FUNCTION videos_search_vector_update();
    `

    const { error: videosTriggerError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: videosTriggerSQL,
      params: []
    })

    if (videosTriggerError) {
      console.error('❌ Failed to create videos trigger:', videosTriggerError)
      return NextResponse.json({ 
        error: 'Migration failed - videos trigger',
        details: videosTriggerError.message 
      }, { status: 500 })
    }

    // Create videos index
    const { error: videosIndexError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS videos_search_vector_idx ON videos USING GIN (search_vector);',
      params: []
    })

    if (videosIndexError) {
      console.error('❌ Failed to create videos index:', videosIndexError)
      return NextResponse.json({ 
        error: 'Migration failed - videos index',
        details: videosIndexError.message 
      }, { status: 500 })
    }

    // Create transcripts search function
    const transcriptsFunctionSQL = `
      CREATE OR REPLACE FUNCTION transcripts_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector := to_tsvector('english', 
          COALESCE(
            (SELECT string_agg(value->>'text', ' ' ORDER BY (value->>'startMs')::int)
             FROM jsonb_array_elements(NEW.lines) AS value), 
            ''
          )
        );
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `

    const { error: transcriptsFunctionError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: transcriptsFunctionSQL,
      params: []
    })

    if (transcriptsFunctionError) {
      console.error('❌ Failed to create transcripts function:', transcriptsFunctionError)
      return NextResponse.json({ 
        error: 'Migration failed - transcripts function',
        details: transcriptsFunctionError.message 
      }, { status: 500 })
    }

    // Create transcripts trigger
    const transcriptsTriggerSQL = `
      DROP TRIGGER IF EXISTS transcripts_search_vector_update ON transcripts;
      CREATE TRIGGER transcripts_search_vector_update
        BEFORE INSERT OR UPDATE ON transcripts
        FOR EACH ROW EXECUTE FUNCTION transcripts_search_vector_update();
    `

    const { error: transcriptsTriggerError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: transcriptsTriggerSQL,
      params: []
    })

    if (transcriptsTriggerError) {
      console.error('❌ Failed to create transcripts trigger:', transcriptsTriggerError)
      return NextResponse.json({ 
        error: 'Migration failed - transcripts trigger',
        details: transcriptsTriggerError.message 
      }, { status: 500 })
    }

    // Create transcripts index
    const { error: transcriptsIndexError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS transcripts_search_vector_idx ON transcripts USING GIN (search_vector);',
      params: []
    })

    if (transcriptsIndexError) {
      console.error('❌ Failed to create transcripts index:', transcriptsIndexError)
      return NextResponse.json({ 
        error: 'Migration failed - transcripts index',
        details: transcriptsIndexError.message 
      }, { status: 500 })
    }

    // Update existing videos with search vectors
    const { error: updateVideosError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        UPDATE videos SET search_vector = 
          setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(description, '')), 'B')
        WHERE search_vector IS NULL;
      `,
      params: []
    })

    if (updateVideosError) {
      console.error('❌ Failed to update existing videos:', updateVideosError)
      return NextResponse.json({ 
        error: 'Migration failed - update videos',
        details: updateVideosError.message 
      }, { status: 500 })
    }

    // Update existing transcripts with search vectors
    const { error: updateTranscriptsError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        UPDATE transcripts SET search_vector = to_tsvector('english', 
          COALESCE(
            (SELECT string_agg(value->>'text', ' ' ORDER BY (value->>'startMs')::int)
             FROM jsonb_array_elements(lines) AS value), 
            ''
          )
        ) WHERE search_vector IS NULL;
      `,
      params: []
    })

    if (updateTranscriptsError) {
      console.error('❌ Failed to update existing transcripts:', updateTranscriptsError)
      return NextResponse.json({ 
        error: 'Migration failed - update transcripts',
        details: updateTranscriptsError.message 
      }, { status: 500 })
    }

    console.log('✅ Search migration applied successfully')

    // Test the search functionality
    const { data: testResult, error: testError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: `
        SELECT COUNT(*) as video_count, 
               COUNT(CASE WHEN search_vector IS NOT NULL THEN 1 END) as indexed_videos
        FROM videos WHERE status = 'ready'
      `,
      params: []
    })

    if (testError) {
      console.error('❌ Test query failed:', testError)
    } else {
      console.log('📊 Migration test results:', testResult)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Search migration applied successfully',
      testResults: testResult
    })

  } catch (error) {
    console.error('❌ Migration error:', error)
    return NextResponse.json({
      error: 'Migration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
