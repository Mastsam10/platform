-- Migration: Cloudflare Stream Captions System
-- Date: 2024-01-XX
-- Description: Replace Deepgram integration with Cloudflare's native caption generation

-- Add transcripts table (replaces transcript_jobs complexity)
create table if not exists transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  lang text not null default 'en',
  status text not null check (status in ('pending','ready','error')) default 'pending',
  vtt_url text,                       -- where the .vtt can be fetched (CF public/signed URL)
  lines jsonb,                        -- array of {startMs, endMs, text}
  raw_vtt text,                       -- optional: store the original .vtt
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add unique constraint for one transcript per language per video
create unique index if not exists transcripts_video_lang_uidx
  on transcripts(video_id, lang);

-- Add index for video lookups
create index if not exists transcripts_video_idx
  on transcripts(video_id);

-- Add has_captions boolean to videos table
alter table videos add column if not exists has_captions boolean default false;

-- Add updated_at trigger for transcripts
create or replace function update_transcripts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_transcripts_updated_at
  before update on transcripts
  for each row
  execute function update_transcripts_updated_at();

-- Add comments for documentation
comment on table transcripts is 'Stores parsed transcript data from Cloudflare Stream captions';
comment on column transcripts.lines is 'JSON array of {startMs, endMs, text} for transcript display';
comment on column transcripts.vtt_url is 'URL to fetch VTT file from Cloudflare Stream';
comment on column videos.has_captions is 'Indicates if video has captions available';
