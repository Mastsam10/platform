import jwt from 'jsonwebtoken'

export interface CloudflareStreamSigningConfig {
  accountId: string
  signingKey: string
  signingKeyId: string
}

export class CloudflareStreamSigning {
  private config: CloudflareStreamSigningConfig
  private decodedSigningKey: string

  constructor(config: CloudflareStreamSigningConfig) {
    this.config = config
    // Decode the base64-encoded private key
    this.decodedSigningKey = Buffer.from(config.signingKey, 'base64').toString('utf8')
  }

  /**
   * Generate a signed download URL for Cloudflare Stream
   * @param uid - Cloudflare Stream video UID
   * @param ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
   * @returns Signed URL for video download
   */
  generateSignedDownloadUrl(uid: string, ttlSeconds: number = 300): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds
    const path = `/${uid}/downloads/default.mp4`
    
    // Create JWT payload
    const payload = {
      sub: path,
      exp: exp,
      nbf: Math.floor(Date.now() / 1000) - 60, // Valid 1 minute ago
      iss: this.config.accountId
    }

    // Create JWT token using the decoded private key
    const token = jwt.sign(payload, this.decodedSigningKey, {
      algorithm: 'RS256',
      keyid: this.config.signingKeyId
    })
    
    return `https://videodelivery.net${path}?token=${token}`
  }

  /**
   * Generate a signed playback URL for Cloudflare Stream
   * @param uid - Cloudflare Stream video UID
   * @param ttlSeconds - Time to live in seconds (default: 3600 = 1 hour)
   * @returns Signed URL for video playback
   */
  generateSignedPlaybackUrl(uid: string, ttlSeconds: number = 3600): string {
    const exp = Math.floor(Date.now() / 1000) + ttlSeconds
    const path = `/${uid}/manifest/video.m3u8`
    
    // Create JWT payload
    const payload = {
      sub: path,
      exp: exp,
      nbf: Math.floor(Date.now() / 1000) - 60,
      iss: this.config.accountId
    }

    // Create JWT token using the decoded private key
    const token = jwt.sign(payload, this.decodedSigningKey, {
      algorithm: 'RS256',
      keyid: this.config.signingKeyId
    })
    
    return `https://videodelivery.net${path}?token=${token}`
  }

  /**
   * Verify if a signed URL is valid (for webhook verification)
   * @param url - Signed URL to verify
   * @returns True if valid, false otherwise
   */
  verifySignedUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      const token = urlObj.searchParams.get('token')
      
      if (!token) {
        return false
      }

      // Verify JWT token using the decoded private key
      const decoded = jwt.verify(token, this.decodedSigningKey, {
        algorithms: ['RS256']
      })
      
      return !!decoded
    } catch (error) {
      console.error('Error verifying signed URL:', error)
      return false
    }
  }
}

// Create singleton instance
export const cloudflareStreamSigning = new CloudflareStreamSigning({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  signingKey: process.env.CLOUDFLARE_STREAM_SIGNING_KEY!,
  signingKeyId: process.env.CLOUDFLARE_STREAM_SIGNING_KEY_ID!
})

// Helper functions for easy access
export function generateSignedDownloadUrl(uid: string, ttlSeconds?: number): string {
  return cloudflareStreamSigning.generateSignedDownloadUrl(uid, ttlSeconds)
}

export function generateSignedPlaybackUrl(uid: string, ttlSeconds?: number): string {
  return cloudflareStreamSigning.generateSignedPlaybackUrl(uid, ttlSeconds)
}

export function verifySignedUrl(url: string): boolean {
  return cloudflareStreamSigning.verifySignedUrl(url)
}
