Goals (what changes)

Anyone can watch. Anyone can create a channel.

“Church pages” are just channels with optional location, service times, and giving link → powers Near Me and This Sunday.

Keep profiles lightweight (person-level), move all publishing/monetization to channels.

Data model (clean split)
Entities (recommended)

profiles – person-level (1:1 with auth user). Minimal public identity.

channels – publisher containers (individual, church, org). All videos belong to a channel.

channel_members – role-based access to a channel (owner/admin/editor).

videos, captions, video_tags – unchanged idea.

service_times – only for channels of type church.

subscriptions – viewers follow channels.

tips, memberships – Stripe Connect (per-channel).

Table changes (SQL snippets)
-- 1) Profiles (person-level)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  bio text,
  avatar_url text,
  banner_url text,
  website_url text,
  created_at timestamptz default now()
);

-- 2) Channels (publisher)
create type channel_type as enum ('individual','church','organization');

create table if not exists channels (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                  -- for /c/:slug
  display_name text not null,
  type channel_type not null default 'individual',
  about text,
  avatar_url text,
  banner_url text,
  verified boolean default false,

  -- church-only (nullable for others)
  denomination text,
  giving_url text,
  address text,
  city text,
  state text,
  country text default 'USA',
  postal_code text,
  geo geography(point,4326),                 -- PostGIS for “near me”
  timezone text,

  owner_id uuid references profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- 3) Channel members (RBAC)
create type channel_role as enum ('owner','admin','editor');

create table if not exists channel_members (
  channel_id uuid references channels(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  role channel_role not null,
  primary key (channel_id, profile_id)
);

-- 4) Service times (for church channels)
create table if not exists service_times (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  weekday int check (weekday between 0 and 6),  -- 0=Sun
  start_time time not null,
  tz text not null,                              -- e.g. "America/Chicago"
  note text
);

-- 5) Videos (belongs to a channel)
alter table videos
  add column channel_id uuid references channels(id) on delete cascade,
  add column status text check (status in ('draft','processing','ready','blocked')) default 'draft';

-- 6) Subscriptions (viewer follows channel)
create table if not exists subscriptions (
  channel_id uuid references channels(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (channel_id, profile_id)
);

-- 7) Indexes for discovery
create index if not exists channels_geo_idx on channels using gist(geo);
create index if not exists videos_channel_idx on videos(channel_id);
create index if not exists subs_profile_idx on subscriptions(profile_id);

RLS (shape)

profiles: public select on safe columns; update only by auth.uid() = id.

channels: public select where not blocked; insert/update by channel members.

channel_members: insert only if you’re the channel owner; select by members/admins; delete owner-only.

videos: public select where status='ready'; insert/update by channel members.

Permissions & roles (simple and scalable)

Global roles: viewer (default), mod, admin—kept in an allowlist table, not on profiles.

Channel roles: owner/admin/editor in channel_members.
Example: a church can add multiple admins; an org can have editors.

Flows to ship first (user & channel POV)
Viewer

Sign up → optional city/ZIP (or “Skip”) → interests (topics/books) → Home.

Follow channels; tip; join memberships; watch with CC/chapters.

Discover: Near Me (church channels with geo), This Sunday (recent uploads + service times).

Creator (individual/org)

Create channel (defaults to individual) → slug, avatar/banner → upload.

Connect Stripe (tips/memberships) → set membership tiers later.

Tag videos with topics/scripture (auto-suggest + editable).

Church channel

Toggle “This is a church channel” → enter address (geocode to geo), denomination, timezone, service times, giving link.

(Optional) Verify church (work email domain + minimal doc) → adds trust badge.

Appears in Near Me / This Sunday modules automatically.

API contracts (thin, predictable)
POST /api/channels
{ "display_name": "Grace Church", "slug": "grace-church", "type": "church" }

PATCH /api/channels/:id
{ "about": "...", "denomination": "Baptist", "giving_url": "https://...", "address": "...", "city":"..." }

POST /api/channels/:id/service-times
{ "weekday": 0, "start_time": "10:30:00", "tz": "America/Chicago", "note": "Main service" }

GET /api/near?lat=29.76&lng=-95.36&radius_km=25
→ list of church channels with distance + next service time

