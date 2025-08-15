# Platform

A video platform with transcription capabilities.

<!-- Deployment trigger: 2025-08-14 -->

## 🚀 Features

### Core Platform
- ✅ **Next.js 15** with TypeScript and Tailwind CSS
- ✅ **Supabase** integration for database and auth
- ✅ **Mux** video integration for upload and playback
- ✅ **Responsive design** with modern UI/UX

### Video Management
- ✅ **Video upload** with Mux direct upload
- ✅ **HLS streaming** for cross-platform playback
- ✅ **Video list** with status indicators
- ✅ **Channel management** for creators and churches

### Scripture Intelligence
- ✅ **Deepgram** transcript generation
- ✅ **Scripture detection** with regex patterns
- ✅ **Bible book mapping** with 66 books + aliases
- ✅ **Topic detection** for 18+ Christian themes
- ✅ **Automatic chapters** from transcripts
- ✅ **Clickable timestamps** for navigation

### Database Schema
- ✅ **Users** with role-based access
- ✅ **Channels** for creators and churches
- ✅ **Videos** with metadata and status
- ✅ **Video tags** for passages and topics
- ✅ **Captions** for transcript storage

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables:
   ```bash
   cp env.example .env.local
   ```

4. Set up your Supabase project and add the credentials to `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_KEY=your_supabase_service_key
   ```

5. Run the database migrations:
   ```bash
   # Copy the schema from db/schema.sql to your Supabase SQL editor
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   ├── globals.css     # Global styles
│   ├── layout.tsx      # Root layout
│   └── page.tsx        # Homepage
├── components/         # React components
└── lib/               # Utility libraries
    └── supabase.ts    # Supabase client
db/
└── schema.sql         # Database schema
```

## Roadmap

This project follows a 12-week development plan:

- **Week 1**: Scaffold, auth, channels, upload init, provider webhooks → playback ✅
- **Week 2**: Transcripts worker, regex chapters, watch page chapters panel
- **Week 3**: Church pages (address/service times/giving), map module, "Near Me" rail
- **Week 4**: Search (FTS/Meili), filters (passage/topic/denom/city), This Sunday rail
- **Week 5**: Stripe Connect (tips + payouts), Tip button UX, receipts
- **Week 6**: Memberships (plans, paywall), Follow/Subscriptions rail
- **Week 7**: Reports queue, age-gate labels, DMCA intake + admin actions
- **Week 8**: LLM fallback for fuzzy passages; topic classifier; polish discovery
- **Week 9**: Clipper (v1.1), simulcast helper (optional), playlists
- **Week 10**: Email digests, sitemaps/OG, perf pass (LCP/CLS), accessibility fixes
- **Week 11**: Creator onboarding flow, analytics basics (views, tips, local)
- **Week 12**: Beta hardening: QA, rate limits, errors, backups, docs

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

## Environment Variables

Add these to your `.env.local` as needed:

- **Required for Week 1**: Supabase credentials
- **Week 1**: Mux/Cloudflare Stream tokens (video upload/playback)
- **Week 2**: Deepgram API key (transcripts)
- **Week 5**: Stripe keys (monetization)
- **Week 8**: OpenAI API key (LLM chapters)
- **Week 4**: Meilisearch (search)
- **Week 3**: Mapbox token (maps)

## Contributing

This project is in active development. Check the roadmap for current priorities and upcoming features.
