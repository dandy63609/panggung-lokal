import type { Band, BandPost, BandPostSlide, RiderItem } from '../types'

const DEFAULT_DASHBOARD_RIDER: RiderItem[] = [
  {
    title: 'Channel Inputs & Patch FOH',
    description:
      'Drum (Kick, Snare, Hi-Hat, 2 Tom, Overhead L/R), Bass DI Box, Guitar Amp Mic (Shure SM57), 2 Vocal Mics (Shure SM58).',
  },
  {
    title: 'Tata Suara & Monitor Panggung',
    description:
      'FOH PA System minimal 5.000 Watt RMS terkalibrasi, 4 unit Floor Wedge Monitors aktif independen.',
  },
  {
    title: 'Backline & Instrumen Panggung',
    description:
      'Standard Drum Kit (Pearl/Tama), Ampeg Bass Head + 4x10 Cab, Marshall JCM900 / Roland JC-120 Guitar Amp.',
  },
  {
    title: 'Hospitality & Ruang Tunggu',
    description:
      'Ruang tunggu bersih ber-AC, air mineral 600ml (2 dus), konsumsi untuk 6 personel, handuk bersih.',
  },
]

const LEGACY_RIDER_KEYS: Array<{
  title: string
  field: keyof Pick<
    Band,
    'riderChannelInputs' | 'riderSoundSystem' | 'riderInstruments' | 'riderHospitality'
  >
}> = [
  { title: 'Channel Inputs & Patch FOH', field: 'riderChannelInputs' },
  { title: 'Tata Suara & Monitor Panggung', field: 'riderSoundSystem' },
  { title: 'Backline & Instrumen Panggung', field: 'riderInstruments' },
  { title: 'Hospitality & Ruang Tunggu', field: 'riderHospitality' },
]

export function buildDashboardRiderItems(
  profile?: Partial<Band> | null,
  options: { filterEmptyLegacy?: boolean } = {}
): RiderItem[] {
  if (profile?.riderItems && profile.riderItems.length > 0) {
    return profile.riderItems.map((item) => ({ ...item }))
  }

  if (options.filterEmptyLegacy) {
    const legacy = LEGACY_RIDER_KEYS.map(({ title, field }) => ({
      title,
      description: profile?.[field] || '',
    })).filter((item) => item.description.trim() !== '')

    if (legacy.length > 0) return legacy
    return DEFAULT_DASHBOARD_RIDER.map((item) => ({ ...item }))
  }

  return LEGACY_RIDER_KEYS.map(({ title, field }, index) => ({
    title,
    description: profile?.[field] || DEFAULT_DASHBOARD_RIDER[index].description,
  }))
}

export function parsePostSlides(
  post: Pick<BandPost, 'slides' | 'mediaType' | 'mediaUrl' | 'thumbnailUrl'> | null | undefined,
  includeMediaFallback = false
): BandPostSlide[] {
  if (!post) return []

  if (Array.isArray(post.slides) && post.slides.length > 0) {
    return post.slides
  }

  if (typeof post.slides === 'string') {
    try {
      const parsed = JSON.parse(post.slides)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    } catch {
      // Fall through to empty or single-media fallback
    }
  }

  if (includeMediaFallback) {
    return [
      {
        type: post.mediaType || 'photo',
        url: post.mediaUrl || post.thumbnailUrl || '',
      },
    ]
  }

  return []
}

export function isActualVideoSlide(type?: string | null, url?: string | null): boolean {
  const cleanUrl = (url || '').trim()
  if (
    cleanUrl &&
    (/\.(jpg|jpeg|png|webp|gif|svg|avif)(\?|$)/i.test(cleanUrl) ||
      /images\.unsplash\.com\/photo-/i.test(cleanUrl))
  ) {
    return false
  }
  return type === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(cleanUrl)
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export function formatWhatsAppPhone(rawPhone?: string | null, fallback = ''): string {
  const digits = (rawPhone || fallback).replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}

export function sanitizeExternalUrl(rawValue?: string | null, handleBaseUrl?: string): string | null {
  const trimmed = (rawValue || '').trim()
  if (!trimmed) return null

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  if (handleBaseUrl && !trimmed.includes(':')) {
    const cleanHandle = trimmed.replace(/^@+/, '').replace(/^\/+/, '')
    return cleanHandle ? `${handleBaseUrl}${cleanHandle}` : null
  }

  return null
}

export function slugify(text?: string | null): string {
  if (!text) return ''
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, 'dan')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getBandProfileUrl(
  band?: { id?: number; slug?: string; bandName?: string } | null
): string {
  if (!band) return '/cari-band'
  if (band.slug && band.slug.trim()) return `/band/${encodeURIComponent(band.slug.trim())}`
  if (band.bandName && band.bandName.trim()) return `/band/${encodeURIComponent(slugify(band.bandName))}`
  if (band.id) return `/band/${band.id}`
  return '/cari-band'
}