POST /api/subscriptions
{ "channel_id": "..." }

GET /api/channels/:slug
→ channel details, latest videos, service times (if church)

GET /api/watch/:videoId
→ video + channel + captions + chapters

Search & discovery (v1 rules)

Index: videos.title, videos.description, video_tags, channels.display_name, denomination.

Ranking: recency + engagement (views/tips) + local bonus if channel is church within radius of viewer’s location.

This Sunday: church channels with uploads in last 7 days; if none, show last 30 days sorted by proximity.

Location & privacy

Location lives on channels, not profiles. Individuals stay private by default.

City-level display is OK; exact address appears only if church wants to show it.

Add “Hide exact address (show city only)” for sensitive cases.

Monetization (channel-centric)

Stripe Connect at channel level:

Tips on watch page.

Memberships: 1–3 tiers (rename them to fit faith context: Supporter, Partner, Patron).

Platform fee starts 10%. For founding churches/creators, offer 90/10 split for first 6 months.

UI/UX tweaks (YouTube familiarity, your differentiators)
Routing

/ Home (rails: Trending / Recent / Following / Near You* / This Sunday*).

/watch/:id Watch page (player, CC, chapters, Tip, Membership CTA, church “Plan a Visit / Directions / Give”).

/c/:slug Channel (tabs: Videos / About; if church: Service times + Map on About).

/discover Filters (passage/topic/denomination/city radius).

/near Map + list (church channels only).

/studio Minimal uploader.

Components to (re)use

ChannelHeader (avatar/banner + Subscribe/Tip/Membership)

ServiceTimes (reads service_times)

DirectionsButton (opens maps with channel geo)

FollowButton (subscriptions)

Rail (configurable data source)

VideoCard (add church badge if channel.type='church')

MapList (church channels with distance chips)

What to cut (for now)

Full social network (DMs, comments moderation at scale) → start with creator-approved comments or off.

Advanced recommendations; start with simple recency/engagement + local boosts.

Multi-channel per user if it complicates MVP—allow one channel per user at first, then expand.

Two-week build checklist (solo)
Week 1

 Migrations (profiles, channels, channel_members, service_times, subscriptions, PostGIS enable).

 RLS policies as above.

 Channel create/edit pages (+ church toggle → address → geocode → geo).

 Upload → Cloudflare Stream → webhook → captions generate → watch page CC.

 /c/:slug basic channel page; /watch/:id page (Tip button wired but hidden if no Stripe).

 Near Me API (ST_DWithin) + simple /near page list.

Week 2

 Service times editor (weekday/time/tz).

 “This Sunday” rail on Home.

 Subscriptions (follow) + “From channels you follow” rail.

 Stripe Connect (tips) for channels; show CTA on watch page.

 SEO: sitemaps (channels, videos), OG tags; email sign-up for launch.

Definition of Done (MVP)

Create a channel, mark it as church, set address + service time → it appears in Near Me/This Sunday.

Upload a video → it’s playable with captions on /watch/:id.

Watch page shows Tip CTA if Stripe connected.

Follow a channel → appears in “Following” rail.

Basic moderation: Report button; age-gate toggle on video.

Growth & seeding (practical)

City-by-city rollout: pick 1–2 metro areas; recruit 25–50 churches/creators each; white-glove onboarding (we’ll set up their channel/service times and import latest 5 sermons).

Founding perks: homepage lanes + 90/10 split for 6 months.

Clips (v1.1): one-click 30–60s scripture clip → auto verse overlay → share to Instagram/shorts; drives back to watch page.

Risks & counters

Moderation load → creator-approved comments only; report queue SLA; age-gate labels; DMCA template + email.

Geo accuracy → let churches pin on map; store tz; validate address via geocoder.

Low creator adoption → manual seeding + perks + import tooling.

Costs → keep to Cloudflare Stream + 720p default; no Deepgram for now.

TL;DR (what to actually change)

Move church fields from users → channels.

Keep profiles minimal; make channels first-class.

Implement channel RBAC, PostGIS, service_times, subscriptions.

Ship Near Me / This Sunday powered by channel geo + service times.

Keep captions native via Cloudflare; add transcript search later if needed.