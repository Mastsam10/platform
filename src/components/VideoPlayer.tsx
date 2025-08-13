'use client'

import { useEffect, useRef } from 'react'

interface VideoPlayerProps {
  playbackId: string
  title?: string
  className?: string
}

export default function VideoPlayer({ playbackId, title, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && playbackId) {
      // Mux HLS stream URL
      const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`
      videoRef.current.src = videoUrl
    }
  }, [playbackId])

  return (
    <div className={`w-full ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
      )}
      <video
        ref={videoRef}
        controls
        className="w-full rounded-lg shadow-lg"
        style={{ aspectRatio: '16/9' }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
