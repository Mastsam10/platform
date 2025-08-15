import { createHmac, createSign } from 'crypto'

export interface CloudflareStreamSigningConfig {
  accountId: string
  signingKey: string
  signingKeyId: string
}

export class CloudflareStreamSigning {
  private config: CloudflareStreamSigningConfig

  constructor(config: CloudflareStreamSigningConfig) {
    this.config = config
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
    const header = {
      alg: 'RS256',
      kid: this.config.signingKeyId
    }
    
    const payload = {
      sub: path,
      exp: exp,
      nbf: Math.floor(Date.now() / 1000) - 60, // Valid 1 minute ago
      iss: this.config.accountId
    }

    // Create JWT token
    const token = this.createJWT(header, payload)
    
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
    const header = {
      alg: 'RS256',
      kid: this.config.signingKeyId
    }
    
    const payload = {
      sub: path,
      exp: exp,
      nbf: Math.floor(Date.now() / 1000) - 60,
      iss: this.config.accountId
    }

    // Create JWT token
    const token = this.createJWT(header, payload)
    
    return `https://videodelivery.net${path}?token=${token}`
  }

  /**
   * Create JWT token for Cloudflare Stream
   * @param header - JWT header
   * @param payload - JWT payload
   * @returns JWT token string
   */
  private createJWT(header: any, payload: any): string {
    // Encode header and payload
    const encodedHeader = this.base64UrlEncode(JSON.stringify(header))
    const encodedPayload = this.base64UrlEncode(JSON.stringify(payload))
    
    // Create signature
    const data = `${encodedHeader}.${encodedPayload}`
    const signature = createSign('RSA-SHA256')
      .update(data)
      .sign(this.config.signingKey, 'base64')
    
    const encodedSignature = this.base64UrlEncode(signature)
    
    return `${data}.${encodedSignature}`
  }

  /**
   * Base64 URL encoding (RFC 4648)
   * @param str - String to encode
   * @returns Base64 URL encoded string
   */
  private base64UrlEncode(str: string): string {
    return Buffer.from(str)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
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

      // Parse JWT token
      const parts = token.split('.')
      if (parts.length !== 3) {
        return false
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts
      
      // Decode payload
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload))
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000)
      if (payload.exp && payload.exp < now) {
        return false
      }

      // Check not before
      if (payload.nbf && payload.nbf > now) {
        return false
      }

      return true
    } catch (error) {
      console.error('Error verifying signed URL:', error)
      return false
    }
  }

  /**
   * Base64 URL decoding
   * @param str - Base64 URL encoded string
   * @returns Decoded string
   */
  private base64UrlDecode(str: string): string {
    // Add padding back
    str = str.replace(/-/g, '+').replace(/_/g, '/')
    while (str.length % 4) {
      str += '='
    }
    
    return Buffer.from(str, 'base64').toString()
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
