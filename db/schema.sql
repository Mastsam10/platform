-- Core database schema for Platform
-- Week 1: users, channels, videos tables

-- Users table
create table users(
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text, 
  role text check (role in ('viewer','creator','church_admin','mod','admin')) default 'viewer',
  created_at timestamptz default now()
);

-- Channels table
create table channels(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id),
  type text check (type in ('church','creator')) not null,
  name text not null, 
  slug text unique not null,
  denomination text, 
  bio text, 
  avatar_url text, 
  banner_url text
);

-- Addresses table
create table addresses(
  id uuid primary key default gen_random_uuid(),
  line1 text, 
  city text, 
  region text, 
  country text, 
  postal text,
  lat double precision, 
  lng double precision
);

-- Churches table
create table churches(
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) unique,
  address_id uuid references addresses(id),
  giving_url text, 
  website text
);

-- Service times table
create table service_times(
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id),
  weekday int check (weekday between 0 and 6),
  time_utc time, 
  note text
);

-- Videos table
create table videos(
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id),
  title text not null, 
  description text,
  status text check (status in ('draft','processing','ready')) default 'draft',
  playback_id text, 
  duration_s int, 
  published_at timestamptz, 
  srt_url text,
  created_at timestamptz default now(),
  asset_id text,
  aspect_ratio text default '16/9',
  upload_id text
);

-- Video tags table
create table video_tags(
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id),
  type text check (type in ('passage','topic','denomination','city')),
  value text not null, 
  start_s int
);

-- Tips table
create table tips(
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id),
  user_id uuid references users(id),
  amount_cents int not null,
  currency text default 'usd',
  stripe_payment_id text,
  created_at timestamptz default now()
);

-- Memberships table
create table memberships(
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id),
  user_id uuid references users(id),
  plan_id text,
  status text,
  stripe_sub_id text,
  started_at timestamptz default now(),
  ended_at timestamptz
);

-- Reports table
create table reports(
  id uuid primary key default gen_random_uuid(),
  object_type text,
  object_id uuid,
  reason text,
  user_id uuid references users(id),
  status text default 'new',
  action text,
  created_at timestamptz default now()
);

-- Denominations table
create table denominations(
  id uuid primary key default gen_random_uuid(),
  name text not null, 
  slug text unique not null
);

-- Indexes
create index on video_tags(video_id, type, value);
create index on videos(channel_id, published_at DESC);
create index on tips(video_id, created_at DESC);
create index on memberships(channel_id, user_id);
create index on reports(object_type, object_id, status);
