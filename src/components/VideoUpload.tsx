'use client'

import { useState } from 'react'

interface VideoUploadProps {
  onUploadComplete?: (videoId: string, assetId: string) => void
}

export default function VideoUpload({ onUploadComplete }: VideoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Check file size (200MB limit for basic uploads)
      if (selectedFile.size > 200 * 1024 * 1024) {
        setError('File size must be under 200MB for basic uploads')
        return
      }
      
      // Check file type
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please select a valid video file')
        return
      }
      
      setFile(selectedFile)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      setError('Please select a file and enter a title')
      return
    }

    setUploading(true)
    setProgress(0)
    setError(null)

    try {
      // Step 1: Get upload URL from our backend
      const initResponse = await fetch('/api/upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          description
        })
      })

      if (!initResponse.ok) {
        throw new Error('Failed to initialize upload')
      }

      const { uploadUrl, videoId, assetId } = await initResponse.json()

      // Step 2: Upload file directly to Cloudflare Stream
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload video')
      }

      setProgress(100)
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(videoId, assetId)
      }

      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4">Upload Video</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Video File
          </label>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={uploading}
          />
          {file && (
            <p className="mt-1 text-sm text-gray-600">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={uploading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter video description"
            rows={3}
            className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={uploading}
          />
        </div>

        {uploading && (
          <div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-1">Uploading... {progress}%</p>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={uploading || !file || !title.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </div>
    </div>
  )
}
