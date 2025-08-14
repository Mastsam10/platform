1) Product spec (v1 + v1.1)

**CORE UPLOAD ARCHITECTURE - CRITICAL FOR DEVELOPMENT:**
- **Users upload their own video files directly** (MP4, MOV, etc.) - NOT URLs from YouTube/Vimeo
- **Direct file upload to Cloudflare Stream** - like YouTube, Vimeo, or any video platform
- **YouTube-like user experience**: Select file → Upload → Process → Available
- **No URL copying, no external video imports** - only direct file uploads

User journeys
Viewer: land → rails (Near You/This Sunday/By Passage) → watch → jump by chapter → tip or follow → plan a visit (map + calendar).
Creator/Church Admin: create channel → connect Stripe → set denomination/address/service times/giving links → **upload video file** → auto-transcode → transcript → scripture chapters → publish → view analytics.
Moderator (you + creator): review reports queue → age-gate/label or remove if illegal/DMCA → handle appeals.

v1 features
**DIRECT FILE UPLOAD** → Users upload their own video files (MP4, MOV, etc.) directly to Cloudflare Stream → HLS playback.

Auto transcript (Whisper/Deepgram) → scripture-aware chapters (regex + LLM fallback).

Discovery by passage, topic, denomination, city; “Near Me” and “This Sunday” (last 7 days + service times).

Church pages (address, service times, giving link), tips & memberships (Stripe Connect).

Minimal moderation: report, block/mute, age-gate, DMCA intake & queue.

v1.1 (after beta)
Clipper to generate Shorts with verse overlay; simulcast helper; playlists/series; local heatmap; creator-approved comments.

Not now
Full RTMP studio, heavy recommendation engine, native apps, ad server, offline downloads, full live-chat moderation suite, auto-translation/dubbing.

2) System architecture

**UPLOAD ARCHITECTURE - TECHNICAL IMPLEMENTATION:**
- **Frontend**: File input → FormData → Direct upload to Cloudflare Stream URL
- **Backend**: Generate Cloudflare Stream upload URL → Return to frontend
- **Cloudflare Stream**: Process video → Send webhook when ready
- **Post-processing**: Transcription → Chapters → Search indexing

High-level: Next.js (SSR + RSC) ↔ API routes (/api) ↔ Supabase (Auth/Postgres/Storage) ↔ Video provider (Cloudflare Stream webhooks) ↔ Transcripts worker ↔ Chapterizer service ↔ Search indexer (Meilisearch/FTS).

API contracts (samples)
POST /api/upload/init

json
Copy
Edit
{ "channelId":"ch_123","title":"Hope in Romans 8","description":"…","denomination":"Baptist","addressId":"addr_9","tags":["faith","suffering"],"serviceDate":"2025-08-17" }
Response

json
Copy
Edit
{ "uploadUrl":"https://api.cloudflare.com/client/v4/accounts/.../stream/.../upload","videoId":"vid_789" }
POST /api/webhooks/video (Mux/CF)

json
Copy
Edit
{ "provider":"mux","type":"video.asset.ready","data":{"asset_id":"asst_1","duration":2140,"playback_id":"pb_2","videoId":"vid_789"} }
POST /api/transcripts/start

json
Copy
Edit
{ "videoId":"vid_789","provider":"deepgram","lang":"en" }
POST /api/chapters/generate

json
Copy
Edit
{ "videoId":"vid_789","srtUrl":"https://.../vid_789.srt" }
POST /api/tips

json
Copy
Edit
{ "videoId":"vid_789","amount":500,"currency":"usd","customerId":"usr_22" }
POST /api/reports

json
Copy
Edit
{ "objectType":"video","objectId":"vid_789","reason":"copyright","notes":"…"}
POST /api/church/claim

json
Copy
Edit
{ "churchId":"church_12","domainEmail":"pastor@firstbaptist.org" }
Data model (tables & key indexes)
users(id, role enum, email, name, created_at) IDX(email)

channels(id, owner_id FK users, type enum[church,creator], name, slug, denomination, bio, avatar_url, banner_url) UNIQ(slug)

