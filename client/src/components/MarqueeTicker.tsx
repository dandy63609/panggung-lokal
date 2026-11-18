import React from 'react'

interface MarqueeTickerProps {
  items?: string[]
  reverse?: boolean
  speedSeconds?: number
}

const defaultItems = [
  'STUDIO GIGS INDONESIA',
  'WARUNG KOPI AKUSTIK',
  'PANGGUNG FESTIVAL KAMPUS',
  'INDIE ROCK SHOWCASE',
  'DIRECT WHATSAPP BOOKING',
  'TRANSPARANSI TECHNICAL RIDER',
  'KOMUNITAS MUSIK LOKAL',
  'NO HIDDEN MIDDLEMAN FEES',
]

export const MarqueeTicker: React.FC<MarqueeTickerProps> = ({
  items = defaultItems,
  reverse = false,
  speedSeconds = 30,
}) => {
  // Duplicate items twice to ensure continuous seamless loop
  const displayItems = [...items, ...items]

  return (
    <div className="w-full bg-[#121212] border-y border-[#242424] py-4 relative z-20 overflow-hidden select-none shadow-md">
      <div
        className="animate-marquee flex gap-8 items-center"
        style={{
          animationDuration: `${speedSeconds}s`,
          animationDirection: reverse ? 'reverse' : 'normal',
        }}
      >
        {displayItems.map((item, idx) => (
          <div key={idx} className="flex items-center gap-8 shrink-0">
            <span className="text-xs md:text-sm font-mono font-bold tracking-widest text-[#B0B0B0] uppercase">
              {item}
            </span>
            <span className="w-1.5 h-1.5 bg-[#E01E37] rotate-45 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
