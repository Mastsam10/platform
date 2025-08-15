# Cloudflare Stream Signing Setup

This guide explains how to set up Cloudflare Stream signing keys for secure video access.

## Why Signed URLs?

Cloudflare Stream videos are not publicly accessible by default. To allow Deepgram to access videos for transcription, we need to generate **signed URLs** with short expiration times.

## Setup Steps

### 1. Access Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Select your account
3. Navigate to **Stream** in the left sidebar

### 2. Create Signing Keys

1. In Stream, go to **Settings** tab
2. Scroll down to **Signing Keys** section
3. Click **Create signing key**
4. Give it a name (e.g., "Platform Transcription")
5. Copy the **Key ID** and **Private Key**

### 3. Add Environment Variables

Add these to your `.env.local` file:

```env
# Cloudflare Stream Signing (for transcription)
CLOUDFLARE_STREAM_SIGNING_KEY=-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
-----END PRIVATE KEY-----
CLOUDFLARE_STREAM_SIGNING_KEY_ID=your_key_id_here
```

**Important:** 
- Keep the private key secure
- Never commit it to version control
- The key should be in PEM format (with BEGIN/END markers)

### 4. Test the Setup

After adding the environment variables, test the setup:

```bash
# Test with a video UID
curl "https://your-domain.com/api/debug/test-signed-urls?uid=your_video_uid"
```

Expected response:
```json
{
  "success": true,
  "uid": "your_video_uid",
  "urls": {
    "download": {
      "url": "https://videodelivery.net/uid/downloads/default.mp4?token=...",
      "valid": true,
      "accessible": true,
      "ttl": "5 minutes"
    },
    "playback": {
      "url": "https://videodelivery.net/uid/manifest/video.m3u8?token=...",
      "valid": true,
      "accessible": true,
      "ttl": "1 hour"
    }
  }
}
```

## How It Works

### Signed URL Generation

1. **JWT Token Creation**: Creates a JWT with:
   - `sub`: Video path (e.g., `/uid/downloads/default.mp4`)
   - `exp`: Expiration time (5 minutes for downloads)
   - `nbf`: Not before time (1 minute ago)
   - `iss`: Your Cloudflare account ID

2. **URL Format**: 
   ```
   https://videodelivery.net/{uid}/downloads/default.mp4?token={jwt}
   ```

### Security Benefits

- **Short-lived URLs**: Download URLs expire in 5 minutes
- **Scoped access**: URLs only work for specific video paths
- **No public access**: Videos remain private by default
- **Audit trail**: All access is logged by Cloudflare

## Usage in Code

```typescript
import { generateSignedDownloadUrl } from '@/lib/cloudflareSigning'

// Generate signed download URL for Deepgram
const downloadUrl = generateSignedDownloadUrl(videoUid, 300) // 5 minutes

// Send to Deepgram
const response = await fetch('https://api.deepgram.com/v1/listen', {
  method: 'POST',
  headers: { 'Authorization': `Token ${DEEPGRAM_API_KEY}` },
  body: JSON.stringify({ url: downloadUrl })
})
```

## Troubleshooting

### Common Issues

1. **"Signing keys not configured"**
   - Check environment variables are set correctly
   - Ensure private key is in PEM format
   - Verify key ID matches the one in Cloudflare dashboard

2. **"URL not accessible"**
   - Check if video UID is correct
   - Verify video is in "ready" status
   - Ensure signing key has proper permissions

3. **"JWT verification failed"**
   - Check system clock is accurate
   - Verify token expiration time
   - Ensure account ID is correct

### Testing Commands

```bash
# Test environment variables
echo $CLOUDFLARE_STREAM_SIGNING_KEY_ID

# Test signed URL generation
curl "https://your-domain.com/api/debug/test-signed-urls?uid=test_uid"

# Test URL accessibility
curl -I "https://videodelivery.net/uid/downloads/default.mp4?token=..."
```

## Next Steps

After setting up signing keys:

1. ✅ **Database migration** - Run `migration_transcript_infrastructure.sql`
2. ✅ **Test signed URLs** - Verify URL generation works
3. 🔄 **Update webhook** - Add job creation to existing webhook
4. 🔄 **Create job processor** - Build background job system
5. 🔄 **Deepgram integration** - Add transcription webhook

## Security Notes

- **Rotate keys regularly**: Change signing keys every 6-12 months
- **Monitor usage**: Check Cloudflare logs for unusual access patterns
- **Least privilege**: Only grant necessary permissions to signing keys
- **Environment separation**: Use different keys for development/production
