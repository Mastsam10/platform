'use client'

import { useState, useEffect } from 'react'
import VideoPlayer from './VideoPlayer'
import TranscriptUpload from './TranscriptUpload'

interface Video {
  id: string
  title: string
  description: string
  status: string
  playback_id: string
  srt_url?: string
  created_at: string
}

export default function VideoList() {
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [showTranscriptUpload, setShowTranscriptUpload] = useState(false)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      const data = await response.json()
      setVideos(data.videos || [])
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTranscriptComplete = (transcript: string, srt: string) => {
    console.log('Transcript uploaded successfully')
    setShowTranscriptUpload(false)
    // Refresh the video list to show updated transcript status
    fetchVideos()
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-600 dark:text-gray-400">Loading videos...</div>
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-600 dark:text-gray-400">No videos uploaded yet.</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {videos.map((video) => (
        <div key={video.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {video.title}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {video.description || 'No description'}
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  video.status === 'ready' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : video.status === 'processing'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {video.status}
                </span>
                <span className="text-gray-500 dark:text-gray-400">
                  {new Date(video.created_at).toLocaleDateString()}
                </span>
                {video.srt_url && (
                  <span className="text-green-600 dark:text-green-400">
                    ✓ Transcript available
                  </span>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex space-x-2">
              {video.status === 'ready' && (
                <>
                  <button
                    onClick={() => setSelectedVideo(selectedVideo?.id === video.id ? null : video)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-sm"
                  >
                    {selectedVideo?.id === video.id ? 'Hide Video' : 'Watch'}
                  </button>
                  
                  {!video.srt_url && (
                    <button
                      onClick={() => {
                        setSelectedVideo(video)
                        setShowTranscriptUpload(true)
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-sm"
                    >
                      Add Transcript
                    </button>
                  )}
                  
                  {video.srt_url && (
                    <button
                      onClick={() => {
                        setSelectedVideo(video)
                        setShowTranscriptUpload(true)
                      }}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600 text-sm"
                    >
                      Edit Transcript
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Video Player */}
          {selectedVideo?.id === video.id && video.status === 'ready' && (
            <div className="mb-4">
              <VideoPlayer 
                playbackId={video.playback_id} 
                title={video.title}
                className="w-full"
              />
            </div>
          )}

          {/* Transcript Upload */}
          {selectedVideo?.id === video.id && showTranscriptUpload && (
            <div className="mt-4">
              <TranscriptUpload 
                videoId={video.id}
                onTranscriptComplete={handleTranscriptComplete}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
