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

## CRITICAL DISCOVERY: Transcription URL Issue

### Problem: Deepgram 404 errors when trying to transcribe videos

**Discovery Date:** August 14, 2024

**Root Cause:**
The transcription system was trying to use `asset_id` as a fallback when `playback_id` was not available, but **Mux asset_ids do not work with stream URLs**. Only `playback_ids` can be used with `https://stream.mux.com/` URLs.

**The Broken Logic:**
```typescript
// WRONG - asset_id doesn't work with stream URLs
const muxId = video.playback_id || video.asset_id
const downloadUrl = `https://stream.mux.com/${muxId}/high.mp4`
```

**The Fix:**
```typescript
// CORRECT - only use playback_id for stream URLs
if (!video.playback_id) {
  return NextResponse.json(
    { error: 'Video not ready for transcription - missing playback_id' },
    { status: 400 }
  )
}
const downloadUrl = `https://stream.mux.com/${video.playback_id}/high.mp4`
```

**Key Insight:**
Transcription can only work when videos have a valid `playback_id`. Videos in "processing" state without `playback_id` cannot be transcribed until the webhook processes them correctly.

**Prevention:**
- Only trigger transcription for videos with valid `playback_id`
- Never use `asset_id` for stream URLs
- Ensure webhook processes videos completely before transcription

## CRITICAL DISCOVERY: Mux URLs Not Publicly Accessible to Deepgram

### Problem: Deepgram cannot access Mux streaming URLs

**Discovery Date:** August 14, 2024

**Root Cause:**
Mux's streaming URLs (`https://stream.mux.com/...`) are **not publicly accessible** to Deepgram's servers, even with public playback policies. This is a common issue with video hosting services that use CDN-based streaming.

**Evidence:**
- Deepgram returns `REMOTE_CONTENT_ERROR` with "404 Not Found" for stream URLs
- Download URLs return "Could not determine if URL for media download is publicly routable"
- Public playback policies don't make URLs accessible to external services

**Current Status:**
- ✅ Deepgram API key is working correctly
- ✅ Mux assets have public playback policies
- ❌ Mux URLs are not accessible to Deepgram servers
- ✅ Placeholder transcription system is working as fallback

**Solutions:**
1. **Immediate:** Use placeholder transcripts (current approach)
2. **Long-term:** Implement direct file upload to Deepgram (requires downloading video first)
3. **Alternative:** Use a different video hosting service with publicly accessible URLs

**Prevention:**
- Test URL accessibility before implementing transcription
- Consider video hosting service limitations when designing transcription pipeline
- Document URL accessibility requirements for external services

## CRITICAL DISCOVERY: Transcription Changes Breaking Video System

### Problem: Every transcription fix breaks video playback

**Discovery Date:** August 14, 2024

**The Pattern:**
1. **Video works** → shows "Ready" and plays correctly
2. **Notice transcription issue** → make changes to fix transcription
3. **Video breaks** → shows "Video not ready" again
4. **Have to fix video status** → back to square one

**Root Cause:**
Making **overly aggressive changes** to transcription system that affect webhook processing:
- Adding strict `playback_id` requirements in transcription
- Modifying webhook logic to only trigger transcription with `playback_id`
- These changes break webhook correlation for videos

**Key Insight:**
The transcription system should be **independent** of webhook processing. Changes to transcription should not touch webhook logic that handles video status updates.

**The Correct Approach:**
1. **Keep webhook processing unchanged** - it's working correctly
2. **Fix transcription separately** - without modifying webhook logic
3. **Test changes incrementally** - one system at a time
4. **Document all changes** - so we don't forget what breaks what

**Prevention:**
- **NEVER modify webhook logic** when fixing transcription issues
- **Test each system independently** before combining changes
- **Revert webhook changes** if video system breaks
- **Document the relationship** between systems before making changes
- **Make minimal, targeted fixes** instead of broad changes

## General Debugging

### Useful Debug Endpoints

```bash
# Check all videos and their status
curl https://platform-gamma-flax.vercel.app/api/debug/simple-video-check

# Detailed webhook correlation analysis
curl https://platform-gamma-flax.vercel.app/api/debug/webhook-debug

# Fix video status inconsistencies
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/fix-video-status

# Process legacy videos stuck in processing (not recommended)
curl -X POST https://platform-gamma-flax.vercel.app/api/debug/process-legacy-videos

# Clean up test data (recommended for legacy issues)
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
- ✅ **Triggers:** Transcription and chapter generation
- ❌ **Should NOT be modified for:** Transcription URL fixes, Deepgram API changes

**Transcription System:**
- ✅ **Handles:** Converting video to text, generating SRT
- ✅ **Depends on:** Valid playback_id for stream URL
- ❌ **Should NOT modify:** Webhook logic, video status handling

**Video Player System:**
- ✅ **Depends on:** Valid playback_id, correct video status
- ✅ **Shows:** Video content, chapters, transcripts
- ❌ **Should NOT be modified for:** Backend processing issues

---

*Last updated: [Current Date]*
