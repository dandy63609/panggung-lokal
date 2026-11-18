import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Eye,
  MessageCircle,
  TrendingUp,
  Music,
  Plus,
  Settings,
  ExternalLink,
  MapPin,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  DollarSign,
  Radio,
  Globe,
  Layers,
  Star,
  Phone,
  Megaphone,
} from 'lucide-react'
import { authClient } from '../lib/auth'
import { BAND_GENRE_OPTIONS, normalizeBandGenreSelection } from '../lib/genres'
import {
  buildDashboardRiderItems,
  parsePostSlides,
  sanitizeExternalUrl,
} from '../lib/bandHelpers'
import {
  SpotifyIcon,
  InstagramIcon,
  YouTubeIcon,
  TikTokIcon,
} from '../components/ui/SocialIcons'
import { JobBroadcastsTab } from '../components/dashboard/JobBroadcastsTab'
import {
  UploadMediaModal,
  PostDetailModal,
  EditProfileModal,
  EditRiderModal,
  type UploadedMediaItem,
  type EditProfileFormState,
} from '../components/dashboard/BandDashboardModals'
import type { BandDashboardData, BandPost, BandPostSlide, RiderItem, JobBroadcast } from '../types'
import { formatRupiah } from '../lib/utils'

export const BandDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState<BandDashboardData | null>(null)
  const [activeTab, setActiveTab] = useState<'feed' | 'rider' | 'analytics' | 'settings' | 'broadcasts'>('feed')

  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false)
  const [isEditRiderModalOpen, setIsEditRiderModalOpen] = useState(false)
  const [selectedPostDetail, setSelectedPostDetail] = useState<BandPost | null>(null)
  const [detailSlideIndex, setDetailSlideIndex] = useState(0)

  // Feedback notifications
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Upload Form State (Multi-file & Mixed Media from Local Directory)
  const [uploadedItems, setUploadedItems] = useState<UploadedMediaItem[]>([])
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadSubmitting, setUploadSubmitting] = useState(false)

  const [editForm, setEditForm] = useState<EditProfileFormState>({
    bandName: '',
    genre: BAND_GENRE_OPTIONS[0],
    locationCity: '',
    phone: '',
    bio: '',
  })
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Settings (Tarif & Kanal Media) State
  const [settingsForm, setSettingsForm] = useState<{
    budgetMin: number
    budgetMax: number
    spotifyUrl: string
    instagramHandle: string
    youtubeUrl: string
    tiktokUrl: string
  }>({
    budgetMin: 0,
    budgetMax: 0,
    spotifyUrl: '',
    instagramHandle: '',
    youtubeUrl: '',
    tiktokUrl: '',
  })
  const [settingsSubmitting, setSettingsSubmitting] = useState(false)

  // Technical Rider State
  const [editRiderItems, setEditRiderItems] = useState<RiderItem[]>([])
  const [riderSubmitting, setRiderSubmitting] = useState(false)

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 4000)
  }, [])

  const applyDashboardResponse = useCallback(
    (res: Awaited<ReturnType<typeof authClient.getBandDashboard>>) => {
      if (res.success && res.data) {
        setDashboardData(res.data)
        setEditForm({
          bandName: res.data.profile.bandName || '',
          genre: normalizeBandGenreSelection(res.data.profile.genre),
          locationCity: res.data.profile.locationCity || '',
          phone: res.data.profile.phone || '',
          bio: res.data.profile.bio || '',
        })
        setSettingsForm({
          budgetMin: res.data.profile.budgetMin || 0,
          budgetMax: res.data.profile.budgetMax || 0,
          spotifyUrl: res.data.profile.spotifyUrl || '',
          instagramHandle: res.data.profile.instagramHandle || '',
          youtubeUrl: res.data.profile.youtubeUrl || '',
          tiktokUrl: res.data.profile.tiktokUrl || '',
        })
        setEditRiderItems(res.data.profile.riderItems || [])
      } else {
        showToast(res.message || 'Gagal memuat data dashboard band.', 'error')
      }
      setLoading(false)
    },
    [showToast]
  )

  const fetchDashboard = useCallback(async () => {
    setLoading(true)
    const res = await authClient.getBandDashboard()
    applyDashboardResponse(res)
  }, [applyDashboardResponse])

  // Initial load
  useEffect(() => {
    const user = authClient.getUser()
    if (!user) {
      navigate('/masuk')
      return
    }
    if (user.accountType !== 'band') {
      navigate('/cari-band')
      return
    }
    let cancelled = false
    authClient.getBandDashboard().then((res) => {
      if (!cancelled) {
        applyDashboardResponse(res)
      }
    })
    return () => {
      cancelled = true
    }
  }, [navigate, applyDashboardResponse])

  const handleOpenUploadModal = (triggerPickerImmediately = false) => {
    setIsUploadModalOpen(true)
    if (triggerPickerImmediately) {
      setTimeout(() => {
        fileInputRef.current?.click()
      }, 150)
    }
  }

  const handleFilesSelected = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (!fileArray.length) return

    const newItems: UploadedMediaItem[] = fileArray.map((file) => {
      const isVideo = file.type.startsWith('video/')
      return {
        id: Math.random().toString(36).substring(2, 9),
        file,
        type: isVideo ? 'video' : 'photo',
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(1) + ' MB',
        uploading: true,
      }
    })

    setUploadedItems((prev) => [...prev, ...newItems])

    // Upload files sequentially/concurrently to server
    for (const item of newItems) {
      if (!item.file) continue
      try {
        const res = await authClient.uploadFile(item.file)
        if (res.success && res.fileUrl) {
          setUploadedItems((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, serverUrl: res.fileUrl, uploading: false }
                : p
            )
          )
        } else {
          setUploadedItems((prev) =>
            prev.map((p) =>
              p.id === item.id
                ? { ...p, uploading: false, error: res.message || 'Gagal upload' }
                : p
            )
          )
        }
      } catch {
        setUploadedItems((prev) =>
          prev.map((p) =>
            p.id === item.id
              ? { ...p, uploading: false, error: 'Kendala upload' }
              : p
          )
        )
      }
    }
  }

  const handleRemoveUploadedItem = (id: string) => {
    setUploadedItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const clearUploadedItems = () => {
    setUploadedItems((prev) => {
      for (const item of prev) {
        if (item.previewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.previewUrl)
        }
      }
      return []
    })
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (uploadedItems.length === 0) {
      showToast('Pilih minimal satu foto atau video dari direktori komputer Anda.', 'error')
      return
    }

    const stillUploading = uploadedItems.some((item) => item.uploading)
    if (stillUploading) {
      showToast('Mohon tunggu hingga proses unggah berkas selesai.', 'error')
      return
    }

    const failedItems = uploadedItems.filter((item) => !item.serverUrl)
    if (failedItems.length > 0) {
      showToast('Terdapat berkas yang belum berhasil diunggah. Hapus atau coba unggah ulang.', 'error')
      return
    }

    setUploadSubmitting(true)

    const slides = uploadedItems.map((item) => ({
      type: item.type,
      url: item.serverUrl!,
    }))

    const firstItem = uploadedItems[0]
    const hasPhoto = uploadedItems.some((i) => i.type === 'photo')
    const hasVideo = uploadedItems.some((i) => i.type === 'video')
    const postType = hasPhoto && hasVideo ? 'mixed' : firstItem.type

    const res = await authClient.createPost({
      mediaType: postType,
      mediaUrl: firstItem.serverUrl!,
      thumbnailUrl: firstItem.serverUrl!,
      caption: uploadCaption.trim(),
      slides: slides.length > 1 ? slides : undefined,
    })

    if (res.success) {
      showToast(
        slides.length > 1
          ? `Karya campuran (${slides.length} media) berhasil dipublikasikan!`
          : 'Karya baru berhasil dipublikasikan ke etalase!'
      )
      setIsUploadModalOpen(false)
      clearUploadedItems()
      setUploadCaption('')
      fetchDashboard()
    } else {
      showToast(res.message || 'Gagal mengunggah karya.', 'error')
    }
    setUploadSubmitting(false)
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus materi karya ini dari etalase?')) {
      return
    }

    const res = await authClient.deletePost(postId)
    if (res.success) {
      showToast('Karya berhasil dihapus.')
      setSelectedPostDetail(null)
      fetchDashboard()
    } else {
      showToast(res.message || 'Gagal menghapus postingan.', 'error')
    }
  }

  // Open Edit Profil modal with current saved profile values synced cleanly
  const handleOpenEditProfileModal = () => {
    setEditForm({
      bandName: profile?.bandName || '',
      genre: normalizeBandGenreSelection(profile?.genre),
      locationCity: profile?.locationCity || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
    })
    setIsEditProfileModalOpen(true)
  }

  // Submit handler: Nama Band, Genre, Kota Domisili, No WhatsApp, Deskripsi / Bio
  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditSubmitting(true)

    const res = await authClient.updateBandProfile({
      bandName: editForm.bandName.trim(),
      genre: editForm.genre.trim(),
      locationCity: editForm.locationCity.trim(),
      phone: editForm.phone.trim(),
      bio: editForm.bio.trim(),
    })

    if (res.success && res.data) {
      showToast('Identitas profil band berhasil diperbarui!')
      setIsEditProfileModalOpen(false)
      fetchDashboard()
    } else {
      showToast(res.message || 'Gagal memperbarui identitas band.', 'error')
    }
    setEditSubmitting(false)
  }

  // Submit handler: Tab 4 Pengaturan Tarif & Tautan Kanal Media Sosial
  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSettingsSubmitting(true)

    const res = await authClient.updateBandProfile({
      budgetMin: settingsForm.budgetMin ? parseInt(String(settingsForm.budgetMin), 10) : 0,
      budgetMax: settingsForm.budgetMax ? parseInt(String(settingsForm.budgetMax), 10) : 0,
      spotifyUrl: settingsForm.spotifyUrl?.trim(),
      instagramHandle: settingsForm.instagramHandle?.trim(),
      youtubeUrl: settingsForm.youtubeUrl?.trim(),
      tiktokUrl: settingsForm.tiktokUrl?.trim(),
    })

    if (res.success && res.data) {
      showToast('Pengaturan tarif dan tautan kanal media berhasil disimpan!')
      fetchDashboard()
    } else {
      showToast(res.message || 'Gagal menyimpan tarif dan kanal.', 'error')
    }
    setSettingsSubmitting(false)
  }

  const handleOpenRiderModal = () => {
    setEditRiderItems(buildDashboardRiderItems(dashboardData?.profile))
    setIsEditRiderModalOpen(true)
  }

  // Submit handler: Tab 2 Technical Rider Panggung
  const handleRiderSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setRiderSubmitting(true)

    const cleanedItems = editRiderItems.filter(
      (item) => item.title.trim() !== '' || item.description.trim() !== ''
    )

    const res = await authClient.updateBandProfile({
      riderItems: cleanedItems,
      riderChannelInputs: cleanedItems[0]?.description || '',
      riderSoundSystem: cleanedItems[1]?.description || '',
      riderInstruments: cleanedItems[2]?.description || '',
      riderHospitality: cleanedItems[3]?.description || '',
    })

    if (res.success && res.data) {
      showToast('Spesifikasi technical rider panggung berhasil diperbarui!')
      setIsEditRiderModalOpen(false)
      fetchDashboard()
    } else {
      showToast(res.message || 'Gagal memperbarui rider teknis.', 'error')
    }
    setRiderSubmitting(false)
  }

  const handleAddRiderItem = () => {
    setEditRiderItems([...editRiderItems, { title: '', description: '' }])
  }

  const handleRemoveRiderItem = (index: number) => {
    setEditRiderItems(editRiderItems.filter((_, i) => i !== index))
  }

  const handleRiderItemChange = (index: number, field: 'title' | 'description', val: string) => {
    const updated = [...editRiderItems]
    updated[index][field] = val
    setEditRiderItems(updated)
  }

  const detailSlides: BandPostSlide[] = useMemo(
    () => parsePostSlides(selectedPostDetail, true),
    [selectedPostDetail]
  )

  const profile = dashboardData?.profile
  const stats = dashboardData?.stats
  const posts = dashboardData?.posts || []
  const connections = dashboardData?.recentConnections || []
  const jobBroadcasts: JobBroadcast[] = dashboardData?.jobBroadcasts || []

  const conversionRate =
    stats && stats.totalViews > 0
      ? ((stats.totalWaClicks / stats.totalViews) * 100).toFixed(1)
      : '0.0'

  const displayRiderItems = useMemo<RiderItem[]>(
    () => buildDashboardRiderItems(profile, { filterEmptyLegacy: true }),
    [profile]
  )

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#0A0A0A] flex flex-col items-center justify-center py-24 text-white">
        <Loader2 className="w-10 h-10 text-[#E01E37] animate-spin mb-4" />
        <p className="font-mono text-sm tracking-wider uppercase text-[#A0A0A0]">
          Memuat Konsol Manajemen Band...
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0A0A0A] text-[#F5F5F5] pb-24 selection:bg-[#E01E37] selection:text-white relative">
      {/* Background Circuit Grid Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:32px_32px]"
        aria-hidden="true"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 p-4 border flex items-center gap-3 shadow-2xl transition-all duration-200 max-w-md ${
            toastMessage.type === 'success'
              ? 'bg-[#161616] border-white text-white'
              : 'bg-[#1C1214] border-[#E01E37] text-white'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-white" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-[#E01E37]" />
          )}
          <span className="text-xs font-mono tracking-wide">{toastMessage.text}</span>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Profile Card */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl mb-8 relative group">
          {/* Cover Photo Banner with Vertical Gradient Dissolve */}
          <div className="h-52 sm:h-64 w-full relative overflow-hidden bg-[#181818]">
            {profile?.coverPhotoUrl ? (
              <img
                src={profile.coverPhotoUrl}
                alt="Stage Cover"
                className="w-full h-full object-cover opacity-60 brightness-90 filter"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-[#181818] via-[#111111] to-[#1C1214]" />
            )}

            {/* Smooth Mist / Gradient Dissolve into Card Background */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent" />

            {/* Top-Right Floating Bookmark / Action Button */}
            {profile?.id && (
              <Link
                to={`/band/${profile.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute top-4 right-4 sm:top-5 sm:right-6 w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 cursor-pointer min-h-[44px] min-w-[44px]"
                title="Lihat Pratinjau Publik Profil Band"
                aria-label="Lihat pratinjau publik profil band"
              >
                <ExternalLink className="w-4 h-4 text-white" />
              </Link>
            )}
          </div>

          {/* Card Body with Overlapping Circular Avatar */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 relative">
            {/* Overlapping Avatar */}
            <div className="-mt-14 sm:-mt-16 mb-4 flex items-end justify-between relative z-10">
              <div className="relative inline-block">
                <img
                  src={
                    profile?.profilePhotoUrl ||
                    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80'
                  }
                  alt={profile?.bandName || 'Band Avatar'}
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#121212] shadow-2xl bg-[#1A1A1A]"
                />
                <div
                  className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#E01E37] border-2 border-[#121212]"
                  title="Band Aktif di Reffband"
                />
              </div>
            </div>

            {/* Title, Subtitle, & Metadata Row */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="font-display text-2xl sm:text-4xl text-white tracking-wide">
                    {profile?.bandName || 'NAMA BAND'}
                  </h1>
                  <span className="px-2.5 py-0.5 bg-[#E01E37]/15 border border-[#E01E37]/50 text-[#E01E37] text-[11px] font-mono font-bold uppercase tracking-wider rounded-md">
                    {profile?.genre || 'Rock Alternatif'}
                  </span>
                  <span className="px-2 py-0.5 bg-white/10 border border-white/20 text-white text-[10px] font-mono tracking-wider rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#E01E37]" />
                    TERVERIFIKASI
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-[#A0A0A0] font-sans max-w-2xl line-clamp-2 leading-relaxed">
                  {profile?.bio ||
                    'Band rock alternatif independen dengan repertoar panggung dinamis dan soundcheck profesional.'}
                </p>

                <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-[#808080] pt-1">
                  <span className="flex items-center gap-1.5 text-[#D4D4D4]">
                    <MapPin className="w-3.5 h-3.5 text-[#E01E37]" />
                    {profile?.locationCity || 'Bandung'}
                    {profile?.locationRegion ? `, ${profile.locationRegion}` : ''}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1.5 text-[#D4D4D4]">
                    <Phone className="w-3.5 h-3.5 text-[#E01E37]" />
                    {profile?.phone || '0812-xxxx-xxxx'}
                  </span>
                </div>
              </div>

              {/* Right Side: Kanal Distribusi (4 official app icons) */}
              <div className="flex flex-col md:items-end gap-1.5 shrink-0">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373]">
                  Kanal Distribusi
                </span>
                <div className="flex items-center gap-2">
                  {/* 1. Spotify */}
                  {sanitizeExternalUrl(profile?.spotifyUrl) ? (
                    <a
                      href={sanitizeExternalUrl(profile?.spotifyUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#E01E37] flex items-center justify-center text-white hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title="Spotify Artist Resmi"
                      aria-label="Spotify Artist Resmi"
                    >
                      <SpotifyIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="w-10 h-10 rounded-full bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] hover:border-[#E01E37] flex items-center justify-center text-[#606060] hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] cursor-pointer"
                      title="Atur tautan Spotify di Tab 04 // Tarif & Kanal"
                      aria-label="Atur tautan Spotify"
                    >
                      <SpotifyIcon className="w-4 h-4" />
                    </button>
                  )}

                  {/* 2. Instagram */}
                  {sanitizeExternalUrl(profile?.instagramHandle, 'https://instagram.com/') ? (
                    <a
                      href={sanitizeExternalUrl(profile?.instagramHandle, 'https://instagram.com/')!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#E01E37] flex items-center justify-center text-white hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title={`Instagram @${(profile?.instagramHandle || '').replace(/^@/, '')}`}
                      aria-label="Instagram Resmi"
                    >
                      <InstagramIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="w-10 h-10 rounded-full bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] hover:border-[#E01E37] flex items-center justify-center text-[#606060] hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] cursor-pointer"
                      title="Atur akun Instagram di Tab 04 // Tarif & Kanal"
                      aria-label="Atur akun Instagram"
                    >
                      <InstagramIcon className="w-4 h-4" />
                    </button>
                  )}

                  {/* 3. YouTube */}
                  {sanitizeExternalUrl(profile?.youtubeUrl) ? (
                    <a
                      href={sanitizeExternalUrl(profile?.youtubeUrl)!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#E01E37] flex items-center justify-center text-white hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title="Kanal YouTube Resmi"
                      aria-label="Kanal YouTube Resmi"
                    >
                      <YouTubeIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="w-10 h-10 rounded-full bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] hover:border-[#E01E37] flex items-center justify-center text-[#606060] hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] cursor-pointer"
                      title="Atur tautan YouTube di Tab 04 // Tarif & Kanal"
                      aria-label="Atur tautan YouTube"
                    >
                      <YouTubeIcon className="w-4 h-4" />
                    </button>
                  )}

                  {/* 4. TikTok */}
                  {sanitizeExternalUrl(profile?.tiktokUrl, 'https://tiktok.com/@') ? (
                    <a
                      href={sanitizeExternalUrl(profile?.tiktokUrl, 'https://tiktok.com/@')!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#E01E37] flex items-center justify-center text-white hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] shadow-sm"
                      title={`TikTok ${profile?.tiktokUrl || ''}`}
                      aria-label="Akun TikTok Resmi"
                    >
                      <TikTokIcon className="w-4 h-4" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('settings')}
                      className="w-10 h-10 rounded-full bg-[#141414] hover:bg-[#1E1E1E] border border-[#262626] hover:border-[#E01E37] flex items-center justify-center text-[#606060] hover:text-[#E01E37] transition-all min-h-[44px] min-w-[44px] cursor-pointer"
                      title="Atur akun TikTok di Tab 04 // Tarif & Kanal"
                      aria-label="Atur akun TikTok"
                    >
                      <TikTokIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Bar: 3 Metrics Columns & Pill Buttons */}
            <div className="border-t border-[#222222] mt-6 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              {/* Left: 3 Metrics separated by vertical line dividers */}
              <div className="flex items-center gap-5 sm:gap-8">
                {/* Metric 1: Rating */}
                <div>
                  <div className="flex items-center gap-1.5 text-white font-display text-xl sm:text-2xl tracking-wide">
                    <Star className="w-4 h-4 fill-[#E01E37] text-[#E01E37]" />
                    <span>4.9</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    rating panggung
                  </span>
                </div>

                <div className="w-px h-8 bg-[#2A2A2A]" />

                {/* Metric 2: Profil Views */}
                <div>
                  <div className="text-white font-display text-xl sm:text-2xl tracking-wide">
                    {stats?.totalViews?.toLocaleString('id-ID') || '1.344'}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    tayangan
                  </span>
                </div>

                <div className="w-px h-8 bg-[#2A2A2A]" />

                {/* Metric 3: Starting Rate */}
                <div>
                  <div className="text-white font-display text-xl sm:text-2xl tracking-wide">
                    {profile?.budgetMin ? formatRupiah(profile.budgetMin) : 'Rp 3.5jt'}
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    tarif mulai
                  </span>
                </div>
              </div>

              {/* Right: Rounded Pill CTA Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleOpenEditProfileModal}
                  className="px-5 py-2.5 rounded-full bg-[#1C1C1C] hover:bg-[#282828] text-white border border-[#333333] font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-[#A0A0A0]" />
                  <span>Edit Profil</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenUploadModal(true)}
                  className="px-6 py-2.5 rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.35)] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Unggah Karya</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Navigation Tabs (Natural width wrap without text truncation or horizontal scrollbar) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[#262626] mb-8 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            className={`px-3.5 sm:px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'feed'
                ? 'border-[#E01E37] text-white bg-[#141414]'
                : 'border-transparent text-[#808080] hover:text-white hover:bg-[#111111]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-[#E01E37] shrink-0" />
            <span>01 // Galeri Karya</span>
            <span className="px-1.5 py-0.2 bg-[#222222] text-[#A0A0A0] text-[10px] shrink-0">
              {posts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rider')}
            className={`px-3.5 sm:px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'rider'
                ? 'border-[#E01E37] text-white bg-[#141414]'
                : 'border-transparent text-[#808080] hover:text-white hover:bg-[#111111]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-white shrink-0" />
            <span>02 // Technical Rider</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 sm:px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'analytics'
                ? 'border-[#E01E37] text-white bg-[#141414]'
                : 'border-transparent text-[#808080] hover:text-white hover:bg-[#111111]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-[#E01E37] shrink-0" />
            <span>03 // Inquiry EO</span>
            <span className="px-1.5 py-0.2 bg-[#222222] text-[#A0A0A0] text-[10px] shrink-0">
              {connections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 sm:px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'settings'
                ? 'border-[#E01E37] text-white bg-[#141414]'
                : 'border-transparent text-[#808080] hover:text-white hover:bg-[#111111]'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5 text-white shrink-0" />
            <span>04 // Tarif & Kanal</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('broadcasts')}
            className={`px-3.5 sm:px-4 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-2 border-b-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'broadcasts'
                ? 'border-[#E01E37] text-white bg-[#141414]'
                : 'border-transparent text-[#808080] hover:text-white hover:bg-[#111111]'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5 text-[#E01E37] shrink-0" />
            <span>05 // Job Broadcast</span>
            <span
              className={`px-1.5 py-0.2 text-[10px] shrink-0 font-bold ${
                jobBroadcasts.length > 0
                  ? 'bg-[#E01E37] text-white'
                  : 'bg-[#222222] text-[#A0A0A0]'
              }`}
            >
              {jobBroadcasts.length}
            </span>
          </button>
        </div>

        {/* Tab 1: Galeri Karya */}
        {activeTab === 'feed' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-display text-2xl tracking-wider text-white">
                  ETALASE KARYA MUSIK & DOKUMENTASI
                </h2>
                <p className="text-xs text-[#808080] font-sans">
                  Foto soundcheck, cuplikan konser live, dan sampel audio yang dilihat penyelenggara acara.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleOpenUploadModal(true)}
                className="px-4 py-2 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider min-h-[44px] flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(224,30,55,0.25)]"
              >
                <Plus className="w-4 h-4" />
                <span>Unggah Materi</span>
              </button>
            </div>

            {posts.length === 0 ? (
              <div className="p-12 text-center bg-[#111111] border border-dashed border-[#2E2E2E]">
                <Music className="w-12 h-12 text-[#606060] mx-auto mb-3" />
                <h3 className="font-display text-xl text-white mb-2">BELUM ADA MATERI TERUNGGAH</h3>
                <p className="text-xs text-[#808080] font-sans max-w-md mx-auto mb-6">
                  Tampilkan aksi panggung terbaik Anda agar kurator festival dan penyelenggara gigs tertarik mengajukan jadwal.
                </p>
                <button
                  type="button"
                  onClick={() => handleOpenUploadModal(true)}
                  className="px-5 py-2.5 bg-[#E01E37] text-white font-mono text-xs uppercase tracking-wider font-bold min-h-[44px]"
                >
                  + Unggah Karya Sekarang
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {posts.map((post) => {
                  const postSlides = parsePostSlides(post)
                  const slideCount = postSlides.length
                  const hasMixed =
                    postSlides.some((s) => s.type === 'photo') && postSlides.some((s) => s.type === 'video')
                  const isVideo = post.mediaType === 'video'
                  const mediaUrl =
                    (slideCount > 0 && postSlides[0]?.url) ||
                    post.mediaUrl ||
                    post.thumbnailUrl ||
                    ''

                  return (
                    <div
                      key={post.id}
                      className="bg-[#121212] border border-[#242424] hover:border-[#E01E37] transition-all flex flex-col group overflow-hidden"
                    >
                      {/* Media Image / Video Box */}
                      <div
                        className="h-52 w-full relative bg-[#181818] cursor-pointer overflow-hidden"
                        onClick={() => {
                          setSelectedPostDetail(post)
                          setDetailSlideIndex(0)
                        }}
                      >
                        <img
                          src={mediaUrl}
                          alt={post.caption || 'Karya Musik'}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />

                        {/* Format Badges */}
                        <div className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-black/80 backdrop-blur-md text-[10px] font-mono uppercase tracking-wider text-white border border-white/10 flex items-center gap-1">
                          {hasMixed ? (
                            <span className="text-[#E01E37] font-bold">CAMPURAN</span>
                          ) : isVideo ? (
                            <span className="text-white font-bold">VIDEO LIVE</span>
                          ) : (
                            <span>FOTO PANGGUNG</span>
                          )}
                        </div>

                        {slideCount > 1 && (
                          <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-black/85 backdrop-blur-md text-[10px] font-mono text-white border border-white/20 flex items-center gap-1 font-bold">
                            <Layers className="w-3 h-3 text-[#E01E37]" />
                            <span>{slideCount} SLIDE</span>
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 text-white font-mono text-xs">
                          <span className="flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-white" />
                            {post.viewsCount || 0}
                          </span>
                          <span className="flex items-center gap-1 text-[#E01E37]">
                            <MessageCircle className="w-3.5 h-3.5" />
                            {post.waClicksCount || 0}
                          </span>
                        </div>
                      </div>

                      {/* Content Box */}
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-xs text-[#C0C0C0] font-sans line-clamp-2 leading-relaxed mb-3">
                            {post.caption || 'Dokumentasi penampilan panggung Reffband.'}
                          </p>
                        </div>

                        {/* Footer Card Telemetry */}
                        <div className="pt-3 border-t border-[#222222] flex items-center justify-between text-[11px] font-mono text-[#808080]">
                          <div className="flex items-center gap-3">
                            <span className="text-white flex items-center gap-1" title="Total Tayangan">
                              <Eye className="w-3.5 h-3.5 text-[#808080]" />
                              {post.viewsCount || 0}
                            </span>
                            <span className="text-[#E01E37] flex items-center gap-1" title="Klik Inquiry WhatsApp">
                              <MessageCircle className="w-3.5 h-3.5" />
                              {post.waClicksCount || 0}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeletePost(post.id)}
                            className="text-[#E01E37] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 cursor-pointer transition-colors"
                            title="Hapus Karya"
                            aria-label="Hapus karya"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Technical Rider */}
        {activeTab === 'rider' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-2xl tracking-wider text-white">
                  TECHNICAL RIDER & SPESIFIKASI PANGGUNG
                </h2>
                <p className="text-xs text-[#808080] font-sans">
                  Spesifikasi resmi kebutuhan sound system, patch list channel, dan instrumen panggung band Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenRiderModal}
                className="px-5 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase tracking-wider font-bold min-h-[44px] flex items-center gap-2 cursor-pointer self-start transition-colors shadow-lg shadow-[#E01E37]/20"
              >
                <Sliders className="w-4 h-4" />
                <span>Atur Technical Rider</span>
              </button>
            </div>

            {/* Dynamic Grid of Customizable Rider Items */}
            {displayRiderItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayRiderItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-5 bg-[#121212] border border-[#242424] hover:border-[#383838] transition-colors flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-mono text-xs text-[#E01E37] uppercase tracking-wider mb-2 font-bold">
                        <Sliders className="w-4 h-4 text-[#E01E37] shrink-0" />
                        <span>{String(idx + 1).padStart(2, '0')} // {item.title || 'Kebutuhan Panggung'}</span>
                      </div>
                      <p className="text-xs text-[#C0C0C0] font-sans leading-relaxed whitespace-pre-wrap">
                        {item.description || 'Belum ada rincian spesifikasi teknis.'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-[#111111] border border-[#242424] space-y-4">
                <Sliders className="w-10 h-10 text-[#606060] mx-auto" />
                <div>
                  <h3 className="font-display text-lg text-white mb-1">Rider Teknis Belum Diatur</h3>
                  <p className="text-xs font-mono text-[#808080] max-w-md mx-auto">
                    Kustomisasi kebutuhan panggung, instrumen, dan tata suara band Anda agar penyelenggara acara memahami spesifikasi dengan jelas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenRiderModal}
                  className="px-5 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold min-h-[44px] inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-[#E01E37]/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Atur Technical Rider</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Analytics & Inquiry History */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl tracking-wider text-white">
                RIWAYAT INQUIRY & ANALITIK KONTAK
              </h2>
              <p className="text-xs text-[#808080] font-sans">
                Penyelenggara acara dan EO yang telah menghubungi WhatsApp resmi band Anda.
              </p>
            </div>

            {/* Performance Telemetry Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#121212] border border-[#242424]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mb-1">
                  TOTAL TAYANGAN
                </span>
                <span className="font-display text-2xl text-white">
                  {stats?.totalViews?.toLocaleString('id-ID') || '0'}
                </span>
              </div>
              <div className="p-4 bg-[#121212] border border-[#242424]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mb-1">
                  LEAD WHATSAPP MASUK
                </span>
                <span className="font-display text-2xl text-[#E01E37]">
                  {stats?.totalWaClicks?.toLocaleString('id-ID') || '0'}
                </span>
              </div>
              <div className="p-4 bg-[#121212] border border-[#242424]">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mb-1">
                  RASIO KONVERSI INQUIRY
                </span>
                <span className="font-display text-2xl text-white">
                  {conversionRate}%
                </span>
              </div>
            </div>

            {connections.length === 0 ? (
              <div className="p-10 text-center bg-[#111111] border border-[#242424]">
                <MessageCircle className="w-10 h-10 text-[#606060] mx-auto mb-2" />
                <p className="text-xs font-mono text-[#808080]">
                  Belum ada log kontak dari penyelenggara baru. Bagikan tautan profil band Anda ke EO untuk meningkatkan inquiry!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#242424] bg-[#111111]">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-[#181818] text-[#808080] font-mono uppercase text-[10px] tracking-wider border-b border-[#242424]">
                    <tr>
                      <th className="py-3.5 px-4">PENYELENGGARA / EO</th>
                      <th className="py-3.5 px-4">JENIS EVENT</th>
                      <th className="py-3.5 px-4">RENCANA TANGGAL</th>
                      <th className="py-3.5 px-4">WAKTU INQUIRY</th>
                      <th className="py-3.5 px-4">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#202020] text-[#D0D0D0]">
                    {connections.map((c, idx) => (
                      <tr key={idx} className="hover:bg-[#161616] transition-colors">
                        <td className="py-3.5 px-4 font-mono text-white font-bold">
                          {c.organizer_email || 'Penyelenggara Terverifikasi'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-[#1F1F1F] border border-[#2F2F2F] text-[11px] font-mono text-white">
                            {c.event_type || 'Live Music / Gig'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#A0A0A0]">
                          {c.event_date || 'TBD'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#808080]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString('id-ID') : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-[#E01E37]/15 border border-[#E01E37]/40 text-[#E01E37] text-[10px] font-mono uppercase font-bold">
                            {c.status || 'TERHUBUNG'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Settings & Socials (Direct In-Place Editor) */}
        {activeTab === 'settings' && (
          <div className="max-w-3xl space-y-6">
            <div>
              <h2 className="font-display text-2xl tracking-wider text-white">
                PENGATURAN TARIF & KANAL RESMI
              </h2>
              <p className="text-xs text-[#808080] font-sans">
                Atur estimasi tarif manggung dan hubungkan tautan musik digital band Anda secara langsung di sini.
              </p>
            </div>

            <form onSubmit={handleSettingsSubmit} className="p-6 sm:p-8 bg-[#121212] border border-[#242424] space-y-6">
              {/* Tariffs Section */}
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider text-[#E01E37] mb-3 font-bold flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#E01E37]" />
                  <span>RENTANG TARIF MANGGUNG (ESTIMASI RATE)</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#181818] border border-[#2A2A2A] focus-within:border-[#E01E37] transition-colors">
                    <label htmlFor="setting-budget-min" className="text-[10px] font-mono text-[#808080] uppercase block mb-1">
                      Tarif Minimum (Indoor / Cafe)
                    </label>
                    <input
                      id="setting-budget-min"
                      type="number"
                      step="500000"
                      min="0"
                      value={settingsForm.budgetMin || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          budgetMin: e.target.value ? parseInt(e.target.value, 10) : 0,
                        })
                      }
                      placeholder="Contoh: 3500000"
                      className="w-full bg-transparent text-white font-mono text-base font-bold outline-none"
                    />
                    <span className="text-[11px] font-mono text-[#A0A0A0] block mt-1.5 pt-1 border-t border-[#262626]">
                      {settingsForm.budgetMin ? formatRupiah(settingsForm.budgetMin) : 'Rp 0'}
                    </span>
                  </div>

                  <div className="p-4 bg-[#181818] border border-[#2A2A2A] focus-within:border-[#E01E37] transition-colors">
                    <label htmlFor="setting-budget-max" className="text-[10px] font-mono text-[#808080] uppercase block mb-1">
                      Tarif Maksimum (Festival / Outdoor)
                    </label>
                    <input
                      id="setting-budget-max"
                      type="number"
                      step="500000"
                      min="0"
                      value={settingsForm.budgetMax || ''}
                      onChange={(e) =>
                        setSettingsForm({
                          ...settingsForm,
                          budgetMax: e.target.value ? parseInt(e.target.value, 10) : 0,
                        })
                      }
                      placeholder="Contoh: 7000000"
                      className="w-full bg-transparent text-white font-mono text-base font-bold outline-none"
                    />
                    <span className="text-[11px] font-mono text-[#A0A0A0] block mt-1.5 pt-1 border-t border-[#262626]">
                      {settingsForm.budgetMax ? formatRupiah(settingsForm.budgetMax) : 'Rp 0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Social Channels Section */}
              <div className="pt-4 border-t border-[#222222]">
                <h3 className="font-mono text-xs uppercase tracking-wider text-white mb-3 font-bold flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-[#E01E37]" />
                  <span>TAUTAN DISTRIBUSI DIGITAL & MEDIA SOSIAL</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                  <div>
                    <label htmlFor="setting-spotify" className="block text-[11px] text-[#A0A0A0] mb-1.5 flex items-center gap-1.5 font-bold">
                      <SpotifyIcon className="w-4 h-4 text-[#E01E37]" />
                      <span>Spotify Artist URL</span>
                    </label>
                    <input
                      id="setting-spotify"
                      type="url"
                      value={settingsForm.spotifyUrl || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, spotifyUrl: e.target.value })}
                      placeholder="https://open.spotify.com/artist/..."
                      className="w-full bg-[#181818] border border-[#2A2A2A] focus:border-[#E01E37] text-white p-3 min-h-[44px] outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="setting-instagram" className="block text-[11px] text-[#A0A0A0] mb-1.5 flex items-center gap-1.5 font-bold">
                      <InstagramIcon className="w-4 h-4 text-white" />
                      <span>Instagram Handle</span>
                    </label>
                    <input
                      id="setting-instagram"
                      type="text"
                      value={settingsForm.instagramHandle || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, instagramHandle: e.target.value })}
                      placeholder="@namaband"
                      className="w-full bg-[#181818] border border-[#2A2A2A] focus:border-[#E01E37] text-white p-3 min-h-[44px] outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="setting-youtube" className="block text-[11px] text-[#A0A0A0] mb-1.5 flex items-center gap-1.5 font-bold">
                      <YouTubeIcon className="w-4 h-4 text-[#E01E37]" />
                      <span>YouTube Channel / Video</span>
                    </label>
                    <input
                      id="setting-youtube"
                      type="url"
                      value={settingsForm.youtubeUrl || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, youtubeUrl: e.target.value })}
                      placeholder="https://youtube.com/@namaband"
                      className="w-full bg-[#181818] border border-[#2A2A2A] focus:border-[#E01E37] text-white p-3 min-h-[44px] outline-none font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label htmlFor="setting-tiktok" className="block text-[11px] text-[#A0A0A0] mb-1.5 flex items-center gap-1.5 font-bold">
                      <TikTokIcon className="w-4 h-4 text-white" />
                      <span>TikTok URL / Akun</span>
                    </label>
                    <input
                      id="setting-tiktok"
                      type="text"
                      value={settingsForm.tiktokUrl || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, tiktokUrl: e.target.value })}
                      placeholder="https://tiktok.com/@namaband"
                      className="w-full bg-[#181818] border border-[#2A2A2A] focus:border-[#E01E37] text-white p-3 min-h-[44px] outline-none font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex items-center justify-end">
                <button
                  type="submit"
                  disabled={settingsSubmitting}
                  className="px-6 py-3 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(224,30,55,0.3)] disabled:opacity-50 transition-all"
                >
                  {settingsSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4" />
                      <span>Simpan Tarif & Kanal Resmi</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'broadcasts' && (
          <JobBroadcastsTab jobBroadcasts={jobBroadcasts} bandName={profile?.bandName} />
        )}
      </div>

      <UploadMediaModal
        isOpen={isUploadModalOpen}
        fileInputRef={fileInputRef}
        uploadedItems={uploadedItems}
        uploadCaption={uploadCaption}
        uploadSubmitting={uploadSubmitting}
        onClose={() => {
          setIsUploadModalOpen(false)
          clearUploadedItems()
        }}
        onFilesSelected={handleFilesSelected}
        onRemoveItem={handleRemoveUploadedItem}
        onCaptionChange={setUploadCaption}
        onSubmit={handleUploadSubmit}
      />

      <PostDetailModal
        post={selectedPostDetail}
        slides={detailSlides}
        slideIndex={detailSlideIndex}
        onSlideIndexChange={setDetailSlideIndex}
        onClose={() => setSelectedPostDetail(null)}
        onDeletePost={handleDeletePost}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        editForm={editForm}
        submitting={editSubmitting}
        onChange={setEditForm}
        onClose={() => setIsEditProfileModalOpen(false)}
        onSubmit={handleEditProfileSubmit}
      />

      <EditRiderModal
        isOpen={isEditRiderModalOpen}
        items={editRiderItems}
        submitting={riderSubmitting}
        onItemChange={handleRiderItemChange}
        onAddItem={handleAddRiderItem}
        onRemoveItem={handleRemoveRiderItem}
        onClose={() => setIsEditRiderModalOpen(false)}
        onSubmit={handleRiderSubmit}
      />
    </div>
  )
}
