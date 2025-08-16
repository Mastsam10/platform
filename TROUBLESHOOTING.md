# Troubleshooting Guide

This document records solutions to common issues encountered during development and deployment.

## Video Status Inconsistency Issues

### Problem: Video shows "Ready" but player displays "Video not ready"

**Symptoms:**
- Video has `status: "ready"` in database
- Video has `playback_id: null` in database
- UI shows green "Ready" tag
- Video player shows "Video not ready" message

**Root Cause:**
The video status and playback_id are out of sync. A video should only be marked as "ready" when it has a valid playback_id.

**Solution:**
Use the video status fix endpoint to correct the inconsistency:

```bash
# Fix all videos with inconsistent status
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/fix-video-status
```

**What the fix does:**
- Finds videos marked as "ready" but with no playback_id
- Changes their status to "processing"
- Clears any fake playback_ids (like "PROCESSING")

**CRITICAL DISCOVERY (Aug 14, 2024):**
After fixing the status inconsistency, the video **automatically becomes playable** when the webhook system processes it correctly. This means:

1. **The fix is working correctly** - changing status from "ready" to "processing" allows the webhook to properly set the playback_id
2. **The webhook system is functional** - it just needs videos to be in the correct state to process them
3. **Don't manually set videos to "ready"** - this breaks the webhook correlation process

**Prevention:**
- Never manually set video status to "ready" without a valid playback_id
- Let the webhook system handle status updates automatically
- The webhook should only set status to "ready" when it receives a valid playback_id
- **If a video shows "Video not ready", run the fix-video-status endpoint and wait for webhook processing**

## Legacy Video Processing Issues

### Problem: Videos stuck in "processing" with asset_id but no playback_id

**Symptoms:**
- Video has `status: "processing"` in database
- Video has `asset_id` but `playback_id: null`
- Video was uploaded before webhook system was fully working
- Video never received the `video.asset.ready` webhook

**Root Cause:**
These are legacy videos that were uploaded when the webhook system wasn't properly configured or working. They have asset_ids but never received the webhook to set their playback_id and status to "ready".

**Recommended Solution: Clean Slate Approach**
For the best user experience, delete legacy videos and let users re-upload:

```bash
# Clean up all videos (including legacy ones)
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/cleanup-test-data
```

**Why this is better:**
- **No false expectations** - users don't see "ready" videos that don't actually play
- **Clean user experience** - fresh uploads work immediately
- **No confusion** about what's working vs. broken
- **Simpler support** - no need to explain why some videos don't work

**Alternative Solution: Manual Processing (NOT RECOMMENDED - CAUSES PROBLEMS)**
If you must keep legacy videos, you can manually process them, but this creates a poor user experience:

```bash
# Process all legacy videos stuck in processing
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/process-legacy-videos
```

**What the manual fix does:**
- Finds videos with asset_id but no playback_id
- Simulates the `video.asset.ready` webhook for each video
- Generates a legacy playback_id based on the asset_id
- Updates the video status to "ready"
- **WARNING**: These videos may not actually play properly

**CRITICAL WARNING: The process-stuck-video endpoint is BROKEN**
This endpoint creates fake `playback_id` values like `placeholder_${asset_id}` and sets videos to "ready" status. This **violates our troubleshooting principles** and creates the exact "Video not ready" issues we've been fixing repeatedly.

**DO NOT USE** the `process-stuck-video` endpoint - it breaks the webhook system!

**Prevention:**
- Ensure webhook endpoints are properly configured
- Monitor webhook logs for failures
- Test webhook delivery in development
- Consider implementing webhook retry logic
- **Best practice**: Clean slate approach for failed uploads

## Mux API Integration Issues

### Problem: TypeScript errors with Mux API calls

**Symptoms:**
- Build fails with TypeScript errors
- Import errors for non-existent functions
- Property access errors on Mux objects

**Root Cause:**
Incorrect understanding of Mux API structure and available methods.

**Solution:**
- Use only documented Mux API methods
- For uploads: `Video.uploads.create()`
- Avoid trying to fetch assets directly unless necessary
- Let webhooks handle asset status updates

