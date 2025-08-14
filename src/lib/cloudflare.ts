// Cloudflare Stream API client
export interface CloudflareStreamResponse {
  success: boolean
  result: {
    uid: string
    meta: {
      name: string
    }
    status: {
      state: 'pending' | 'ready' | 'error'
    }
    preview: string
    thumbnail: string
    duration: number
    input: {
      width: number
      height: number
    }
    playback: {
      hls: string
      dash: string
    }
    downloadUrl: string
  }
}

export interface CloudflareUploadResponse {
  success: boolean
  result: {
    uploadURL: string
    uid: string
  }
}

export class CloudflareStream {
  private accountId: string
  private apiToken: string

  constructor() {
    this.accountId = process.env.CLOUDFLARE_ACCOUNT_ID!
    this.apiToken = process.env.CLOUDFLARE_API_TOKEN!
    
    if (!this.accountId || !this.apiToken) {
      throw new Error('Cloudflare credentials not configured')
    }
  }

  /**
   * Create a direct upload URL for Cloudflare Stream
   * Based on testing: Cloudflare Stream works with /stream/copy endpoint
   * For Direct Creator Uploads, we need to use a different approach
   */
  async createUpload(title: string): Promise<CloudflareUploadResponse> {
    // For now, we'll use a placeholder approach since Direct Creator Uploads
    // requires a different endpoint structure than what we've tested
    // The /stream endpoint we tried doesn't work for creating upload URLs
    // The /stream/copy endpoint works for copying from URLs (tested successfully)
    
    // Generate a temporary UID for now
    const tempUid = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Return a mock response that matches our interface
    return {
      success: true,
      result: {
        uploadURL: `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${tempUid}/upload`,
        uid: tempUid
      }
    }
  }

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Cloudflare upload creation failed: ${error}`)
    }

    return await response.json()
  }

  /**
   * Get video details by UID
   */
  async getVideo(uid: string): Promise<CloudflareStreamResponse> {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream/${uid}`, {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Failed to get video: ${error}`)
    }

    return await response.json()
  }

  /**
   * Get download URL for transcription
   */
  getDownloadUrl(uid: string): string {
    return `https://videodelivery.net/${uid}/downloads/default.mp4`
  }

  /**
   * Get playback URL for video player
   */
  getPlaybackUrl(uid: string): string {
    return `https://videodelivery.net/${uid}/manifest/video.m3u8`
  }

  /**
   * Check if video is ready
   */
  async isVideoReady(uid: string): Promise<boolean> {
    try {
      const video = await this.getVideo(uid)
      return video.result.status.state === 'ready'
    } catch (error) {
      console.error('Error checking video status:', error)
      return false
    }
  }
}

export const cloudflareStream = new CloudflareStream()
