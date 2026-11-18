import React, { useRef, useState, useEffect } from 'react'
import { Play, Pause } from 'lucide-react'

interface HeroVideoProps {
  posterUrl?: string
  videoSrc?: string
}

export const HeroVideo: React.FC<HeroVideoProps> = ({
  posterUrl = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1920&auto=format&fit=crop',
  videoSrc = '/nirvana-heart-shaped-box.mp4',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (!isPlaying && videoRef.current) {
      videoRef.current.pause()
    }
  }, [isPlaying])

  const togglePlay = () => {
    if (isPlaying) {
      if (videoRef.current) {
        videoRef.current.pause()
      }
      setIsPlaying(false)
    } else {
      if (videoRef.current) {
        videoRef.current.play().catch(() => {})
      }
      setIsPlaying(true)
    }
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
      {/* Direct Local Video Player: Nirvana - Heart-Shaped Box */}
      <video
        ref={videoRef}
        src={videoSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={posterUrl}
        className="w-full h-full object-cover object-center opacity-50 scale-105 transition-opacity duration-1000 absolute inset-0 z-0"
      />

      {/* Heavy Stage Scrim Gradients (WCAG AA Compliance) */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] via-[#0D0D0D]/75 to-[#0D0D0D]/90 z-2" />
      <div className="absolute inset-0 bg-radial-at-c from-transparent via-[#0D0D0D]/60 to-[#0D0D0D] z-2" />

      {/* Grid Overlay texture */}
      <div
        className="absolute inset-0 opacity-[0.03] z-2"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Pause/Play Button (Docked bottom-left for Antislop R-39) */}
      <div className="absolute bottom-6 left-6 z-20 pointer-events-auto">
        <button
          type="button"
          onClick={togglePlay}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0] hover:text-white bg-[#141414]/90 backdrop-blur-md border border-[#2C2C2C] hover:border-[#E01E37] transition-all min-h-[44px] rounded-sm"
          aria-label={isPlaying ? 'Pause background concert video' : 'Play background concert video'}
        >
          {isPlaying ? (
            <>
              <Pause className="w-3.5 h-3.5 text-[#E01E37]" />
              <span>Jeda Video [NIRVANA : HEART-SHAPED BOX]</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-[#25D366]" />
              <span>Putar Video [NIRVANA : HEART-SHAPED BOX]</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
