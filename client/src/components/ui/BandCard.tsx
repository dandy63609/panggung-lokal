import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, Star } from 'lucide-react'
import type { Band } from '../../types'
import { formatRupiah } from '../../lib/utils'
import { getBandProfileUrl } from '../../lib/bandHelpers'
import { getRatingTierBadge } from '../../lib/ratingHelpers'

interface BandCardProps {
  band: Band
  isWide?: boolean
  isOffset?: boolean
  isCompared?: boolean
  onToggleCompare?: (band: Band) => void
  accentTag?: string
  glassTag?: string
}

const CIPHER_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

export const BandCard: React.FC<BandCardProps> = ({
  band,
  isCompared = false,
  onToggleCompare,
  accentTag,
  glassTag,
}) => {
  const [prevBandName, setPrevBandName] = useState(band.bandName)
  const [displayText, setDisplayText] = useState(band.bandName)
  const intervalRef = useRef<number | null>(null)
  const isHoveringRef = useRef(false)

  if (band.bandName !== prevBandName) {
    setPrevBandName(band.bandName)
    setDisplayText(band.bandName)
  }

  // Cipher Text Scramble Effect on Card Title
  const handleMouseEnter = useCallback(() => {
    isHoveringRef.current = true
    let iteration = 0
    const originalText = band.bandName

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = window.setInterval(() => {
      setDisplayText(
        originalText
          .split('')
          .map((char, index) => {
            if (char === ' ') return ' '
            if (index < iteration) {
              return originalText[index]
            }
            return CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)]
          })
          .join('')
      )

      if (iteration >= originalText.length) {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
      iteration += 1 / 2
    }, 28)
  }, [band.bandName])

  const handleMouseLeave = useCallback(() => {
    isHoveringRef.current = false
    if (intervalRef.current) clearInterval(intervalRef.current)
    setDisplayText(band.bandName)
  }, [band.bandName])

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [band.bandName])

  const photo = band.profilePhotoUrl || band.coverPhotoUrl || null
  const currentRating = Number(band.rating || band.ratingAverage || 4.8)
  const ratingTierInfo = getRatingTierBadge(currentRating)

  const budgetText = band.budgetMin && band.budgetMax && band.budgetMin !== band.budgetMax
    ? `${formatRupiah(band.budgetMin)} - ${formatRupiah(band.budgetMax)}`
    : band.budgetMin
      ? `Mulai ${formatRupiah(band.budgetMin)}`
      : 'Negosiasi'

  const resolvedAccentTag = accentTag || (band.genre ? band.genre.toUpperCase() : 'TERKURASI')
  const resolvedGlassTag = glassTag || (band.locationCity ? band.locationCity.toUpperCase() : 'INDONESIA')

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative bg-[#141414] border border-[#242424] hover:border-[#E01E37] flex flex-col justify-between h-full overflow-hidden transition-all duration-300 shadow-lg hover:shadow-[0_8px_30px_rgba(224,30,55,0.15)]"
    >
      {/* 1. UNIFORM PROPORTIONAL MEDIA FRAME (16:10 aspect ratio) */}
      <div className="relative w-full aspect-[16/10] bg-[#0D0D0D] overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={band.bandName}
            loading="lazy"
            className="w-full h-full object-cover grayscale contrast-115 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#0F0F0F] text-[#555]">
            <span className="font-mono text-xs uppercase tracking-wider text-[#888]">Live Act Photo</span>
          </div>
        )}

        {/* Subtle Vignette Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-black/50 pointer-events-none" />

        {/* Floating Top Badges (Genre, City, and Campus Label) */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10 pointer-events-none flex-wrap max-w-[80%]">
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-white bg-[#E01E37] px-2.5 py-1 font-bold select-none shadow-md">
            {resolvedAccentTag}
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E0E0E0] bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-1 select-none">
            {resolvedGlassTag}
          </span>
          {band.campus && (
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-[#FFD166] bg-black/90 backdrop-blur-sm border border-[#FFD166]/40 px-2 py-1 font-bold select-none flex items-center gap-1 shadow-sm">
              <span>🎓</span>
              <span>{band.campus}</span>
            </span>
          )}
        </div>

        {/* Top-Right Compare Button (Opposing arrows, 44x44px touch target) */}
        {onToggleCompare && (
          <div className="absolute top-2 right-2 z-20">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggleCompare(band)
              }}
              aria-pressed={isCompared}
              aria-label={`Bandingkan ${band.bandName}`}
              title={isCompared ? 'Hapus dari perbandingan' : 'Tambahkan ke perbandingan'}
              className={`w-11 h-11 flex items-center justify-center transition-all ${
                isCompared
                  ? 'bg-[#E01E37] text-white shadow-[0_0_12px_rgba(224,30,55,0.6)]'
                  : 'bg-black/75 hover:bg-[#E01E37] text-[#B0B0B0] hover:text-white border border-white/10'
              }`}
            >
              {isCompared ? (
                <Check className="w-4 h-4 stroke-[2.5]" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M10.387 15.173H3.5C3.358 15.173 3.239 15.1253 3.143 15.03C3.047 14.9347 2.99933 14.8157 3 14.673C3.00067 14.5303 3.04833 14.4113 3.143 14.316C3.23767 14.2207 3.35667 14.173 3.5 14.173H10.387L7.647 11.433C7.553 11.3397 7.503 11.2257 7.497 11.091C7.49033 10.9577 7.54033 10.8357 7.647 10.725C7.757 10.615 7.87567 10.56 8.003 10.56C8.13033 10.56 8.24933 10.615 8.36 10.725L11.742 14.108C11.8293 14.1947 11.8907 14.2837 11.926 14.375C11.9613 14.4663 11.979 14.5657 11.979 14.673C11.979 14.7803 11.9613 14.8797 11.926 14.971C11.8907 15.0623 11.8293 15.1513 11.742 15.238L8.354 18.627C8.25667 18.7243 8.142 18.7753 8.01 18.78C7.87733 18.7847 7.756 18.7317 7.646 18.621C7.53933 18.511 7.48533 18.393 7.484 18.267C7.48267 18.141 7.53667 18.0233 7.646 17.914L10.387 15.173ZM13.613 9.808L16.353 12.548C16.447 12.6413 16.497 12.755 16.503 12.889C16.509 13.023 16.459 13.1453 16.353 13.256C16.2437 13.366 16.125 13.421 15.997 13.421C15.869 13.421 15.7503 13.366 15.641 13.256L12.258 9.873C12.1707 9.78633 12.1093 9.69733 12.074 9.606C12.0387 9.51467 12.021 9.41533 12.021 9.308C12.021 9.20067 12.0387 9.10133 12.074 9.01C12.1093 8.91867 12.1707 8.82933 12.258 8.742L15.646 5.354C15.7433 5.25667 15.8583 5.20567 15.991 5.201C16.1237 5.19633 16.2447 5.24933 16.354 5.36C16.4607 5.47 16.5147 5.58767 16.516 5.713C16.518 5.839 16.464 5.957 16.354 6.067L13.614 8.807H20.5C20.6427 8.807 20.7617 8.855 20.857 8.951C20.9523 9.047 21 9.166 21 9.308C21 9.45 20.9523 9.569 20.857 9.665C20.7617 9.761 20.6427 9.80867 20.5 9.808H13.613Z"
                    fill="currentColor"
                  />
                </svg>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 2. CARD BODY & CONTENT AREA */}
      <Link
        to={getBandProfileUrl(band)}
        className="flex-1 flex flex-col justify-between p-5 text-inherit no-underline space-y-4"
      >
        <div className="space-y-2">
          {/* Rating Stars & Tier Representation Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded border border-white/10 font-mono text-xs">
              <Star className="w-3.5 h-3.5 fill-[#FFD166] text-[#FFD166]" />
              <span className="font-bold text-white">{currentRating.toFixed(1)}</span>
            </div>
            <span
              className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 font-bold border rounded ${ratingTierInfo.bgClass}`}
              title={ratingTierInfo.description}
            >
              {ratingTierInfo.label}
            </span>
            {band.campus && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#FFD166] bg-black/70 border border-[#FFD166]/40 px-1.5 py-0.5 font-bold rounded flex items-center gap-0.5">
                <span>🎓</span>
                <span>{band.campus}</span>
              </span>
            )}
          </div>

          {/* Band Title with Cipher text scramble */}
          <h3 className="font-mono font-bold text-lg text-white uppercase tracking-tight group-hover:text-[#E01E37] transition-colors truncate">
            {displayText}
          </h3>

          {/* Location & Status Line */}
          <div className="flex items-center gap-2 text-xs font-mono text-[#00D9FF]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D9FF] animate-pulse" />
            <span className="truncate uppercase">
              {band.locationCity} {band.locationRegion ? `• ${band.locationRegion}` : ''}
            </span>
          </div>

          {/* Bio / Description Snippet */}
          <p className="text-xs text-[#A0A0A0] line-clamp-2 leading-relaxed min-h-[32px]">
            {band.bio || 'Unit musisi terverifikasi siap tampil untuk panggung live festival, gig intim, dan pementasan kampus.'}
          </p>
        </div>

        {/* 3. CARD FOOTER: Rate & Profile CTA */}
        <div className="pt-3.5 border-t border-[#222222] flex items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono text-[#757575] uppercase tracking-wider block">
              ESTIMASI RATE
            </span>
            <div className="font-mono text-sm font-bold text-white tracking-tight mt-0.5">
              {budgetText}
            </div>
          </div>

          <div className="h-9 px-3.5 bg-white/[0.04] group-hover:bg-[#E01E37] text-white border border-white/10 group-hover:border-[#E01E37] font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0">
            <span>PROFIL</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>
    </div>
  )
}
