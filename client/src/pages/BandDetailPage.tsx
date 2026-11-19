import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Star,
  MapPin,
  Phone,
  Play,
  Pause,
  Eye,
  Film,
  Camera,
  Music,
  Share2,
  Sliders,
  Clock,
  Radio,
  CheckCircle2,
  Layers,
  ImageOff,
} from 'lucide-react'
import { fallbackBands } from '../data/bandsData'
import { BandCard } from '../components/ui/BandCard'
import {
  SpotifyIcon,
  InstagramIcon,
  YouTubeIcon,
  TikTokIcon,
} from '../components/ui/SocialIcons'
import { BroadcastInquirySection } from '../components/band-detail/BroadcastInquirySection'
import { PostViewerModal, DirectBookingModal } from '../components/band-detail/BandDetailModals'
import { formatWhatsAppPhone, parsePostSlides, sanitizeExternalUrl } from '../lib/bandHelpers'
import { formatRupiah } from '../lib/utils'
import { authClient, type AuthUser } from '../lib/auth'
import type { Band, BandPost, MediaFile, RiderItem } from '../types'

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export const BandDetailPage: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const effectiveId = routeId || searchParams.get('id') || '1'

  const [activeAccordion, setActiveAccordion] = useState<'specs' | 'kit' | 'hospitality'>('kit')
  const [setQuantity, setSetQuantity] = useState<number>(1)
  const [activeSlide, setActiveSlide] = useState<number>(0)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false)
  const [activePost, setActivePost] = useState<BandPost | null>(null)
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [brokenCardThumbIds, setBrokenCardThumbIds] = useState<Record<number, boolean>>({})

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [audioDuration, setAudioDuration] = useState<number>(38)
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0)

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authClient.getUser())

  useEffect(() => {
    const syncAuth = () => {
      setCurrentUser(authClient.getUser())
    }
    window.addEventListener('auth-change', syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener('auth-change', syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  // Find base band data from fallback
  const baseBand = useMemo(() => {
    const numId = parseInt(effectiveId, 10)
    const found = fallbackBands.find((b) => b.id === numId)
    return found || fallbackBands[0]
  }, [effectiveId])

  const [prevBaseBandId, setPrevBaseBandId] = useState(baseBand.id)
  const [band, setBand] = useState<Band>(baseBand)

  if (baseBand.id !== prevBaseBandId) {
    setPrevBaseBandId(baseBand.id)
    setBand(baseBand)
    setActiveSlide(0)
    setIsPlayingAudio(false)
    setAudioCurrentTime(0)
  }

  // Sync fetched live band details when route target changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    let cancelled = false

    async function fetchBandProfile() {
      try {
        const res = await fetch(`/api/bands/profile/${baseBand.id}`)
        if (res.ok && !cancelled) {
          const json = await res.json()
          if (json.success && json.data && !cancelled) {
            setBand((prev) => ({
              ...prev,
              ...json.data,
            }))
          }
        }
      } catch {
        // Fallback active
      }
    }
    fetchBandProfile()

    return () => {
      cancelled = true
    }
  }, [baseBand.id])

  // Extract Audio tracks from mediaFiles
  const audioTracks: MediaFile[] = useMemo(() => {
    const files = (band.mediaFiles || []).filter((m) => m.file_type === 'audio')
    if (files.length > 0) {
      return files.map((f) => ({
        ...f,
        file_url: f.file_url?.includes('google.com') || !f.file_url ? '/sample-audio.wav' : f.file_url,
      }))
    }
    return [
      {
        id: band.id * 1000 + 1,
        file_type: 'audio',
        file_url: '/sample-audio.wav',
        title: `Single Demo Track - ${band.bandName} (Live Master)`,
      },
    ]
  }, [band])

  const currentAudioTrack = audioTracks[activeTrackIndex] || audioTracks[0]

  // Audio Playback Handlers
  const handleTogglePlayAudio = () => {
    if (!audioRef.current) return
    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      if (!audioRef.current.src || audioRef.current.src === '' || audioRef.current.src.endsWith('/')) {
        audioRef.current.src = currentAudioTrack?.file_url || '/sample-audio.wav'
      }
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlayingAudio(true)
          })
          .catch(() => {
            setIsPlayingAudio(true)
          })
      } else {
        setIsPlayingAudio(true)
      }
    }
  }

  useEffect(() => {
    let timer: number | null = null
    if (isPlayingAudio) {
      timer = window.setInterval(() => {
        setAudioCurrentTime((prev) => {
          if (prev >= audioDuration) {
            setIsPlayingAudio(false)
            return 0
          }
          return Math.min(audioDuration, prev + 1)
        })
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlayingAudio, audioDuration])

  const handleAudioTimeUpdate = () => {
    if (audioRef.current && audioRef.current.currentTime > 0) {
      setAudioCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration) {
      setAudioDuration(audioRef.current.duration)
    }
  }

  const handleAudioEnded = () => {
    setIsPlayingAudio(false)
    setAudioCurrentTime(0)
  }

  const handleAudioSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !audioDuration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percent * audioDuration
    audioRef.current.currentTime = newTime
    setAudioCurrentTime(newTime)
  }

  const audioProgressPercent = audioDuration > 0 ? (audioCurrentTime / audioDuration) * 100 : 0

  // 8 Curated Stage & Rider Carousel Slides
  const gallerySlides = useMemo(() => {
    const mainImg = band.profilePhotoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop'
    const coverImg = band.coverPhotoUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop'

    return [
      { id: 1, src: mainImg, title: 'Live Stage Hero', tag: 'STAGE ACT' },
      { id: 2, src: coverImg, title: 'Soundcheck Session', tag: 'SOUNDCHECK' },
      { id: 3, src: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop', title: 'Microphone & Backline', tag: 'AUDIO RIG' },
      { id: 4, src: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?q=80&w=1200&auto=format&fit=crop', title: 'Live Performance Energy', tag: 'CONCERT' },
      { id: 5, src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop', title: 'Crowd & Moshpit', tag: 'CROWD' },
      { id: 6, src: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=1200&auto=format&fit=crop', title: 'Lighting & Production', tag: 'LIGHT SHOW' },
      { id: 7, src: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop', title: 'Intimate Gig Acoustic', tag: 'SESSION' },
      { id: 8, src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop', title: 'Backstage Transit & Crew', tag: 'CREW' },
    ]
  }, [band])

  // Extract all portfolio posts
  const allPosts: BandPost[] = useMemo(() => {
    if (band.posts && band.posts.length > 0) return band.posts
    return [
      {
        id: band.id * 100 + 1,
        bandProfileId: band.id,
        mediaType: 'photo',
        mediaUrl: band.coverPhotoUrl || band.profilePhotoUrl,
        thumbnailUrl: band.profilePhotoUrl,
        caption: `Energi panggung live ${band.bandName}. Terima kasih festival kampus dan para penonton atas sambutan hangatnya!`,
        viewsCount: 342,
        createdAt: '2026-11-04T16:45:00.000Z',
      },
      {
        id: band.id * 100 + 2,
        bandProfileId: band.id,
        mediaType: 'video',
        mediaUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
        caption: `Cuplikan live session pembuka. Full band format siap guncang panggung festival terbuka!`,
        viewsCount: 514,
        createdAt: '2026-10-28T09:15:00.000Z',
      },
      {
        id: band.id * 100 + 3,
        bandProfileId: band.id,
        mediaType: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=800&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=400&auto=format&fit=crop',
        caption: `Soundcheck showcase acoustic session. Reverb analog siap mengalun di panggung akhir pekan ini.`,
        viewsCount: 289,
        createdAt: '2026-10-20T14:20:00.000Z',
      },
      {
        id: band.id * 100 + 4,
        bandProfileId: band.id,
        mediaType: 'photo',
        mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=800&auto=format&fit=crop',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
        caption: `Backstage vibes sebelum naik panggung. Rider aman, soundcheck terkalibrasi, energi maksimal.`,
        viewsCount: 199,
        createdAt: '2026-10-15T18:00:00.000Z',
      },
    ]
  }, [band])

  // Filtered posts based on category (including mixed carousels)
  const filteredPosts = useMemo(() => {
    if (galleryFilter === 'all') return allPosts
    return allPosts.filter((p) => {
      if (p.mediaType === galleryFilter) return true
      const slides = parsePostSlides(p, true)
      return slides.some((s) => s.type === galleryFilter)
    })
  }, [allPosts, galleryFilter])

  // Related bands (3 bands from other genres/cities)
  const relatedBands = useMemo(() => {
    return fallbackBands.filter((b) => b.id !== band.id).slice(0, 3)
  }, [band.id])

  // Calculated estimated rate based on sets
  const baseRate = band.budgetMin || 3500000
  const totalPrice = Math.round(baseRate * setQuantity)

  const handleDirectWhatsApp = () => {
    const cleanPhone = formatWhatsAppPhone(band.phone, '6281234567890')
    const message = encodeURIComponent(
      `Halo Management ${band.bandName}, kami dari Event Organizer ingin mengajukan penawaran booking panggung melalui Reffband:\n` +
      `- Durasi: ${setQuantity} Set Performance\n` +
      `- Estimasi Rate: ${formatRupiah(totalPrice)}\n` +
      `Mohon informasi ketersediaan jadwal tanggal dan konfirmasi spesifikasi technical rider panggung Anda. Terima kasih!`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: band.bandName, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  // Fallback / Customizable Rider items
  const displayRiderItems: RiderItem[] = useMemo(() => {
    if (band.riderItems && band.riderItems.length > 0) {
      return band.riderItems
    }
    return [
      {
        title: 'FOH Mixer & Audio Console',
        description: 'Digital console min 16-channel (Yamaha QL/CL series, Behringer X32, or Allen & Heath)',
      },
      {
        title: 'Monitor Panggung & IEM System',
        description: '4 Independent AUX Wedge mixes + 2 Wireless IEM transmitter feeds',
      },
      {
        title: 'Mikrofon & Wireless Transmitters',
        description: 'Shure SM58 wireless untuk vokal utama, Shure SM57 untuk cabinet & perkusi',
      },
      {
        title: 'Kelistrikan & Power Distribution',
        description: 'Dedicated isolated power 220V dengan grounded stabilizer khusus panggung audio',
      },
    ]
  }, [band.riderItems])

  return (
    <div className="w-full bg-[#000000] text-white min-h-screen">
      {/* 1. BREADCRUMBS BAR */}
      <nav aria-label="Breadcrumb" className="w-full border-b border-[#1E1E1E] bg-[#050505]">
        <div className="w-full max-w-[1440px] mx-auto px-5 h-14 sm:h-16 flex items-center">
          <ol className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-[#7A7A7A]">
            <li>
              <Link to="/" className="hover:text-white transition-colors">
                BERANDA
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="w-3.5 h-3.5 text-[#444]" />
            </li>
            <li>
              <Link to="/cari-band" className="hover:text-white transition-colors">
                KATALOG BAND
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="w-3.5 h-3.5 text-[#444]" />
            </li>
            <li className="text-white font-bold truncate max-w-[200px] sm:max-w-none" aria-current="page">
              {band.bandName}
            </li>
          </ol>
        </div>
      </nav>

      {/* MAIN CONTENT WRAPPER */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* 2. HERO PROFILE CARD (MATCHING REFERENCE UI & 2/3 COLORS PALETTE) */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl mb-8 relative group">
          {/* Cover Photo Banner with Vertical Gradient Dissolve */}
          <div className="h-56 sm:h-72 w-full relative overflow-hidden bg-[#181818]">
            <img
              src={band.coverPhotoUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop'}
              alt={`${band.bandName} Cover Banner`}
              className="w-full h-full object-cover opacity-65 brightness-90 filter"
            />
            {/* Smooth Mist / Gradient Dissolve into Card Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent pointer-events-none" />

            {/* Top-Right Floating Share / Bookmark Button */}
            <button
              type="button"
              onClick={handleShare}
              className="absolute top-4 right-4 sm:top-5 sm:right-6 w-11 h-11 rounded-full bg-black/60 hover:bg-[#E01E37] text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-lg hover:scale-105 min-h-[44px] min-w-[44px] cursor-pointer"
              title="Bagikan tautan profil band"
              aria-label="Bagikan tautan profil band"
            >
              <Share2 className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Card Body with Overlapping Circular Avatar */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 relative">
            {/* Overlapping Avatar Row */}
            <div className="-mt-14 sm:-mt-16 mb-4 flex items-end justify-between relative z-10 flex-wrap gap-4">
              <div className="relative">
                <img
                  src={band.profilePhotoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=400&auto=format&fit=crop'}
                  alt={band.bandName}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#121212] object-cover bg-[#181818] shadow-xl"
                />
                <div
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#E01E37] border-2 border-[#121212] flex items-center justify-center text-white text-[11px] font-bold"
                  title="Musisi Terverifikasi Reffband"
                >
                  ✓
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] uppercase tracking-wider text-white bg-[#E01E37] px-3 py-1 font-bold flex items-center gap-1.5 select-none rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  TOP BAND TERKURASI
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-white bg-white/10 border border-white/20 px-3 py-1 font-bold flex items-center gap-1.5 select-none rounded-full">
                  SOUNDCHECK VERIFIED
                </span>
              </div>
            </div>

            {/* Identity & Social Channels Grid */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white tracking-wider uppercase leading-none">
                  {band.bandName}
                </h1>
                <p className="text-sm text-[#CCCCCC] font-sans leading-relaxed">
                  {band.bio || 'Unit musisi terverifikasi siap tampil untuk panggung live festival, gig intim, dan pementasan kampus.'}
                </p>

                {/* Metadata Chips */}
                <div className="flex items-center gap-4 flex-wrap pt-1 font-mono text-xs text-[#A0A0A0]">
                  <div className="flex items-center gap-1.5 text-white">
                    <MapPin className="w-3.5 h-3.5 text-[#E01E37]" />
                    <span>{band.locationCity}{band.locationRegion ? ` • ${band.locationRegion}` : ''}</span>
                  </div>
                  <span className="text-[#333]">•</span>
                  <div className="flex items-center gap-1.5 text-[#E01E37] font-bold">
                    <Radio className="w-3.5 h-3.5" />
                    <span>GENRE: {band.genre?.toUpperCase()}</span>
                  </div>
                  <span className="text-[#333]">•</span>
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Phone className="w-3.5 h-3.5 text-white/60" />
                    <span>MANAJEMEN: {band.phone || '0812-3456-7890'}</span>
                  </div>
                </div>
              </div>

              {/* Kanal Distribusi (4 Authentic Round Icons Matching Reference "Tools" Row) */}
              <div className="bg-[#0C0C0C] border border-[#222222] rounded-2xl p-4 lg:min-w-[280px]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373] block mb-3 font-bold">
                  // KANAL DISTRIBUSI RESMI
                </span>
                <div className="flex items-center gap-2.5">
                  {/* Spotify */}
                  {sanitizeExternalUrl(band.spotifyUrl) ? (
                    <a
                      href={sanitizeExternalUrl(band.spotifyUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#1DB954] text-white hover:text-[#1DB954] flex items-center justify-center transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title="Dengarkan di Spotify"
                      aria-label="Spotify Resmi"
                    >
                      <SpotifyIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full bg-[#141414] border border-[#242424] text-[#444] flex items-center justify-center min-h-[44px] min-w-[44px]"
                      title="Belum terhubung ke Spotify"
                    >
                      <SpotifyIcon className="w-4 h-4" />
                    </div>
                  )}

                  {/* Instagram */}
                  {sanitizeExternalUrl(band.instagramHandle, 'https://instagram.com/') ? (
                    <a
                      href={sanitizeExternalUrl(band.instagramHandle, 'https://instagram.com/')!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#E1306C] text-white hover:text-[#E1306C] flex items-center justify-center transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title="Akun Instagram Resmi"
                      aria-label="Instagram Resmi"
                    >
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full bg-[#141414] border border-[#242424] text-[#444] flex items-center justify-center min-h-[44px] min-w-[44px]"
                      title="Belum terhubung ke Instagram"
                    >
                      <InstagramIcon className="w-4 h-4" />
                    </div>
                  )}

                  {/* YouTube */}
                  {sanitizeExternalUrl(band.youtubeUrl) ? (
                    <a
                      href={sanitizeExternalUrl(band.youtubeUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#FF0000] text-white hover:text-[#FF0000] flex items-center justify-center transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title="Kanal YouTube Resmi"
                      aria-label="YouTube Resmi"
                    >
                      <YouTubeIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full bg-[#141414] border border-[#242424] text-[#444] flex items-center justify-center min-h-[44px] min-w-[44px]"
                      title="Belum terhubung ke YouTube"
                    >
                      <YouTubeIcon className="w-4 h-4" />
                    </div>
                  )}

                  {/* TikTok */}
                  {sanitizeExternalUrl(band.tiktokUrl, 'https://tiktok.com/@') ? (
                    <a
                      href={sanitizeExternalUrl(band.tiktokUrl, 'https://tiktok.com/@')!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-11 h-11 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-white text-white hover:text-white flex items-center justify-center transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title="Akun TikTok Resmi"
                      aria-label="TikTok Resmi"
                    >
                      <TikTokIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full bg-[#141414] border border-[#242424] text-[#444] flex items-center justify-center min-h-[44px] min-w-[44px]"
                      title="Belum terhubung ke TikTok"
                    >
                      <TikTokIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar: 3 Metrics Columns & Pill Action Buttons */}
            <div className="border-t border-[#222222] mt-6 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              {/* 3 Metrics separated by vertical line dividers */}
              <div className="flex items-center gap-5 sm:gap-8 flex-wrap">
                {/* Metric 1: Rating */}
                <div>
                  <div className="flex items-center gap-1.5 text-white font-display text-xl sm:text-2xl tracking-wide">
                    <Star className="w-4 h-4 fill-[#E01E37] text-[#E01E37]" />
                    <span>4.9</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    RATING PANGGUNG
                  </span>
                </div>

                <div className="w-px h-8 bg-[#2A2A2A] hidden sm:block" />

                {/* Metric 2: Live Set Duration */}
                <div>
                  <div className="flex items-center gap-1.5 text-white font-display text-xl sm:text-2xl tracking-wide">
                    <Clock className="w-4 h-4 text-white/80" />
                    <span>45 - 60 MENIT</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    DURASI LIVE SET
                  </span>
                </div>

                <div className="w-px h-8 bg-[#2A2A2A] hidden sm:block" />

                {/* Metric 3: Starting Rate */}
                <div>
                  <div className="text-white font-display text-xl sm:text-2xl tracking-wide text-[#E01E37]">
                    {formatRupiah(band.budgetMin || 3500000)}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    TARIF MULAI / SET
                  </span>
                </div>
              </div>

              {/* Right: Rounded Pill Action Buttons for EO & Visitors */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleTogglePlayAudio}
                  className="px-5 py-2.5 rounded-full bg-[#1C1C1C] hover:bg-[#282828] text-white border border-[#333333] font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all cursor-pointer"
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>Jeda Audio</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      <span>Dengar Demo</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsOrderModalOpen(true)}
                  className="px-6 py-2.5 rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.4)] cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                  <span>Booking Sekarang</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. SAMPEL AUDIO DEMO PLAYER (Black, Red #E01E37, White) */}
        <div className="bg-[#101010] border border-[#242424] rounded-2xl p-5 sm:p-6 mb-8 relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between mb-4 relative z-10 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E01E37] animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-white font-bold">
                SAMPEL AUDIO RESMI // LIVE MASTER DEMO
              </span>
            </div>
            <span className="font-mono text-[10px] text-white bg-white/10 border border-white/20 px-2.5 py-0.5 uppercase tracking-wider rounded-full">
              320 KBPS LIVE MASTER
            </span>
          </div>

          <div className="flex items-center gap-4 relative z-10">
            {/* Play / Pause Big Button */}
            <button
              type="button"
              onClick={handleTogglePlayAudio}
              className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white flex items-center justify-center transition-all shadow-[0_0_20px_rgba(224,30,55,0.4)] shrink-0 cursor-pointer"
              aria-label={isPlayingAudio ? 'Jeda sampel audio' : 'Putar sampel audio'}
            >
              {isPlayingAudio ? (
                <Pause className="w-5 h-5 fill-white" />
              ) : (
                <Play className="w-5 h-5 fill-white ml-0.5" />
              )}
            </button>

            {/* Track Info & Interactive Waveform */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-white font-bold truncate">
                  {currentAudioTrack?.title || `${band.bandName} - Single Demo Track`}
                </span>
                <span className="text-[#888] shrink-0 ml-2 font-mono text-[11px]">
                  {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration || 38)}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                onClick={handleAudioSeek}
                className="w-full h-3 bg-[#1A1A1A] border border-[#2E2E2E] rounded-full relative cursor-pointer overflow-hidden group/scrub"
                role="slider"
                aria-label="Progress pemutaran audio"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(audioProgressPercent)}
              >
                <div
                  className="h-full bg-[#E01E37] relative transition-all duration-100"
                  style={{ width: `${audioProgressPercent}%` }}
                />
              </div>

              {/* Track Selector */}
              {audioTracks.length > 1 && (
                <div className="flex items-center gap-2 pt-1">
                  <Music className="w-3.5 h-3.5 text-[#E01E37]" />
                  <span className="font-mono text-[10px] text-[#777] uppercase font-bold">PILIH TRACK:</span>
                  {audioTracks.map((tr, idx) => (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => {
                        setActiveTrackIndex(idx)
                        setIsPlayingAudio(false)
                        setAudioCurrentTime(0)
                      }}
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase transition-colors cursor-pointer ${
                        activeTrackIndex === idx
                          ? 'bg-[#E01E37] text-white font-bold'
                          : 'bg-[#181818] text-[#888] hover:text-white border border-white/10'
                      }`}
                    >
                      TRACK 0{idx + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Hidden Audio Tag */}
          <audio
            ref={audioRef}
            src={currentAudioTrack?.file_url || '/sample-audio.wav'}
            onPlay={() => setIsPlayingAudio(true)}
            onPause={() => setIsPlayingAudio(false)}
            onTimeUpdate={handleAudioTimeUpdate}
            onLoadedMetadata={handleAudioLoadedMetadata}
            onEnded={handleAudioEnded}
            preload="auto"
          />
        </div>

        {/* 4. DUAL COLUMN: TECHNICAL RIDER (LEFT) & 8-SLIDE STAGE VISUAL (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start mb-12">

          {/* LEFT COLUMN: Industrial Specs & Customizable Rider Accordion */}
          <div className="bg-[#101010] border border-[#242424] rounded-2xl flex flex-col justify-between p-6 sm:p-8 min-h-[580px] shadow-xl">
            <div className="space-y-6">

              {/* Header: Rider Info */}
              <div className="flex items-center justify-between border-b border-[#202020] pb-4">
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-[#E01E37]" />
                  <span className="font-mono text-xs uppercase tracking-widest text-white font-bold">
                    SPESIFIKASI AUDIO & RIDER TEKNIS PANGGUNG
                  </span>
                </div>
                <span className="font-mono text-[10px] text-[#A0A0A0] uppercase bg-[#181818] border border-[#282828] px-2.5 py-1 rounded">
                  EO VERIFIED
                </span>
              </div>

              {/* Technical Rider Items (Customizable list from band dashboard) */}
              <div className="space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#777] block font-bold">
                  // KEBUTUHAN PERALATAN & RIDER RESMI
                </span>
                <div className="space-y-2.5">
                  {displayRiderItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-[#0C0C0C] border border-[#222222] p-3.5 rounded-xl space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-white font-bold uppercase flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#E01E37]" />
                          {item.title}
                        </span>
                        <span className="font-mono text-[10px] text-[#666]">#0{idx + 1}</span>
                      </div>
                      <p className="text-xs text-[#A8A8A8] font-sans pl-5.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Accordion: Specs Tambahan & Hospitality */}
              <div className="space-y-2 border-t border-[#1E1E1E] pt-4">

                {/* ACCORDION 1: KONSOL & CHANNEL FOH */}
                <div className="border border-[#202020] bg-[#0C0C0C] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'specs' ? 'kit' : 'specs')}
                    className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left font-mono text-xs uppercase tracking-widest text-white hover:text-[#E01E37] transition-colors"
                  >
                    <span>DETAIL TEKNIS INPUT CHANNEL & SOUND SYSTEM</span>
                    <span className="text-[#E01E37]">
                      {activeAccordion === 'specs' ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>
                  {activeAccordion === 'specs' && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#1C1C1C] space-y-2.5 font-mono text-xs">
                      <div className="flex justify-between py-1 border-b border-[#181818]">
                        <span className="text-[#757575] uppercase">INPUT CHANNELS FOH</span>
                        <span className="text-white font-medium uppercase">{band.riderChannelInputs || '16 Channels Analog/Digital'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#181818]">
                        <span className="text-[#757575] uppercase">KAPASITAS SOUND SYSTEM FOH</span>
                        <span className="text-white font-medium uppercase">{band.riderSoundSystem || 'MIN. 10.000 WATT'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-[#181818]">
                        <span className="text-[#757575] uppercase">DURASI SOUNDCHECK</span>
                        <span className="text-white font-medium uppercase">30 - 45 MENIT SEBELUM OPEN GATE</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-[#757575] uppercase">KABEL & DIRECT BOX (DI)</span>
                        <span className="text-white font-medium uppercase">SEDIAKAN MINIMAL 4 UNIT PASSIVE/ACTIVE DI BOX</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: HOSPITALITY & RUANG TUNGGU */}
                <div className="border border-[#202020] bg-[#0C0C0C] rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setActiveAccordion(activeAccordion === 'hospitality' ? 'kit' : 'hospitality')}
                    className="w-full min-h-[44px] px-4 py-3 flex items-center justify-between text-left font-mono text-xs uppercase tracking-widest text-white hover:text-[#E01E37] transition-colors"
                  >
                    <span>HOSPITALITY, RUANG TRANSIT & LOGISTIK</span>
                    <span className="text-[#E01E37]">
                      {activeAccordion === 'hospitality' ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </span>
                  </button>
                  {activeAccordion === 'hospitality' && (
                    <div className="px-4 pb-4 pt-1 border-t border-[#1C1C1C] space-y-2.5 font-mono text-xs">
                      <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#181818] gap-1">
                        <span className="text-[#757575] uppercase">RUANG TRANSIT PRIVAT</span>
                        <span className="text-white font-medium uppercase text-right">Ruangan privat ber-AC dengan cermin & stopkontak aman</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between py-1 border-b border-[#181818] gap-1">
                        <span className="text-[#757575] uppercase">KONSUMSI & REFRESHMENT</span>
                        <span className="text-white font-medium uppercase text-right">Air mineral botol, kopi/teh hangat, & snack kru</span>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:justify-between py-1 gap-1">
                        <span className="text-[#757575] uppercase">TRANSPORTASI LUAR KOTA</span>
                        <span className="text-white font-medium uppercase text-right">Akomodasi hotel min. bintang 3 & transportasi darat resmi</span>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Bottom Card Action Bar (Set Stepper + Rate Calculator) */}
            <div className="mt-8 pt-6 border-t border-[#202020] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Stepper + Rate Display */}
              <div className="flex items-center gap-4">
                {/* Stepper Box */}
                <div className="flex items-center border border-[#282828] bg-[#141414] h-12 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setSetQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={setQuantity <= 1}
                    aria-label="Kurangi durasi set"
                    className="w-11 h-full min-w-[44px] flex items-center justify-center text-[#777] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-14 text-center font-mono font-bold text-sm text-white select-none">
                    {setQuantity} SET
                  </div>
                  <button
                    type="button"
                    onClick={() => setSetQuantity((prev) => Math.min(5, prev + 1))}
                    disabled={setQuantity >= 5}
                    aria-label="Tambah durasi set"
                    className="w-11 h-full min-w-[44px] flex items-center justify-center text-[#777] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Rate Display */}
                <div>
                  <span className="text-[10px] font-mono text-[#777] uppercase tracking-wider block font-bold">
                    TOTAL ESTIMASI RATE
                  </span>
                  <div className="font-mono text-base sm:text-lg font-bold text-[#E01E37] tracking-tight">
                    {formatRupiah(totalPrice)}
                  </div>
                </div>
              </div>

              {/* Massive Crimson CTA Action Button */}
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(true)}
                className="min-h-[44px] h-12 px-6 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 rounded-xl cursor-pointer"
              >
                <span>BOOKING SEKARANG</span>
                <span className="text-white text-sm">▶</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: 8-Slide Image Carousel Stage with Arrow Buttons */}
          <div className="bg-[#101010] border border-[#242424] rounded-2xl flex flex-col justify-between p-6 sm:p-8 h-[592px] lg:sticky lg:top-24 relative overflow-hidden group shadow-xl">
            {/* Top Stage Header */}
            <div className="flex items-center justify-between text-xs font-mono text-[#777] z-10 pb-2 border-b border-[#1E1E1E]">
              <span className="uppercase tracking-widest text-[#E01E37] font-bold">
                STAGE VISUAL // {gallerySlides[activeSlide].tag}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSlide((prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length)}
                  aria-label="Slide sebelumnya"
                  className="w-8 h-8 flex items-center justify-center border border-[#282828] hover:border-[#E01E37] hover:text-[#E01E37] text-white transition-colors rounded"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-white text-[11px] font-bold min-w-[70px] text-center select-none">
                  SLIDE {activeSlide + 1} / {gallerySlides.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSlide((prev) => (prev + 1) % gallerySlides.length)}
                  aria-label="Slide berikutnya"
                  className="w-8 h-8 flex items-center justify-center border border-[#282828] hover:border-[#E01E37] hover:text-[#E01E37] text-white transition-colors rounded"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central Stage Cutout / Photography Display */}
            <div className="relative flex-1 w-full my-3 overflow-hidden bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl flex items-center justify-center group/stage">
              <img
                src={gallerySlides[activeSlide].src}
                alt={`${band.bandName} - ${gallerySlides[activeSlide].title}`}
                className="w-full h-full object-cover filter contrast-110 drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] transition-all duration-700 ease-out"
              />

              {/* Ambient Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* HUD Telemetry Overlay Corners (Black, Red #E01E37, White) */}
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] text-white/80 tracking-widest pointer-events-none uppercase">
                CAM: 0{activeSlide + 1} // FOH STAGE
              </div>
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] text-[#E01E37] tracking-widest pointer-events-none uppercase font-bold">
                LIVE SPL: 112 dB
              </div>

              {/* Floating Slide Photo Arrow Buttons (Left & Right) */}
              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length)}
                aria-label="Foto panggung sebelumnya"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 min-w-[44px] min-h-[44px] bg-black/80 hover:bg-[#E01E37] text-white/80 hover:text-white border border-white/15 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm rounded-full group/btn"
              >
                <ChevronLeft className="w-5 h-5 group-hover/btn:-translate-x-0.5 transition-transform" />
              </button>

              <button
                type="button"
                onClick={() => setActiveSlide((prev) => (prev + 1) % gallerySlides.length)}
                aria-label="Foto panggung berikutnya"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 min-w-[44px] min-h-[44px] bg-black/80 hover:bg-[#E01E37] text-white/80 hover:text-white border border-white/15 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm rounded-full group/btn"
              >
                <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
              </button>

              {/* Slide Title Banner Pill */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-white/15 px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-white pointer-events-none shadow-lg whitespace-nowrap rounded-full">
                {band.bandName} // {gallerySlides[activeSlide].title}
              </div>
            </div>

            {/* 8-Segment Horizontal Interactive Pager Bar */}
            <div className="w-full pt-3 z-10">
              <div className="grid grid-cols-8 gap-1.5 h-1.5 w-full">
                {gallerySlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Pindah ke slide ${idx + 1}`}
                    aria-current={activeSlide === idx}
                    className={`h-full transition-all duration-300 rounded-full ${
                      activeSlide === idx
                        ? 'bg-[#E01E37] shadow-[0_0_8px_rgba(224,30,55,0.8)]'
                        : 'bg-[#262626] hover:bg-[#444444]'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* 5. POSTINGAN & GALERI KARYA */}
        <section className="w-full pt-4 pb-16">
          <div className="relative border-b-2 border-[#E01E37] pb-3 mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div
              className="bg-[#E01E37] text-white px-6 py-2.5 font-mono font-bold text-sm sm:text-base uppercase tracking-widest inline-flex items-center gap-3 select-none"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 100%, 0 100%)',
              }}
            >
              <span>POSTINGAN & GALERI KARYA</span>
            </div>

            {/* Filter Pills & Counter */}
            <div className="flex items-center gap-4 flex-wrap font-mono text-xs">
              <span className="text-[#666] hidden sm:inline">
                PORTFOLIO ARCHIVE // {allPosts.length} KARYA
              </span>
              <div className="flex items-center border border-[#242424] bg-[#0E0E0E] p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setGalleryFilter('all')}
                  className={`min-h-[44px] px-3.5 uppercase transition-colors rounded-md font-bold ${
                    galleryFilter === 'all'
                      ? 'bg-[#E01E37] text-white'
                      : 'text-[#888] hover:text-white'
                  }`}
                >
                  SEMUA
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryFilter('photo')}
                  className={`min-h-[44px] px-3.5 uppercase transition-colors rounded-md font-bold ${
                    galleryFilter === 'photo'
                      ? 'bg-[#E01E37] text-white'
                      : 'text-[#888] hover:text-white'
                  }`}
                >
                  FOTO
                </button>
                <button
                  type="button"
                  onClick={() => setGalleryFilter('video')}
                  className={`min-h-[44px] px-3.5 uppercase transition-colors rounded-md font-bold ${
                    galleryFilter === 'video'
                      ? 'bg-[#E01E37] text-white'
                      : 'text-[#888] hover:text-white'
                  }`}
                >
                  VIDEO
                </button>
              </div>
            </div>
          </div>

          {/* 4-Column Responsive Work Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {filteredPosts.map((post) => {
              const postSlides = parsePostSlides(post, true)
              const slideCount = postSlides.length
              const hasPhotoSlide = postSlides.some((s) => s.type === 'photo')
              const hasVideoSlide = postSlides.some((s) => s.type === 'video')
              const hasMixed = post.mediaType === 'mixed' || (hasPhotoSlide && hasVideoSlide)
              const primarySlide = postSlides[0]
              const primaryUrl = primarySlide?.url || post.mediaUrl || post.thumbnailUrl || ''
              const isPrimaryVideo =
                primarySlide?.type === 'video' ||
                (!primarySlide?.type && post.mediaType === 'video') ||
                /\.(mp4|webm|mov|m4v)(\?|$)/i.test(primaryUrl)
              const isCardBroken = Boolean(brokenCardThumbIds[post.id])

              return (
                <div
                  key={post.id}
                  onClick={() => setActivePost(post)}
                  className="group relative bg-[#121212] border border-[#242424] hover:border-[#E01E37] rounded-xl flex flex-col justify-between overflow-hidden cursor-pointer transition-all duration-300 shadow-md hover:shadow-[0_8px_30px_rgba(224,30,55,0.2)]"
                >
                  {/* Media Thumbnail */}
                  <div className="relative w-full aspect-[4/3] bg-[#0A0A0A] overflow-hidden">
                    {isPrimaryVideo ? (
                      <video
                        src={primaryUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : isCardBroken || !primaryUrl ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-[#141414] text-[#707070] p-4 text-center">
                        <ImageOff className="w-6 h-6 mb-1.5" aria-hidden="true" />
                        <span className="font-mono text-[10px] uppercase tracking-wider">
                          Pratinjau tidak tersedia
                        </span>
                      </div>
                    ) : (
                      <img
                        src={primaryUrl}
                        alt={post.caption || 'Portofolio Panggung'}
                        onError={() =>
                          setBrokenCardThumbIds((prev) => ({ ...prev, [post.id]: true }))
                        }
                        className="w-full h-full object-cover grayscale contrast-115 group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500 ease-out"
                      />
                    )}

                    {/* Media Type Badge */}
                    <div className="absolute top-2.5 left-2.5 z-10 flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-white bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 font-bold flex items-center gap-1 rounded">
                        {hasMixed ? (
                          <>
                            <Layers className="w-3 h-3 text-[#E01E37]" aria-hidden="true" />
                            <span className="text-[#E01E37]">CAMPURAN</span>
                          </>
                        ) : isPrimaryVideo ? (
                          <>
                            <Film className="w-3 h-3 text-[#E01E37]" aria-hidden="true" />
                            <span>VIDEO</span>
                          </>
                        ) : (
                          <>
                            <Camera className="w-3 h-3 text-white" aria-hidden="true" />
                            <span>FOTO</span>
                          </>
                        )}
                      </span>
                      {slideCount > 1 && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-white bg-black/85 border border-white/15 px-2 py-0.5 font-bold rounded">
                          {slideCount} SLIDE
                        </span>
                      )}
                    </div>

                    {/* Views Pill */}
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="font-mono text-[10px] text-[#A0A0A0] bg-black/80 backdrop-blur-sm px-2 py-0.5 flex items-center gap-1 border border-white/5 rounded">
                        <Eye className="w-3 h-3 text-white/70" />
                        <span>{post.viewsCount || 0}</span>
                      </span>
                    </div>

                    {isPrimaryVideo && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                        <span className="w-11 h-11 rounded-full bg-black/75 border border-white/25 flex items-center justify-center text-white shadow-lg">
                          <Play className="w-5 h-5 fill-white ml-0.5" aria-hidden="true" />
                        </span>
                      </div>
                    )}

                    {/* Dark Vignette Overlay on Hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60 group-hover:opacity-80 transition-opacity pointer-events-none" />
                  </div>

                  {/* Card Footer: Snippet & Action */}
                  <div className="p-4 bg-[#101010] border-t border-[#1F1F1F] space-y-2">
                    <p className="text-xs text-[#B5B5B5] line-clamp-2 leading-relaxed min-h-[32px]">
                      {post.caption || 'Dokumentasi performa panggung live resmi.'}
                    </p>
                    <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#666] uppercase">
                        {post.createdAt ? new Date(post.createdAt).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) : 'DOKUMENTASI'}
                      </span>
                      <span className="text-[#E01E37] group-hover:translate-x-0.5 transition-transform font-bold flex items-center gap-1">
                        <span>LIHAT</span>
                        <span>▸</span>
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <BroadcastInquirySection sourceBandProfileId={band.id} currentUser={currentUser} />

        {/* 7. BAND LAIN YANG TERKAIT */}
        <section className="w-full pb-16">
          <div className="relative border-b-2 border-[#E01E37] pb-3 mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div
              className="bg-[#E01E37] text-white px-6 py-2.5 font-mono font-bold text-sm sm:text-base uppercase tracking-widest inline-flex items-center gap-3 select-none"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 100%, 0 100%)',
              }}
            >
              <span>BAND LAIN YANG TERKAIT</span>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <span className="text-[#666] hidden sm:inline">INDEX // 01 / 03</span>
              <Link
                to="/cari-band"
                className="text-[#E01E37] hover:text-white font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5"
              >
                <span>SEMUA KATALOG</span>
                <span>▸</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {relatedBands.map((rBand) => (
              <BandCard
                key={rBand.id}
                band={rBand}
                accentTag={rBand.genre?.toUpperCase()}
                glassTag={rBand.locationCity?.toUpperCase()}
              />
            ))}
          </div>
        </section>

      </div>

      <PostViewerModal
        band={band}
        activePost={activePost}
        onClose={() => setActivePost(null)}
      />

      <DirectBookingModal
        isOpen={isOrderModalOpen}
        band={band}
        setQuantity={setQuantity}
        totalPrice={totalPrice}
        onClose={() => setIsOrderModalOpen(false)}
        onConfirmWhatsApp={handleDirectWhatsApp}
      />
    </div>
  )
}