**Prevention:**
- Always check Mux documentation before using API methods
- Test API calls in development before deploying
- Use webhook-based updates instead of direct API calls when possible

## Database Cleanup

### Problem: Test videos cluttering the system

**Symptoms:**
- Multiple test videos with inconsistent states
- Videos stuck in processing
- Confusion between test and real content

**Solution:**
Use the cleanup endpoint to remove all test data:

```bash
# Clean up all test data
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/cleanup-test-data
```

**What the cleanup does:**
- Deletes all videos from the database
- Deletes all video tags (chapters)
- Deletes all captions (transcripts)
- Leaves database schema intact

**Prevention:**
- Use descriptive titles for test videos
- Clean up test data regularly
- Consider using separate test environments

## Webhook Processing

### Problem: Videos stuck in processing state

**Symptoms:**
- Video has asset_id but no playback_id
- Status remains "processing" indefinitely
- Webhook didn't fire or failed
- "Video not found for asset_id" errors in logs

**Solution:**
1. Use the webhook debug endpoint to analyze correlation issues:
   ```bash
   curl https://platform-gamma-flax.vercel.app/api/debug/webhook-debug
   ```
2. Check if video has asset_id
3. If yes, manually trigger webhook processing
4. If no, the upload may have failed

**Root Cause Analysis:**
The webhook system now uses multiple correlation methods:
1. **Primary**: Find video by `asset_id`
2. **Secondary**: Find video by `upload_id` (if available in webhook)
3. **Fallback**: Find most recent video without `asset_id`

**Prevention:**
- Monitor webhook logs for correlation failures
- Ensure webhook endpoints are accessible
- Verify Mux webhook configuration
- Use the webhook debug endpoint regularly to catch issues early

## CRITICAL DISCOVERY: Webhook Processing Flow

### Problem: Videos marked "ready" but not actually playable

**Discovery Date:** August 14, 2024

**What We Learned:**
When a video shows "Ready" status but displays "Video not ready" in the player, the issue is NOT with the webhook system itself, but with the video being in the wrong state for webhook processing.

**The Correct Flow:**
1. **Video uploaded** → status: "draft"
2. **Asset created** → status: "processing" 
3. **Asset ready** → webhook sets playback_id and status: "ready"
4. **Video becomes playable**

**The Broken Flow:**
1. **Video uploaded** → status: "draft"
2. **Asset created** → status: "processing"
3. **Something goes wrong** → video gets marked "ready" without playback_id
4. **Video shows "Ready" but "Video not ready"**

**The Fix:**
1. **Run fix-video-status** → changes status back to "processing"
2. **Wait for webhook** → webhook processes the video correctly
3. **Video becomes playable** → webhook sets proper playback_id and status: "ready"

**Key Insight:**
The webhook system works perfectly when videos are in the correct "processing" state. The problem occurs when videos are prematurely marked as "ready" without a valid playback_id.

**Prevention:**
- Never manually set video status to "ready"
- Always use the fix-video-status endpoint for "Video not ready" issues
- Let the webhook system handle the final "ready" state
- The webhook correlation works correctly when videos are in "processing" state

## CRITICAL DISCOVERY: Cloudflare Stream Transcription URL Requirements

### Problem: Deepgram requires valid playback_id for Cloudflare Stream transcription

**Discovery Date:** August 15, 2024

**Root Cause:**
The transcription system requires a valid `playback_id` (which is the Cloudflare UID) to generate signed download URLs. Videos in "processing" state without `playback_id` cannot be transcribed until the webhook processes them correctly.

**The Correct Logic:**
```typescript
// In src/app/api/transcripts/dequeue/route.ts
if (!video.playback_id) {
  console.error(`❌ Video ${video.id} has no playback_id - rescheduling job`)
  // Reschedule the job for later instead of marking as error
  await supabaseAdmin
    .from('transcript_jobs')
    .update({
      status: 'queued',
      attempts: job.attempts + 1,
      next_attempt_at: new Date(Date.now() + 30000).toISOString(), // Retry in 30 seconds
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
  
  results.push({
    job_id: job.id,
    success: false,
    error: 'Video not ready yet - rescheduled',
    rescheduled: true
  })
  continue
}

// Generate signed download URL for Deepgram
const signedDownloadUrl = cloudflareStreamSigning.generateSignedDownloadUrl(
  video.playback_id,
  300 // 5 minutes TTL
)
```

