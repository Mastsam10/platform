'use client'

import { useRef, useEffect } from 'react'

interface VideoPlayerProps {
  playbackId: string
  title?: string
  className?: string
  aspectRatio?: string
}

export default function VideoPlayer({ playbackId, title, className = '', aspectRatio = '16/9' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<any>(null)
  
  useEffect(() => {
    if (videoRef.current && playbackId) {
      // Use Cloudflare Stream URL format
      const videoUrl = `https://videodelivery.net/${playbackId}/manifest/video.m3u8`
      
      // Check if HLS is supported natively
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = videoUrl
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
  }, [playbackId])

  return (
    <div className={`relative ${className}`} style={{ aspectRatio }}>
      <video
        ref={videoRef}
        controls
        className="w-full h-full rounded-lg"
        poster={`https://videodelivery.net/${playbackId}/thumbnails/thumbnail.jpg?time=0s`}
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
          <p className="text-sm font-medium">{title}</p>
        </div>
      )}
    </div>
  )
}
