export type RatingTier = 'Baik' | 'Sangat Baik' | 'Rekomendasi Favorit'

export function getRatingTier(rating: number): RatingTier {
  const r = Number(rating) || 0
  if (r >= 4.5) return 'Rekomendasi Favorit'
  if (r >= 3.0) return 'Sangat Baik'
  return 'Baik'
}

export function getRatingTierBadge(rating: number) {
  const tier = getRatingTier(rating)
  switch (tier) {
    case 'Rekomendasi Favorit':
      return {
        tier,
        label: 'Rekomendasi Favorit',
        bgClass: 'bg-[#E01E37]/15 border-[#E01E37] text-[#FF4D6D]',
        badgeText: 'Rekomendasi Favorit',
        starClass: 'text-[#FFD166]',
        scoreRangeAdmin: 'Bintang 4.5 - 5.0',
        description: 'Performa panggung unggulan terkurasi dengan kepuasan Event Organizer tertinggi'
      }
    case 'Sangat Baik':
      return {
        tier,
        label: 'Sangat Baik',
        bgClass: 'bg-[#00D9FF]/15 border-[#00D9FF] text-[#00D9FF]',
        badgeText: 'Sangat Baik',
        starClass: 'text-[#00D9FF]',
        scoreRangeAdmin: 'Bintang 3.0 - 4.4',
        description: 'Penampilan panggung solid, tepat waktu dan crowd engagement memuaskan'
      }
    case 'Baik':
    default:
      return {
        tier,
        label: 'Baik',
        bgClass: 'bg-[#FFD166]/15 border-[#FFD166] text-[#FFD166]',
        badgeText: 'Baik',
        starClass: 'text-[#FFD166]',
        scoreRangeAdmin: 'Bintang 1.0 - 2.9',
        description: 'Musisi siap tampil dengan standar dasar panggung festival dan gig intim'
      }
  }
}
