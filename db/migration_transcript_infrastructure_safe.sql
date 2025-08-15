-- Migration: Add transcript infrastructure (Safe Version)
-- Date: 2024-01-XX
-- Description: Add transcript_jobs table and enhance videos table for transcription support
-- This version handles existing tables and columns gracefully

-- Add transcript_jobs table with retry logic and proper constraints
-- Only create if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcript_jobs') THEN
        CREATE TABLE transcript_jobs(
            id uuid primary key default gen_random_uuid(),
            video_id uuid not null references videos(id) on delete cascade,
            provider text default 'deepgram',
            status text check (status in ('queued','running','done','error','dead')) default 'queued',
            attempts int default 0,
            next_attempt_at timestamptz default now(),
            error text,
            created_at timestamptz default now(),
            updated_at timestamptz default now()
        );
        
        -- Add indexes for performance
        CREATE INDEX ON transcript_jobs(status, next_attempt_at);
        CREATE INDEX ON transcript_jobs(video_id);
        CREATE INDEX ON transcript_jobs(created_at DESC);
        
        RAISE NOTICE 'transcript_jobs table created successfully';
    ELSE
        RAISE NOTICE 'transcript_jobs table already exists, skipping creation';
    END IF;
END $$;

-- Add transcript_text column to videos table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcript_text') THEN
        ALTER TABLE videos ADD COLUMN transcript_text text;
        RAISE NOTICE 'transcript_text column added to videos table';
    ELSE
        RAISE NOTICE 'transcript_text column already exists in videos table, skipping';
    END IF;
END $$;

-- Add updated_at trigger for transcript_jobs
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language plpgsql;

-- Create trigger if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_trigger WHERE tgname = 'update_transcript_jobs_updated_at') THEN
        CREATE TRIGGER update_transcript_jobs_updated_at
            BEFORE UPDATE ON transcript_jobs
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        RAISE NOTICE 'update_transcript_jobs_updated_at trigger created';
    ELSE
        RAISE NOTICE 'update_transcript_jobs_updated_at trigger already exists, skipping';
    END IF;
END $$;

-- Add captions table for storing transcript metadata (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'captions') THEN
        CREATE TABLE captions(
            id uuid primary key default gen_random_uuid(),
            video_id uuid not null references videos(id) on delete cascade,
            provider text not null,
            lang text default 'en',
            srt_url text,
            created_at timestamptz default now()
        );
        
        -- Add index for captions
        CREATE INDEX ON captions(video_id, lang);
        
        RAISE NOTICE 'captions table created successfully';
    ELSE
        RAISE NOTICE 'captions table already exists, skipping creation';
    END IF;
END $$;

-- Add comments for documentation (these will be added/replaced)
COMMENT ON TABLE transcript_jobs IS 'Queue for managing transcription jobs with retry logic';
COMMENT ON COLUMN transcript_jobs.status IS 'Job status: queued, running, done, error, dead';
COMMENT ON COLUMN transcript_jobs.attempts IS 'Number of processing attempts made';
COMMENT ON COLUMN transcript_jobs.next_attempt_at IS 'When to retry this job (exponential backoff)';
COMMENT ON COLUMN videos.transcript_text IS 'Plain text transcript for search and chapter generation';
COMMENT ON TABLE captions IS 'Stores transcript metadata and SRT file references';

-- Final verification query
SELECT 
    'Migration completed successfully!' as status,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcript_jobs') as transcript_jobs_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'transcript_text') as transcript_text_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'captions') as captions_exists;
