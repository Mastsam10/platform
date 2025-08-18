'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import VideoPlayer from '@/components/VideoPlayer'

interface Channel {
  id: string
  slug: string
  display_name: string
  type: string
  about?: string
  denomination?: string
  city?: string
  state?: string
  avatar_url?: string
  banner_url?: string
  created_at: string
}

interface Video {
  id: string
  title: string
  description?: string
  status: string
  playback_id?: string
  duration_s?: number
  aspect_ratio?: string
  published_at?: string
  has_captions?: boolean
}

interface ChannelPageData {
  channel: Channel
  videos: Video[]
  videoCount: number
}

export default function ChannelPage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [data, setData] = useState<ChannelPageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchChannelData = async () => {
      try {
        const response = await fetch(`/api/channels/${slug}`)
        if (!response.ok) {
          throw new Error('Channel not found')
        }
        const channelData = await response.json()
        setData(channelData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load channel')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchChannelData()
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Channel Not Found
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {error || 'The channel you\'re looking for doesn\'t exist.'}
            </p>
            <Link 
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              Back to Videos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const { channel, videos, videoCount } = data

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mb-4"
          >
            ← Back to Videos
          </Link>
          
          {/* Channel Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center space-x-4">
              {channel.avatar_url ? (
                <img 
                  src={channel.avatar_url} 
                  alt={channel.display_name}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {channel.display_name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {channel.display_name}
                </h1>
                <div className="flex items-center space-x-4 text-gray-600 dark:text-gray-400 mt-2">
                  {channel.type === 'church' && channel.denomination && (
                    <span>{channel.denomination}</span>
                  )}
                  {channel.city && channel.state && (
                    <span>{channel.city}, {channel.state}</span>
                  )}
                  <span>{videoCount} videos</span>
                </div>
                {channel.about && (
                  <p className="text-gray-600 dark:text-gray-400 mt-3">
                    {channel.about}
                  </p>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Subscribe
                </button>
                <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                  Share
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Videos Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Videos ({videoCount})
          </h2>
          
          {videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No videos uploaded yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {videos.map((video) => (
                <div key={video.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <Link href={`/videos/${video.id}`}>
                    <div className="aspect-video bg-gray-200 dark:bg-gray-700 relative">
                      {video.playback_id ? (
                        <VideoPlayer
                          playbackId={video.playback_id}
                          title={video.title}
                          className="w-full h-full"
                          aspectRatio={video.aspect_ratio || '16/9'}
                          hasCaptions={video.has_captions}
                        />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-500 dark:text-gray-400">Video not ready</p>
                        </div>
                      )}
                    </div>
                  </Link>
                  
                  <div className="p-4">
                    <Link href={`/videos/${video.id}`}>
                      <h3 className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors">
                        {video.title}
                      </h3>
                    </Link>
                    {video.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm mt-1 line-clamp-2">
                        {video.description}
                      </p>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      {video.duration_s && (
                        <span>{Math.floor(video.duration_s / 60)}:{(video.duration_s % 60).toString().padStart(2, '0')}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
