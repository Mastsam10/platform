'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import VideoPlayer from '@/components/VideoPlayer'
import TranscriptPanel from '@/components/TranscriptPanel'
import { useTranscriptPolling } from '@/hooks/useTranscriptPolling'
import Link from 'next/link'

interface Video {
  id: string
  title: string
  description?: string
  status: 'draft' | 'ready'
  playback_id?: string
  has_captions?: boolean
  channels?: {
    name: string
    denomination?: string
  }
}

export default function VideoWatchPage() {
  const params = useParams()
  const videoId = params.videoId as string
  
  const [video, setVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Transcript toggle state
  const [showTranscript, setShowTranscript] = useState(false)
  
  // Video info expand state
  const [expandedInfo, setExpandedInfo] = useState(false)
  
  // Player control functions
  const [getCurrentTime, setGetCurrentTime] = useState<(() => number) | null>(null)
  const [seekTo, setSeekTo] = useState<((seconds: number) => void) | null>(null)

  // Fetch video data
  useEffect(() => {
    const fetchVideo = async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}`)
        if (!response.ok) {
          throw new Error('Video not found')
        }
        const data = await response.json()
        setVideo(data.video)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load video')
      } finally {
        setLoading(false)
      }
    }

    if (videoId) {
      fetchVideo()
    }
  }, [videoId])

  // Poll for transcript readiness
  const { transcript, isLoading: transcriptLoading, error: transcriptError } = useTranscriptPolling({
    videoId,
    playbackId: video?.playback_id || '',
    enabled: !!video?.playback_id && !!video?.has_captions
  })

  const handlePlayerReady = (getTime: () => number, seek: (seconds: number) => void) => {
    setGetCurrentTime(() => getTime)
    setSeekTo(() => seek)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !video) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Video Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'The video you\'re looking for doesn\'t exist.'}
            </p>
            <Link 
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Back to Videos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            ← Back to Videos
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {video.title}
          </h1>
          {video.channels?.name && (
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {video.channels.name}
              {video.channels.denomination && ` • ${video.channels.denomination}`}
            </p>
          )}
        </div>

        {/* Video Player and Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Video Player and Info */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            {video.playback_id ? (
              <VideoPlayer
                playbackId={video.playback_id}
                title={video.title}
                hasCaptions={video.has_captions}
                onPlayerReady={handlePlayerReady}
                className="w-full mb-6"
              />
            ) : (
              <div className="aspect-video bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center mb-6">
                <p className="text-gray-500 dark:text-gray-400">Video not ready</p>
              </div>
            )}
            
            {/* Video Info Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
              {/* Basic Info (Always Visible) */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {video.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {video.channels?.name}
                    {video.channels?.denomination && ` • ${video.channels.denomination}`}
                  </p>
                </div>
                
                {/* Show Transcript Button - Always show if video is ready */}
                {video.status === 'ready' && (
                  <button
                    onClick={() => setShowTranscript(!showTranscript)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors font-medium"
                  >
                    {showTranscript ? 'Hide Transcript' : 'Show Transcript'}
                  </button>
                )}
              </div>

              {/* Expandable Description */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Description</h4>
                  <button
                    onClick={() => setExpandedInfo(!expandedInfo)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                  >
                    {expandedInfo ? 'Show less' : 'Show more'}
                  </button>
                </div>
                
                <div className={`text-gray-600 dark:text-gray-300 ${expandedInfo ? '' : 'line-clamp-2'}`}>
                  {video.description || 'No description available for this video.'}
                </div>
              </div>

              {/* Additional Info (when expanded) */}
              {expandedInfo && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Status:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {video.status === 'ready' ? 'Ready' : 'Processing'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Captions:</span>
                      <span className="ml-2 text-gray-900 dark:text-white">
                        {video.has_captions ? 'Available' : 'Not available'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Transcript Panel (Hidden by default) */}
          {showTranscript && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Transcript
              </h3>
              
              {transcriptLoading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Generating transcript...
                  </p>
                </div>
              )}

              {transcriptError && (
                <div className="text-red-600 dark:text-red-400 text-sm">
                  Error: {transcriptError}
                </div>
              )}

              {transcript && getCurrentTime && seekTo && (
                <TranscriptPanel
                  lines={transcript.lines}
                  getCurrentTime={getCurrentTime}
                  seekTo={seekTo}
                  className="max-h-96"
                />
              )}

              {!transcript && !transcriptLoading && !transcriptError && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No transcript available yet
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
