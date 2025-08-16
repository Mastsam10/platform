-- Migration: Fix video table columns
-- Date: 2024-01-XX
-- Description: Add missing columns to videos table for Cloudflare captions system

-- Add updated_at column to videos table
alter table videos add column if not exists updated_at timestamptz default now();

-- Add has_captions column to videos table
alter table videos add column if not exists has_captions boolean default false;

-- Add updated_at trigger for videos table
create or replace function update_videos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Drop trigger if it exists
drop trigger if exists update_videos_updated_at on videos;

-- Create trigger
create trigger update_videos_updated_at
  before update on videos
  for each row
  execute function update_videos_updated_at();

-- Add comments for documentation
comment on column videos.updated_at is 'Timestamp when video was last updated';
comment on column videos.has_captions is 'Indicates if video has captions available';
