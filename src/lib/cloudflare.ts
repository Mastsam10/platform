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
   */
  async createUpload(title: string): Promise<CloudflareUploadResponse> {
    // First, create a video record
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${this.accountId}/stream`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        meta: {
          name: title
        },
        requireSignedURLs: false,
        allowedOrigins: ['*']
      })
    })

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
