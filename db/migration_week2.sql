-- Week 2 Migration: Add captions table for transcript storage
-- Run this in Supabase SQL editor

-- Add captions table for storing transcripts
create table if not exists captions(
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  provider text not null, -- 'deepgram', 'whisper', etc.
  lang text not null default 'en',
  srt_url text, -- URL to SRT file (or content stored directly)
  created_at timestamptz default now()
);

-- Add index for faster lookups
create index if not exists idx_captions_video_id on captions(video_id);
create index if not exists idx_captions_provider on captions(provider);

-- Add any missing columns to existing tables if needed
-- (These will be ignored if columns already exist)

-- Add srt_url column to videos table if it doesn't exist
do $$
begin
  if not exists (select 1 from information_schema.columns 
                 where table_name = 'videos' and column_name = 'srt_url') then
    alter table videos add column srt_url text;
  end if;
end $$;
