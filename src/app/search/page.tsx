'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Search, Clock, Play, Filter } from 'lucide-react'

interface SearchResult {
  id: string
  title: string
  description?: string
  playback_id?: string
  has_captions?: boolean
  channels?: {
    display_name: string
    denomination?: string
    type: string
    slug: string
  }
  search_rank: number
  matched_text?: string
  transcript_matches?: Array<{
    text: string
    startMs: number
    endMs: number
  }>
}

interface SearchResponse {
  results: SearchResult[]
  total: number
  query: string
  hasMore: boolean
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') || ''
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [channels, setChannels] = useState<Array<{ id: string; name: string }>>([])

  const resultsPerPage = 20

  // Load channels for filter
  useEffect(() => {
    loadChannels()
  }, [])

  // Perform search when query or filters change
  useEffect(() => {
    if (query) {
      performSearch(1)
    }
  }, [query, selectedChannel])

  const loadChannels = async () => {
    try {
      const response = await fetch('/api/channels')
      const data = await response.json()
      setChannels(data.channels || [])
    } catch (error) {
      console.error('Failed to load channels:', error)
    }
  }

  const performSearch = async (page: number) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        q: query,
        limit: resultsPerPage.toString(),
        offset: ((page - 1) * resultsPerPage).toString()
      })

      if (selectedChannel) {
        params.append('channel', selectedChannel)
      }

      const response = await fetch(`/api/search?${params}`)
      const data: SearchResponse = await response.json()
      
      setResults(data.results)
      setTotal(data.total)
      setHasMore(data.hasMore)
      setCurrentPage(page)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMore = () => {
    if (hasMore && !isLoading) {
      performSearch(currentPage + 1)
    }
  }

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const highlightText = (text: string, query: string) => {
    if (!query) return text
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>')
  }

  if (!query) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto p-8">
          <div className="text-center">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Search Videos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Enter a search term to find videos and transcripts
            </p>
            <Link 
              href="/"
              className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Videos
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              ← Back to Videos
            </Link>
            <Search className="w-6 h-6 text-gray-400" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Search Results
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <p className="text-gray-600 dark:text-gray-400">
              {total} result{total !== 1 ? 's' : ''} for "{query}"
            </p>
            
            {/* Channel Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Channels</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {isLoading && currentPage === 1 ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Searching...</p>
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-6">
            {results.map((result) => (
              <div
                key={result.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start gap-4">
                  {/* Video Thumbnail */}
                  <div className="flex-shrink-0">
                    <Link href={`/videos/${result.id}`}>
                      <div className="w-48 h-27 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden relative">
                        {result.playback_id && (
                          <img
                            src={`https://videodelivery.net/${result.playback_id}/thumbnails/thumbnail.jpg?time=0s`}
                            alt={result.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </Link>
                  </div>

                  {/* Video Info */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/videos/${result.id}`}>
                      <h2 
                        className="text-xl font-semibold text-gray-900 dark:text-white mb-2 hover:text-blue-600 dark:hover:text-blue-400"
                        dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
                      />
                    </Link>

                    {/* Channel Info */}
                    {result.channels && (
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                        {result.channels.display_name}
                        {result.channels.denomination && ` • ${result.channels.denomination}`}
                      </p>
                    )}

                    {/* Description */}
                    {result.description && (
                      <p 
                        className="text-gray-600 dark:text-gray-300 mb-3 line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: highlightText(result.description, query) }}
                      />
                    )}

                    {/* Transcript Matches */}
                    {result.transcript_matches && result.transcript_matches.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Transcript matches:</span>
                        </div>
                        {result.transcript_matches.map((match, index) => (
                          <div key={index} className="pl-6">
                            <Link 
                              href={`/videos/${result.id}?t=${Math.floor(match.startMs / 1000)}`}
                              className="block p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm hover:bg-blue-100 dark:hover:bg-blue-900/30"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-blue-600 dark:text-blue-400 font-medium">
                                  {formatTime(match.startMs)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatTime(match.endMs - match.startMs)}
                                </span>
                              </div>
                              <p 
                                className="text-gray-700 dark:text-gray-300"
                                dangerouslySetInnerHTML={{ __html: highlightText(match.text, query) }}
                              />
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Caption Indicator */}
                    {result.has_captions && (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                          CC Available
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center pt-6">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Loading...' : 'Load More Results'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No results found
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No videos match your search for "{query}"
            </p>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <p>Try:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Using different keywords</li>
                <li>Checking your spelling</li>
                <li>Using more general terms</li>
                <li>Searching for specific topics or scripture references</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

