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

**Prevention:**
- Never manually set video status to "ready" without a valid playback_id
- Let the webhook system handle status updates automatically
- The webhook should only set status to "ready" when it receives a valid playback_id

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

**Alternative Solution: Manual Processing (Not Recommended)**
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

**Solution:**
1. Check if video has asset_id
2. If yes, manually trigger webhook processing
3. If no, the upload may have failed

**Prevention:**
- Monitor webhook logs
- Ensure webhook endpoints are accessible
- Verify Mux webhook configuration

## General Debugging

### Useful Debug Endpoints

```bash
# Check all videos and their status
curl https://platform-gamma-flax.vercel.app/api/debug/simple-video-check

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

---

*Last updated: [Current Date]*
