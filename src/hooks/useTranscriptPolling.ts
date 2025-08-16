import { useState, useEffect, useCallback } from 'react'

interface UseTranscriptPollingProps {
  videoId: string
  playbackId: string
  enabled?: boolean
  pollInterval?: number
  maxAttempts?: number
}

interface TranscriptData {
  lines: Array<{ startMs: number; endMs: number; text: string }>
  vttUrl: string
}

export function useTranscriptPolling({
  videoId,
  playbackId,
  enabled = true,
  pollInterval = 15000, // 15 seconds
  maxAttempts = 20 // 5 minutes total
}: UseTranscriptPollingProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)

  const finalizeTranscript = useCallback(async () => {
    if (!enabled || !videoId || !playbackId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/transcripts/finalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoId,
          playbackId,
          lang: 'en'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTranscript({
          lines: data.lines || [],
          vttUrl: data.vttUrl
        })
        setIsLoading(false)
        return true // Success
      } else {
        const errorData = await response.json()
        if (errorData.notReady) {
          // VTT not ready yet, this is expected
          setAttempts(prev => prev + 1)
          setIsLoading(false)
          return false // Not ready, continue polling
        } else {
          // Actual error
          setError(errorData.error || 'Failed to finalize transcript')
          setIsLoading(false)
          return true // Stop polling on error
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
      setIsLoading(false)
      return true // Stop polling on error
    }
  }, [enabled, videoId, playbackId])

  useEffect(() => {
    if (!enabled || !videoId || !playbackId) return

    let timeoutId: NodeJS.Timeout

    const poll = async () => {
      const shouldStop = await finalizeTranscript()
      
      if (shouldStop || attempts >= maxAttempts) {
        if (attempts >= maxAttempts) {
          setError('Transcript generation timed out')
        }
        return
      }

      // Schedule next poll
      timeoutId = setTimeout(poll, pollInterval)
    }

    // Start polling
    poll()

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
  }, [enabled, videoId, playbackId, finalizeTranscript, attempts, maxAttempts, pollInterval])

  const retry = useCallback(() => {
    setAttempts(0)
    setError(null)
    setTranscript(null)
    finalizeTranscript()
  }, [finalizeTranscript])

  return {
    isLoading,
    transcript,
    error,
    attempts,
    retry,
    hasReachedMaxAttempts: attempts >= maxAttempts
  }
}
