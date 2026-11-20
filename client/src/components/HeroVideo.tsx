import React, { useRef } from 'react'

interface HeroVideoProps {
  posterUrl?: string
  videoSrc?: string
}

export const HeroVideo: React.FC<HeroVideoProps> = ({
  posterUrl = 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1920&auto=format&fit=crop',
  videoSrc = '/nirvana-heart-shaped-box.mp4',
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)

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
    </div>
  )
}