**Key Insight:**
Transcription can only work when videos have a valid `playback_id`. The job queue system intelligently reschedules jobs when videos aren't ready yet, rather than failing them permanently.

**Why This Works:**
- Cloudflare UID serves as both `asset_id` and `playback_id`
- Signed URLs require the UID to generate proper JWT tokens
- Job rescheduling prevents permanent failures for videos still processing
- The system is resilient to timing issues between video processing and transcription

**Prevention:**
- Only trigger transcription for videos with valid `playback_id`
- Use job rescheduling instead of permanent failures
- Ensure webhook processes videos completely before transcription
- Monitor job queue for rescheduled jobs to identify processing delays

## CRITICAL DISCOVERY: Cloudflare Stream URLs Work with Deepgram

### Problem: Deepgram can access Cloudflare Stream URLs with signed URLs

**Discovery Date:** August 15, 2024

**Root Cause:**
Unlike Mux, **Cloudflare Stream URLs ARE accessible to Deepgram** when using signed URLs. The issue was not URL accessibility, but the need for proper signed URL generation.

**Evidence:**
- Cloudflare Stream provides `videodelivery.net` URLs that are publicly accessible
- Deepgram can access these URLs when they're properly signed
- Signed URLs with appropriate TTL (5 minutes) work for transcription
- The `cloudflareStreamSigning.generateSignedDownloadUrl()` function creates working URLs

**Current Status:**
- ✅ Deepgram API key is working correctly
- ✅ Cloudflare Stream URLs are accessible to Deepgram
- ✅ Signed URL generation is working
- ✅ Transcription system is functional with Cloudflare Stream

**Key Implementation:**
```typescript
// In src/app/api/transcripts/dequeue/route.ts
const signedDownloadUrl = cloudflareStreamSigning.generateSignedDownloadUrl(
  video.playback_id,
  300 // 5 minutes TTL
)
```

**Why This Works:**
- Cloudflare Stream's `videodelivery.net` domain is publicly accessible
- Signed URLs provide secure, time-limited access
- Deepgram can download videos for transcription processing
- The signing system uses JWT tokens with proper expiration

**Prevention:**
- Always use signed URLs for external service access
- Test URL accessibility with actual API calls
- Don't assume all video hosting services have the same limitations
- Document which services work with which external APIs

## CRITICAL DISCOVERY: Next.js Caching Preventing New Videos from Appearing

### Problem: Videos created successfully but not showing on website

**Discovery Date:** August 15, 2024

**Symptoms:**
- Upload logs show successful database record creation
- Webhook logs show successful video status updates
- Videos appear in database when queried directly
- **But videos don't appear on website** - `/api/videos` returns stale data
- Manual video creation works (appears immediately)
- Only automatic uploads seem to "disappear"

**Root Cause:**
Next.js was **caching the `/api/videos` endpoint**, returning stale data that didn't include newly created videos. The database records were being created successfully, but the API was serving cached responses.

**Evidence:**
- Videos "4", "5", "6", "8" were all created successfully (logs confirmed)
- Manual video "3" appeared immediately (bypassed cache)
- After adding `export const dynamic = 'force-dynamic'` → video "free" appeared immediately

**The Fix:**
Add `export const dynamic = 'force-dynamic'` to the videos API route:

```typescript
// In src/app/api/videos/route.ts
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'  // ← This fixed it!

export async function GET(request: NextRequest) {
  // ... existing code
}
```

**Why This Works:**
- `force-dynamic` tells Next.js to never cache this endpoint
- Ensures fresh data is fetched from the database on every request
- Eliminates stale cache issues that hide new videos

**Additional Fixes Applied:**
- Added `export const runtime = 'nodejs'` to all database-touching routes
- Added database fingerprinting for environment consistency checks
- These ensure consistent behavior across all API endpoints

