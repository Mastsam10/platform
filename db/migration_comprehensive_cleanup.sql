-- Migration: Comprehensive Database Cleanup
-- Date: 2024-01-XX
-- Description: Remove all unnecessary tables and keep only core video platform functionality

-- ========================================
-- STEP 1: Remove all legacy and unnecessary tables
-- ========================================

-- Remove old transcript system tables
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transcript_jobs') THEN
    DROP TABLE transcript_jobs CASCADE;
    RAISE NOTICE 'transcript_jobs table dropped successfully';
  ELSE
    RAISE NOTICE 'transcript_jobs table does not exist (already cleaned up)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'captions') THEN
    DROP TABLE captions CASCADE;
    RAISE NOTICE 'captions table dropped successfully';
  ELSE
    RAISE NOTICE 'captions table does not exist (already cleaned up)';
  END IF;
END $$;

-- Remove church-specific tables (not needed for core video platform)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'addresses') THEN
    DROP TABLE addresses CASCADE;
    RAISE NOTICE 'addresses table dropped successfully';
  ELSE
    RAISE NOTICE 'addresses table does not exist (already cleaned up)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'churches') THEN
    DROP TABLE churches CASCADE;
    RAISE NOTICE 'churches table dropped successfully';
  ELSE
    RAISE NOTICE 'churches table does not exist (already cleaned up)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'denominations') THEN
    DROP TABLE denominations CASCADE;
    RAISE NOTICE 'denominations table dropped successfully';
  ELSE
    RAISE NOTICE 'denominations table does not exist (already cleaned up)';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_times') THEN
    DROP TABLE service_times CASCADE;
    RAISE NOTICE 'service_times table dropped successfully';
  ELSE
    RAISE NOTICE 'service_times table does not exist (already cleaned up)';
  END IF;
END $$;

-- ========================================
-- STEP 2: Remove legacy columns from videos table
-- ========================================

-- Remove srt_url column (replaced by transcripts.vtt_url)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'videos' AND column_name = 'srt_url') THEN
    ALTER TABLE videos DROP COLUMN srt_url;
    RAISE NOTICE 'srt_url column dropped successfully';
  ELSE
    RAISE NOTICE 'srt_url column does not exist (already cleaned up)';
  END IF;
END $$;

-- Remove asset_id column (Cloudflare uses UID as both asset_id and playback_id)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'videos' AND column_name = 'asset_id') THEN
    ALTER TABLE videos DROP COLUMN asset_id;
    RAISE NOTICE 'asset_id column dropped successfully';
  ELSE
    RAISE NOTICE 'asset_id column does not exist (already cleaned up)';
  END IF;
END $$;

-- Remove upload_id column (no longer needed with Cloudflare Direct Creator Uploads)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'videos' AND column_name = 'upload_id') THEN
    ALTER TABLE videos DROP COLUMN upload_id;
    RAISE NOTICE 'upload_id column dropped successfully';
  ELSE
    RAISE NOTICE 'upload_id column does not exist (already cleaned up)';
  END IF;
END $$;

-- ========================================
-- STEP 3: Clean up any orphaned triggers/functions
-- ========================================

-- Drop all legacy triggers and functions
DO $$
DECLARE
    trigger_name text;
    function_name text;
BEGIN
    -- Drop transcript_jobs related triggers
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger WHERE tgname LIKE '%transcript_jobs%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON transcript_jobs CASCADE';
        RAISE NOTICE 'Dropped trigger: %', trigger_name;
    END LOOP;
    
    -- Drop captions related triggers
    FOR trigger_name IN 
        SELECT tgname FROM pg_trigger WHERE tgname LIKE '%captions%'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_name || ' ON captions CASCADE';
        RAISE NOTICE 'Dropped trigger: %', trigger_name;
    END LOOP;
    
    -- Drop legacy functions
    FOR function_name IN 
        SELECT proname FROM pg_proc WHERE proname IN (
            'update_transcript_jobs_updated_at',
            'update_captions_updated_at'
        )
    LOOP
        EXECUTE 'DROP FUNCTION IF EXISTS ' || function_name || '() CASCADE';
        RAISE NOTICE 'Dropped function: %', function_name;
    END LOOP;
END $$;

-- ========================================
-- STEP 4: Verify cleanup and show final state
-- ========================================

-- Show all remaining tables with status
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('videos', 'transcripts', 'video_tags', 'channels', 'users') 
    THEN '✅ KEEPING (Core Platform)'
    ELSE '❌ SHOULD BE REMOVED'
  END AS status,
  CASE 
    WHEN table_name IN ('videos', 'transcripts', 'video_tags', 'channels', 'users') 
    THEN 'Essential for video platform functionality'
    ELSE 'Legacy or unnecessary table'
  END AS reason
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY 
  CASE WHEN table_name IN ('videos', 'transcripts', 'video_tags', 'channels', 'users') THEN 0 ELSE 1 END,
  table_name;

-- Show videos table columns
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name IN ('id', 'channel_id', 'title', 'description', 'status', 'playback_id', 'duration_s', 'published_at', 'created_at', 'aspect_ratio', 'updated_at', 'has_captions')
    THEN '✅ KEEPING'
    ELSE '❌ SHOULD BE REMOVED'
  END AS status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'videos'
ORDER BY column_name;

-- ========================================
-- STEP 5: Add helpful comments
-- ========================================

COMMENT ON TABLE videos IS 'Core video table for Cloudflare Stream integration';
COMMENT ON TABLE transcripts IS 'Stores parsed transcript data from Cloudflare Stream captions';
COMMENT ON TABLE video_tags IS 'Stores chapters, topics, and other video metadata';
COMMENT ON TABLE channels IS 'Organizational structure for videos (churches, creators)';
COMMENT ON TABLE users IS 'User authentication and authorization';

-- ========================================
-- SUMMARY
-- ========================================

-- This migration removes ALL unnecessary tables:
-- ❌ transcript_jobs table (replaced by transcripts)
-- ❌ captions table (replaced by transcripts)  
-- ❌ addresses table (not needed for core platform)
-- ❌ churches table (not needed for core platform)
-- ❌ denominations table (not needed for core platform)
-- ❌ service_times table (not needed for core platform)
-- ❌ videos.srt_url column (replaced by transcripts.vtt_url)
-- ❌ videos.asset_id column (Cloudflare uses UID)
-- ❌ videos.upload_id column (not needed with Direct Creator Uploads)
--
-- This keeps ONLY essential tables:
-- ✅ videos table (core functionality)
-- ✅ transcripts table (new Cloudflare captions)
-- ✅ video_tags table (chapters and topics)
-- ✅ channels table (organization)
-- ✅ users table (authentication)

-- ========================================
-- FINAL VERIFICATION
-- ========================================

-- Count remaining tables
SELECT 
  COUNT(*) as total_tables,
  COUNT(CASE WHEN table_name IN ('videos', 'transcripts', 'video_tags', 'channels', 'users') THEN 1 END) as essential_tables,
  COUNT(CASE WHEN table_name NOT IN ('videos', 'transcripts', 'video_tags', 'channels', 'users') THEN 1 END) as unnecessary_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';
