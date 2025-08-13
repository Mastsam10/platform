import Mux from '@mux/mux-node'

const muxClient = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

// Access Video API through the client
export const Video = muxClient.video

export interface MuxUploadResponse {
  uploadUrl: string
  assetId: string
}

export interface MuxPlaybackResponse {
  playbackId: string
  duration: number
}
