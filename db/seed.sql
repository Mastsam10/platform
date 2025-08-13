-- Seed data for Platform database
-- Run this after creating the schema

-- Insert sample denominations
INSERT INTO denominations (name, slug) VALUES
('Baptist', 'baptist'),
('Methodist', 'methodist'),
('Presbyterian', 'presbyterian'),
('Lutheran', 'lutheran'),
('Catholic', 'catholic'),
('Non-denominational', 'non-denominational');

-- Insert sample users (you'll need to create these through auth first)
-- These are placeholder UUIDs - replace with actual user IDs from Supabase Auth
INSERT INTO users (id, email, name, role) VALUES
('11111111-1111-1111-1111-111111111111', 'pastor@example.com', 'Pastor John', 'church_admin'),
('22222222-2222-2222-2222-222222222222', 'creator@example.com', 'Video Creator', 'creator');

-- Insert sample channels
INSERT INTO channels (id, owner_id, type, name, slug, denomination, bio) VALUES
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'church', 'First Baptist Church', 'first-baptist', 'Baptist', 'A welcoming community of faith'),
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'creator', 'Faithful Teachings', 'faithful-teachings', 'Non-denominational', 'Sharing biblical wisdom and insights');

-- Insert sample addresses
INSERT INTO addresses (id, line1, city, region, country, postal, lat, lng) VALUES
('55555555-5555-5555-5555-555555555555', '123 Main St', 'Springfield', 'IL', 'USA', '62701', 39.7817, -89.6501);

-- Insert sample churches
INSERT INTO churches (id, channel_id, address_id, giving_url, website) VALUES
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', 'https://give.firstbaptist.org', 'https://firstbaptist.org');

-- Insert sample service times
INSERT INTO service_times (id, church_id, weekday, time_utc, note) VALUES
('77777777-7777-7777-7777-777777777777', '66666666-6666-6666-6666-666666666666', 0, '10:30:00', 'Sunday Morning Service'),
('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', 0, '18:00:00', 'Sunday Evening Service');

-- Insert sample videos (with placeholder playback IDs)
INSERT INTO videos (id, channel_id, title, description, status, playback_id, duration_s, published_at) VALUES
('99999999-9999-9999-9999-999999999999', '33333333-3333-3333-3333-333333333333', 'Hope in Romans 8', 'A message about finding hope in difficult times through Romans 8', 'ready', 'demo-playback-id', 1800, NOW()),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '44444444-4444-4444-4444-444444444444', 'Understanding Grace', 'Exploring the concept of grace in the New Testament', 'ready', 'demo-playback-id-2', 2400, NOW());

-- Insert sample video tags
INSERT INTO video_tags (id, video_id, type, value, start_s) VALUES
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '99999999-9999-9999-9999-999999999999', 'passage', 'Romans 8:28', 120),
('cccccccc-cccc-cccc-cccc-cccccccccccc', '99999999-9999-9999-9999-999999999999', 'topic', 'hope', 0),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'passage', 'Ephesians 2:8-9', 300),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'topic', 'grace', 0);
