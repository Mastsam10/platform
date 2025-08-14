'use client'

import { useState, useEffect } from 'react'
import VideoUpload from '@/components/VideoUpload'
import VideoList from '@/components/VideoList'
import VideoPlayer from '@/components/VideoPlayer'
import ChapterList from '@/components/ChapterList'

export default function TestPage() {
  const [selectedVideo, setSelectedVideo] = useState<any>(null)
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      if (response.ok) {
        const data = await response.json()
        setVideos(data.videos || [])
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleVideoSelect = (video: any) => {
    setSelectedVideo(video)
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Platform Test Page</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Video List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Upload Test</h2>
              <VideoUpload />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Video List</h2>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {videos.map(video => (
                    <div
                      key={video.id}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedVideo?.id === video.id 
                          ? 'bg-blue-100 dark:bg-blue-900 border-blue-300 dark:border-blue-600' 
                          : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                      onClick={() => handleVideoSelect(video)}
                    >
                      <h3 className="font-medium text-gray-900 dark:text-white">{video.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Status: {video.status} | Duration: {video.duration_s}s
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Player & Chapters */}
          <div className="lg:col-span-2 space-y-6">
            {selectedVideo ? (
              <>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Video Player</h2>
                  <VideoPlayer 
                    playbackId={selectedVideo.playback_id || 'demo-playback-id'}
                    title={selectedVideo.title}
                  />
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Chapters</h2>
                  <ChapterList 
                    videoId={selectedVideo.id}
                    onChapterClick={(startTime) => {
                      console.log('Chapter clicked at:', startTime)
                      // TODO: Implement video seeking
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Select a Video</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Choose a video from the list to start testing the player and chapters.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Debug Section */}
        <div className="mt-8 bg-white dark:bg-gray-800 p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Debug Info</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Selected Video:</h3>
              <pre className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                {selectedVideo ? JSON.stringify(selectedVideo, null, 2) : 'None selected'}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">All Videos:</h3>
              <pre className="text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(videos, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
