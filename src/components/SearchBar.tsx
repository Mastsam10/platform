'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Clock } from 'lucide-react'

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

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchTimeoutRef = useRef<NodeJS.Timeout>()
  const router = useRouter()

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (query.length >= 2) {
      setIsLoading(true)
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(query)
      }, 300)
    } else {
      setResults([])
      setShowResults(false)
      setIsLoading(false)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      const data: SearchResponse = await response.json()
      
      setResults(data.results)
      setShowResults(true)
      
      // Save to recent searches
      if (searchQuery.trim()) {
        const updated = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5)
        setRecentSearches(updated)
        localStorage.setItem('recentSearches', JSON.stringify(updated))
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResultClick = (result: SearchResult) => {
    router.push(`/videos/${result.id}`)
    setShowResults(false)
    setQuery('')
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      performSearch(query.trim())
    }
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
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

  return (
    <div className="relative w-full max-w-2xl">
      {/* Search Input */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search videos, transcripts, or descriptions..."
            className="w-full pl-3 pr-20 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onFocus={() => setShowResults(true)}
          />
          
          {/* Search Button */}
          <button
            type="submit"
            disabled={!query.trim()}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:text-gray-300 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
            aria-label="Search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              aria-label="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </form>

      {/* Search Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2">Searching...</p>
            </div>
          ) : results.length > 0 ? (
            <div>
              {results.map((result) => (
                <div
                  key={result.id}
                  onClick={() => handleResultClick(result)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                >
                  {/* Video Title */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 
                        className="font-medium text-gray-900 dark:text-white mb-1"
                        dangerouslySetInnerHTML={{ __html: highlightText(result.title, query) }}
                      />
                      
                      {/* Channel Info */}
                      {result.channels && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {result.channels.display_name}
                          {result.channels.denomination && ` • ${result.channels.denomination}`}
                        </p>
                      )}

                      {/* Description */}
                      {result.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                          {result.description}
                        </p>
                      )}

                      {/* Transcript Match */}
                      {result.matched_text && (
                        <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="w-4 h-4 text-blue-500" />
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Transcript match
                            </span>
                          </div>
                          <p 
                            className="text-gray-700 dark:text-gray-300"
                            dangerouslySetInnerHTML={{ __html: highlightText(result.matched_text, query) }}
                          />
                          {result.transcript_matches && result.transcript_matches.length > 0 && (
                            <div className="mt-1 text-xs text-blue-500">
                              {result.transcript_matches.length} match{result.transcript_matches.length > 1 ? 'es' : ''} found
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Caption Indicator */}
                    {result.has_captions && (
                      <div className="ml-2 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-xs rounded-full">
                        CC
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Show More Results */}
              {results.length >= 20 && (
                <div className="p-4 text-center border-t border-gray-100 dark:border-gray-700">
                  <button 
                    onClick={() => router.push(`/search?q=${encodeURIComponent(query)}`)}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View all results
                  </button>
                </div>
              )}
            </div>
          ) : query.length >= 2 ? (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400">
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or check spelling</p>
            </div>
          ) : (
            <div className="p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Recent searches</h3>
              {recentSearches.length > 0 ? (
                <div className="space-y-1">
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => setQuery(search)}
                      className="w-full text-left px-2 py-1 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      {search}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent searches</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showResults && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowResults(false)}
        />
      )}
    </div>
  )
}
