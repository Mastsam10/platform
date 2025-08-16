'use client'
import { useEffect, useMemo, useState } from 'react'

type Line = { startMs: number; endMs: number; text: string }

interface TranscriptPanelProps {
  lines: Line[]
  getCurrentTime: () => number // () => number (seconds) – you provide from player
  seekTo: (seconds: number) => void
  className?: string
}

export default function TranscriptPanel({
  lines,
  getCurrentTime,
  seekTo,
  className = ''
}: TranscriptPanelProps) {
  const [activeIdx, setActiveIdx] = useState<number>(-1)

  // Poll the player time (simple MVP). You can also subscribe to timeupdate if your player exposes it.
  useEffect(() => {
    const t = setInterval(() => {
      const tSec = getCurrentTime()
      const tMs = Math.floor(tSec * 1000)
      const idx = lines.findIndex(l => tMs >= l.startMs && tMs < l.endMs)
      setActiveIdx(idx)
    }, 300)
    return () => clearInterval(t)
  }, [lines, getCurrentTime])

  if (!lines || lines.length === 0) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        <p>No transcript available</p>
      </div>
    )
  }

  return (
    <div className={`space-y-2 text-sm leading-6 max-h-96 overflow-y-auto ${className}`}>
      {lines.map((l, i) => {
        const isActive = i === activeIdx
        const start = msToStamp(l.startMs)
        return (
          <div
            key={i}
            className={`rounded px-2 py-1 cursor-pointer transition-colors ${
              isActive 
                ? 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500' 
                : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            }`}
            onClick={() => seekTo(l.startMs / 1000)}
          >
            <span className="text-zinc-500 mr-2 font-mono text-xs">{start}</span>
            <span className={isActive ? 'font-medium' : ''}>{l.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function msToStamp(ms: number) {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return (h > 0 ? `${h}:` : '') + `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}
