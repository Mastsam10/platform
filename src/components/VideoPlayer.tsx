'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface VideoPlayerProps {
  playbackId: string
  title?: string
  className?: string
  aspectRatio?: string
  hasCaptions?: boolean // Whether video has Cloudflare captions
  onPlayerReady?: (getCurrentTime: () => number, seekTo: (seconds: number) => void) => void
}

export default function VideoPlayer({ 
  playbackId, 
  title, 
  className = '', 
  aspectRatio = '16/9', 
  hasCaptions,
  onPlayerReady 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  const [showCaptions, setShowCaptions] = useState(true) // Default to showing captions like YouTube
  const [isPlayerReady, setIsPlayerReady] = useState(false)
  
  // Functions for transcript panel integration
  const getCurrentTime = useCallback(() => {
    return videoRef.current?.currentTime || 0
  }, [])

  const seekTo = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds
    }
  }, [])

  useEffect(() => {
    if (videoRef.current && playbackId) {
      // Use Cloudflare Stream URL format
      const videoUrl = `https://videodelivery.net/${playbackId}/manifest/video.m3u8`
      
      // Check if HLS is supported natively
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = videoUrl
        
        videoRef.current.onloadedmetadata = () => {
          setIsPlayerReady(true)
          if (onPlayerReady) {
            onPlayerReady(getCurrentTime, seekTo)
          }
        }
      } else {
        // Use HLS.js for other browsers - dynamic import to avoid build issues
        import('hls.js').then((Hls) => {
          if (Hls.default.isSupported()) {
            if (hlsRef.current) {
              hlsRef.current.destroy()
            }
            
            hlsRef.current = new Hls.default()
            hlsRef.current.loadSource(videoUrl)
            hlsRef.current.attachMedia(videoRef.current)
            
            hlsRef.current.on(Hls.default.Events.MANIFEST_PARSED, () => {
              setIsPlayerReady(true)
              if (onPlayerReady) {
                onPlayerReady(getCurrentTime, seekTo)
              }
            })
            
            hlsRef.current.on(Hls.default.Events.ERROR, (event: any, data: any) => {
              console.error('HLS error:', data)
            })
          } else {
            console.warn('HLS not supported in this browser')
          }
        }).catch((error) => {
          console.error('Failed to load HLS.js:', error)
        })
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [playbackId, onPlayerReady, getCurrentTime, seekTo])

  return (
    <div className={`relative ${className}`} style={{ aspectRatio }}>
      <video
        ref={videoRef}
        controls
        className="w-full h-full rounded-lg"
        poster={`https://videodelivery.net/${playbackId}/thumbnails/thumbnail.jpg?time=0s`}
      >
        {hasCaptions && (
          <track 
            kind="subtitles"
            src={`https://videodelivery.net/${playbackId}/captions/en.vtt`}
            srcLang="en"
            label="English"
            default={showCaptions}
          />
        )}
        Your browser does not support the video tag.
      </video>
      
      {/* Caption Controls - YouTube-style */}
      {hasCaptions && (
        <div className="absolute top-2 right-2 flex gap-2">
          <button
            onClick={() => setShowCaptions(!showCaptions)}
            className="bg-black bg-opacity-70 text-white px-3 py-1 rounded text-sm hover:bg-opacity-90 transition-all"
            title={showCaptions ? 'Hide Captions' : 'Show Captions'}
          >
            {showCaptions ? 'CC' : 'CC'}
          </button>
        </div>
      )}
      
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
    </div>
  )
}
