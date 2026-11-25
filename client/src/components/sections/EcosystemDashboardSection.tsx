import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

interface MetricColumn {
  id: string
  label: string
  targetValue: number
  suffix: string
  sublabel: string
  totalSegments: number
  activeSegments: number
  color: string
}

interface EcosystemDashboardProps {
  totalBands?: number
}

export const EcosystemDashboardSection: React.FC<EcosystemDashboardProps> = ({ totalBands = 8 }) => {
  const pinWrapRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLElement>(null)
  const totalBandsRef = useRef<number>(totalBands || 8)
  const hasCompletedRef = useRef<boolean>(false)

  useEffect(() => {
    const nextValue = totalBands || 8
    totalBandsRef.current = nextValue
    if (hasCompletedRef.current) {
      const bandsEl = document.getElementById('count-bands')
      if (bandsEl) {
        bandsEl.innerText = `${nextValue}+`
      }
    }
  }, [totalBands])

  const metrics: MetricColumn[] = [
    { id: 'gigs', label: 'PANGGUNG TERHUBUNG', targetValue: 128, suffix: '+', sublabel: 'Sepanjang Musim', totalSegments: 10, activeSegments: 8, color: '#E01E37' },
    { id: 'rider', label: 'SOUNDCHECK PASS', targetValue: 100, suffix: '%', sublabel: 'Bebas Miskomunikasi', totalSegments: 10, activeSegments: 10, color: '#25D366' },
    { id: 'chat', label: 'DIRECT INQUIRIES', targetValue: 350, suffix: '+', sublabel: 'Percakapan WA', totalSegments: 10, activeSegments: 7, color: '#FFB627' },
    { id: 'cities', label: 'KOTA TERJANGKAU', targetValue: 7, suffix: ' Kota', sublabel: 'Jawa & Bali', totalSegments: 10, activeSegments: 5, color: '#FF6B35' },
    { id: 'hours', label: 'JAM PANGGUNG', targetValue: 2400, suffix: '+ Jam', sublabel: 'Akumulasi Live', totalSegments: 10, activeSegments: 9, color: '#E01E37' },
  ]

  useGSAP(() => {
    const getTargetValue = (m: MetricColumn) => (m.id === 'bands' ? totalBandsRef.current : m.targetValue)

    // Respect reduced motion (Antislop R-39)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      metrics.forEach((m) => {
        const el = document.getElementById(`count-${m.id}`)
        if (el) el.innerText = `${getTargetValue(m)}${m.suffix}`
      })
      gsap.set('.matrix-segment', { opacity: 1, scale: 1 })
      hasCompletedRef.current = true
      return
    }

    const mm = gsap.matchMedia()

    // Desktop (>= 1024px): CSS sticky pin + ScrollTrigger scrub (avoids GSAP pin-spacer / fixed snap glitches)
    mm.add('(min-width: 1024px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinWrapRef.current,
          start: 'top 65%',
          end: 'bottom bottom',
          scrub: 0.5,
          onUpdate: (self) => {
            hasCompletedRef.current = self.progress >= 0.99
          },
        },
      })

      tl.fromTo(
        '.matrix-segment',
        { opacity: 0.15, scale: 0.8 },
        { opacity: 1, scale: 1, stagger: { amount: 1.0, from: 'end', grid: [10, 6] }, ease: 'power1.inOut' }
      )

      metrics.forEach((m) => {
        const counterObj = { progress: 0 }
        tl.to(
          counterObj,
          {
            progress: 1,
            duration: 1.0,
            ease: 'power2.out',
            onUpdate: () => {
              const el = document.getElementById(`count-${m.id}`)
              if (el) {
                el.innerText = `${Math.round(counterObj.progress * getTargetValue(m))}${m.suffix}`
              }
            },
          },
          '<'
        )
      })
    })

    // Mobile / Tablet (< 1024px): Smooth scroll reveal without sticky/pin to prevent clipping
    mm.add('(max-width: 1023px)', () => {
      const tl = gsap.timeline({
        onComplete: () => {
          hasCompletedRef.current = true
        },
        onReverseComplete: () => {
          hasCompletedRef.current = false
        },
        scrollTrigger: {
          trigger: containerRef.current,
          start: 'top 75%',
          end: 'bottom 25%',
          toggleActions: 'play none none reverse',
        },
      })

      tl.fromTo(
        '.matrix-segment',
        { opacity: 0.15, scale: 0.8 },
        { opacity: 1, scale: 1, stagger: 0.02, duration: 0.6, ease: 'power1.out' }
      )

      metrics.forEach((m) => {
        const counterObj = { progress: 0 }
        tl.to(
          counterObj,
          {
            progress: 1,
            duration: 0.8,
            ease: 'power2.out',
            onUpdate: () => {
              const el = document.getElementById(`count-${m.id}`)
              if (el) {
                el.innerText = `${Math.round(counterObj.progress * getTargetValue(m))}${m.suffix}`
              }
            },
          },
          '<'
        )
      })
    })

    return () => mm.revert()
  }, { scope: pinWrapRef })

  return (
    <div ref={pinWrapRef} className="relative w-full lg:h-[180vh] bg-[#0D0D0D]">
      <section
        ref={containerRef}
        className="lg:sticky lg:top-0 w-full min-h-screen bg-[#0D0D0D] border-b border-[#242424] flex flex-col justify-center pt-24 pb-16 px-4 sm:px-8 z-10 overflow-hidden"
      >
      <div className="max-w-7xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00D9FF] animate-pulse" />
              <span className="text-xs font-mono text-[#00D9FF] tracking-widest uppercase font-bold">
                TELEMETRI MATRIX // SOUND SYSTEM RACK
              </span>
            </div>
            <h2 className="font-display text-4xl sm:text-6xl text-white tracking-wide uppercase leading-tight">
              DASHBOARD POTENSI EKOSISTEM
            </h2>
          </div>
          <div className="text-xs font-mono text-[#A0A0A0]">
            STATUS SISTEM: REAL-TIME AKTIF
          </div>
        </div>

        {/* 5 VU-Meter Rack Columns (balanced layout) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {metrics.map((col) => (
            <div
              key={col.id}
              className="bg-[#141414] border border-[#262626] p-3 sm:p-4 flex flex-col justify-between hover:border-[#E01E37] transition-all duration-200 rounded-sm shadow-xl group"
            >
              {/* Count Header */}
              <div className="text-center pb-2.5 border-b border-[#202020]">
                <div
                  id={`count-${col.id}`}
                  className="font-mono text-xl sm:text-2xl font-bold text-white tracking-tight group-hover:text-[#E01E37] transition-colors"
                >
                  0{col.suffix}
                </div>
                <div className="text-[10px] font-mono text-[#A0A0A0] uppercase mt-0.5 tracking-wider truncate">
                  {col.label}
                </div>
              </div>

              {/* Stack of LED meter segments */}
              <div className="py-3 flex flex-col-reverse gap-1 items-center">
                {Array.from({ length: col.totalSegments }).map((_, sIdx) => {
                  const isActive = sIdx < col.activeSegments
                  const isPeak = sIdx >= col.totalSegments - 2
                  return (
                    <div
                      key={sIdx}
                      className="matrix-segment w-full h-1.5 rounded-[1px] transition-all"
                      style={{
                        backgroundColor: isActive ? (isPeak ? '#E01E37' : col.color) : '#1E1E1E',
                        boxShadow: isActive ? `0 0 5px ${isPeak ? '#E01E37' : col.color}80` : 'none',
                      }}
                    />
                  )
                })}
              </div>

              {/* Sublabel */}
              <div className="text-[10px] font-mono text-[#616161] text-center pt-2 border-t border-[#202020] uppercase tracking-wider truncate">
                {col.sublabel}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="pt-2 flex flex-wrap items-center justify-between text-xs font-mono text-[#616161]">
          <span>INDIKATOR ELEKTROAKUSTIK STANDAR ISO</span>
          <span className="text-[#25D366]">TERHUBUNG DATABASE LANGSUNG</span>
        </div>
      </div>
      </section>
    </div>
  )
}
