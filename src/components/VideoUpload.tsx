'use client'

import { useState } from 'react'

interface UploadResponse {
  uploadUrl: string
  videoId: string
  assetId: string
}

export default function VideoUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return

    setUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Initialize upload
      const initResponse = await fetch('/api/upload/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channelId: 'temp-channel-id', // TODO: Get from auth context
          title,
          description,
        }),
      })

      if (!initResponse.ok) {
        throw new Error('Failed to initialize upload')
      }

      const { uploadUrl, videoId }: UploadResponse = await initResponse.json()

      // Step 2: Upload file to Mux
      const formData = new FormData()
      formData.append('file', file)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      })

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file')
      }

      setUploadProgress(100)
      alert('Video uploaded successfully!')

      // Reset form
      setFile(null)
      setTitle('')
      setDescription('')
      setUploadProgress(0)

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed. Please try again.'
      alert(`Upload failed: ${errorMessage}`)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Upload Video</h2>
      
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title *
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          />
        </div>
        
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700"
          />
        </div>
        
        <div>
          <label htmlFor="video" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Video File *
          </label>
          <input
            id="video"
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-white bg-white dark:bg-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
          />
          {file && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </p>
          )}
        </div>

        {uploading && (
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        )}
        
        <button
          type="submit"
          disabled={uploading || !file || !title}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {uploading ? 'Uploading...' : 'Upload Video'}
        </button>
      </form>
    </div>
  )
}
