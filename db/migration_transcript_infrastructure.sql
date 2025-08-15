-- Migration: Add transcript infrastructure
-- Date: 2024-01-XX
-- Description: Add transcript_jobs table and enhance videos table for transcription support

-- Add transcript_jobs table with retry logic and proper constraints
create table transcript_jobs(
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

-- Add transcript fields to videos table
-- Note: srt_url already exists, adding transcript_text
alter table videos add column transcript_text text;

-- Add indexes for performance
create index on transcript_jobs(status, next_attempt_at);
create index on transcript_jobs(video_id);
create index on transcript_jobs(created_at DESC);

-- Add updated_at trigger for transcript_jobs
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_transcript_jobs_updated_at
  before update on transcript_jobs
  for each row
  execute function update_updated_at_column();

-- Add captions table for storing transcript metadata
create table captions(
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references videos(id) on delete cascade,
  provider text not null,
  lang text default 'en',
  srt_url text,
  created_at timestamptz default now()
);

-- Add index for captions
create index on captions(video_id, lang);

-- Add comments for documentation
comment on table transcript_jobs is 'Queue for managing transcription jobs with retry logic';
comment on column transcript_jobs.status is 'Job status: queued, running, done, error, dead';
comment on column transcript_jobs.attempts is 'Number of processing attempts made';
comment on column transcript_jobs.next_attempt_at is 'When to retry this job (exponential backoff)';
comment on column videos.transcript_text is 'Plain text transcript for search and chapter generation';
comment on table captions is 'Stores transcript metadata and SRT file references';
