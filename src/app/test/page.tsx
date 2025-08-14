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
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Platform Test Page</h1>
        
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Upload & Video List */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Upload Test</h2>
              <VideoUpload />
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Video List</h2>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {videos.map(video => (
                    <div
                      key={video.id}
                      className={`p-3 rounded cursor-pointer transition-colors ${
                        selectedVideo?.id === video.id 
                          ? 'bg-blue-100 border-blue-300' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                      onClick={() => handleVideoSelect(video)}
                    >
                      <h3 className="font-medium">{video.title}</h3>
                      <p className="text-sm text-gray-600">
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
                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Video Player</h2>
                  <VideoPlayer 
                    playbackId={selectedVideo.playback_id || 'demo-playback-id'}
                    title={selectedVideo.title}
                  />
                </div>

                <div className="bg-white p-6 rounded-lg shadow">
                  <h2 className="text-xl font-semibold mb-4">Chapters</h2>
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
              <div className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Select a Video</h2>
                <p className="text-gray-600">
                  Choose a video from the list to view the player and chapters.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* API Test Section */}
        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">API Tests</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/videos')
                  const data = await response.json()
                  console.log('Videos API:', data)
                  alert(`Found ${data.videos?.length || 0} videos`)
                } catch (error) {
                  console.error('API test failed:', error)
                  alert('API test failed')
                }
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Test Videos API
            </button>
            
            <button
              onClick={async () => {
                try {
                  const response = await fetch('/api/transcripts/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      videoId: videos[0]?.id || 'test-id',
                      provider: 'deepgram',
                      lang: 'en'
                    })
                  })
                  const data = await response.json()
                  console.log('Transcript API:', data)
                  alert('Transcript test completed')
                } catch (error) {
                  console.error('Transcript test failed:', error)
                  alert('Transcript test failed')
                }
              }}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Test Transcript API
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
