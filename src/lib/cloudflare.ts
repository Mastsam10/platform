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
   * Based on Cloudflare Stream Direct Creator Uploads documentation
   * https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
   */
  async createUpload(title: string): Promise<CloudflareUploadResponse> {
    try {
      console.log('Creating Cloudflare Stream upload URL...')
      
      // The correct endpoint for Direct Creator Uploads
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

      if (!response.ok) {
        const error = await response.text()
        console.error('Cloudflare upload creation failed:', error)
        throw new Error(`Cloudflare upload creation failed: ${error}`)
      }

      const data = await response.json()
      console.log('Cloudflare upload created successfully:', data.result.uid)
      
      return {
        success: true,
        result: {
          uploadURL: data.result.uploadURL,
          uid: data.result.uid
        }
      }
    } catch (error) {
      console.error('Error creating Cloudflare upload:', error)
      throw error
    }
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
