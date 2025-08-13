'use client'

import { useState, useEffect } from 'react'

interface Chapter {
  id: string
  start_s: number
  end_s: number
  title: string
  type: 'passage' | 'topic'
  value: string
}

interface ChapterListProps {
  videoId: string
  onChapterClick?: (startTime: number) => void
  className?: string
}

export default function ChapterList({ videoId, onChapterClick, className = '' }: ChapterListProps) {
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchChapters()
  }, [videoId])

  const fetchChapters = async () => {
    try {
      const response = await fetch(`/api/videos/${videoId}/chapters`)
      if (!response.ok) {
        throw new Error('Failed to fetch chapters')
      }
      const data = await response.json()
      setChapters(data.chapters || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chapters')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleChapterClick = (startTime: number) => {
    if (onChapterClick) {
      onChapterClick(startTime)
    }
  }

  if (loading) {
    return (
      <div className={`p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-3">Chapters</h3>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-3">Chapters</h3>
        <p className="text-red-600 text-sm">Error: {error}</p>
      </div>
    )
  }

  if (chapters.length === 0) {
    return (
      <div className={`p-4 ${className}`}>
        <h3 className="text-lg font-semibold mb-3">Chapters</h3>
        <p className="text-gray-500 text-sm">No chapters available</p>
      </div>
    )
  }

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-3">Chapters</h3>
      <div className="space-y-2">
        {chapters.map((chapter) => (
          <button
            key={chapter.id}
            onClick={() => handleChapterClick(chapter.start_s)}
            className="w-full text-left p-2 rounded hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs rounded ${
                  chapter.type === 'passage' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {chapter.type === 'passage' ? '📖' : '🏷️'}
                </span>
                <span className="text-sm font-medium">{chapter.title}</span>
              </div>
              <span className="text-xs text-gray-500">
                {formatTime(chapter.start_s)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

