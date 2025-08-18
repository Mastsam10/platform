'use client'

import VideoList from '@/components/VideoList'
import VideoUpload from '@/components/VideoUpload'
import { useState } from 'react'

// Deployment trigger: 2025-08-14 19:40 - Force Vercel deployment

export default function Home() {
  const [showUpload, setShowUpload] = useState(false)

  const handleUploadComplete = (videoId: string, assetId: string) => {
    console.log('Upload completed:', { videoId, assetId })
    setShowUpload(false)
    // You could refresh the video list here
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Recent Videos</h1>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {showUpload ? 'Cancel Upload' : 'Upload Video'}
          </button>
        </div>

        {showUpload && (
          <div className="mb-8">
            <VideoUpload onUploadComplete={handleUploadComplete} />
          </div>
        )}

        <VideoList />
      </div>
    </div>
  )
}
