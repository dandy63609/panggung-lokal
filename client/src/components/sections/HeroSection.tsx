import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
import { HeroVideo } from '../HeroVideo'
import { TelemetryCard } from '../ui/TelemetryCard'
import { Button } from '../ui/Button'
import { Badge } from '../ui/Badge'
import type { PlatformStats } from '../../types'

interface HeroSectionProps {
  stats: PlatformStats
}

export const HeroSection: React.FC<HeroSectionProps> = ({ stats }) => {
  return (
    <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden pt-12 pb-24 border-b border-[#242424]">
      {/* Background Nirvana live concert loop with scrim */}
      <HeroVideo />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="max-w-3xl space-y-6">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="red" dot>
              PLATFORM BAND LOKAL INDONESIA
            </Badge>
            <span className="text-xs font-mono text-[#A0A0A0]">
              Katalog Terbuka Musisi &amp; Penyelenggara
            </span>
          </div>

          {/* Main Title */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-white tracking-wider uppercase leading-none break-words">
            KATALOG BAND LOKAL UNTUK ACARA
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-[#B0B0B0] max-w-2xl leading-relaxed font-sans">
            Eksplorasi musisi lokal Indonesia lintas genre. Tinjau portofolio live, audio rekaman, dan technical rider panggung terstandarisasi langsung ke manajer band.
          </p>

          {/* Single Cari Band CTA button directing to Cari Band catalog */}
          <div className="pt-2">
            <Link to="/cari-band" className="inline-block">
              <Button
                variant="primary"
                size="lg"
                icon={<ArrowUpRight className="w-5 h-5" />}
                className="px-8 py-3.5 text-base shadow-[0_0_24px_rgba(224,30,55,0.45)]"
              >
                Cari Band
              </Button>
            </Link>
          </div>
        </div>

        {/* Platform Indicators / Stats Counter matching previous UX */}
        <div className="mt-14 pt-8 border-t border-[#242424]/80 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <TelemetryCard
            label="Band Terdaftar"
            value={stats.totalBands ? `${stats.totalBands}+` : '8+'}
            sublabel="Terverifikasi Aktif"
            statusDot
          />
          <TelemetryCard
            label="Genre Musik"
            value={stats.totalGenres ? `${stats.totalGenres}+` : '6+'}
            sublabel="Ragam Pilihan"
            statusDot
          />
          <TelemetryCard
            label="Kontak Terverifikasi"
            value={stats.curatedBadge || '100%'}
            sublabel="Langsung ke Band"
            statusDot
          />
          <TelemetryCard
            label="Biaya Perantara"
            value="Rp 0"
            sublabel="Direct WhatsApp"
            statusDot
          />
        </div>
      </div>
    </section>
  )
}
