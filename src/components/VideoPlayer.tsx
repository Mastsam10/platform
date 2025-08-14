'use client'

import { useEffect, useRef } from 'react'
import Hls from 'hls.js'

interface VideoPlayerProps {
  playbackId: string
  title?: string
  className?: string
  aspectRatio?: string
}

export default function VideoPlayer({ playbackId, title, className = '', aspectRatio = '16/9' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)

  useEffect(() => {
    if (videoRef.current && playbackId) {
      const videoUrl = `https://stream.mux.com/${playbackId}.m3u8`
      console.log('Loading video URL:', videoUrl)
      
      // Check if HLS is supported natively
      if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = videoUrl
        console.log('Using native HLS support')
      } else if (Hls.isSupported()) {
        // Use HLS.js for other browsers
        if (hlsRef.current) {
          hlsRef.current.destroy()
        }
        
        hlsRef.current = new Hls()
        hlsRef.current.loadSource(videoUrl)
        hlsRef.current.attachMedia(videoRef.current)
        
        hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('HLS manifest parsed, video ready to play')
        })
        
        hlsRef.current.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS error:', data)
        })
        
        console.log('Using HLS.js')
      } else {
        console.error('HLS not supported in this browser')
      }
      
      // Add event listeners for debugging
      videoRef.current.addEventListener('loadstart', () => console.log('Video loadstart'))
      videoRef.current.addEventListener('loadeddata', () => console.log('Video loadeddata'))
      videoRef.current.addEventListener('error', (e) => console.error('Video error:', e))
    }
    
    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
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
        style={{ aspectRatio }}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  )
}
