-- Migration: User Profiles & Channel System
-- Based on userapproach.md - implements profiles, channels, channel_members, etc.
-- This migration preserves existing data while implementing the new schema

-- Step 1: Enable PostGIS extension for geospatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Step 2: Create new enum types
CREATE TYPE channel_type AS ENUM ('individual', 'church', 'organization');
CREATE TYPE channel_role AS ENUM ('owner', 'admin', 'editor');

-- Step 3: Create profiles table (person-level, 1:1 with auth users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  website_url text,
  created_at timestamptz DEFAULT now()
);

-- Step 4: Create new channels table (publisher containers)
CREATE TABLE IF NOT EXISTS channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,                  -- for /c/:slug
  display_name text NOT NULL,
  type channel_type NOT NULL DEFAULT 'individual',
  about text,
  avatar_url text,
  banner_url text,
  verified boolean DEFAULT false,

  -- church-only fields (nullable for others)
  denomination text,
  giving_url text,
  address text,
  city text,
  state text,
  country text DEFAULT 'USA',
  postal_code text,
  geo geography(point,4326),                 -- PostGIS for "near me"
  timezone text,

  owner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Step 5: Create channel_members table (RBAC)
CREATE TABLE IF NOT EXISTS channel_members (
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  role channel_role NOT NULL,
  PRIMARY KEY (channel_id, profile_id)
);

-- Step 6: Create new service_times table (for church channels)
CREATE TABLE IF NOT EXISTS service_times (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  weekday int CHECK (weekday BETWEEN 0 AND 6),  -- 0=Sun
  start_time time NOT NULL,
  tz text NOT NULL,                              -- e.g. "America/Chicago"
  note text
);

-- Step 7: Create subscriptions table (viewer follows channel)
CREATE TABLE IF NOT EXISTS subscriptions (
  channel_id uuid REFERENCES channels(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (channel_id, profile_id)
);

-- Step 8: Update videos table to work with new schema
-- Add new status values and ensure channel_id exists
ALTER TABLE videos 
  ADD COLUMN IF NOT EXISTS status text CHECK (status IN ('draft','processing','ready','blocked')) DEFAULT 'draft';

-- Step 9: Create indexes for discovery and performance
CREATE INDEX IF NOT EXISTS channels_geo_idx ON channels USING gist(geo);
CREATE INDEX IF NOT EXISTS videos_channel_idx ON videos(channel_id);
CREATE INDEX IF NOT EXISTS subs_profile_idx ON subscriptions(profile_id);
CREATE INDEX IF NOT EXISTS channel_members_profile_idx ON channel_members(profile_id);
CREATE INDEX IF NOT EXISTS service_times_channel_idx ON service_times(channel_id);

-- Step 10: Migrate existing data
-- Note: This section will be executed after the tables are created

-- Migrate existing users to profiles (placeholder - will be populated by auth)
-- This will be handled by the application when users first log in

-- Migrate existing channels to new structure
INSERT INTO channels (
  id,
  slug,
  display_name,
  type,
  about,
  avatar_url,
  banner_url,
  denomination,
  owner_id,
  created_at
)
SELECT 
  c.id,
  c.slug,
  c.name as display_name,
  CASE 
    WHEN c.type = 'church' THEN 'church'::channel_type
    ELSE 'individual'::channel_type
  END as type,
  c.bio as about,
  c.avatar_url,
  c.banner_url,
  c.denomination,
  c.owner_id,
  c.created_at
FROM channels c
ON CONFLICT (id) DO NOTHING;

-- Migrate existing church data to new channel structure
UPDATE channels 
SET 
  giving_url = ch.giving_url,
  address = a.line1,
  city = a.city,
  state = a.region,
  country = a.country,
  postal_code = a.postal,
  geo = ST_SetSRID(ST_MakePoint(a.lng, a.lat), 4326)
FROM churches ch
LEFT JOIN addresses a ON ch.address_id = a.id
WHERE channels.id = ch.channel_id;

-- Migrate existing service times to new structure
INSERT INTO service_times (
  id,
  channel_id,
  weekday,
  start_time,
  tz,
  note
)
SELECT 
  st.id,
  ch.channel_id,
  st.weekday,
  st.time_utc as start_time,
  'UTC' as tz,  -- Default to UTC, can be updated later
  st.note
FROM service_times st
JOIN churches ch ON st.church_id = ch.id
ON CONFLICT (id) DO NOTHING;

-- Create channel members for existing channel owners
INSERT INTO channel_members (channel_id, profile_id, role)
SELECT 
  c.id as channel_id,
  c.owner_id as profile_id,
  'owner'::channel_role as role
FROM channels c
WHERE c.owner_id IS NOT NULL
ON CONFLICT (channel_id, profile_id) DO NOTHING;

-- Step 11: Set up Row Level Security (RLS) policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Channels policies
CREATE POLICY "Public channels are viewable by everyone" ON channels
  FOR SELECT USING (true);

CREATE POLICY "Channel members can update channel" ON channels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM channel_members 
      WHERE channel_id = channels.id 
      AND profile_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Channel owners can insert channels" ON channels
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Channel members policies
CREATE POLICY "Channel members can view membership" ON channel_members
  FOR SELECT USING (
    profile_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM channel_members cm2
      WHERE cm2.channel_id = channel_members.channel_id
      AND cm2.profile_id = auth.uid()
      AND cm2.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Channel owners can manage members" ON channel_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM channel_members cm2
      WHERE cm2.channel_id = channel_members.channel_id
      AND cm2.profile_id = auth.uid()
      AND cm2.role = 'owner'
    )
  );

-- Service times policies
CREATE POLICY "Public service times are viewable" ON service_times
  FOR SELECT USING (true);

CREATE POLICY "Channel admins can manage service times" ON service_times
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM channel_members
      WHERE channel_id = service_times.channel_id
      AND profile_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Subscriptions policies
CREATE POLICY "Users can view own subscriptions" ON subscriptions
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "Users can manage own subscriptions" ON subscriptions
  FOR ALL USING (profile_id = auth.uid());

-- Step 12: Create PostGIS function for nearby churches
CREATE OR REPLACE FUNCTION nearby_churches(
  user_lat double precision,
  user_lng double precision,
  radius_meters integer
)
RETURNS TABLE (
  id uuid,
  slug text,
  display_name text,
  type channel_type,
  denomination text,
  city text,
  state text,
  distance_meters double precision
)
LANGUAGE sql
AS $$
  SELECT 
    c.id,
    c.slug,
    c.display_name,
    c.type,
    c.denomination,
    c.city,
    c.state,
    ST_Distance(c.geo, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) as distance_meters
  FROM channels c
  WHERE 
    c.type = 'church'::channel_type
    AND c.geo IS NOT NULL
    AND ST_DWithin(
      c.geo::geography,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
$$;

-- Step 13: Add helper functions for profile management

-- Function to create profile for new auth user
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id, display_name, username)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'User'),
    COALESCE(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8))
  );
  RETURN new;
END;
$$;

-- Trigger to automatically create profile for new auth users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 14: Clean up old tables (optional - keep for now)
-- Note: Don't drop old tables yet - keep them for reference during migration
-- They can be dropped after confirming the new system works

-- Step 15: Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS channels_slug_idx ON channels(slug);
CREATE INDEX IF NOT EXISTS channels_type_idx ON channels(type);
CREATE INDEX IF NOT EXISTS channels_denomination_idx ON channels(denomination);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Migration complete!
-- Next steps:
-- 1. Test the migration in development
-- 2. Update API endpoints to use new schema
-- 3. Update frontend components
-- 4. Test data migration thoroughly
-- 5. Deploy to production