**Key Insight:**
When database records are created successfully but don't appear in API responses, **check for caching issues first**. The problem is often not in the database or API logic, but in Next.js serving stale cached data.

**Prevention:**
- Always add `export const dynamic = 'force-dynamic'` to API routes that need fresh data
- Use `export const runtime = 'nodejs'` for database operations
- Monitor for caching issues when debugging "disappearing" data
- Test with manual database queries to confirm data exists

**Debugging Steps:**
1. Check if manual database queries return the data
2. Add `force-dynamic` to the API route
3. Test if the issue persists
4. If resolved, document the caching issue

---

## CRITICAL DISCOVERY: Cloudflare Stream Direct Creator Uploads Implementation

### Problem: Cloudflare Stream Direct Creator Uploads API implementation

**Discovery Date:** August 14, 2024

**✅ SOLVED: Direct Creator Uploads Implementation**

**Root Cause:**
The issue was using the wrong API endpoint. We were trying to use `/stream` instead of the correct `/stream/direct_upload` endpoint for Direct Creator Uploads.

**The Correct Implementation:**

1. **Correct Endpoint:** `/stream/direct_upload` (not `/stream`)
2. **Correct Method:** POST
3. **Correct Request Body:**
   ```json
   {
     "maxDurationSeconds": 3600
   }
   ```

**Working Implementation:**
```typescript
// In src/lib/cloudflare.ts
async createUpload(title: string): Promise<CloudflareUploadResponse> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/direct_upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      maxDurationSeconds: 3600
    })
  })
  
  const data = await response.json()
  return {
    success: true,
    result: {
      uploadURL: data.result.uploadURL,
      uid: data.result.uid
    }
  }
}
```

**Frontend Upload Flow:**
1. **Step 1:** Call `/api/upload/init` to get upload URL and video ID
2. **Step 2:** Upload file directly to Cloudflare Stream using FormData
3. **Step 3:** Cloudflare processes video and sends webhook when ready

**Test Results:**
- ✅ API endpoint works: Returns `uploadURL` and `uid`
- ✅ Upload flow works: Files upload successfully to Cloudflare Stream
- ✅ Video processing: Cloudflare processes videos and makes them available
- ✅ Transcription ready: Videos are accessible via public URLs for Deepgram

**Key Insights:**
- **Direct Creator Uploads** is the correct approach for user uploads
- **200MB limit** for basic uploads (no resumable uploads needed)
- **FormData upload** to the returned `uploadURL`
- **Webhook processing** handles video status updates automatically

**Current Status:**
- ✅ Cloudflare Stream Direct Creator Uploads working
- ✅ Frontend upload component implemented
- ✅ Complete upload flow functional
- ✅ Ready for transcription and chapter generation

**Prevention:**
- Always use `/stream/direct_upload` endpoint for Direct Creator Uploads
- Follow official Cloudflare Stream documentation exactly
- Test API endpoints with cURL before implementing in code
- Use FormData for file uploads to Cloudflare Stream URLs

## CRITICAL DISCOVERY: Job Queue System Prevents Transcription Failures

### Problem: Transcription system is now resilient and self-healing

**Discovery Date:** August 15, 2024

**The Pattern:**
1. **Video uploaded** → webhook creates transcription job
2. **Job queued** → waits for video to be ready
3. **Video ready** → job processes with signed URL
4. **If video not ready** → job reschedules automatically
5. **No permanent failures** → system is self-healing

**Root Cause:**
The job queue system with intelligent rescheduling prevents the transcription failures we experienced with Mux. Jobs are not marked as failed when videos aren't ready - they're rescheduled for later.

**Key Implementation:**
```typescript
// In src/app/api/transcripts/dequeue/route.ts
if (!video.playback_id) {
  // Reschedule instead of fail
  await supabaseAdmin
    .from('transcript_jobs')
    .update({
      status: 'queued',
      attempts: job.attempts + 1,
      next_attempt_at: new Date(Date.now() + 30000).toISOString(), // 30 seconds
      updated_at: new Date().toISOString()
    })
    .eq('id', job.id)
}
```

