import { Deepgram } from '@deepgram/sdk'

const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY!, 'api.deepgram.com')

export { deepgram }

export interface TranscriptResponse {
  transcript: string
  srt: string
  confidence: number
}

export interface Chapter {
  start_s: number
  end_s: number
  title: string
  type: 'passage' | 'topic'
  value: string
}