churches(id, channel_id FK, address_id FK, giving_url, website)

addresses(id, line1, city, region, country, postal, lat, lng) GIST(geography)

service_times(id, church_id FK, weekday int, time_utc, note)

videos(id, channel_id FK, title, description, status enum[draft,ready], playback_id, duration_s, published_at, srt_url) IDX(channel_id,published_at DESC)

captions(id, video_id FK, provider, lang, srt_url, created_at)

video_tags(id, video_id FK, type enum[passage,topic,denomination,city], value, start_s INT NULL) IDX(video_id,type,value)

tips(id, video_id FK, user_id FK, amount_cents, currency, stripe_payment_id, created_at)

memberships(id, channel_id FK, user_id FK, plan_id, status, stripe_sub_id, started_at, ended_at)

reports(id, object_type, object_id, reason, user_id, status enum[new,actioned,closed], action enum[none,age_gate,remove], created_at)

denominations(id, name, slug)

Event flows
**DIRECT FILE UPLOAD FLOW**: User selects video file → direct upload to Cloudflare Stream → webhook (ready) → transcripts/start → on success store SRT → chapters/generate → insert video_tags (passages + topics) → index to search → visible in discovery rails.
Tip → Payout: POST /tips → Stripe intent → success → record in tips → Stripe Connect routes funds to channel account (platform fee retained).

3) Dev environment & ops
Scaffold

bash
Copy
Edit
/app (routes)
/components
/lib (clients: mux, stripe, supabase)
/db (schema.sql, seed.sql)
/api (route handlers)
/scripts (indexer, chapterizer, transcripts)
/styles
.env.example

makefile
Copy
Edit
NEXT_PUBLIC_SITE_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
MUX_TOKEN_ID=
MUX_TOKEN_SECRET=
CF_STREAM_TOKEN=
DEEPGRAM_API_KEY=
OPENAI_API_KEY=        # LLM fallback for chapters
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
MAPBOX_TOKEN=          # or leave if using OSM/Photon
MEILISEARCH_HOST=
MEILISEARCH_MASTER_KEY=
CI/CD: Vercel previews on PR; checks: tsc --noEmit, eslint, vitest, basic Playwright e2e (upload, watch, tip).
Observability: route-level logs, webhook error alerts, metrics: ingest_success, ingest_fail, transcript_queue_depth, chapter_latency, HLS_4xx/5xx.
Backups: Supabase daily; version schema via drizzle or SQL migrations; seed.sql for demo data.

4) Security, privacy, compliance
Auth/RBAC: Supabase Auth; roles: viewer, creator, church_admin, mod, admin; policies to restrict channel actions.

DMCA: public page + form → creates reports with reason=copyright; designated agent email; repeat-infringer policy (auto-flag on 3 upheld).

Reporting/appeals: report modal → queue view for mods → actions: label/age-gate/remove; appeal email → ticket id.

Privacy/ToS: “not for kids”; PII minimal; delete on request; logs 30–90 days; IP/city for “Near Me” only with consent.

Abuse-prevention: rate-limit uploads & reports (IP + user), upload size caps, MIME/type sniffing, profanity filter (title/description).

5) Transcripts & scripture chapters
Transcript job: triggered by “video.ready” webhook; call Deepgram/Whisper; retry 3× with expo backoff; store SRT & plain text.

Scripture detection:

Regex for ([1-3]?\s?[A-Za-z]+)\s(\d{1,3}):(\d{1,3})(–|-)?(\d{1,3})?

Normalize to canonical book list (66-book map + aliases).

For fuzzy mentions (“Paul in Romans eight”), send short window text to LLM → map to Romans 8.

Create time-coded video_tags(type=passage, value=”Romans 8:28”, start_s).

Topics/denomination: keyword dictionaries (anxiety, forgiveness, marriage, Trinity, etc.); optional LLM classifier when confidence low.

Player: chapter sidebar → click → player.seekTo(start_s).

