export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Applying search migration...')

    // Migration SQL
    const migrationSQL = `
      -- Add full-text search columns to videos table
      ALTER TABLE videos ADD COLUMN IF NOT EXISTS search_vector tsvector;

      -- Create a function to generate search vectors
      CREATE OR REPLACE FUNCTION videos_search_vector_update() RETURNS trigger AS $$
      BEGIN
        NEW.search_vector :=
          setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
          setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger to automatically update search vector
      DROP TRIGGER IF EXISTS videos_search_vector_update ON videos;
      CREATE TRIGGER videos_search_vector_update
        BEFORE INSERT OR UPDATE ON videos
        FOR EACH ROW EXECUTE FUNCTION videos_search_vector_update();

      -- Create GIN index for fast full-text search
      CREATE INDEX IF NOT EXISTS videos_search_vector_idx ON videos USING GIN (search_vector);

      -- Add search vector to transcripts table for more granular search
      ALTER TABLE transcripts ADD COLUMN IF NOT EXISTS search_vector tsvector;

      -- Create function for transcript search vector
      CREATE OR REPLACE FUNCTION transcripts_search_vector_update() RETURNS trigger AS $$
      BEGIN
        -- Extract text from the lines JSONB array
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

      -- Create trigger for transcripts
      DROP TRIGGER IF EXISTS transcripts_search_vector_update ON transcripts;
      CREATE TRIGGER transcripts_search_vector_update
        BEFORE INSERT OR UPDATE ON transcripts
        FOR EACH ROW EXECUTE FUNCTION transcripts_search_vector_update();

      -- Create GIN index for transcripts
      CREATE INDEX IF NOT EXISTS transcripts_search_vector_idx ON transcripts USING GIN (search_vector);

      -- Update existing videos with search vectors
      UPDATE videos SET search_vector = 
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B')
      WHERE search_vector IS NULL;

      -- Update existing transcripts with search vectors
      UPDATE transcripts SET search_vector = to_tsvector('english', 
        COALESCE(
          (SELECT string_agg(value->>'text', ' ' ORDER BY (value->>'startMs')::int)
           FROM jsonb_array_elements(lines) AS value), 
          ''
        )
      ) WHERE search_vector IS NULL;
    `

    // Execute the migration
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: migrationSQL,
      params: []
    })

    if (error) {
      console.error('❌ Migration failed:', error)
      return NextResponse.json({ 
        error: 'Migration failed',
        details: error.message 
      }, { status: 500 })
    }

    console.log('✅ Search migration applied successfully')

    // Test the search functionality
    const testQuery = `
      SELECT COUNT(*) as video_count, 
             COUNT(CASE WHEN search_vector IS NOT NULL THEN 1 END) as indexed_videos
      FROM videos WHERE status = 'ready'
    `

    const { data: testResult, error: testError } = await supabaseAdmin.rpc('exec_sql', {
      sql_query: testQuery,
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
