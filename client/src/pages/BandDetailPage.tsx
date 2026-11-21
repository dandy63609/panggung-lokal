import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
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
  Settings,
  X,
  Lock,
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
import { ManageAudioModal } from '../components/band/ManageAudioModal'
import {
  formatWhatsAppPhone,
  isActualVideoSlide,
  parsePostSlides,
  sanitizeExternalUrl,
  slugify,
  getBandProfileUrl,
} from '../lib/bandHelpers'
import { formatRupiah } from '../lib/utils'
import { authClient, type AuthUser } from '../lib/auth'
import { getRatingTierBadge, getRatingTier } from '../lib/ratingHelpers'
import { usePlatformSettings } from '../lib/platformSettings'
import type { Band, BandPost, MediaFile, RiderItem, BandReview } from '../types'

function formatAudioTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`
}

export const BandDetailPage: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()

  const [activeAccordion, setActiveAccordion] = useState<'specs' | 'kit' | 'hospitality'>('kit')
  const [setQuantity, setSetQuantity] = useState<number>(1)
  const [activeSlide, setActiveSlide] = useState<number>(0)
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false)
  const [activePost, setActivePost] = useState<BandPost | null>(null)
  const [brokenCardThumbIds, setBrokenCardThumbIds] = useState<Record<number, boolean>>({})

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false)
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0)
  const [audioDuration, setAudioDuration] = useState<number>(38)
  const [activeTrackIndex, setActiveTrackIndex] = useState<number>(0)

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authClient.getUser())
  const [isAudioManageModalOpen, setIsAudioManageModalOpen] = useState<boolean>(false)

  // Auto-open manage audio modal if requested via URL query params
  useEffect(() => {
    const editParam = searchParams.get('edit') || searchParams.get('manageAudio')
    if (editParam === 'audio' || editParam === 'true') {
      setIsAudioManageModalOpen(true)
    }
  }, [searchParams])

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

  // Parse requested band profile identifier (supports both numeric ID e.g. "15" and URL slug e.g. "reffband")
  const rawIdentifier = (routeId || searchParams.get('id') || '1').trim()
  const isNumeric = /^\d+$/.test(rawIdentifier)
  const numericId = isNumeric ? parseInt(rawIdentifier, 10) : null
  const isValidIdentifier = Boolean(rawIdentifier)

  const fallbackMatch = useMemo(() => {
    if (!isValidIdentifier) return null
    if (numericId !== null && numericId > 0) {
      return fallbackBands.find((b) => b.id === numericId) || null
    }
    const cleanSlug = rawIdentifier.toLowerCase()
    return (
      fallbackBands.find(
        (b) =>
          slugify(b.bandName) === cleanSlug ||
          (b.slug && b.slug.toLowerCase() === cleanSlug) ||
          b.bandName.toLowerCase() === cleanSlug
      ) || null
    )
  }, [isValidIdentifier, numericId, rawIdentifier])

  const [prevIdentifier, setPrevIdentifier] = useState(rawIdentifier)
  const [band, setBand] = useState<Band | null>(fallbackMatch)
  const [loadingBand, setLoadingBand] = useState<boolean>(isValidIdentifier && !fallbackMatch)
  const [notFoundError, setNotFoundError] = useState<boolean>(!isValidIdentifier)
  const [liveRelatedBands, setLiveRelatedBands] = useState<Band[] | null>(null)
  const [reviews, setReviews] = useState<BandReview[]>([])
  const { showCampusAffiliation } = usePlatformSettings()

  if (rawIdentifier !== prevIdentifier) {
    setPrevIdentifier(rawIdentifier)
    setBand(fallbackMatch)
    setLoadingBand(isValidIdentifier && !fallbackMatch)
    setNotFoundError(!isValidIdentifier)
    setActiveSlide(0)
    setIsPlayingAudio(false)
    setAudioCurrentTime(0)
    setActivePost(null)
    setBrokenCardThumbIds({})
  }

  useEffect(() => {
    if (!band?.id) return
    fetch(`/api/reviews/band/${band.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setReviews(data.data)
        }
      })
      .catch(() => {})
  }, [band?.id])

  // Sync fetched live band details when route target or auth session changes
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    if (!isValidIdentifier || !currentUser) {
      if (!currentUser) {
        setBand(null)
        setLoadingBand(false)
      }
      return
    }
    let cancelled = false

    async function fetchBandProfile() {
      if (!authClient.getUser()) {
        setBand(null)
        setLoadingBand(false)
        return
      }
      try {
        const [profileRes, recentRes] = await Promise.all([
          fetch(`/api/bands/profile/${encodeURIComponent(rawIdentifier)}`, {
            headers: authClient.getAuthHeaders(),
          }),
          fetch('/api/bands/recent?limit=4', {
            headers: authClient.getAuthHeaders(),
          }).catch(() => null),
        ])

        if (recentRes && recentRes.ok && !cancelled) {
          const recentJson = await recentRes.json().catch(() => null)
          if (recentJson?.success && Array.isArray(recentJson.data) && !cancelled) {
            setLiveRelatedBands(recentJson.data)
          }
        }

        if (profileRes.ok && !cancelled) {
          const json = await profileRes.json()
          if (json.success && json.data && !cancelled) {
            setBand(fallbackMatch ? { ...fallbackMatch, ...json.data } : json.data)
            setNotFoundError(false)
            setLoadingBand(false)
            return
          }
        }

        if ((profileRes.status === 404 || profileRes.status === 400) && !cancelled) {
          setBand(null)
          setNotFoundError(true)
        } else if (!fallbackMatch && !cancelled) {
          setNotFoundError(true)
        }
      } catch {
        if (!fallbackMatch && !cancelled) {
          setNotFoundError(true)
        }
      } finally {
        if (!cancelled) {
          setLoadingBand(false)
        }
      }
    }
    fetchBandProfile()

    return () => {
      cancelled = true
    }
  }, [rawIdentifier, isValidIdentifier, fallbackMatch, currentUser?.id])

  // Check if current user is the owner of this band
  const isOwner = Boolean(
    band?.isOwner ||
    (
      currentUser &&
      currentUser.accountType === 'band' &&
      (
        (band?.userId && Number(currentUser.id) === Number(band.userId)) ||
        (currentUser.bandProfile?.id && Number(currentUser.bandProfile.id) === Number(band?.id)) ||
        (currentUser.bandProfile?.slug && band?.slug && currentUser.bandProfile.slug.toLowerCase() === band.slug.toLowerCase()) ||
        (currentUser.bandProfile?.bandName && band?.bandName && currentUser.bandProfile.bandName.toLowerCase() === band.bandName.toLowerCase())
      )
    )
  )
  const canManage = isOwner || currentUser?.accountType === 'admin'

  const refetchBandProfile = useCallback(async () => {
    if (!isValidIdentifier) return
    try {
      const res = await fetch(`/api/bands/profile/${encodeURIComponent(rawIdentifier)}`, {
        headers: authClient.getAuthHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setBand(fallbackMatch ? { ...fallbackMatch, ...json.data } : json.data)
        }
      }
    } catch (err) {
      console.error('Failed to refetch band profile:', err)
    }
  }, [isValidIdentifier, rawIdentifier, fallbackMatch])

  // Extract Audio tracks from mediaFiles
  const audioTracks: MediaFile[] = useMemo(() => {
    if (!band) return []
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

  useEffect(() => {
    if (activeTrackIndex >= audioTracks.length && audioTracks.length > 0) {
      setActiveTrackIndex(0)
    }
  }, [audioTracks.length, activeTrackIndex])

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

  // Extract all portfolio posts (show honest empty state for newly registered bands with no posts yet)
  const allPosts: BandPost[] = useMemo(() => {
    if (!band) return []
    if (band.posts && band.posts.length > 0) return band.posts
    if (band.id > 8) return []
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

  // Stage Visual Carousel: use the band-selected post carousel if configured, otherwise default slides
  const gallerySlides = useMemo(() => {
    if (!band) return []
    if (band.stageVisualPostId) {
      const selectedPost = allPosts.find((p) => p.id === band.stageVisualPostId)
      if (selectedPost) {
        const customSlides = parsePostSlides(selectedPost, true).filter((s) => Boolean(s.url))
        if (customSlides.length > 0) {
          return customSlides.map((slide, idx) => {
            const isVideo = isActualVideoSlide(slide.type, slide.url)
            return {
              id: idx + 1,
              type: isVideo ? 'video' : 'photo',
              src: slide.url,
              title: selectedPost.caption?.trim() || `Dokumentasi Panggung #${idx + 1}`,
              tag: isVideo ? 'VIDEO LIVE' : 'STAGE ACT',
            }
          })
        }
      }
    }

    const mainImg = band.profilePhotoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1200&auto=format&fit=crop'
    const coverImg = band.coverPhotoUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=1200&auto=format&fit=crop'

    return [
      { id: 1, type: 'photo', src: mainImg, title: 'Live Stage Hero', tag: 'STAGE ACT' },
      { id: 2, type: 'photo', src: coverImg, title: 'Soundcheck Session', tag: 'SOUNDCHECK' },
      { id: 3, type: 'photo', src: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop', title: 'Microphone & Backline', tag: 'AUDIO RIG' },
      { id: 4, type: 'photo', src: 'https://images.unsplash.com/photo-1526478806334-5fd488fcaabc?q=80&w=1200&auto=format&fit=crop', title: 'Live Performance Energy', tag: 'CONCERT' },
      { id: 5, type: 'photo', src: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1200&auto=format&fit=crop', title: 'Crowd & Moshpit', tag: 'CROWD' },
      { id: 6, type: 'photo', src: 'https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?q=80&w=1200&auto=format&fit=crop', title: 'Lighting & Production', tag: 'LIGHT SHOW' },
      { id: 7, type: 'photo', src: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=1200&auto=format&fit=crop', title: 'Intimate Gig Acoustic', tag: 'SESSION' },
      { id: 8, type: 'photo', src: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop', title: 'Backstage Transit & Crew', tag: 'CREW' },
    ]
  }, [band, allPosts])

  const safeActiveSlide = gallerySlides.length > 0 ? activeSlide % gallerySlides.length : 0
  const currentStageSlide = gallerySlides[safeActiveSlide] || gallerySlides[0]

  // Related bands (3 live bands from other genres/cities, falling back cleanly offline)
  const relatedBands = useMemo(() => {
    const pool = liveRelatedBands && liveRelatedBands.length > 0 ? liveRelatedBands : fallbackBands
    return pool.filter((b) => b.id !== band?.id).slice(0, 3)
  }, [band?.id, liveRelatedBands])

  // Calculated estimated rate based on sets
  const hasFixedRate = Boolean(band?.budgetMin && band.budgetMin > 0)
  const baseRate = hasFixedRate ? (band?.budgetMin || 0) : 0
  const totalPrice = hasFixedRate ? Math.round(baseRate * setQuantity) : 0

  const handleDirectWhatsApp = (eventDate?: string, eventName?: string) => {
    if (!band?.phone) return
    const cleanPhone = formatWhatsAppPhone(band.phone, '')
    if (!cleanPhone) return

    // Record connection / lead in backend if authenticated and NOT the owner
    try {
      if (currentUser && band.id && !isOwner) {
        fetch('/api/connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authClient.getAuthHeaders(),
          },
          body: JSON.stringify({
            bandProfileId: band.id,
            connectionType: 'whatsapp_direct',
            notes: `Direct WA booking: ${setQuantity} Set Performance`,
            eventDate: eventDate || null,
            eventName: eventName || null,
          }),
        }).catch(() => {})
      }
    } catch {
      // Non-blocking
    }
    const rateLabel = hasFixedRate ? formatRupiah(totalPrice) : 'Negosiasi'
    const eventLabel = eventName ? `- Acara: ${eventName}\n` : ''
    const dateLabel = eventDate ? `- Tanggal Tampil: ${eventDate}\n` : ''
    const message = encodeURIComponent(
      `Halo Management ${band.bandName}, kami dari Event Organizer ingin mengajukan penawaran booking panggung melalui Reffband:\n` +
      eventLabel +
      dateLabel +
      `- Durasi: ${setQuantity} Set Performance\n` +
      `- Estimasi Rate: ${rateLabel}\n` +
      `Mohon informasi ketersediaan jadwal tanggal dan konfirmasi spesifikasi technical rider panggung Anda. Terima kasih!`
    )
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank')
  }

  const handleShare = () => {
    if (!band) return
    const shareUrl = window.location.origin + getBandProfileUrl(band)
    if (navigator.share) {
      navigator.share({ title: band.bandName, url: shareUrl }).catch(() => {})
    } else {
      navigator.clipboard.writeText(shareUrl)
    }
  }

  // Fallback / Customizable Rider items
  const displayRiderItems: RiderItem[] = useMemo(() => {
    if (band?.riderItems && band.riderItems.length > 0) {
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
  }, [band])

  if (loadingBand && !band) {
    return (
      <div className="w-full bg-[#000000] text-white min-h-screen flex flex-col items-center justify-center p-6 font-mono">
        <div className="w-12 h-12 rounded-full border-2 border-[#222222] border-t-[#E01E37] animate-spin mb-4" />
        <div className="text-xs uppercase tracking-widest text-[#A0A0A0]">
          MEMUAT PROFIL BAND...
        </div>
      </div>
    )
  }

  if (notFoundError || !band) {
    return (
      <div className="w-full bg-[#000000] text-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#121212] border border-[#262626] rounded-2xl p-8 text-center space-y-5 shadow-xl">
          <div className="font-mono text-xs uppercase tracking-widest text-[#F87171] font-bold">
            404 · PROFIL TIDAK DITEMUKAN
          </div>
          <h1 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wide">
            Profil Band Tidak Tersedia
          </h1>
          <p className="text-sm text-[#A0A0A0] font-sans leading-relaxed">
            Profil musisi yang Anda cari tidak ditemukan atau akun telah dihapus dari katalog Reffband.
          </p>
          <Link
            to="/cari-band"
            className="inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider transition-colors"
          >
            Kembali ke Katalog Band
          </Link>
        </div>
      </div>
    )
  }

  if (!currentUser) {
    return (
      <div className="w-full min-h-[80vh] flex items-center justify-center bg-black px-4 py-20">
        <div className="max-w-md w-full bg-[#141414] border border-[#E01E37]/50 p-8 sm:p-10 rounded-2xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-[#E01E37]/15 border border-[#E01E37]/50 text-[#E01E37] mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="font-mono text-[11px] text-[#E01E37] font-bold tracking-widest uppercase bg-[#E01E37]/10 px-3 py-1 rounded-full border border-[#E01E37]/20">
              Akses Terproteksi
            </span>
            <h1 className="font-mono text-xl sm:text-2xl font-bold uppercase text-white tracking-wider">
              Profil Musisi Terkunci
            </h1>
            <p className="text-[#A0A0A0] text-xs font-sans leading-relaxed">
              Untuk melihat portofolio live, audio rekaman demo, dan technical rider band ini, silakan daftar akun baru atau masuk ke akun Anda.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              to={`/daftar?redirect=${encodeURIComponent(window.location.pathname)}`}
              className="w-full min-h-[46px] bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(224,30,55,0.4)]"
            >
              <span>Daftar Akun Baru</span>
              <span className="text-white text-sm">▶</span>
            </Link>
            <Link
              to={`/masuk?redirect=${encodeURIComponent(window.location.pathname)}`}
              className="w-full min-h-[46px] bg-[#202020] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-white font-mono font-bold text-xs uppercase tracking-widest rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <Lock className="w-4 h-4 text-[#E01E37]" />
              <span>Masuk ke Akun</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

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

        {/* OWNER MODE NOTIFICATION BANNER */}
        {canManage && (
          <div className="mb-6 p-4 rounded-2xl bg-[#141012] border border-[#E01E37]/50 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E01E37]/20 border border-[#E01E37]/50 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5 text-[#E01E37]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs uppercase font-bold text-white tracking-wider">
                    Mode Pemilik Band · {band.bandName}
                  </span>
                  <span className="bg-[#E01E37] text-white text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase">
                    Pemilik
                  </span>
                </div>
                <p className="text-xs text-[#A0A0A0] mt-0.5 font-sans">
                  Anda sedang melihat profil band Anda seperti yang dilihat oleh EO. Anda dapat mengedit sampel lagu atau membuka dashboard band.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setIsAudioManageModalOpen(true)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(224,30,55,0.4)] cursor-pointer"
              >
                <Music className="w-4 h-4" />
                <span>Edit Sampel Audio</span>
              </button>
              <Link
                to="/dashboard-band"
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#1F1F1F] hover:bg-[#282828] text-white border border-white/10 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#A0A0A0]" />
                <span>Dashboard Band</span>
              </Link>
            </div>
          </div>
        )}

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
                {(() => {
                  const currentRating = Number(band.rating || band.ratingAverage || 4.8)
                  const tierInfo = getRatingTierBadge(currentRating)
                  return (
                    <div className={`font-mono text-[11px] uppercase tracking-wider px-3 py-1 font-bold flex items-center gap-1.5 select-none rounded-full border ${tierInfo.bgClass}`}>
                      {currentUser?.accountType === 'admin' && (
                        <span className="text-[#FFD166] flex items-center gap-1 mr-0.5">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{currentRating.toFixed(1)} ·</span>
                        </span>
                      )}
                      <span>{tierInfo.label}</span>
                    </div>
                  )
                })()}
              </div>
            </div>

            {/* Identity & Social Channels Grid */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white tracking-wider uppercase leading-none">
                  {band.bandName}
                </h1>

                {/* Rating & Review Counter Line (Stars visible only to Admin; public only sees status words) */}
                {(() => {
                  const currentRating = Number(band.rating || band.ratingAverage || 4.8)
                  const tierInfo = getRatingTierBadge(currentRating)
                  return (
                    <div className="flex items-center gap-3 flex-wrap pt-0.5">
                      {currentUser?.accountType === 'admin' && (
                        <>
                          <div className="flex items-center gap-1 bg-[#181818] border border-[#FFD166]/40 px-2.5 py-1 rounded-lg">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= Math.round(currentRating)
                                    ? 'fill-[#FFD166] text-[#FFD166]'
                                    : 'text-[#444]'
                                }`}
                              />
                            ))}
                            <span className="font-mono font-bold text-white text-xs sm:text-sm ml-1.5">
                              {currentRating.toFixed(1)} / 5.0
                            </span>
                            <span className="text-[10px] text-[#00D9FF] ml-1 bg-[#00D9FF]/10 px-1.5 py-0.5 rounded border border-[#00D9FF]/20 font-bold">
                              Admin View
                            </span>
                          </div>
                          <span className="text-[#555]">•</span>
                        </>
                      )}
                      <span className={`font-mono text-xs font-bold px-3 py-1 rounded border uppercase tracking-wider ${tierInfo.bgClass}`}>
                        {tierInfo.label}
                      </span>
                      <span className="text-[#555]">•</span>
                      <span className="font-mono text-xs text-[#A0A0A0]">
                        {reviews.length || band.ratingCount || 1} Penilaian EO Terverifikasi
                      </span>
                    </div>
                  )
                })()}
                <p className="text-sm text-[#CCCCCC] font-sans leading-relaxed">
                  {band.bio || 'Unit musisi terverifikasi siap tampil untuk panggung live festival, gig intim, dan pementasan kampus.'}
                </p>

                {/* Metadata Chips */}
                <div className="flex items-center gap-4 flex-wrap pt-1 font-mono text-xs text-[#A0A0A0]">
                  <div className="flex items-center gap-1.5 text-white">
                    <MapPin className="w-3.5 h-3.5 text-[#E01E37]" />
                    <span>{band.locationCity}{band.locationRegion ? ` • ${band.locationRegion}` : ''}</span>
                  </div>
                  {band.campus && (showCampusAffiliation || currentUser?.accountType === 'admin') && (
                    <>
                      <span className="text-[#333]">•</span>
                      <div className="flex items-center gap-1.5 text-[#FFD166] font-bold bg-[#FFD166]/10 px-2 py-0.5 border border-[#FFD166]/30">
                        <span>🎓</span>
                        <span>AFILIASI: {band.campus}</span>
                        {!showCampusAffiliation && currentUser?.accountType === 'admin' && (
                          <span className="text-[9px] text-[#888] font-mono ml-0.5">(Admin Only)</span>
                        )}
                      </div>
                    </>
                  )}
                  <span className="text-[#333]">•</span>
                  <div className="flex items-center gap-1.5 text-[#E01E37] font-bold">
                    <Radio className="w-3.5 h-3.5" />
                    <span>GENRE: {band.genre?.toUpperCase()}</span>
                  </div>
                  <span className="text-[#333]">•</span>
                  <div className="flex items-center gap-1.5 text-white/80">
                    <Phone className="w-3.5 h-3.5 text-white/60" />
                    <span>MANAJEMEN: {band.phone || 'Belum tercantum'}</span>
                  </div>
                </div>
              </div>

              {/* Kanal Distribusi (4 Authentic Round Icons Matching Reference "Tools" Row) */}
              <div className="bg-[#0C0C0C] border border-[#222222] rounded-2xl p-4 lg:min-w-[280px]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373] block mb-3 font-bold">
                  KANAL DISTRIBUSI RESMI
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
                    {hasFixedRate && band.budgetMin ? formatRupiah(band.budgetMin) : 'Negosiasi'}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    TARIF MULAI / SET
                  </span>
                </div>
              </div>

              {/* Right: Rounded Pill Action Buttons for EO & Visitors */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* 1. Tombol Tunggal Sampel Audio / Demo Lagu */}
                <button
                  type="button"
                  onClick={handleTogglePlayAudio}
                  className={`px-5 py-2.5 rounded-full font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-[#E01E37] text-white shadow-[0_0_20px_rgba(224,30,55,0.6)] animate-pulse'
                      : 'bg-[#1C1C1C] hover:bg-[#282828] text-white border border-[#333333]'
                  }`}
                  aria-label={isPlayingAudio ? 'Jeda sampel audio' : 'Putar sampel audio'}
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-white" />
                      <span>Jeda Demo ({formatAudioTime(audioCurrentTime)})</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white ml-0.5" />
                      <span>Dengar Sampel Lagu</span>
                    </>
                  )}
                </button>

                {/* Indikator / Pilihan Track jika memiliki lebih dari 1 sampel lagu */}
                {audioTracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = (activeTrackIndex + 1) % audioTracks.length
                      setActiveTrackIndex(next)
                      setIsPlayingAudio(false)
                      setAudioCurrentTime(0)
                    }}
                    className="px-3 py-2 rounded-full bg-[#181818] hover:bg-[#252525] text-[#A0A0A0] hover:text-white border border-[#333] font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Ganti ke potongan lagu berikutnya"
                  >
                    <Music className="w-3.5 h-3.5 text-[#E01E37]" />
                    <span>Track {activeTrackIndex + 1}/{audioTracks.length}</span>
                  </button>
                )}

                {canManage ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsAudioManageModalOpen(true)}
                      className="px-5 py-2.5 rounded-full bg-[#1C1C1C] hover:bg-[#282828] text-white border border-[#333333] font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Music className="w-4 h-4 text-[#E01E37]" />
                      <span>Edit Sampel Audio</span>
                    </button>
                    <Link
                      to="/dashboard-band"
                      className="px-5 py-2.5 rounded-full bg-[#1C1C1C] hover:bg-[#282828] text-white border border-[#333333] font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[#A0A0A0]" />
                      <span>Dashboard Band</span>
                    </Link>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsOrderModalOpen(true)}
                    className="px-6 py-2.5 rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.4)] cursor-pointer"
                  >
                    {currentUser ? <Phone className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    <span>{currentUser ? 'Booking Sekarang' : 'Hubungi Band (Login)'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Floating Mini Player (Aktif ketika audio sedang diputar tanpa memakan tempat di halaman) */}
        {isPlayingAudio && (
          <aside
            aria-label="Pemutar Audio Demo Melayang"
            className="fixed bottom-5 right-5 left-5 sm:left-auto sm:w-[420px] z-50 bg-[#121212]/95 backdrop-blur-md border border-[#E01E37]/60 rounded-2xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.85)] flex flex-col gap-2.5 animate-in slide-in-from-bottom-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={handleTogglePlayAudio}
                  className="w-10 h-10 rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(224,30,55,0.6)] cursor-pointer"
                  aria-label="Jeda audio"
                >
                  <Pause className="w-4 h-4 fill-white" />
                </button>
                <div className="min-w-0">
                  <span className="font-mono text-[9px] text-[#E01E37] uppercase font-bold block">
                    MEMUTAR DEMO · TRACK 0{activeTrackIndex + 1}
                  </span>
                  <p className="font-mono text-xs font-bold text-white truncate">
                    {currentAudioTrack?.title || `${band.bandName} - Master Demo`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {audioTracks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = (activeTrackIndex + 1) % audioTracks.length
                      setActiveTrackIndex(next)
                    }}
                    className="px-2 py-1 bg-[#222] hover:bg-[#333] text-white text-[10px] font-mono uppercase font-bold rounded cursor-pointer"
                    title="Next Track"
                  >
                    Ganti Track
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (audioRef.current) audioRef.current.pause()
                    setIsPlayingAudio(false)
                  }}
                  className="w-7 h-7 rounded-full bg-[#202020] hover:bg-[#333] text-[#A0A0A0] hover:text-white flex items-center justify-center cursor-pointer"
                  aria-label="Tutup pemutar audio"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress Bar & Timer */}
            <div className="space-y-1">
              <div
                onClick={handleAudioSeek}
                className="w-full h-2 bg-[#222222] rounded-full overflow-hidden cursor-pointer relative"
                role="slider"
                aria-label="Progress pemutaran audio"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(audioProgressPercent)}
              >
                <div
                  className="h-full bg-[#E01E37] transition-all duration-100"
                  style={{ width: `${audioProgressPercent}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] text-[#707070]">
                <span>{formatAudioTime(audioCurrentTime)}</span>
                <span>{formatAudioTime(audioDuration || 38)}</span>
              </div>
            </div>
          </aside>
        )}

        {/* Hidden Audio Element */}
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
                  KEBUTUHAN PERALATAN & RIDER RESMI
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
                    {hasFixedRate ? formatRupiah(totalPrice) : 'Negosiasi'}
                  </div>
                </div>
              </div>

              {/* Massive Crimson CTA Action Button */}
              <button
                type="button"
                onClick={() => setIsOrderModalOpen(true)}
                className="min-h-[44px] h-12 px-6 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 rounded-xl cursor-pointer"
              >
                {!currentUser && <Lock className="w-4 h-4" />}
                <span>{currentUser ? 'BOOKING SEKARANG' : 'LOGIN UNTUK BOOKING'}</span>
                <span className="text-white text-sm">▶</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Stage Visual Carousel with Arrow Buttons */}
          <div className="bg-[#101010] border border-[#242424] rounded-2xl flex flex-col justify-between p-6 sm:p-8 h-[592px] lg:sticky lg:top-24 relative overflow-hidden group shadow-xl">
            {/* Top Stage Header */}
            <div className="flex items-center justify-between text-xs font-mono text-[#777] z-10 pb-2 border-b border-[#1E1E1E]">
              <span className="uppercase tracking-widest text-[#E01E37] font-bold">
                STAGE VISUAL · {currentStageSlide.tag}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSlide((prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length)}
                  aria-label="Slide sebelumnya"
                  className="w-8 h-8 flex items-center justify-center border border-[#282828] hover:border-[#E01E37] hover:text-[#E01E37] text-white transition-colors rounded cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-white text-[11px] font-bold min-w-[70px] text-center select-none whitespace-nowrap">
                  SLIDE {safeActiveSlide + 1} / {gallerySlides.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSlide((prev) => (prev + 1) % gallerySlides.length)}
                  aria-label="Slide berikutnya"
                  className="w-8 h-8 flex items-center justify-center border border-[#282828] hover:border-[#E01E37] hover:text-[#E01E37] text-white transition-colors rounded cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Central Stage Cutout / Photo & Video Display */}
            <div className="relative flex-1 w-full my-3 overflow-hidden bg-[#0A0A0A] border border-[#1E1E1E] rounded-xl flex items-center justify-center group/stage">
              {currentStageSlide.type === 'video' ? (
                <video
                  key={currentStageSlide.src}
                  src={currentStageSlide.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img
                  src={currentStageSlide.src}
                  alt={`${band.bandName} - ${currentStageSlide.title}`}
                  className="w-full h-full object-cover filter contrast-110 drop-shadow-[0_20px_40px_rgba(0,0,0,0.9)] transition-all duration-700 ease-out"
                />
              )}

              {/* Ambient Vignette Overlay (photo slides only so video controls remain unobstructed) */}
              {currentStageSlide.type !== 'video' && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
              )}

              {/* HUD Telemetry Overlay Corners (Black, Red #E01E37, White) */}
              <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] text-white/80 tracking-widest pointer-events-none uppercase">
                CAM: 0{safeActiveSlide + 1} · FOH STAGE
              </div>
              <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm border border-white/10 px-2 py-0.5 font-mono text-[9px] text-[#E01E37] tracking-widest pointer-events-none uppercase font-bold">
                LIVE SPL: 112 dB
              </div>

              {/* Floating Slide Arrow Buttons (Left & Right) */}
              {gallerySlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveSlide((prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length)}
                    aria-label="Slide panggung sebelumnya"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 min-w-[44px] min-h-[44px] bg-black/80 hover:bg-[#E01E37] text-white/80 hover:text-white border border-white/15 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm rounded-full group/btn cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5 group-hover/btn:-translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveSlide((prev) => (prev + 1) % gallerySlides.length)}
                    aria-label="Slide panggung berikutnya"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-11 h-11 min-w-[44px] min-h-[44px] bg-black/80 hover:bg-[#E01E37] text-white/80 hover:text-white border border-white/15 flex items-center justify-center transition-all shadow-[0_0_15px_rgba(0,0,0,0.8)] backdrop-blur-sm rounded-full group/btn cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </>
              )}

              {/* Slide Title Banner Pill (photo slides only so video controls remain clear) */}
              {currentStageSlide.type !== 'video' && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 max-w-[90%] truncate bg-black/85 backdrop-blur-md border border-white/15 px-4 py-1.5 font-mono text-xs uppercase tracking-wider text-white pointer-events-none shadow-lg rounded-full">
                  {band.bandName} · {currentStageSlide.title}
                </div>
              )}
            </div>

            {/* Dynamic Horizontal Interactive Pager Bar */}
            <div className="w-full pt-3 z-10">
              <div
                className="grid gap-1.5 h-1.5 w-full"
                style={{ gridTemplateColumns: `repeat(${gallerySlides.length}, minmax(0, 1fr))` }}
              >
                {gallerySlides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    aria-label={`Pindah ke slide ${idx + 1}`}
                    aria-current={safeActiveSlide === idx}
                    className={`h-full transition-all duration-300 rounded-full cursor-pointer ${
                      safeActiveSlide === idx
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

            <span className="font-mono text-xs text-[#666]">
              PORTFOLIO ARCHIVE · {allPosts.length} KARYA
            </span>
          </div>

          {/* 4-Column Responsive Work Grid or Honest Empty State */}
          {allPosts.length === 0 ? (
            <div className="bg-[#121212] border border-[#242424] rounded-2xl p-10 text-center space-y-2">
              <Camera className="w-8 h-8 text-[#808080] mx-auto" aria-hidden="true" />
              <p className="font-mono text-sm text-white uppercase font-bold">
                Belum Ada Karya Diunggah
              </p>
              <p className="text-xs text-[#A0A0A0] font-sans">
                {band.bandName} belum menambahkan dokumentasi foto atau video panggung. Gunakan fitur inquiry atau hubungi kontak manajemen di atas.
              </p>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
            {allPosts.map((post) => {
              const postSlides = parsePostSlides(post, true)
              const slideCount = postSlides.length
              const hasPhotoSlide = postSlides.some((s) => !isActualVideoSlide(s.type, s.url))
              const hasVideoSlide = postSlides.some((s) => isActualVideoSlide(s.type, s.url))
              const hasMixed = post.mediaType === 'mixed' || (hasPhotoSlide && hasVideoSlide)
              const primarySlide = postSlides[0]
              const primaryUrl = primarySlide?.url || post.mediaUrl || post.thumbnailUrl || ''
              const isPrimaryVideo = isActualVideoSlide(
                primarySlide?.type || post.mediaType,
                primaryUrl
              )
              const isCardBroken = Boolean(brokenCardThumbIds[post.id])

              return (
                <div
                  key={post.id}
                  onClick={() => {
                    setActivePost(post)
                    if (!isOwner) {
                      fetch(`/api/posts/${post.id}/view`, {
                        method: 'POST',
                        headers: authClient.getAuthHeaders(),
                      }).catch(() => {})
                    }
                  }}
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
          )}
        </section>

        {/* 6. PENILAIAN & ULASAN EVENT ORGANIZER */}
        <section className="w-full pb-16">
          <div className="relative border-b-2 border-[#E01E37] pb-3 mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <div
              className="bg-[#E01E37] text-white px-6 py-2.5 font-mono font-bold text-sm sm:text-base uppercase tracking-widest inline-flex items-center gap-3 select-none"
              style={{
                clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 100%, 0 100%)',
              }}
            >
              <span>PENILAIAN & ULASAN EVENT ORGANIZER</span>
            </div>

            <div className="flex items-center gap-4 font-mono text-xs">
              <span className="text-[#A0A0A0]">
                Rating Ditentukan Oleh EO Terverifikasi
              </span>
            </div>
          </div>

          {/* Rating Summary Card & Scale Representation (Stars visible ONLY to Admin) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Status Box */}
            {(() => {
              const currentRating = Number(band.rating || band.ratingAverage || 4.8)
              const tierInfo = getRatingTierBadge(currentRating)
              return (
                <div className="bg-[#121212] border border-[#222222] p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373] block mb-2 font-bold">
                      STATUS KURASI &amp; PERFORMA BAND
                    </span>
                    <div className="my-3">
                      <span className={`inline-block font-mono text-xl sm:text-2xl font-black px-4 py-2.5 rounded-xl border uppercase tracking-wider ${tierInfo.bgClass}`}>
                        {tierInfo.label}
                      </span>
                    </div>

                    <p className="text-xs text-[#A0A0A0] mt-3 font-sans leading-relaxed">
                      {tierInfo.description}
                    </p>

                    {/* Admin Only Star Inspection */}
                    {currentUser?.accountType === 'admin' && (
                      <div className="mt-4 pt-3 border-t border-white/10 bg-black/60 p-3 rounded-xl border border-[#FFD166]/30">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#FFD166] font-bold">KHUSUS ADMIN // SKOR BINTANG</span>
                          <span className="text-white font-bold">{currentRating.toFixed(1)} / 5.0</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1.5 text-[#FFD166]">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={`w-3.5 h-3.5 ${
                                s <= Math.round(currentRating) ? 'fill-[#FFD166] text-[#FFD166]' : 'text-[#444]'
                              }`}
                            />
                          ))}
                          <span className="text-[9px] font-mono text-[#00D9FF] ml-1 bg-[#00D9FF]/10 px-1 py-0.2 rounded border border-[#00D9FF]/20">
                            Admin View
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}

            {/* Rating Scale Legend (1-2 Baik, 3-4 Sangat Baik, 4.5-5 Rekomendasi Favorit) */}
            <div className="lg:col-span-2 bg-[#121212] border border-[#222222] p-6 rounded-2xl space-y-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373] block font-bold">
                STANDAR TIER STATUS REFFBAND
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#0A0A0A] border border-[#FFD166]/30 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#FFD166]">BAIK</span>
                    {currentUser?.accountType === 'admin' && (
                      <span className="text-[9px] font-mono text-[#FFD166]/70">1.0 - 2.9 ★</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                    Performa standar, musisi siap tampil di gig kecil dan panggung santai.
                  </p>
                </div>

                <div className="bg-[#0A0A0A] border border-[#00D9FF]/30 p-3.5 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#00D9FF]">SANGAT BAIK</span>
                    {currentUser?.accountType === 'admin' && (
                      <span className="text-[9px] font-mono text-[#00D9FF]/70">3.0 - 4.4 ★</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                    Aksi panggung energik, crowd engagement kuat, dan kedisiplinan rundown tinggi.
                  </p>
                </div>

                <div className="bg-[#0A0A0A] border border-[#E01E37]/50 p-3.5 rounded-xl space-y-1.5 shadow-[0_0_15px_rgba(224,30,55,0.1)]">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#FF4D6D]">REKOMENDASI FAVORIT</span>
                    {currentUser?.accountType === 'admin' && (
                      <span className="text-[9px] font-mono text-[#FF4D6D]/70">4.5 - 5.0 ★</span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#A0A0A0] leading-relaxed">
                    Pilihan utama kurator &amp; EO. Live show spektakuler, audio rider prima, kepuasan 100%.
                  </p>
                </div>
              </div>

              {/* EO Rating Workflow Info */}
              <div className="bg-[#181818] p-3 rounded-xl border border-white/5 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E01E37]/20 text-[#E01E37] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  ✓
                </div>
                <div className="text-xs text-[#CCCCCC] space-y-0.5 leading-relaxed">
                  <span className="font-bold text-white block">Sistem Kurasi Status Otomatis Reffband</span>
                  <span>Penilaian hanya dapat diberikan oleh akun Event Organizer (EO) yang telah membooking band. Setelah tanggal acara selesai (tepat pukul 00.00 WIB), EO menerima email otomatis dan wajib memberikan ulasan sebelum dapat mengakses menu utama.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((rev) => {
                const tierInfo = getRatingTierBadge(rev.rating)
                return (
                  <div key={rev.id} className="bg-[#101010] border border-[#222222] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {currentUser?.accountType === 'admin' ? (
                          <div className="flex items-center gap-1 text-[#FFD166] bg-black/60 px-2 py-0.5 rounded border border-[#FFD166]/30">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-3.5 h-3.5 ${
                                  s <= Math.round(rev.rating) ? 'fill-[#FFD166] text-[#FFD166]' : 'text-[#333]'
                                }`}
                              />
                            ))}
                            <span className="font-mono text-xs font-bold text-white ml-1">{Number(rev.rating).toFixed(1)}</span>
                            <span className="text-[9px] font-mono text-[#00D9FF] bg-[#00D9FF]/10 px-1 py-0.2 rounded border border-[#00D9FF]/20 font-bold ml-1">
                              Admin View
                            </span>
                          </div>
                        ) : null}
                        <span className={`text-[10px] font-mono px-2.5 py-1 rounded border font-bold uppercase ${tierInfo.bgClass}`}>
                          {tierInfo.label}
                        </span>
                        <span className="text-[11px] font-mono text-[#00D9FF] bg-[#00D9FF]/10 px-2 py-0.5 rounded border border-[#00D9FF]/20">
                          ✓ Terverifikasi Selesai Tampil
                        </span>
                      </div>
                      <p className="text-sm text-[#CCCCCC] font-sans leading-relaxed">
                        "{rev.reviewText}"
                      </p>
                    </div>

                    <div className="text-right shrink-0 space-y-1 font-mono text-[11px] text-[#777]">
                      <div className="text-[#AAA] font-bold">{rev.organizerEmail || 'EO Penyelenggara'}</div>
                      {rev.eventDate && <div>Tgl Tampil: {rev.eventDate}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-[#101010] border border-[#222222] p-8 text-center rounded-2xl space-y-2">
              <span className="text-2xl">⚡</span>
              <h3 className="font-mono text-sm font-bold uppercase text-white">Belum Ada Ulasan Pasca-Tampil</h3>
              <p className="text-xs text-[#888] max-w-md mx-auto">
                Band ini berstatus kurasi Rekomendasi Favorit. Penilaian langsung akan bertambah setelah EO menyelesaikan booking tanggal penampilan berikutnya.
              </p>
            </div>
          )}
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
              <span className="text-[#666] hidden sm:inline">01 / 03</span>
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
        currentUser={currentUser}
        onClose={() => setIsOrderModalOpen(false)}
        onConfirmWhatsApp={handleDirectWhatsApp}
      />

      {/* Modal Kelola & Edit Sampel Audio Profil (Mode Pemilik) */}
      <ManageAudioModal
        isOpen={isAudioManageModalOpen}
        onClose={() => setIsAudioManageModalOpen(false)}
        mediaFiles={band.mediaFiles || []}
        bandName={band.bandName}
        onUpdated={refetchBandProfile}
      />
    </div>
  )
}
