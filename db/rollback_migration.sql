-- Rollback script for user profiles migration
-- WARNING: This will drop the new tables and revert to the old schema
-- Only run this if you need to completely undo the migration

-- Step 1: Drop the trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Drop the function
DROP FUNCTION IF EXISTS handle_new_user();

-- Step 3: Drop the PostGIS function
DROP FUNCTION IF EXISTS nearby_churches(double precision, double precision, integer);

-- Step 4: Drop RLS policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Public channels are viewable by everyone" ON channels;
DROP POLICY IF EXISTS "Channel members can update channel" ON channels;
DROP POLICY IF EXISTS "Channel owners can insert channels" ON channels;

DROP POLICY IF EXISTS "Channel members can view membership" ON channel_members;
DROP POLICY IF EXISTS "Channel owners can manage members" ON channel_members;

DROP POLICY IF EXISTS "Public service times are viewable" ON service_times;
DROP POLICY IF EXISTS "Channel admins can manage service times" ON service_times;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON subscriptions;

-- Step 5: Drop indexes
DROP INDEX IF EXISTS channels_geo_idx;
DROP INDEX IF EXISTS videos_channel_idx;
DROP INDEX IF EXISTS subs_profile_idx;
DROP INDEX IF EXISTS channel_members_profile_idx;
DROP INDEX IF EXISTS service_times_channel_idx;
DROP INDEX IF EXISTS channels_slug_idx;
DROP INDEX IF EXISTS channels_type_idx;
DROP INDEX IF EXISTS channels_denomination_idx;
DROP INDEX IF EXISTS profiles_username_idx;

-- Step 6: Drop new tables (in reverse dependency order)
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS service_times;
DROP TABLE IF EXISTS channel_members;
DROP TABLE IF EXISTS channels;
DROP TABLE IF EXISTS profiles;

-- Step 7: Drop enum types
DROP TYPE IF EXISTS channel_role;
DROP TYPE IF EXISTS channel_type;

-- Step 8: Revert videos table changes
ALTER TABLE videos DROP COLUMN IF EXISTS status;

-- Step 9: Note about PostGIS
-- PostGIS extension will remain enabled - this is usually fine
-- If you want to remove it completely, run: DROP EXTENSION IF EXISTS postgis;

-- Rollback complete!
-- Note: This does NOT restore any data that was migrated
-- You would need to restore from a backup if you want the old data back