6) Search & discovery
Indexing: Meilisearch docs per video {title, description, passages[], topics[], denomination, city, lat,lng, published_at, engagement}.
Queries:

Passage: exact book:chapter or verse range.

Topic/denomination: filters + full-text.

Near me: HAVERSINE on lat/lng (or Meilisearch geo filter) within X miles.

This Sunday: videos with published_at >= lastSunday-1d ∧ church within radius ∧ service_times in next 7 days.
Ranking: recency desc + local distance boost + engagement (tips/views) + channel follow boost; down-rank clickbait (excess caps/exclamations).

7) Monetization
Stripe Connect (Express): creator onboarding → KYC → tips (one-off PaymentIntent); memberships (Subscriptions API).
Platform fee: 10% application_fee on both tips & memberships; monthly payouts; refund window 7 days; dispute webhook → notify channel.

8) UI/UX plan (YouTube + Netflix + Twitch/Spotify)
Design system: dark-first palette, 4/8 spacing grid, type scale 12–32, focus rings, AA contrast, motion 150–300ms, reduce-motion support.

Home: hero carousel (muted auto-preview) + rails: Continue Watching / Near You / This Sunday / By Passage / By Topic / Trending / From Churches You Follow. Cards show mini chapter ticks + distance badge.

Watch: player left; title, channel, Tip/Membership CTAs; passage/topic/denomination chips; Plan a Visit / Directions / Give buttons; right rail + mini-map.

Discover: grid + faceted filter bar (Passage picker → Book→Chapter; Topic pills; Denomination; City radius; Format; Language). Sort recency/distance/most watched/tipped.

Channel/Church: banner, avatar, denomination, service times, address map, Follow, Give; tabs: Videos, About, (Events later).

Onboarding: Viewer asks city/ZIP & denomination prefs; Creator connects Stripe, sets address & service times.

Nav: desktop left sidebar (Home, Near Me, Discover, Subscriptions, Your Clips); mobile bottom tabs (Home, Near Me, Upload, Subs, Profile).

Quality: LCP < 2.5s, CLS < 0.1; skeleton loaders; prefetch adjacent rails.

Components (props): VideoPlayer(src,chapters,onTip), Rail(title,items), VideoCard(video), ChapterList(chapters,onJump), TipButton(channelId), MembershipCTA(channelId,plans), ChurchCard(church), MapList(items,center,radius), FilterBar(filters,onChange), ReportModal(target), AgeGateDialog(onConfirm), StripeConnectButton(onboardUrl), ServiceTimes(list), DirectionsButton(lat,lng).

9) Week-by-week roadmap (12 weeks)
Fast MVP (Days 1–10):

Upload→HLS watch; basic transcript; regex-only chapters; one Discover view (Passage); tips; report button.

W1: Scaffold, auth, channels, upload init, provider webhooks → playback ✅
W2: Transcripts worker, regex chapters, watch page chapters panel ✅
W3: Church pages (address/service times/giving), map module, “Near Me” rail ✅
W4: Search (FTS/Meili), filters (passage/topic/denom/city), This Sunday rail ✅
W5: Stripe Connect (tips + payouts), Tip button UX, receipts ✅
W6: Memberships (plans, paywall), Follow/Subscriptions rail ✅
W7: Reports queue, age-gate labels, DMCA intake + admin actions ✅
W8: LLM fallback for fuzzy passages; topic classifier; polish discovery ✅
W9: Clipper (v1.1), simulcast helper (optional), playlists ✅
W10: Email digests, sitemaps/OG, perf pass (LCP/CLS), accessibility fixes ✅
W11: Creator onboarding flow, analytics basics (views, tips, local) ✅
W12: Beta hardening: QA, rate limits, errors, backups, docs ✅

Acceptance criteria per week: “Definition of Done” includes unit tests, e2e happy path, metrics emitting, and docs.

Manual QA checklist (always): upload 100MB file, webhook fires, HLS plays on mobile, chapters jump accuracy, search by Romans 8, tip $1 test, report flow, age-gate toggle.

