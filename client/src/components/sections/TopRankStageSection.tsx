import React, { useRef, useState, useEffect } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger)

export const TopRankStageSection: React.FC = () => {
  const pinWrapRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Floating media plane refs
  const unionRightRef = useRef<HTMLDivElement>(null)
  const unionLeftRef = useRef<HTMLDivElement>(null)
  const thumbARef = useRef<HTMLDivElement>(null)
  const thumbBRef = useRef<HTMLDivElement>(null)
  const thumbCRef = useRef<HTMLDivElement>(null)

  // Typography refs
  const subtitleRef = useRef<HTMLParagraphElement>(null)
  const valueRef = useRef<HTMLParagraphElement>(null)

  // Ambient telemetry camera cycling (Gencherry optical pulse: opacity transition 1500ms)
  const [pulseState, setPulseState] = useState<number>(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setPulseState((prev) => (prev + 1) % 4)
    }, 3200)
    return () => clearInterval(timer)
  }, [])

  useGSAP(() => {
    // Respect reduced motion (Antislop R-39)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const mm = gsap.matchMedia()

    // Desktop (>= 1024px): Scroll-Pinned Parallax Multi-Plane Depth balanced inside viewport below Navbar
    mm.add('(min-width: 1024px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinWrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        }
      })

      tl.to(unionRightRef.current, { y: -40, ease: 'none' }, 0)
      tl.to(unionLeftRef.current, { y: -55, ease: 'none' }, 0)
      tl.to(thumbBRef.current, { y: -60, ease: 'none' }, 0)
      tl.to(thumbARef.current, { y: -85, ease: 'none' }, 0)
      tl.to(thumbCRef.current, { y: -100, ease: 'none' }, 0)
      tl.to(subtitleRef.current, { y: -95, ease: 'none' }, 0)
      tl.to(valueRef.current, { y: -120, ease: 'none' }, 0)
    })

    // Mobile / Tablet (< 1024px): Dynamic scrub parallax with multi-plane depth
    mm.add('(max-width: 1023px)', () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: pinWrapRef.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
        }
      })

      // Dynamic mobile scrub-parallax offsets tailored for phone viewports:
      // Multi-plane floating depth that moves in real-time with finger scroll
      tl.to(unionRightRef.current, { y: -35, scale: 1.04, ease: 'none' }, 0)
      tl.to(unionLeftRef.current, { y: -45, scale: 0.96, ease: 'none' }, 0)
      tl.to(thumbBRef.current, { y: -50, x: -8, ease: 'none' }, 0)
      tl.to(thumbARef.current, { y: -65, x: 8, ease: 'none' }, 0)
      tl.to(thumbCRef.current, { y: -80, scale: 1.03, ease: 'none' }, 0)
      tl.to(subtitleRef.current, { y: -65, opacity: 0.9, ease: 'none' }, 0)
      tl.to(valueRef.current, { y: -90, scale: 0.94, ease: 'none' }, 0)
    })

    return () => mm.revert()
  }, { scope: pinWrapRef })

  return (
    <div
      ref={pinWrapRef}
      className="relative w-full h-[160vh] lg:h-[170vh] bg-black"
    >
      <section
        ref={sectionRef}
        className="sticky top-0 w-full h-screen overflow-hidden flex flex-col justify-center items-center px-5 pt-20 select-none"
        style={{
          color: '#ffffff',
          fontFamily: "'Space Mono', monospace, ui-monospace",
          letterSpacing: '-0.04em',
          textAlign: 'center',
          background: 'radial-gradient(85% 70% at 50% 92%, rgba(224, 30, 55, 0.35) 0%, rgba(224, 30, 55, 0.16) 45%, rgba(224, 30, 55, 0) 75%), #000000',
        }}
      >
        {/* Subtle grid mesh */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* 1. TOP-RIGHT UNION PLANE (diagonal chamfer / angled notch on left) */}
        <div
          ref={unionRightRef}
          className="absolute top-[92px] sm:top-[100px] right-5 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000"
          style={{
            width: 'clamp(180px, 32.01vw, 461px)',
            aspectRatio: '461 / 357',
            opacity: pulseState === 0 || pulseState === 2 ? 1 : 0.45,
            clipPath: 'polygon(28% 0, 100% 0, 100% 100%, 0 100%)',
          }}
          aria-hidden="true"
        >
          <div className="w-full h-full relative bg-[#0D0D0D]">
            <img
              src="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=900&auto=format&fit=crop"
              alt="Live Stage Lighting"
              className="w-full h-full object-cover grayscale contrast-125 brightness-95"
            />
            {/* Dark vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40 pointer-events-none" />
            {/* Baked telemetry overlay */}
            <div className="absolute top-3 right-4 font-mono text-[9px] sm:text-[10px] text-white/70 tracking-widest uppercase">
              GEN.CHERRY_STAGE // 198 BPM
            </div>
            <div className="absolute bottom-3 right-4 font-mono text-[9px] sm:text-[10px] text-[#E01E37] tracking-widest font-bold">
              MASTER AUDIO // 100%
            </div>
          </div>
        </div>

        {/* 2. TOP-LEFT UNION PLANE (diagonal chamfer on right edge) */}
        <div
          ref={unionLeftRef}
          className="absolute top-[92px] sm:top-[100px] left-5 z-0 overflow-hidden pointer-events-none transition-opacity duration-1000"
          style={{
            width: 'clamp(180px, 32.01vw, 461px)',
            aspectRatio: '461 / 357',
            opacity: pulseState === 0 || pulseState === 1 ? 1 : 0.4,
            clipPath: 'polygon(0 0, 100% 0, 72% 100%, 0 100%)',
          }}
          aria-hidden="true"
        >
          <div className="w-full h-full relative bg-[#0D0D0D]">
            {/* Live video playback loop */}
            <video
              src="/nirvana-live.mp4"
              poster="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=900&auto=format&fit=crop"
              className="w-full h-full object-cover grayscale contrast-125 brightness-90"
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
            />
            {/* Dark vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />
            {/* Baked telemetry overlay */}
            <div className="absolute top-3 left-4 font-mono text-[9px] sm:text-[10px] text-white/70 tracking-widest uppercase">
              ALT 104M // FOH CONSOLE
            </div>
            <div className="absolute bottom-3 left-4 font-mono text-[9px] sm:text-[10px] text-[#E01E37] tracking-widest font-bold">
              ACT 01 : 112 dB SPL
            </div>
          </div>
        </div>

        {/* 3. THUMB A (Upper-Right Inset beside TOP 1) */}
        <div
          ref={thumbARef}
          className="absolute z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 bg-[#141414]"
          style={{
            top: '25.04%',
            left: 'calc(58.33% + 36px)',
            width: 'clamp(90px, 12.22vw, 176px)',
            aspectRatio: '176 / 153',
            opacity: pulseState === 1 || pulseState === 2 ? 1 : 0.5,
          }}
          aria-hidden="true"
        >
          <div className="w-full h-full relative">
            <img
              src="https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop"
              alt="Microphone acoustic setup"
              className="w-full h-full object-cover object-bottom grayscale contrast-120"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-2 font-mono text-[8px] text-white/80 tracking-wider">
              ACT 02 // 96 dB
            </div>
          </div>
        </div>

        {/* 4. THUMB B (Bottom-Right Inset) */}
        <div
          ref={thumbBRef}
          className="absolute z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 bg-[#141414]"
          style={{
            top: '69.7%',
            left: 'calc(66.67% + 20px)',
            width: 'clamp(70px, 9.44vw, 136px)',
            aspectRatio: '136 / 132',
            opacity: pulseState === 2 || pulseState === 3 ? 0.9 : 0.35,
          }}
          aria-hidden="true"
        >
          <div className="w-full h-full relative">
            <img
              src="https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=500&auto=format&fit=crop"
              alt="Live concert crowd"
              className="w-full h-full object-cover object-bottom grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-1.5 left-1.5 font-mono text-[8px] text-[#E01E37] tracking-wider">
              CROWD LIVE
            </div>
          </div>
        </div>

        {/* 5. THUMB C (Bottom-Left Inset) */}
        <div
          ref={thumbCRef}
          className="absolute z-0 overflow-hidden pointer-events-none transition-opacity duration-1000 bg-[#141414]"
          style={{
            top: '68.04%',
            left: 'calc(16.67% + 25px)',
            width: 'clamp(110px, 15vw, 216px)',
            aspectRatio: '216 / 222',
            opacity: pulseState === 3 || pulseState === 0 ? 1 : 0.4,
          }}
          aria-hidden="true"
        >
          <div className="w-full h-full relative">
            <img
              src="https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=700&auto=format&fit=crop"
              alt="Moshpit high energy"
              className="w-full h-full object-cover object-bottom grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-2 left-2 font-mono text-[9px] text-[#E01E37] tracking-wider">
              ACT 03 // 120 dB
            </div>
          </div>
        </div>

        {/* 6. SUBTITLE: Red Uppercase Monospace Header */}
        <p
          ref={subtitleRef}
          className="relative z-10 m-0 font-mono text-[20px] sm:text-[24px] font-bold leading-[28px] sm:leading-[32px] tracking-[-0.04em] uppercase text-[#E01E37] text-center select-none"
        >
          UNTUK ENERGI<br />PANGGUNG MUSIK LIVE
        </p>

        {/* 7. GIANT "TOP 1": Vertical Crimson Gradient with transparent fade */}
        <p
          ref={valueRef}
          className="relative z-10 m-0 mt-6 sm:mt-10 font-mono font-normal tracking-[-0.04em] uppercase text-center select-none leading-none"
          style={{
            fontSize: 'clamp(64px, 16.43vw, 236.56px)',
            background: 'linear-gradient(to bottom, #E01E37 0%, rgba(224, 30, 55, 0) 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
          }}
        >
          TOP 1
        </p>
      </section>
    </div>
  )
}