**Key Insight:**
The transcription system is now **independent and resilient**. It doesn't break video playback, and it handles timing issues gracefully through job rescheduling.

**The Correct Approach:**
1. **Job queue handles timing** - no need to modify webhook logic
2. **Rescheduling prevents failures** - jobs wait for videos to be ready
3. **Signed URLs work reliably** - Cloudflare Stream is accessible to Deepgram
4. **System is self-healing** - no manual intervention needed

**Prevention:**
- **Use job queues for async processing** - don't try to do everything in webhooks
- **Reschedule instead of fail** - be resilient to timing issues
- **Test signed URL generation** - ensure external services can access videos
- **Monitor job queue health** - watch for patterns in rescheduling

## General Debugging

### Useful Debug Endpoints

```bash
# Check all videos and their status
curl https://platform-gamma-flax.vercel.app/api/debug/simple-video-check

# List all videos in database
curl https://platform-gamma-flax.vercel.app/api/debug/list-videos

# Find video by title
curl "https://platform-gamma-flax.vercel.app/api/debug/find-video?title=test"

# Test database connection and fingerprint
curl https://platform-gamma-flax.vercel.app/api/debug/test-db-fingerprint

# Test upload initialization process
curl https://platform-gamma-flax.vercel.app/api/debug/test-upload-init

# Test webhook with simulated payload
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/test-webhook

# Check environment variables
curl https://platform-gamma-flax.vercel.app/api/debug/check-env

# Test job queue system
curl https://platform-gamma-flax.vercel.app/api/debug/test-job-queue

# Test signed URL generation
curl https://platform-gamma-flax.vercel.app/api/debug/test-signed-urls

# Clean up test data
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/cleanup-test-data

# Check transcript status
curl https://platform-gamma-flax.vercel.app/api/debug/check-transcript-status
```

### Key Principles

1. **Never manually set video status to "ready" without a valid playback_id**
2. **Let webhooks handle status updates automatically**
3. **Clean up test data regularly**
4. **Monitor webhook logs for failures**
5. **Use debug endpoints to diagnose issues**
6. **For legacy videos: prefer clean slate over fake fixes**
7. **User experience first: don't show broken videos as "ready"**
8. **CRITICAL: When a video shows "Video not ready", run fix-video-status and wait for webhook processing - don't manually set to "ready"**
9. **The webhook system works correctly when videos are in "processing" state**
10. **NEVER modify webhook logic when fixing transcription issues**
11. **Test each system independently before combining changes**
12. **Document all discoveries and changes immediately**
13. **CRITICAL: When database records exist but don't appear in API responses, check for Next.js caching issues first**
14. **Always add `export const dynamic = 'force-dynamic'` to API routes that need fresh data**
15. **Use `export const runtime = 'nodejs'` for database operations to ensure consistent behavior**
16. **CRITICAL: Cloudflare Stream URLs work with Deepgram when using signed URLs**
17. **Use job queues with rescheduling instead of permanent failures for async processing**
18. **Signed URLs are essential for secure external service access**
19. **Cloudflare UID serves as both asset_id and playback_id**
20. **Job rescheduling prevents timing-related failures in transcription system**

## Systematic Change Management

### Before Making Any Changes

**Documentation First:**
1. **Record current state** - what's working, what's broken
2. **Identify the specific issue** - be precise about what needs fixing
3. **Plan the fix** - write down exactly what you'll change
4. **Predict side effects** - what might break as a result
5. **Create rollback plan** - how to revert if things go wrong

**Testing Strategy:**
1. **Test current state** - verify what's working before changes
2. **Make minimal changes** - one small fix at a time
3. **Test immediately** - verify the fix works
4. **Test other systems** - ensure nothing else broke
5. **Document results** - what worked, what didn't

**When Things Go Wrong:**
1. **Stop immediately** - don't make more changes
2. **Revert to last working state** - use git to go back
3. **Document what broke** - add to troubleshooting guide
4. **Analyze why it broke** - understand the root cause
5. **Plan a different approach** - try a more targeted fix

### System Dependencies Map