10) Launch & growth
Seed 50 founding churches/creators: concierge onboarding, homepage lanes, 90/10 split.
Local focus: pick 1–2 metros; “This Sunday Near You” campaign; printable QR cards.
Simulcast guidance: keep YouTube + upload master here → we power scripture search & local discovery.
SEO: sitemaps by passage/topic/city; structured data; OG images.
KPIs: DAU/WAU, uploads/day, median session length, % videos with chapters, tips conversion %, report SLA (<24h).

11) Risks & mitigations
Bandwidth cost spikes: start with Cloudflare Stream, cap 1080p, promote clips.

Moderation load: creator-approved comments (later), report queue SLA, label over remove.

Creator uptake: city-by-city playbook, founding perks, better rev share, local discovery unique value.

App-store risks (later): keep UGC tooling & policies ready; launch web first.

12) Deliverables
(a) Milestone checklist (excerpt)
 Upload → HLS ready on web & mobile

 Transcript stored (SRT) + chapters visible

 Passage/Topic/Denomination/City filters working

 Stripe Connect tips end-to-end

 Report → moderator action (age-gate/remove)

 “Near Me / This Sunday” rails populated

(b) Gantt (Mermaid)
mermaid
Copy
Edit
gantt
  title 12-week Beta Plan
  section Core
  Scaffold/Auth/Webhooks     :w1, 2025-08-12, 7d
  Transcripts/Chapters       :w2, after w1, 7d
  Church Pages/Maps          :w3, after w2, 7d
  Search/Discovery           :w4, after w3, 7d
  Stripe Tips                :w5, after w4, 7d
  Memberships/Subs           :w6, after w5, 7d
  Moderation/DMCA            :w7, after w6, 7d
  LLM Fallback/Topics        :w8, after w7, 7d
  Clipper/Playlists          :w9, after w8, 7d
  SEO/Perf/Email             :w10, after w9, 7d
  Onboarding/Analytics       :w11, after w10, 7d
  Beta Hardening             :w12, after w11, 7d
(c) Sample JSON (already included above)
(d) DB schema (starter)
sql
Copy
Edit
create table users(
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text, role text check (role in ('viewer','creator','church_admin','mod','admin')) default 'viewer',
  created_at timestamptz default now()
);
create table channels(
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id),
  type text check (type in ('church','creator')) not null,
  name text not null, slug text unique not null,
  denomination text, bio text, avatar_url text, banner_url text
);
create table addresses(
  id uuid primary key default gen_random_uuid(),
  line1 text, city text, region text, country text, postal text,
  lat double precision, lng double precision
);
create table churches(
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) unique,
  address_id uuid references addresses(id),
  giving_url text, website text
);
create table service_times(
  id uuid primary key default gen_random_uuid(),
  church_id uuid references churches(id),
  weekday int check (weekday between 0 and 6),
  time_utc time, note text
);
create table videos(
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id),
  title text not null, description text,
  status text check (status in ('draft','ready')) default 'draft',
  playback_id text, duration_s int, published_at timestamptz, srt_url text
);
create table video_tags(
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id),
  type text check (type in ('passage','topic','denomination','city')),
  value text not null, start_s int
);
create index on video_tags(video_id, type, value);
create table tips(
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id),
  user_id uuid references users(id),
  amount_cents int not null, currency text default 'usd',
  stripe_payment_id text, created_at timestamptz default now()
);
create table memberships(
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id),
  user_id uuid references users(id),
  plan_id text, status text, stripe_sub_id text,
  started_at timestamptz default now(), ended_at timestamptz
);
create table reports(
  id uuid primary key default gen_random_uuid(),
  object_type text, object_id uuid, reason text,
  user_id uuid references users(id),
  status text default 'new', action text, created_at timestamptz default now()
);
(e) .env.example (already included)
(f) Definition of Done (examples)
Upload/Watch: file uploads, webhook→ready, HLS plays on iOS/Android browsers, transcript saved, chapters clickable.

Monetization: test tips & payouts in Stripe sandbox; fees recorded; receipts emailed.

Moderation: report→queue→action; DMCA intake; audit log.