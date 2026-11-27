import type { Band, BandPost, BandPostSlide, RiderItem } from '../types'

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
  _options: { filterEmptyLegacy?: boolean } = {}
): RiderItem[] {
  if (Array.isArray(profile?.riderItems)) {
    return profile.riderItems
      .filter((item) => item && (item.title?.trim() || item.description?.trim()))
      .map((item) => ({
        title: item.title || '',
        description: item.description || '',
      }))
  }

  return LEGACY_RIDER_KEYS.map(({ title, field }) => ({
    title,
    description: profile?.[field] || '',
  })).filter((item) => item.description.trim() !== '')
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

export type ParsedAudioSource =
  | {
      kind: 'spotify'
      embedUrl: string
      externalUrl: string
      height: number
      providerLabel: 'Spotify'
    }
  | {
      kind: 'youtube'
      embedUrl: string
      externalUrl: string
      height: number
      providerLabel: 'YouTube'
    }
  | {
      kind: 'audio'
      src: string
      externalUrl: string
      providerLabel: 'Audio'
    }

const DIRECT_AUDIO_EXT_RE = /\.(mp3|wav|m4a|ogg|aac|flac|opus|webm)(\?|$)/i

/**
 * Parses a band's audio sample URL into a playable source:
 * - Spotify track / album / playlist / artist / episode -> official Spotify embed iframe
 * - YouTube / youtu.be / YouTube Music -> youtube-nocookie embed iframe
 * - Direct audio file URL -> native HTML5 <audio>
 */
export function parseAudioSource(rawUrl?: string | null): ParsedAudioSource | null {
  const trimmed = (rawUrl || '').trim()
  if (!trimmed) return null

  try {
    const parsed = new URL(trimmed, 'https://reffband.studio')
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '')

    if (host === 'open.spotify.com' || host === 'play.spotify.com') {
      const segments = parsed.pathname.split('/').filter(Boolean)
      const filtered = segments.filter((seg) => !/^intl-[a-z-]+$/i.test(seg) && seg !== 'embed')
      const resourceType = (filtered[0] || '').toLowerCase()
      const resourceId = filtered[1] || ''
      const allowedTypes = new Set(['track', 'album', 'playlist', 'artist', 'episode'])
      if (allowedTypes.has(resourceType) && /^[A-Za-z0-9]{10,40}$/.test(resourceId)) {
        return {
          kind: 'spotify',
          embedUrl: `https://open.spotify.com/embed/${resourceType}/${resourceId}?utm_source=generator&theme=0`,
          externalUrl: trimmed,
          height: 152,
          providerLabel: 'Spotify',
        }
      }
    }

    if (host === 'youtu.be' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      let videoId = ''
      if (host === 'youtu.be') {
        videoId = parsed.pathname.split('/').filter(Boolean)[0] || ''
      } else if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || ''
      } else {
        const parts = parsed.pathname.split('/').filter(Boolean)
        if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
          videoId = parts[1]
        }
      }
      if (/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return {
          kind: 'youtube',
          embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`,
          externalUrl: trimmed,
          height: 200,
          providerLabel: 'YouTube',
        }
      }
    }
  } catch {
    // Relative path or non-standard URL falls through to direct audio handling
  }

  return {
    kind: 'audio',
    src: trimmed,
    externalUrl: trimmed,
    providerLabel: 'Audio',
  }
}

export function isSupportedExternalAudioUrl(rawUrl?: string | null): boolean {
  const trimmed = (rawUrl || '').trim()
  if (!/^https?:\/\//i.test(trimmed)) return false

  const parsed = parseAudioSource(trimmed)
  if (!parsed) return false
  if (parsed.kind === 'spotify' || parsed.kind === 'youtube') return true

  try {
    const urlObj = new URL(trimmed)
    return (
      DIRECT_AUDIO_EXT_RE.test(urlObj.pathname) ||
      urlObj.pathname.includes('/storage/v1/object/public/') ||
      urlObj.pathname.startsWith('/uploads/')
    )
  } catch {
    return false
  }
}
