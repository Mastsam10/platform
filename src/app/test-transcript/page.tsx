'use client'

import { useState } from 'react'
import VideoPlayer from '@/components/VideoPlayer'
import TranscriptPanel from '@/components/TranscriptPanel'
import { useTranscriptPolling } from '@/hooks/useTranscriptPolling'

export default function TestTranscriptPage() {
  const [videoId, setVideoId] = useState('')
  const [playbackId, setPlaybackId] = useState('')
  const [getCurrentTime, setGetCurrentTime] = useState<(() => number) | null>(null)
  const [seekTo, setSeekTo] = useState<((seconds: number) => void) | null>(null)

  const {
    isLoading,
    transcript,
    error,
    attempts,
    retry,
    hasReachedMaxAttempts
  } = useTranscriptPolling({
    videoId,
    playbackId,
    enabled: !!videoId && !!playbackId
  })

  const handlePlayerReady = (getTime: () => number, seek: (seconds: number) => void) => {
    setGetCurrentTime(() => getTime)
    setSeekTo(() => seek)
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">Cloudflare Stream Captions Test</h1>
      
      {/* Test Controls */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mb-6">
        <h2 className="text-xl font-semibold mb-4">Test Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Video ID</label>
            <input
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              placeholder="Enter video UUID"
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Playback ID</label>
            <input
              type="text"
              value={playbackId}
              onChange={(e) => setPlaybackId(e.target.value)}
              placeholder="Enter Cloudflare playback ID"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Status Display */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">Transcript Status</h3>
        <div className="space-y-1 text-sm">
          <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
          <p>Attempts: {attempts}</p>
          <p>Has Transcript: {transcript ? 'Yes' : 'No'}</p>
          {error && <p className="text-red-600">Error: {error}</p>}
          {hasReachedMaxAttempts && (
            <p className="text-orange-600">Max attempts reached</p>
          )}
        </div>
        {error && (
          <button
            onClick={retry}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        )}
      </div>

      {/* Video Player and Transcript Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Video Player</h2>
          {playbackId ? (
            <VideoPlayer
              playbackId={playbackId}
              title="Test Video"
              onPlayerReady={handlePlayerReady}
            />
          ) : (
            <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-lg flex items-center justify-center">
              <p className="text-gray-500">Enter a playback ID to load video</p>
            </div>
          )}
        </div>

        {/* Transcript Panel */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Transcript Panel</h2>
          {getCurrentTime && seekTo && transcript ? (
            <TranscriptPanel
              lines={transcript.lines}
              getCurrentTime={getCurrentTime}
              seekTo={seekTo}
              className="bg-white dark:bg-gray-800 border rounded-lg p-4"
            />
          ) : (
            <div className="bg-gray-200 dark:bg-gray-700 h-64 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-center">
                {!videoId || !playbackId 
                  ? 'Enter video details to start'
                  : isLoading 
                    ? 'Loading transcript...'
                    : 'No transcript available'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">How to Test</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Upload a video through the main upload page</li>
          <li>Copy the video ID and playback ID from the database</li>
          <li>Enter them in the fields above</li>
          <li>The system will automatically poll for captions</li>
          <li>Once captions are ready, the transcript panel will appear</li>
          <li>Click on any transcript line to seek to that time</li>
        </ol>
      </div>
    </div>
  )
}
