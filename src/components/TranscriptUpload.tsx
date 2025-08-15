'use client'

import { useState } from 'react'

interface TranscriptUploadProps {
  videoId: string
  onTranscriptComplete?: (transcript: string, srt: string) => void
}

export default function TranscriptUpload({ videoId, onTranscriptComplete }: TranscriptUploadProps) {
  const [transcript, setTranscript] = useState('')
  const [srtFile, setSrtFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleTextUpload = async () => {
    if (!transcript.trim()) {
      setError('Please enter a transcript')
      return
    }

    setUploading(true)
    setError(null)

    try {
      // Convert plain text to SRT format
      const srt = convertToSRT(transcript)
      
      // Upload transcript
      const response = await fetch('/api/transcripts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          transcript,
          srt
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Transcript uploaded successfully:', data)
        
        if (onTranscriptComplete) {
          onTranscriptComplete(transcript, srt)
        }
        
        setTranscript('')
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to upload transcript')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleSrtUpload = async () => {
    if (!srtFile) {
      setError('Please select an SRT file')
      return
    }

    setUploading(true)
    setError(null)

    try {
      const srtContent = await srtFile.text()
      
      // Extract plain text from SRT
      const plainText = extractTextFromSRT(srtContent)
      
      // Upload transcript
      const response = await fetch('/api/transcripts/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          transcript: plainText,
          srt: srtContent
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('SRT file uploaded successfully:', data)
        
        if (onTranscriptComplete) {
          onTranscriptComplete(plainText, srtContent)
        }
        
        setSrtFile(null)
        setError(null)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to upload SRT file')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const convertToSRT = (text: string): string => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
    let srt = ''
    
    sentences.forEach((sentence, index) => {
      const startTime = index * 3 // 3 seconds per sentence
      const endTime = startTime + 3
      
      srt += `${index + 1}\n`
      srt += `${formatTime(startTime)} --> ${formatTime(endTime)}\n`
      srt += `${sentence.trim()}.\n\n`
    })
    
    return srt
  }

  const extractTextFromSRT = (srt: string): string => {
    const lines = srt.split('\n')
    const textLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      // Skip timestamp lines and empty lines
      if (line && !line.match(/^\d+$/) && !line.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/)) {
        textLines.push(line)
      }
    }
    
    return textLines.join(' ')
  }

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const ms = Math.floor((seconds % 1) * 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Add Transcript</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Text Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Transcript Text
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste or type your video transcript here..."
            rows={6}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={uploading}
          />
          <button
            onClick={handleTextUpload}
            disabled={uploading || !transcript.trim()}
            className="mt-2 w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Text Transcript'}
          </button>
        </div>

        <div className="text-center text-gray-500 dark:text-gray-400">- OR -</div>

        {/* SRT File Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            SRT File
          </label>
          <input
            type="file"
            accept=".srt"
            onChange={(e) => setSrtFile(e.target.files?.[0] || null)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={uploading}
          />
          {srtFile && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Selected: {srtFile.name}
            </p>
          )}
          <button
            onClick={handleSrtUpload}
            disabled={uploading || !srtFile}
            className="mt-2 w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload SRT File'}
          </button>
        </div>
      </div>
    </div>
  )
}