**Webhook System:**
- ✅ **Handles:** Video status updates, playback_id assignment
- ✅ **Triggers:** Transcription job creation (not direct processing)
- ✅ **Uses:** Cloudflare Stream webhook payload structure
- ❌ **Should NOT be modified for:** Transcription URL fixes, Deepgram API changes

**Job Queue System:**
- ✅ **Handles:** Asynchronous transcription processing
- ✅ **Features:** Intelligent rescheduling, retry logic, error handling
- ✅ **Depends on:** Valid playback_id for signed URL generation
- ✅ **Triggers:** Deepgram API calls with callback webhooks
- ❌ **Should NOT modify:** Webhook logic, video status handling

**Transcription System:**
- ✅ **Handles:** Converting video to text, generating SRT/VTT
- ✅ **Features:** Signed URL generation, Deepgram integration
- ✅ **Depends on:** Cloudflare Stream UID for URL signing
- ✅ **Stores:** Results in Supabase Storage and database
- ❌ **Should NOT modify:** Webhook logic, video status handling

**Video Player System:**
- ✅ **Depends on:** Valid playback_id, correct video status
- ✅ **Features:** HLS.js for cross-browser compatibility
- ✅ **Shows:** Video content, chapters, transcripts, captions
- ✅ **Uses:** Cloudflare Stream videodelivery.net URLs
- ❌ **Should NOT be modified for:** Backend processing issues

**Cloudflare Stream Integration:**
- ✅ **Provides:** Direct Creator Uploads, HLS playback, signed URLs
- ✅ **Features:** Webhook notifications, video processing
- ✅ **URLs:** videodelivery.net for playback, signed URLs for external access
- ✅ **Compatible:** With Deepgram transcription via signed URLs

## CRITICAL DISCOVERY: Pivoting from Mux to Cloudflare Stream

### Problem: Mux integration had fundamental limitations

**Discovery Date:** August 15, 2024

**Why We Pivoted:**
1. **Mux URLs not accessible to Deepgram** - streaming URLs were not publicly accessible
2. **Complex webhook correlation** - asset_id vs playback_id confusion
3. **Expensive for direct uploads** - required server-side processing
4. **Limited signed URL support** - not designed for external service access

**Why Cloudflare Stream Works Better:**
1. **Direct Creator Uploads** - users upload directly to Cloudflare
2. **Public URL accessibility** - videodelivery.net URLs work with external services
3. **Simple UID system** - one ID serves as both asset_id and playback_id
4. **Built-in signed URLs** - JWT-based signing for secure external access
5. **Cost-effective** - no server-side video processing required

**Key Technical Differences:**

**Mux (Old System):**
```typescript
// Complex correlation between asset_id and playback_id
const assetId = video.asset_id
const playbackId = video.playback_id
const streamUrl = `https://stream.mux.com/${playbackId}/high.mp4` // Not accessible to Deepgram
```

**Cloudflare Stream (New System):**
```typescript
// Simple UID system
const uid = video.playback_id // Same as asset_id
const playbackUrl = `https://videodelivery.net/${uid}/manifest/video.m3u8`
const signedUrl = cloudflareStreamSigning.generateSignedDownloadUrl(uid, 300)
```

**Migration Benefits:**
- ✅ **Simpler architecture** - one ID instead of two
- ✅ **Better external service compatibility** - Deepgram can access videos
- ✅ **Cost reduction** - no server-side video processing
- ✅ **Better user experience** - direct uploads work immediately
- ✅ **More reliable** - fewer moving parts in the system

**Lessons Learned:**
1. **Test external service compatibility early** - don't assume all video hosts work the same
2. **Consider total cost of ownership** - server-side processing adds complexity and cost
3. **Simplify when possible** - one ID system is better than two
4. **Direct uploads are superior** - better user experience and reliability
5. **Signed URLs are essential** - for secure external service access

**Prevention:**
- Research video hosting service limitations before committing
- Test external service integration during proof of concept
- Consider both technical and business requirements
- Document service limitations and workarounds
- Be willing to pivot when fundamental issues are discovered

---

*Last updated: August 15, 2024*
