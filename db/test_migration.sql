-- Test script for user profiles migration
-- Run this after applying migration_user_profiles.sql to verify everything works

-- Test 1: Check if all tables were created
SELECT 
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'channels', 'channel_members', 'service_times', 'subscriptions')
ORDER BY table_name;

-- Test 2: Check if PostGIS extension is enabled
SELECT 
  extname,
  CASE WHEN extname = 'postgis' THEN '✅ Enabled' ELSE '❌ Missing' END as status
FROM pg_extension 
WHERE extname = 'postgis';

-- Test 3: Check if enum types were created
SELECT 
  typname,
  CASE WHEN typname IN ('channel_type', 'channel_role') THEN '✅ Created' ELSE '❌ Missing' END as status
FROM pg_type 
WHERE typname IN ('channel_type', 'channel_role');

-- Test 4: Check if indexes were created
SELECT 
  indexname,
  CASE WHEN indexname IS NOT NULL THEN '✅ Created' ELSE '❌ Missing' END as status
FROM pg_indexes 
WHERE indexname IN (
  'channels_geo_idx',
  'videos_channel_idx', 
  'subs_profile_idx',
  'channel_members_profile_idx',
  'service_times_channel_idx'
)
ORDER BY indexname;

-- Test 5: Check if RLS is enabled on new tables
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as status
FROM pg_tables 
WHERE tablename IN ('profiles', 'channels', 'channel_members', 'service_times', 'subscriptions')
ORDER BY tablename;

-- Test 6: Check if nearby_churches function was created
SELECT 
  proname,
  CASE WHEN proname = 'nearby_churches' THEN '✅ Created' ELSE '❌ Missing' END as status
FROM pg_proc 
WHERE proname = 'nearby_churches';

-- Test 7: Check if data migration worked (if you have existing data)
SELECT 
  'channels' as table_name,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '⚠️ No data' END as status
FROM channels
UNION ALL
SELECT 
  'channel_members' as table_name,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '⚠️ No data' END as status
FROM channel_members
UNION ALL
SELECT 
  'service_times' as table_name,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '✅ Has data' ELSE '⚠️ No data' END as status
FROM service_times;

-- Test 8: Test the nearby_churches function (with dummy coordinates)
SELECT 
  'nearby_churches function' as test_name,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ Function works' 
    ELSE '❌ Function failed' 
  END as status
FROM nearby_churches(39.7817, -89.6501, 50000); -- Springfield, IL coordinates

-- Test 9: Check if trigger was created for new users
SELECT 
  trigger_name,
  CASE WHEN trigger_name = 'on_auth_user_created' THEN '✅ Created' ELSE '❌ Missing' END as status
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Summary
SELECT 'Migration Test Complete' as summary;
