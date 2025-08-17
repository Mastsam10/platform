-- Migration: Add Full-Text Search Indexes
-- This enables fast searching across video titles, descriptions, and transcript content

-- Add full-text search columns to videos table
ALTER TABLE videos ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create a function to generate search vectors
CREATE OR REPLACE FUNCTION videos_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.transcript_text, '')), 'C');
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

-- Add comments for documentation
COMMENT ON COLUMN videos.search_vector IS 'Full-text search vector for video titles, descriptions, and transcript text';
COMMENT ON COLUMN transcripts.search_vector IS 'Full-text search vector for transcript content';
COMMENT ON INDEX videos_search_vector_idx IS 'GIN index for fast full-text search on videos';
COMMENT ON INDEX transcripts_search_vector_idx IS 'GIN index for fast full-text search on transcripts';
