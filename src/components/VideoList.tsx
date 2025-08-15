'use client'

import { useState, useEffect } from 'react'
import VideoPlayer from './VideoPlayer'

interface Video {
  id: string
  title: string
  description?: string
  status?: string
  playback_id?: string
  duration_s?: number
  aspect_ratio?: string
  published_at?: string
  srt_url?: string // Add SRT URL for captions
  channels?: {
    name: string
    denomination?: string
  }
}

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }
      const data = await response.json()
      setVideos(data.videos || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600 dark:text-gray-400">Loading videos...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 dark:text-red-400">Error: {error}</p>
        <button 
          onClick={fetchVideos}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600 dark:text-gray-400">No videos found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Videos</h2>
      {videos.map((video) => {
        return (
        <div key={video.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">{video.title}</h3>
              {video.description && (
                <p className="text-gray-600 dark:text-gray-300 mb-2">{video.description}</p>
              )}
              <div className="text-sm text-gray-500 dark:text-gray-400">
                <p className="mb-1">
                  <span className={`px-2 py-1 rounded text-xs ${
                    video.status === 'ready' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {video.status === 'ready' ? 'Ready' : 'Processing'}
                  </span>
                </p>
                {video.channels?.name && (
                  <p>Channel: {video.channels.name}</p>
                )}
                {video.channels?.denomination && (
                  <p>Denomination: {video.channels.denomination}</p>
                )}
                {video.duration_s && (
                  <p>Duration: {Math.floor(video.duration_s / 60)}:{(video.duration_s % 60).toString().padStart(2, '0')}</p>
                )}
              </div>
            </div>
            <div>
              {video.playback_id ? (
                <VideoPlayer 
                  playbackId={video.playback_id} 
                  title={video.title}
                  className="w-full"
                  aspectRatio={video.aspect_ratio || '16/9'}
                  srtUrl={video.srt_url} // Pass SRT URL for captions
                />
              ) : (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Video not ready</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )})}
    </div>
  )
}
