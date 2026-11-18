import React from 'react'
import { HeroSection } from '../components/sections/HeroSection'
import { MarqueeTicker } from '../components/MarqueeTicker'
import { AboutSection } from '../components/sections/AboutSection'
import { TopRankStageSection } from '../components/sections/TopRankStageSection'
import { EcosystemDashboardSection } from '../components/sections/EcosystemDashboardSection'
import { StageSpecsSection } from '../components/sections/StageSpecsSection'
import { GenreMatrixSection } from '../components/sections/GenreMatrixSection'
import { HowItWorksSection } from '../components/sections/HowItWorksSection'
import { FaqSection } from '../components/sections/FaqSection'
import type { PlatformStats } from '../types'

interface HomePageProps {
  stats: PlatformStats
}

export const HomePage: React.FC<HomePageProps> = ({ stats }) => {
  return (
    <>
      {/* Hero Section with Nirvana Video Loop & Live Telemetry */}
      <HeroSection stats={stats} />

      {/* Top Ticker */}
      <MarqueeTicker speedSeconds={25} />

      {/* 01 // Tentang Reffband (Platform Explanation : FIRST AFTER HERO) */}
      <AboutSection />

      {/* TopRank Pinned Scrollytelling (Gencherry TopRankModule Adaptation) */}
      <TopRankStageSection />

      {/* Ecosystem Dashboard Pinned Scrollytelling (Gencherry TargetsDashboard Adaptation) */}
      <EcosystemDashboardSection totalBands={stats.totalBands} />

      {/* Mid-page Reverse Ticker */}
      <MarqueeTicker
        reverse
        speedSeconds={32}
        items={[
          'BANDUNG INDIE COLLECTIVE',
          'JAKARTA UNDERGROUND',
          'JOGJA FOLK SCENE',
          'SURABAYA METAL FRONT',
          'BALI PSYCHEDELIC ROCK',
          'TRANSPARAN TANPA BROKER',
        ]}
      />

      {/* 03 // Stage 01 : Audio Preview & Technical Rider Specs */}
      <StageSpecsSection />

      {/* 04 // Peta Musisi Per Genre (Animated Distribution Matrix) */}
      <GenreMatrixSection totalBands={stats.totalBands} />

      {/* 05 // Cara Kerja Platform */}
      <HowItWorksSection />

      {/* 06 // Tanya Jawab (FAQ) */}
      <FaqSection />
    </>
  )
}
