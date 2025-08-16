-- Migration: Cleanup Legacy Tables and Columns
-- Date: 2024-01-XX
-- Description: Remove old Deepgram/Mux tables and columns after Cloudflare Stream migration

-- ========================================
-- STEP 1: Remove legacy tables
-- ========================================

-- Drop transcript_jobs table (replaced by transcripts table)
drop table if exists transcript_jobs cascade;

-- Drop captions table (replaced by transcripts table)
drop table if exists captions cascade;

-- ========================================
-- STEP 2: Remove legacy columns from videos table
-- ========================================

-- Remove srt_url column (replaced by transcripts.vtt_url)
alter table videos drop column if exists srt_url;

-- Remove asset_id column (Cloudflare uses UID as both asset_id and playback_id)
alter table videos drop column if exists asset_id;

-- Remove upload_id column (no longer needed with Cloudflare Direct Creator Uploads)
alter table videos drop column if exists upload_id;

-- ========================================
-- STEP 3: Clean up any orphaned triggers/functions
-- ========================================

-- Drop transcript_jobs triggers if they exist
drop trigger if exists update_transcript_jobs_updated_at on transcript_jobs;
drop function if exists update_transcript_jobs_updated_at();

-- Drop captions triggers if they exist  
drop trigger if exists update_captions_updated_at on captions;
drop function if exists update_captions_updated_at();

-- ========================================
-- STEP 4: Verify cleanup
-- ========================================

-- Show remaining tables
select 
  table_name,
  case 
    when table_name in ('videos', 'transcripts', 'video_tags', 'channels', 'users') 
    then '✅ KEEPING'
    else '❌ SHOULD BE REMOVED'
  end as status
from information_schema.tables 
where table_schema = 'public' 
and table_type = 'BASE TABLE'
order by table_name;

-- Show videos table columns
select 
  column_name,
  data_type,
  case 
    when column_name in ('id', 'channel_id', 'title', 'description', 'status', 'playback_id', 'duration_s', 'published_at', 'created_at', 'aspect_ratio', 'updated_at', 'has_captions')
    then '✅ KEEPING'
    else '❌ SHOULD BE REMOVED'
  end as status
from information_schema.columns 
where table_schema = 'public' 
and table_name = 'videos'
order by column_name;

-- ========================================
-- STEP 5: Add helpful comments
-- ========================================

comment on table videos is 'Core video table for Cloudflare Stream integration';
comment on table transcripts is 'Stores parsed transcript data from Cloudflare Stream captions';
comment on table video_tags is 'Stores chapters, topics, and other video metadata';
comment on table channels is 'Organizational structure for videos (churches, creators)';
comment on table users is 'User authentication and authorization';

-- ========================================
-- SUMMARY
-- ========================================

-- This migration removes:
-- ❌ transcript_jobs table (replaced by transcripts)
-- ❌ captions table (replaced by transcripts)  
-- ❌ videos.srt_url column (replaced by transcripts.vtt_url)
-- ❌ videos.asset_id column (Cloudflare uses UID)
-- ❌ videos.upload_id column (not needed with Direct Creator Uploads)
--
-- This keeps:
-- ✅ videos table (core functionality)
-- ✅ transcripts table (new Cloudflare captions)
-- ✅ video_tags table (chapters and topics)
-- ✅ channels table (organization)
-- ✅ users table (authentication)
