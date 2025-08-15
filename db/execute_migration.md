# Database Migration Execution Guide

## Step 1: Access Supabase Dashboard

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar

## Step 2: Execute Migration

Copy and paste the following SQL into the SQL Editor:

```sql
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
```

## Step 3: Verify Migration

After executing, run this query to verify the migration:

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('transcript_jobs', 'captions');

-- Check if column was added to videos
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'videos' 
AND column_name = 'transcript_text';

-- Check if indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('transcript_jobs', 'captions');
```

## Expected Results

You should see:
- ✅ `transcript_jobs` table created
- ✅ `captions` table created  
- ✅ `transcript_text` column added to `videos` table
- ✅ Indexes created for performance
- ✅ Trigger created for `updated_at` timestamps

## Step 4: Test Job Creation

Test that the job queue works by creating a test job:

```sql
-- Insert a test job (replace with actual video_id)
INSERT INTO transcript_jobs (video_id, status, provider)
VALUES (
  (SELECT id FROM videos LIMIT 1), 
  'queued', 
  'deepgram'
);

-- Verify job was created
SELECT * FROM transcript_jobs ORDER BY created_at DESC LIMIT 5;
```

## Next Steps

After successful migration:
1. ✅ **Database infrastructure ready**
2. 🔄 **Set up Cloudflare signing keys**
3. 🔄 **Test signed URL generation**
4. 🔄 **Update webhook to create jobs**

## Troubleshooting

### Error: "relation already exists"
- The `captions` table might already exist
- This is fine - the migration will skip it

### Error: "column already exists"  
- The `transcript_text` column might already exist
- This is fine - the migration will skip it

### Error: "function already exists"
- The `update_updated_at_column` function might already exist
- This is fine - it will be replaced
