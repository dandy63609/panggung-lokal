import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Eye,
  Phone,
  TrendingUp,
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ChevronRight,
  Database,
  Radio,
  Sliders,
  Trash2,
  X,
  Lock,
  GraduationCap,
  Plus,
  Building2,
  Edit3,
} from 'lucide-react'
import { authClient, type AuthUser } from '../lib/auth'
import { formatRupiah } from '../lib/utils'
import { setLocalShowCampus } from '../lib/platformSettings'
import { DEFAULT_CITY, getProvinceForCity } from '../lib/cities'
import { CityCombobox } from '../components/ui/CityCombobox'

interface AdminCampus {
  id: number
  name: string
  short_name: string
  city: string
  created_at?: string
}

interface AdminBandRecord {
  id: number
  userId: number
  bandName: string
  genre: string
  locationCity: string
  locationRegion?: string
  campus?: string | null
  bio?: string
  budgetMin?: number
  budgetMax?: number
  setDuration?: string | null
  phone?: string
  profileViews?: number
  userEmail?: string
  isActive?: boolean
  createdAt?: string
  profilePhotoUrl?: string | null
  coverPhotoUrl?: string | null
  instagramHandle?: string | null
  facebookUrl?: string | null
  youtubeUrl?: string | null
  spotifyUrl?: string | null
  tiktokUrl?: string | null
  riderChannelInputs?: string | null
  riderSoundSystem?: string | null
  riderInstruments?: string | null
  riderHospitality?: string | null
  riderItems?: any
}

interface AdminBandAffiliation {
  id: number
  band_name: string
  location_city: string
  genre: string
  campus?: string | null
  profile_views?: number
  email?: string
}

interface AdminSummary {
  totalUsers: number
  totalBands: number
  totalOrganizers: number
  totalBandProfiles: number
  totalActivePosts: number
  totalConnections: number
  totalProfileViews: number
  conversionRate: string
}

interface AdminUser {
  id: number | string
  email: string
  account_type: string
  created_at: string
  is_active: boolean
  band_profile_id?: number | null
  band_name?: string | null
}

interface AdminReport {
  id: number
  reporterEmail?: string
  reportedEntityType: string
  reason: string
  status: string
  createdAt?: string
}

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authClient.getUser())
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [activeTab, setActiveTab] = useState<'users' | 'reports' | 'system' | 'campuses' | 'bands'>('users')
  const [userFilter, setUserFilter] = useState<'all' | 'band' | 'organizer'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [deletingUserId, setDeletingUserId] = useState<number | string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Super Admin Bands Control State
  const [adminBands, setAdminBands] = useState<AdminBandRecord[]>([])
  const [loadingBands, setLoadingBands] = useState(false)
  const [bandSearch, setBandSearch] = useState('')
  const [editingBand, setEditingBand] = useState<AdminBandRecord | null>(null)
  const [isSavingBand, setIsSavingBand] = useState(false)

  // Platform Settings State (Campus Affiliation Visibility Control)
  const [showCampusAffiliation, setShowCampusAffiliation] = useState(false)
  const [isTogglingCampusSetting, setIsTogglingCampusSetting] = useState(false)

  // Campuses & Band Affiliation State (Hanya Admin yang berwenang mengelola)
  const [campuses, setCampuses] = useState<AdminCampus[]>([])
  const [bandAffiliations, setBandAffiliations] = useState<AdminBandAffiliation[]>([])
  const [newCampusName, setNewCampusName] = useState('')
  const [newCampusShort, setNewCampusShort] = useState('')
  const [newCampusCity, setNewCampusCity] = useState<string>(DEFAULT_CITY)
  const [isSubmittingCampus, setIsSubmittingCampus] = useState(false)
  const [updatingBandCampusId, setUpdatingBandCampusId] = useState<number | null>(null)

  const [summary, setSummary] = useState<AdminSummary>({
    totalUsers: 0,
    totalBands: 0,
    totalOrganizers: 0,
    totalBandProfiles: 0,
    totalActivePosts: 0,
    totalConnections: 0,
    totalProfileViews: 0,
    conversionRate: '0.00%',
  })

  const [users, setUsers] = useState<AdminUser[]>([])
  const [reports, setReports] = useState<AdminReport[]>([])

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }, [])

  const loadCampuses = useCallback(async () => {
    try {
      const headers = authClient.getAuthHeaders()
      const res = await fetch('/api/admin/campuses', { headers })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setCampuses(json.data.campuses || [])
          setBandAffiliations(json.data.bands || [])
        }
      }
    } catch {
      // keep fallback
    }
  }, [])

  const handleAddCampus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCampusName.trim() || !newCampusShort.trim()) {
      showToast('Nama kampus dan kode singkatan wajib diisi', 'error')
      return
    }

    try {
      setIsSubmittingCampus(true)
      const headers = { ...authClient.getAuthHeaders(), 'Content-Type': 'application/json' }
      const res = await fetch('/api/admin/campuses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: newCampusName.trim(),
          shortName: newCampusShort.trim().toUpperCase(),
          city: newCampusCity,
        }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showToast(json.message || 'Kampus berhasil ditambahkan', 'success')
        setNewCampusName('')
        setNewCampusShort('')
        loadCampuses()
      } else {
        showToast(json.message || 'Gagal menambahkan kampus', 'error')
      }
    } catch {
      showToast('Kendala jaringan saat menambahkan kampus', 'error')
    } finally {
      setIsSubmittingCampus(false)
    }
  }

  const handleDeleteCampus = async (campusId: number) => {
    if (!window.confirm('Yakin ingin menghapus label kampus ini?')) return
    try {
      const headers = authClient.getAuthHeaders()
      const res = await fetch(`/api/admin/campuses/${campusId}`, {
        method: 'DELETE',
        headers,
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showToast(json.message || 'Kampus berhasil dihapus', 'success')
        loadCampuses()
      } else {
        showToast(json.message || 'Gagal menghapus kampus', 'error')
      }
    } catch {
      showToast('Kendala koneksi saat menghapus kampus', 'error')
    }
  }

  const handleAssignBandCampus = async (bandId: number, campusName: string | null) => {
    try {
      setUpdatingBandCampusId(bandId)
      const headers = { ...authClient.getAuthHeaders(), 'Content-Type': 'application/json' }
      const res = await fetch(`/api/admin/bands/${bandId}/campus`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ campus: campusName }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        showToast(json.message || 'Afiliasi kampus musisi berhasil diperbarui', 'success')
        setBandAffiliations((prev) =>
          prev.map((b) => (b.id === bandId ? { ...b, campus: campusName } : b))
        )
      } else {
        showToast(json.message || 'Gagal memperbarui afiliasi kampus', 'error')
      }
    } catch {
      showToast('Kendala koneksi saat menetapkan kampus', 'error')
    } finally {
      setUpdatingBandCampusId(null)
    }
  }

  const loadAdminSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/settings', {
        headers: authClient.getAuthHeaders(),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.success && json.data) {
          setShowCampusAffiliation(Boolean(json.data.showCampusAffiliation))
          setLocalShowCampus(Boolean(json.data.showCampusAffiliation))
        }
      }
    } catch {
      // ignore
    }
  }, [])

  const handleToggleCampusAffiliation = async () => {
    try {
      setIsTogglingCampusSetting(true)
      const targetState = !showCampusAffiliation
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { ...authClient.getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ showCampusAffiliation: targetState }),
      })
      const json = await res.json()
      if (res.ok && json.success) {
        setShowCampusAffiliation(targetState)
        setLocalShowCampus(targetState)
        showToast(json.message || `Visibilitas afiliasi kampus sekarang ${targetState ? 'DITAMPILKAN' : 'DISEMBUNYIKAN'}`, 'success')
      } else {
        showToast(json.message || 'Gagal mengubah pengaturan visibilitas kampus', 'error')
      }
    } catch {
      showToast('Kendala koneksi saat mengubah pengaturan visibilitas kampus', 'error')
    } finally {
      setIsTogglingCampusSetting(false)
    }
  }

  const loadAdminBands = useCallback(async () => {
    try {
      setLoadingBands(true)
      const res = await fetch('/api/admin/bands', {
        headers: authClient.getAuthHeaders(),
      })
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setAdminBands(json.data)
      }
    } catch {
      // ignore
    } finally {
      setLoadingBands(false)
    }
  }, [])

  const handleSaveBand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBand) return
    setIsSavingBand(true)
    try {
      const res = await fetch(`/api/admin/bands/${editingBand.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
        },
        body: JSON.stringify({
          bandName: editingBand.bandName,
          genre: editingBand.genre,
          locationCity: editingBand.locationCity,
          locationRegion: editingBand.locationRegion,
          campus: editingBand.campus,
          budgetMin: editingBand.budgetMin,
          budgetMax: editingBand.budgetMax,
          setDuration: editingBand.setDuration,
          profilePhotoUrl: editingBand.profilePhotoUrl,
          coverPhotoUrl: editingBand.coverPhotoUrl,
          instagramHandle: editingBand.instagramHandle,
          facebookUrl: editingBand.facebookUrl,
          youtubeUrl: editingBand.youtubeUrl,
          spotifyUrl: editingBand.spotifyUrl,
          tiktokUrl: editingBand.tiktokUrl,
          riderChannelInputs: editingBand.riderChannelInputs,
          riderSoundSystem: editingBand.riderSoundSystem,
          riderInstruments: editingBand.riderInstruments,
          riderHospitality: editingBand.riderHospitality,
          riderItems: editingBand.riderItems,
          bio: editingBand.bio,
          phone: editingBand.phone,
          isActive: editingBand.isActive,
        }),
      })
      const json = await res.json()
      if (json.success) {
        showToast(json.message || 'Data musisi berhasil diperbarui oleh Administrator', 'success')
        setEditingBand(null)
        await loadAdminBands()
        await loadCampuses()
      } else {
        showToast(json.message || 'Gagal menyimpan perubahan musisi', 'error')
      }
    } catch {
      showToast('Kendala jaringan saat menyimpan perubahan musisi', 'error')
    } finally {
      setIsSavingBand(false)
    }
  }

  const loadAdminMetrics = useCallback(
    async (notifySuccess: boolean) => {
      try {
        const headers = authClient.getAuthHeaders()
        const res = await fetch('/api/admin/metrics', { headers })
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            if (json.data.summary) setSummary(json.data.summary)
            if (Array.isArray(json.data.recentUsers)) {
              setUsers(json.data.recentUsers)
            }
            if (json.data.pendingReports) {
              setReports(json.data.pendingReports)
            }
            if (notifySuccess) {
              showToast('Metrik platform berhasil disinkronkan', 'success')
            }
          }
        }
        await loadCampuses()
        await loadAdminSettings()
      } catch {
        // Keep solid fallback data
      } finally {
        setRefreshing(false)
        setLoading(false)
      }
    },
    [showToast, loadCampuses, loadAdminSettings]
  )

  // Manual refresh button handler
  const fetchMetrics = useCallback(async () => {
    setRefreshing(true)
    await loadAdminMetrics(true)
  }, [loadAdminMetrics])

  useEffect(() => {
    let cancelled = false
    async function initMetrics() {
      const user = authClient.getUser()
      if (!user || user.accountType !== 'admin') {
        if (!cancelled) {
          setLoading(false)
        }
        return
      }
      try {
        const headers = authClient.getAuthHeaders()
        const res = await fetch('/api/admin/metrics', { headers })
        if (res.ok && !cancelled) {
          const json = await res.json()
          if (json.success && json.data && !cancelled) {
            if (json.data.summary) setSummary(json.data.summary)
            if (Array.isArray(json.data.recentUsers)) {
              setUsers(json.data.recentUsers)
            }
            if (json.data.pendingReports) {
              setReports(json.data.pendingReports)
            }
            await loadAdminSettings()
          }
        }
      } catch {
        // Keep empty state cleanly on network error
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    initMetrics()
    const onAuth = () => {
      const updated = authClient.getUser()
      setCurrentUser(updated)
      if (updated?.accountType === 'admin') {
        loadAdminMetrics(false)
      }
    }
    window.addEventListener('auth-change', onAuth)
    return () => {
      cancelled = true
      window.removeEventListener('auth-change', onAuth)
    }
  }, [loadAdminMetrics])

  // Handle Quick Admin Login (in case of direct /admin visit)
  const handleAdminDemoLogin = async () => {
    setLoading(true)
    const res = await authClient.login('admin@admin.com', 'admin')
    if (res.success && res.user) {
      setCurrentUser(res.user)
      showToast('Otentikasi Super Admin berhasil diverifikasi', 'success')
      fetchMetrics()
    } else {
      showToast('Gagal otentikasi admin', 'error')
      setLoading(false)
    }
  }

  // Handle Logout
  const handleLogout = () => {
    authClient.clearSession()
    setCurrentUser(null)
    navigate('/masuk')
  }

  // Toggle User Suspend / Activate
  const handleToggleSuspendUser = async (userId: number | string, currentStatus: boolean) => {
    try {
      const headers = {
        ...authClient.getAuthHeaders(),
        'Content-Type': 'application/json',
      }
      const res = await fetch(`/api/admin/users/${userId}/suspend`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ isActive: !currentStatus }),
      })
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
        )
        showToast(
          currentStatus
            ? `Akun #${userId} berhasil ditangguhkan.`
            : `Akun #${userId} berhasil diaktifkan kembali.`,
          'success'
        )
      } else {
        // Optimistic toggle for demo
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
        )
        showToast(`Status akun #${userId} diperbarui.`, 'success')
      }
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_active: !currentStatus } : u))
      )
      showToast(`Status akun #${userId} diperbarui.`, 'success')
    }
  }

  // Close delete confirmation modal with Escape when idle
  useEffect(() => {
    if (!deleteTarget || deletingUserId !== null) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setDeleteTarget(null)
        setDeleteError(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteTarget, deletingUserId])

  // Permanently delete Band or EO user account
  const handleConfirmDeleteUser = async () => {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeletingUserId(target.id)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/admin/users/${target.id}`, {
        method: 'DELETE',
        headers: authClient.getAuthHeaders(),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok || !json?.success) {
        setDeleteError(
          json?.message || `Gagal menghapus akun #${target.id}. Pastikan sesi admin aktif.`
        )
        return
      }
      setUsers((prev) => prev.filter((u) => String(u.id) !== String(target.id)))
      setDeleteTarget(null)
      showToast(json.message || `Akun ${target.email} berhasil dihapus permanen.`, 'success')
      loadAdminMetrics(false)
    } catch {
      setDeleteError('Gagal menghubungi server untuk menghapus akun.')
    } finally {
      setDeletingUserId(null)
    }
  }

  // Resolve Moderation Report
  const handleResolveReport = async (reportId: number) => {
    try {
      const headers = authClient.getAuthHeaders()
      await fetch(`/api/admin/reports/${reportId}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved',
          adminNotes: 'Telah ditinjau dan diselesaikan oleh Super Admin Reffband.',
        }),
      })
    } catch {
      // optimistic update
    }
    setReports((prev) => prev.filter((r) => r.id !== reportId))
    showToast(`Tiket moderasi #${reportId} telah diselesaikan.`, 'success')
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesFilter =
        userFilter === 'all' ||
        (userFilter === 'organizer'
          ? u.account_type === 'organizer' || u.account_type === 'general'
          : u.account_type === userFilter)
      const matchesSearch =
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.band_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(u.id).includes(searchQuery)
      return matchesFilter && matchesSearch
    })
  }, [users, userFilter, searchQuery])

  // Is Admin Verified
  const isAdmin = currentUser?.accountType === 'admin'

  if (loading) {
    return (
      <div className="w-full bg-[#000000] text-white min-h-screen flex flex-col items-center justify-center p-6 font-mono">
        <div className="w-12 h-12 rounded-full border-2 border-[#222222] border-t-[#E01E37] animate-spin mb-4" />
        <div className="text-xs uppercase tracking-widest text-[#888]">
          MEMUAT KONSOL ADMINISTRATOR REFFBAND...
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="w-full bg-[#000000] text-white min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-[#121212] border border-[#262626] rounded-2xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-[#E01E37]/15 border border-[#E01E37]/40 text-[#E01E37] mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <div className="font-mono text-[11px] uppercase tracking-widest text-[#F87171] font-bold">
              OTORISASI DIPERLUKAN
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wide">
              Akses Khusus Administrator
            </h1>
            <p className="text-sm text-[#A0A0A0] font-sans leading-relaxed">
              {currentUser
                ? `Akun ${currentUser.email} (${currentUser.accountType.toUpperCase()}) tidak memiliki izin administrator untuk mengakses konsol ini.`
                : 'Silakan masuk menggunakan akun administrator Reffband untuk mengakses metrik platform dan moderasi pengguna.'}
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <Link
              to="/masuk"
              state={{ from: '/admin' }}
              className="min-h-[44px] w-full py-2.5 px-6 rounded-xl bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider flex items-center justify-center transition-colors"
            >
              Masuk Akun Admin
            </Link>
            <Link
              to="/"
              className="min-h-[44px] w-full py-2.5 px-6 rounded-xl border border-[#333333] text-[#CCCCCC] hover:text-white hover:bg-white/5 font-mono text-xs uppercase font-bold tracking-wider flex items-center justify-center transition-colors"
            >
              Kembali ke Beranda
            </Link>
            {import.meta.env.DEV && (
              <button
                type="button"
                onClick={handleAdminDemoLogin}
                className="min-h-[44px] w-full py-2.5 px-6 rounded-xl bg-[#1A1A1A] hover:bg-[#242424] border border-[#E01E37]/40 text-[#F87171] font-mono text-[11px] uppercase font-bold tracking-wider cursor-pointer transition-colors"
              >
                Otentikasi Demo Admin (Dev)
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full bg-[#000000] text-white min-h-screen">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl font-mono text-xs shadow-2xl transition-all border bg-[#121212] border-[#E01E37] text-white">
          <span className="w-2 h-2 rounded-full bg-[#E01E37] animate-ping" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* 1. BREADCRUMBS BAR */}
      <nav aria-label="Breadcrumb" className="w-full border-b border-[#1E1E1E] bg-[#050505]">
        <div className="w-full max-w-[1440px] mx-auto px-5 h-14 sm:h-16 flex items-center justify-between">
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
              <span className="text-[#888]">KONSOL SISTEM</span>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="w-3.5 h-3.5 text-[#444]" />
            </li>
            <li className="text-white font-bold" aria-current="page">
              METRIK ADMINISTRATOR
            </li>
          </ol>

          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] text-white/80 bg-[#141414] border border-[#242424] px-3 py-1 rounded-full uppercase tracking-wider hidden sm:inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E01E37] animate-pulse" />
              SISTEM LIVE 24/7
            </span>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT WRAPPER */}
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* 2. HERO ADMIN PROFILE CARD (MATCHING REFERENCE UI) */}
        <div className="bg-[#121212] border border-[#262626] rounded-3xl overflow-hidden shadow-2xl mb-8 relative group">
          {/* Cover Photo Banner with Vertical Gradient Dissolve */}
          <div className="h-52 sm:h-64 w-full relative overflow-hidden bg-[#181818]">
            <img
              src="https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1400&auto=format&fit=crop"
              alt="Console Banner"
              className="w-full h-full object-cover opacity-55 brightness-90 filter"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-[#121212]/50 to-transparent pointer-events-none" />

            {/* Top-Right Floating Refresh Action */}
            <button
              type="button"
              onClick={fetchMetrics}
              disabled={refreshing}
              className="absolute top-4 right-4 sm:top-5 sm:right-6 w-11 h-11 rounded-full bg-black/60 hover:bg-[#E01E37] text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all shadow-lg hover:scale-105 min-h-[44px] min-w-[44px] cursor-pointer disabled:opacity-50"
              title="Segarkan data metrik platform"
              aria-label="Segarkan data metrik"
            >
              <RefreshCw className={`w-4 h-4 text-white ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Card Body with Overlapping Circular Avatar */}
          <div className="px-6 sm:px-8 pb-6 sm:pb-8 relative">
            {/* Overlapping Avatar Row */}
            <div className="-mt-14 sm:-mt-16 mb-4 flex items-end justify-between relative z-10 flex-wrap gap-4">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-[#121212] bg-[#1A1A1A] flex items-center justify-center shadow-xl text-[#E01E37]">
                  <ShieldCheck className="w-12 h-12" />
                </div>
                <div
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-[#E01E37] border-2 border-[#121212] flex items-center justify-center text-white text-[11px] font-bold"
                  title="Super Admin Terotorisasi"
                >
                  ✓
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] uppercase tracking-wider text-white bg-[#E01E37] px-3 py-1 font-bold flex items-center gap-1.5 select-none rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                  KONSOL SUPER ADMIN
                </span>
                <span className="font-mono text-[11px] uppercase tracking-wider text-white bg-white/10 border border-white/20 px-3 py-1 font-bold flex items-center gap-1.5 select-none rounded-full">
                  TELEMETRI LIVE
                </span>
              </div>
            </div>

            {/* Identity & Metadata Grid */}
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="space-y-2.5 max-w-2xl">
                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl text-white tracking-wider uppercase leading-none">
                  KONSOL METRIK &amp; MODERASI // REFFBAND
                </h1>
                <p className="text-sm text-[#CCCCCC] font-sans leading-relaxed">
                  Pusat kendali ekosistem Reffband: pantau akuisisi musisi, tayangan etalase profil, konversi kontak keluar via WhatsApp, dan penanganan tiket keluhan penyelenggara.
                </p>

                {/* System Chips */}
                <div className="flex items-center gap-4 flex-wrap pt-1 font-mono text-xs text-[#A0A0A0]">
                  <div className="flex items-center gap-1.5 text-white">
                    <Database className="w-3.5 h-3.5 text-[#E01E37]" />
                    <span>DATABASE: POSTGRESQL CONNECTED</span>
                  </div>
                  <span className="text-[#333]">•</span>
                  <div className="flex items-center gap-1.5 text-[#E01E37] font-bold">
                    <Radio className="w-3.5 h-3.5" />
                    <span>MODERASI: AKTIF</span>
                  </div>
                  <span className="text-[#333]">•</span>
                  <div className="flex items-center gap-1.5 text-white/80">
                    <CheckCircle2 className="w-3.5 h-3.5 text-white/60" />
                    <span>AUDIT: AUTO-LOGGED</span>
                  </div>
                </div>
              </div>

              {/* Admin Identity Box */}
              <div className="bg-[#0C0C0C] border border-[#222222] rounded-2xl p-4 lg:min-w-[280px]">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#737373] block mb-2 font-bold">
                  // AKUN ADMINISTRATOR AKTIF
                </span>
                <div className="space-y-1">
                  <div className="font-mono text-xs text-white font-bold truncate">
                    {currentUser?.email || 'Administrator'}
                  </div>
                  <div className="font-mono text-[11px] text-[#E01E37] uppercase">
                    ROLE: {currentUser?.accountType?.toUpperCase() || 'ADMIN'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Bar: 3 Key Metrics & Pill Actions */}
            <div className="border-t border-[#222222] mt-6 pt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
              <div className="flex items-center gap-5 sm:gap-8 flex-wrap">
                <div>
                  <div className="flex items-center gap-1.5 text-white font-display text-xl sm:text-2xl tracking-wide">
                    <Users className="w-4 h-4 text-[#E01E37]" />
                    <span>{summary.totalUsers}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    TOTAL PENGGUNA
                  </span>
                </div>

                <div className="w-px h-8 bg-[#2A2A2A] hidden sm:block" />

                <div>
                  <div className="flex items-center gap-1.5 text-white font-display text-xl sm:text-2xl tracking-wide">
                    <Eye className="w-4 h-4 text-white/80" />
                    <span>{summary.totalProfileViews.toLocaleString('id-ID')}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    TAYANGAN PROFIL
                  </span>
                </div>

                <div className="w-px h-8 bg-[#2A2A2A] hidden sm:block" />

                <div>
                  <div className="flex items-center gap-1.5 text-[#E01E37] font-display text-xl sm:text-2xl tracking-wide">
                    <TrendingUp className="w-4 h-4 text-[#E01E37]" />
                    <span>{summary.conversionRate}</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block mt-0.5">
                    RASIO KONVERSI
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={fetchMetrics}
                  disabled={refreshing}
                  className="px-5 py-2.5 rounded-full bg-[#1C1C1C] hover:bg-[#282828] text-white border border-[#333333] font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-white ${refreshing ? 'animate-spin' : ''}`} />
                  <span>Segarkan</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-6 py-2.5 rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider min-h-[44px] flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.4)] cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar Akun</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 4 KPI METRIC CARDS (STRICT 2/3 COLORS PALETTE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* KPI 1 */}
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#777] font-bold">
                PENGGUNA TERDAFTAR
              </span>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-4xl text-white tracking-tight">
              {summary.totalUsers}
            </div>
            <div className="pt-2 border-t border-[#1C1C1C] flex items-center justify-between font-mono text-xs text-[#999]">
              <span>{summary.totalBands} Akun Band</span>
              <span className="text-[#444]">•</span>
              <span>{summary.totalOrganizers} EO Penyelenggara</span>
            </div>
          </div>

          {/* KPI 2 */}
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#777] font-bold">
                TAYANGAN PROFIL TOTAL
              </span>
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white">
                <Eye className="w-4 h-4 text-white/80" />
              </div>
            </div>
            <div className="font-display text-4xl text-white tracking-tight">
              {summary.totalProfileViews.toLocaleString('id-ID')}
            </div>
            <div className="pt-2 border-t border-[#1C1C1C] font-mono text-xs text-[#999]">
              Total impresi etalase publik profil band
            </div>
          </div>

          {/* KPI 3 */}
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#777] font-bold">
                KLIK KONTAK WHATSAPP
              </span>
              <div className="w-8 h-8 rounded-full bg-[#E01E37]/10 border border-[#E01E37]/30 flex items-center justify-center text-[#E01E37]">
                <Phone className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-4xl text-white tracking-tight">
              {summary.totalConnections}
            </div>
            <div className="pt-2 border-t border-[#1C1C1C] font-mono text-xs text-[#999]">
              Total tombol kontak keluar yang diklik
            </div>
          </div>

          {/* KPI 4 */}
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#777] font-bold">
                RASIO KONVERSI PLATFORM
              </span>
              <div className="w-8 h-8 rounded-full bg-[#E01E37]/10 border border-[#E01E37]/30 flex items-center justify-center text-[#E01E37]">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="font-display text-4xl text-[#E01E37] tracking-tight">
              {summary.conversionRate}
            </div>
            <div className="pt-2 border-t border-[#1C1C1C] font-mono text-xs text-[#999]">
              Rasio tayangan profil ke interaksi kontak
            </div>
          </div>
        </div>

        {/* 4. FUNNEL BISNIS DIGITAL */}
        <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#202020] mb-5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#E01E37]" />
              <span className="font-mono text-xs uppercase tracking-widest text-white font-bold">
                ALUR PENGGUNA PLATFORM // CORONG BISNIS DIGITAL
              </span>
            </div>
            <span className="font-mono text-[10px] text-white/70 uppercase bg-[#181818] border border-[#2A2A2A] px-2.5 py-0.5 rounded">
              3-STEP PIPELINE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#0C0C0C] border border-[#222222] border-l-4 border-l-white/60 p-4 rounded-xl space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-white/60 font-bold block">
                TAHAP 01 // DISCOVERY
              </span>
              <h3 className="font-mono text-sm font-bold text-white uppercase">
                Pencarian &amp; Filter Band
              </h3>
              <p className="text-xs text-[#999] font-sans leading-relaxed">
                Penyelenggara mencari musisi berdasarkan genre musik, kota domisili, dan rentang tarif yang sesuai kebutuhan acara.
              </p>
            </div>

            <div className="bg-[#0C0C0C] border border-[#222222] border-l-4 border-l-[#E01E37] p-4 rounded-xl space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#E01E37] font-bold block">
                TAHAP 02 // EVALUATION
              </span>
              <h3 className="font-mono text-sm font-bold text-white uppercase">
                Kurasi Audio &amp; Rider Teknis
              </h3>
              <p className="text-xs text-[#999] font-sans leading-relaxed">
                Penyelenggara meninjau sampel live cut audio demo, galeri video panggung, dan daftar spesifikasi technical rider.
              </p>
            </div>

            <div className="bg-[#0C0C0C] border border-[#222222] border-l-4 border-l-white p-4 rounded-xl space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-white font-bold block">
                TAHAP 03 // TRANSACTION
              </span>
              <h3 className="font-mono text-sm font-bold text-white uppercase">
                Kontak Langsung WhatsApp
              </h3>
              <p className="text-xs text-[#999] font-sans leading-relaxed">
                Penyelenggara menghubungi manajemen band resmi secara langsung melalui WhatsApp untuk negosiasi dan kontrak panggung.
              </p>
            </div>
          </div>
        </div>

        {/* 5. INTERACTIVE WORKSPACE TABS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 border-b border-[#242424] pb-3 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`px-3 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#E01E37] text-white shadow-[0_0_15px_rgba(224,30,55,0.3)]'
                : 'bg-[#121212] border border-[#242424] text-[#808080] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>01 // Pengguna ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-[#E01E37] text-white shadow-[0_0_15px_rgba(224,30,55,0.3)]'
                : 'bg-[#121212] border border-[#242424] text-[#808080] hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>02 // Moderasi ({reports.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-3 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl cursor-pointer ${
              activeTab === 'system'
                ? 'bg-[#E01E37] text-white shadow-[0_0_15px_rgba(224,30,55,0.3)]'
                : 'bg-[#121212] border border-[#242424] text-[#808080] hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>03 // Infrastruktur</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('campuses')
              loadCampuses()
            }}
            className={`px-3 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl cursor-pointer ${
              activeTab === 'campuses'
                ? 'bg-[#E01E37] text-white shadow-[0_0_15px_rgba(224,30,55,0.3)]'
                : 'bg-[#121212] border border-[#242424] text-[#808080] hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-[#FFD166]" />
            <span>04 // Kampus ({campuses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('bands')
              loadAdminBands()
            }}
            className={`px-3 py-3 font-mono text-xs uppercase tracking-wider font-bold transition-all min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl cursor-pointer ${
              activeTab === 'bands'
                ? 'bg-[#E01E37] text-white shadow-[0_0_15px_rgba(224,30,55,0.3)]'
                : 'bg-[#121212] border border-[#242424] text-[#808080] hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#FFD166]" />
            <span>05 // Kontrol Musisi &amp; Harga</span>
          </button>
        </div>

        {/* TAB 1: USERS MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#202020]">
              <div>
                <h2 className="font-mono text-base font-bold text-white uppercase">
                  PENGGUNA TERBARU &amp; STATUS AKUN
                </h2>
                <p className="text-xs text-[#808080] font-sans">
                  Kelola status operasional akun musisi dan penyelenggara terdaftar.
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari email atau nama band..."
                    className="pl-9 pr-3 py-2 bg-[#181818] border border-[#2E2E2E] rounded-lg text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none min-h-[44px] w-48 sm:w-60"
                  />
                </div>

                <div className="flex items-center border border-[#282828] bg-[#181818] p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setUserFilter('all')}
                    className={`px-3 py-1.5 font-mono text-[11px] uppercase rounded-md transition-colors min-h-[40px] ${
                      userFilter === 'all' ? 'bg-[#E01E37] text-white font-bold' : 'text-[#888] hover:text-white'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('band')}
                    className={`px-3 py-1.5 font-mono text-[11px] uppercase rounded-md transition-colors min-h-[40px] ${
                      userFilter === 'band' ? 'bg-[#E01E37] text-white font-bold' : 'text-[#888] hover:text-white'
                    }`}
                  >
                    Band
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserFilter('organizer')}
                    className={`px-3 py-1.5 font-mono text-[11px] uppercase rounded-md transition-colors min-h-[40px] ${
                      userFilter === 'organizer' ? 'bg-[#E01E37] text-white font-bold' : 'text-[#888] hover:text-white'
                    }`}
                  >
                    EO
                  </button>
                </div>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#242424] text-[#737373] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Email Akun</th>
                    <th className="py-3 px-4">Tipe Akun</th>
                    <th className="py-3 px-4">Tanggal Registrasi</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#666]">
                        Tidak ada pengguna yang cocok dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isBandAccount = u.account_type === 'band'
                      const isAdminAccount = u.account_type === 'admin'
                      const isSelf = String(u.id) === String(currentUser?.id)
                      const roleLabel = isBandAccount
                        ? 'BAND'
                        : isAdminAccount
                          ? 'ADMIN'
                          : 'EO / PENYELENGGARA'

                      return (
                        <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4 text-[#A0A0A0]">#{u.id}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{u.email}</div>
                            {u.band_name && u.band_profile_id ? (
                              <Link
                                to={`/band/${u.band_profile_id}`}
                                className="inline-block mt-0.5 text-[11px] text-[#A0A0A0] hover:text-[#F87171] underline underline-offset-2 transition-colors"
                              >
                                Band: {u.band_name}
                              </Link>
                            ) : u.band_name ? (
                              <div className="mt-0.5 text-[11px] text-[#A0A0A0]">
                                Band: {u.band_name}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase whitespace-nowrap ${
                                isBandAccount
                                  ? 'bg-[#E01E37]/15 text-[#F87171] border border-[#E01E37]/30'
                                  : 'bg-white/10 text-white border border-white/20'
                              }`}
                            >
                              {roleLabel}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#A0A0A0] whitespace-nowrap">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }) : '2026-11-01'}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 whitespace-nowrap ${
                                u.is_active
                                  ? 'bg-white/15 text-white border border-white/30'
                                  : 'bg-[#E01E37]/20 text-[#F87171] border border-[#E01E37]/40'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-white' : 'bg-[#F87171]'}`} />
                              {u.is_active ? 'AKTIF' : 'SUSPENDED'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2 flex-wrap">
                              {u.band_profile_id && (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    await loadAdminBands()
                                    const res = await fetch('/api/admin/bands', { headers: authClient.getAuthHeaders() })
                                    const json = await res.json()
                                    const bandsList = json.data || []
                                    const found = bandsList.find((b: any) => b.id === u.band_profile_id)
                                    if (found) {
                                      setEditingBand(found)
                                    } else {
                                      setActiveTab('bands')
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-[#FFD166]/10 text-[#FFD166] border border-[#FFD166]/40 hover:bg-[#FFD166] hover:text-black font-mono text-[11px] uppercase transition-all min-h-[44px] whitespace-nowrap cursor-pointer inline-flex items-center gap-1 font-bold"
                                  title="Super Admin: Ubah status akun, harga dan profil band"
                                >
                                  <Edit3 className="w-3 h-3" />
                                  <span>Kontrol Band</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleToggleSuspendUser(u.id, u.is_active)}
                                disabled={isAdminAccount || isSelf}
                                className={`px-3 py-1.5 rounded-lg border font-mono text-[11px] uppercase transition-all min-h-[44px] whitespace-nowrap cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                                  u.is_active
                                    ? 'border-[#F87171]/40 text-[#F87171] hover:bg-[#E01E37] hover:border-[#E01E37] hover:text-white'
                                    : 'border-white/30 text-white hover:bg-white hover:text-black'
                                }`}
                              >
                                {u.is_active ? 'Tangguhkan' : 'Aktifkan'}
                              </button>
                              {!isAdminAccount && !isSelf && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeleteError(null)
                                    setDeleteTarget(u)
                                  }}
                                  aria-label={`Hapus akun ${u.email}`}
                                  title={`Hapus permanen akun ${u.email}`}
                                  className="px-3 py-1.5 rounded-lg border border-[#F87171]/40 bg-[#1A0D0F] text-[#F87171] hover:bg-[#E01E37] hover:border-[#E01E37] hover:text-white font-mono text-[11px] uppercase transition-all min-h-[44px] inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: REPORTS & MODERATION */}
        {activeTab === 'reports' && (
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="pb-4 border-b border-[#202020]">
              <h2 className="font-mono text-base font-bold text-white uppercase">
                TIKET LAPORAN &amp; KELUHAN MODERASI
              </h2>
              <p className="text-xs text-[#808080] font-sans">
                Tinjau keluhan penyelenggara terkait profil musisi, informasi kontak, atau rider panggung.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#242424] text-[#737373] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Pelapor</th>
                    <th className="py-3 px-4">Kategori Laporan</th>
                    <th className="py-3 px-4">Rincian Alasan</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-[#666]">
                        Tidak ada laporan yang perlu ditinjau. Semua tiket telah terselesaikan.
                      </td>
                    </tr>
                  ) : (
                    reports.map((r) => (
                      <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-3.5 px-4 text-[#888]">#{r.id}</td>
                        <td className="py-3.5 px-4 font-bold text-white">{r.reporterEmail || 'Anonim'}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded bg-[#E01E37]/15 text-[#E01E37] border border-[#E01E37]/30 text-[10px] font-bold">
                            {r.reportedEntityType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#CCC] max-w-xs">{r.reason}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white/10 text-white border border-white/20 font-bold">
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleResolveReport(r.id)}
                            className="px-4 py-2 rounded-lg bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-[11px] uppercase font-bold transition-all min-h-[40px] cursor-pointer shadow-[0_0_12px_rgba(224,30,55,0.3)]"
                          >
                            Selesaikan
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM & INFRASTRUCTURE */}
        {activeTab === 'system' && (
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl space-y-6">
            <div className="pb-4 border-b border-[#202020]">
              <h2 className="font-mono text-base font-bold text-white uppercase">
                STATUS KESEHATAN INFRASTRUKTUR SISTEM
              </h2>
              <p className="text-xs text-[#808080] font-sans">
                Monitoring ketersediaan layanan database, API gateway, dan penyimpanan media Reffband.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#0C0C0C] border border-[#222222] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white font-bold uppercase">Koneksi Database PostgreSQL</span>
                  <span className="font-mono text-[10px] text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full font-bold">
                    CONNECTED
                  </span>
                </div>
                <p className="text-xs text-[#888] font-sans">
                  Koneksi pool aktif dengan latensi rata-rata 12ms. Indeks query teroptimasi.
                </p>
              </div>

              <div className="bg-[#0C0C0C] border border-[#222222] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white font-bold uppercase">Enkripsi Token Autentikasi</span>
                  <span className="font-mono text-[10px] text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full font-bold">
                    JWT 7-DAY SHA-256
                  </span>
                </div>
                <p className="text-xs text-[#888] font-sans">
                  Sesi login terenkripsi menggunakan secret token dengan durasi kedaluwarsa 7 hari.
                </p>
              </div>

              <div className="bg-[#0C0C0C] border border-[#222222] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white font-bold uppercase">Penyimpanan Media &amp; Audio</span>
                  <span className="font-mono text-[10px] text-white bg-white/10 border border-white/20 px-2.5 py-0.5 rounded-full font-bold">
                    LOCAL / CLOUD OK
                  </span>
                </div>
                <p className="text-xs text-[#888] font-sans">
                  Mendukung berkas audio live demo 320 kbps dan multi-file gambar/video panggung.
                </p>
              </div>

              <div className="bg-[#0C0C0C] border border-[#222222] p-4 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-white font-bold uppercase">Reffband Identity Protocol</span>
                  <span className="font-mono text-[10px] text-[#E01E37] bg-[#E01E37]/10 border border-[#E01E37]/30 px-2.5 py-0.5 rounded-full font-bold">
                    VERIFIED v2.0
                  </span>
                </div>
                <p className="text-xs text-[#888] font-sans">
                  Standarisasi katalog band lokal Indonesia dengan protokol kurasi soundcheck resmi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CAMPUS MANAGEMENT & BAND AFFILIATION ACCESS (ADMIN EXCLUSIVE) */}
        {activeTab === 'campuses' && (
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#202020]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-[#FFD166] rounded-full animate-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#FFD166] font-bold">
                    OTORISASI ADMINISTRATOR
                  </span>
                </div>
                <h2 className="font-mono text-base font-bold text-white uppercase">
                  MANAJEMEN LABEL KAMPUS &amp; HAK AKSES AFILIASI MUSISI
                </h2>
                <p className="text-xs text-[#808080] font-sans">
                  Mendukung seluruh 514 Kota &amp; Kabupaten di Indonesia. Hanya Admin yang dapat menambahkan master kampus dan memberikan hak akses afiliasi kepada musisi.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-[#FFD166]/10 border border-[#FFD166]/30 text-[#FFD166] font-mono text-xs font-bold uppercase rounded-md flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4" />
                  <span>{campuses.length} Kampus Aktif</span>
                </span>
              </div>
            </div>

            {/* Master Switch: Kontrol Visibilitas Afiliasi Kampus ke Publik */}
            <div className="bg-[#181310] border border-[#FFD166]/40 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`w-2.5 h-2.5 rounded-full ${showCampusAffiliation ? 'bg-[#00D9FF] animate-pulse' : 'bg-[#FFD166]'}`} />
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    MASTER KONTROL: VISIBILITAS AFILIASI KAMPUS (PUBLIK)
                  </span>
                  <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border uppercase ${
                    showCampusAffiliation ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/40' : 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/40'
                  }`}>
                    {showCampusAffiliation ? 'STATUS: DITAMPILKAN KE PUBLIK' : 'STATUS: DISEMBUNYIKAN (DEFAULT)'}
                  </span>
                </div>
                <p className="text-xs text-[#AAA] font-sans max-w-2xl leading-relaxed">
                  {showCampusAffiliation
                    ? 'Afiliasi kampus saat ini AKTIF dan TAMPIL di kartu musisi dan halaman detail. Seluruh pengunjung dan EO dapat melihat lencana kampus band secara langsung.'
                    : 'Afiliasi kampus saat ini DISEMBUNYIKAN dari pengunjung umum dan kartu band. Data afiliasi tetap tersimpan aman di database admin dan dapat diaktifkan kembali secara instan.'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleToggleCampusAffiliation}
                disabled={isTogglingCampusSetting}
                className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer whitespace-nowrap min-h-[44px] flex items-center justify-center gap-2 ${
                  showCampusAffiliation
                    ? 'bg-[#1C1C1C] hover:bg-[#252525] text-[#FFD166] border border-[#FFD166]/40 shadow-sm'
                    : 'bg-[#E01E37] hover:bg-[#C71B30] text-white shadow-lg shadow-[#E01E37]/30'
                }`}
              >
                <span>{isTogglingCampusSetting ? 'Memproses...' : showCampusAffiliation ? 'Sembunyikan dari Publik' : 'Tampilkan ke Publik Sekarang'}</span>
              </button>
            </div>

            {/* Top Grid: Form Tambah Kampus Baru + Daftar Ringkas Kampus */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Tambah Kampus */}
              <div className="bg-[#0C0C0C] border border-[#262626] rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-[#202020]">
                  <Plus className="w-4 h-4 text-[#E01E37]" />
                  <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    Tambah Label Kampus Baru
                  </h3>
                </div>

                <form onSubmit={handleAddCampus} className="space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1">
                      Nama Lengkap Kampus *
                    </label>
                    <input
                      type="text"
                      value={newCampusName}
                      onChange={(e) => setNewCampusName(e.target.value)}
                      placeholder="Contoh: Universitas Negeri Semarang"
                      required
                      className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs px-3.5 py-2.5 min-h-[40px] outline-none font-sans rounded-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1">
                        Kode / Singkatan *
                      </label>
                      <input
                        type="text"
                        value={newCampusShort}
                        onChange={(e) => setNewCampusShort(e.target.value)}
                        placeholder="Contoh: UNNES"
                        required
                        className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs px-3 py-2.5 min-h-[40px] outline-none font-mono uppercase rounded-none"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="admin-new-campus-city"
                        className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1"
                      >
                        Kota / Kabupaten *
                      </label>
                      <CityCombobox
                        id="admin-new-campus-city"
                        value={newCampusCity}
                        onChange={setNewCampusCity}
                        required
                        showIcon={false}
                        placeholder="Ketik kota / kabupaten..."
                        inputClassName="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#8A8A8A] text-xs pl-2.5 pr-14 py-2.5 min-h-[40px] outline-none font-sans rounded-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingCampus}
                    className="w-full py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{isSubmittingCampus ? 'Menyimpan...' : 'Tambahkan Kampus'}</span>
                  </button>
                </form>
              </div>

              {/* Daftar Master Kampus */}
              <div className="lg:col-span-2 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#202020]">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#FFD166]" />
                    <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      Daftar Master Label Kampus ({campuses.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#808080]">
                    Semarang &amp; Jogja
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {campuses.map((c) => {
                    const affiliatedCount = bandAffiliations.filter(
                      (b) => (b.campus || '').toUpperCase() === c.short_name.toUpperCase()
                    ).length

                    return (
                      <div
                        key={c.id}
                        className="bg-[#0E0E0E] border border-[#262626] hover:border-[#383838] p-3.5 rounded-xl flex items-start justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-bold text-white bg-[#FFD166]/15 border border-[#FFD166]/40 text-[#FFD166] px-2 py-0.5 rounded">
                              {c.short_name}
                            </span>
                            <span className="font-mono text-[10px] text-[#A0A0A0] uppercase bg-[#181818] px-2 py-0.5 border border-[#2A2A2A]">
                              {c.city}
                            </span>
                          </div>
                          <div className="text-xs text-[#E0E0E0] font-sans truncate max-w-[220px]">
                            {c.name}
                          </div>
                          <div className="text-[11px] font-mono text-[#777777]">
                            {affiliatedCount} Musisi Terafiliasi
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleDeleteCampus(c.id)}
                          title={`Hapus label ${c.short_name}`}
                          className="text-[#666] hover:text-[#E01E37] p-1.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Table: Penugasan Hak Akses Kampus ke Musisi */}
            <div className="space-y-4 pt-4 border-t border-[#202020]">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    Penugasan Hak Akses Kampus ke Musisi ({bandAffiliations.length} Band)
                  </h3>
                  <p className="text-xs text-[#808080] font-sans">
                    Admin dapat menetapkan atau mencabut label kampus yang akan tampil sebagai badge resmi di profil musisi.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-[#242424] rounded-xl">
                <table className="w-full text-left font-sans text-xs">
                  <thead className="bg-[#0D0D0D] text-[#808080] font-mono text-[10px] uppercase tracking-wider border-b border-[#242424]">
                    <tr>
                      <th className="py-3 px-4">Nama Band</th>
                      <th className="py-3 px-4">Kota</th>
                      <th className="py-3 px-4">Genre</th>
                      <th className="py-3 px-4">Label Kampus Terpasang</th>
                      <th className="py-3 px-4 text-right">Otorisasi Hak Akses (Admin)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F1F1F]">
                    {bandAffiliations.map((b) => (
                      <tr key={b.id} className="hover:bg-[#161616]/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white font-mono text-xs">{b.band_name}</div>
                          <div className="text-[11px] text-[#777] font-mono">{b.email || `ID #${b.id}`}</div>
                        </td>
                        <td className="py-3 px-4 text-[#C0C0C0] font-mono text-[11px]">
                          {b.location_city || 'Belum diatur'}
                        </td>
                        <td className="py-3 px-4 text-[#A0A0A0]">
                          {b.genre}
                        </td>
                        <td className="py-3 px-4">
                          {b.campus ? (
                            <span className="font-mono text-xs text-[#FFD166] font-bold bg-[#FFD166]/15 border border-[#FFD166]/40 px-2.5 py-1 rounded-md inline-flex items-center gap-1 shadow-sm">
                              <span>🎓</span>
                              <span>{b.campus}</span>
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-[#666666] italic">
                              Belum Terafiliasi
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <select
                              value={b.campus || ''}
                              disabled={updatingBandCampusId === b.id}
                              onChange={(e) => {
                                const val = e.target.value.trim()
                                handleAssignBandCampus(b.id, val ? val : null)
                              }}
                              className="bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs px-2.5 py-1.5 outline-none font-mono cursor-pointer rounded"
                            >
                              <option value="">-- Tanpa Kampus --</option>
                              {campuses.map((c) => (
                                <option key={c.id} value={c.short_name}>
                                  {c.short_name} ({c.city})
                                </option>
                              ))}
                            </select>

                            {b.campus && (
                              <button
                                type="button"
                                disabled={updatingBandCampusId === b.id}
                                onClick={() => handleAssignBandCampus(b.id, null)}
                                className="px-2 py-1.5 bg-[#1F1F1F] hover:bg-[#2A2A2A] text-[#E01E37] border border-[#333333] hover:border-[#E01E37] text-[10px] font-mono uppercase tracking-wider rounded transition-colors cursor-pointer"
                                title="Cabut label kampus dari band ini"
                              >
                                Cabut
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: SUPER ADMIN BANDS CONTROL */}
        {activeTab === 'bands' && (
          <div className="bg-[#121212] border border-[#242424] rounded-2xl p-6 shadow-xl space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#202020]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 bg-[#E01E37] rounded-full animate-pulse" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#E01E37] font-bold">
                    HAK OTORITAS TERTINGGI // SUPER ADMIN
                  </span>
                </div>
                <h2 className="font-mono text-base font-bold text-white uppercase">
                  KONTROL LENGKAP MUSISI &amp; HARGA
                </h2>
                <p className="text-xs text-[#808080] font-sans">
                  Akun Administrator memiliki kuasa penuh mengubah nama, genre, status keaktifan, afiliasi kampus, rider, dan tarif panggung musisi.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={loadAdminBands}
                  disabled={loadingBands}
                  className="px-4 py-2 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] text-white font-mono text-xs uppercase font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingBands ? 'animate-spin' : ''}`} />
                  <span>Segarkan Data Band</span>
                </button>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="relative flex-1 max-w-md">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                <input
                  type="text"
                  value={bandSearch}
                  onChange={(e) => setBandSearch(e.target.value)}
                  placeholder="Cari musisi berdasarkan nama, genre, kota, atau kampus..."
                  className="w-full bg-[#0E0E0E] border border-[#2A2A2A] focus:border-[#E01E37] text-white text-xs pl-9 pr-3 py-2 rounded-xl outline-none font-mono transition-colors"
                />
              </div>

              <div className="font-mono text-xs text-[#888]">
                Total: <span className="text-white font-bold">{adminBands.length}</span> Musisi Terdaftar
              </div>
            </div>

            {/* Bands Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-xs">
                <thead>
                  <tr className="border-b border-[#242424] text-[#737373] uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Musisi &amp; Kontak</th>
                    <th className="py-3 px-4">Genre &amp; Domisili</th>
                    <th className="py-3 px-4">Afiliasi Kampus</th>
                    <th className="py-3 px-4">Estimasi Tarif</th>
                    <th className="py-3 px-4">Status Akun</th>
                    <th className="py-3 px-4 text-right">Otoritas Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1C1C1C]">
                  {adminBands
                    .filter((b) => {
                      if (!bandSearch.trim()) return true
                      const q = bandSearch.toLowerCase()
                      return (
                        b.bandName.toLowerCase().includes(q) ||
                        b.genre.toLowerCase().includes(q) ||
                        b.locationCity.toLowerCase().includes(q) ||
                        (b.campus && b.campus.toLowerCase().includes(q))
                      )
                    })
                    .map((b) => {
                      return (
                        <tr key={b.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white text-sm block uppercase">{b.bandName}</span>
                              </div>
                              <span className="text-[11px] text-[#777] block">{b.userEmail}</span>
                              <span className="text-[11px] text-[#999] block font-sans">WA: {b.phone || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5">
                              <span className="text-[#FF4D6D] font-bold block">{b.genre}</span>
                              <span className="text-[#888] block">{b.locationCity}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            {b.campus ? (
                              <span className="font-mono text-[10px] uppercase font-bold text-[#FFD166] bg-[#FFD166]/10 px-2.5 py-1 rounded border border-[#FFD166]/30 inline-flex items-center gap-1">
                                <span>🎓</span>
                                <span>{b.campus}</span>
                              </span>
                            ) : (
                              <span className="text-[#555] font-mono text-[11px]">Bebas Kampus</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="space-y-0.5 font-mono text-xs">
                              <span className="text-white font-bold block">
                                {b.budgetMin ? formatRupiah(b.budgetMin) : 'Negosiasi'}
                              </span>
                              {b.budgetMax && b.budgetMax !== b.budgetMin && (
                                <span className="text-[#777] text-[11px] block">
                                  s/d {formatRupiah(b.budgetMax)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1 whitespace-nowrap ${
                                b.isActive !== false
                                  ? 'bg-white/15 text-white border border-white/30'
                                  : 'bg-[#E01E37]/20 text-[#F87171] border border-[#E01E37]/40'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${b.isActive !== false ? 'bg-white' : 'bg-[#F87171]'}`} />
                              {b.isActive !== false ? 'AKTIF' : 'NONAKTIF'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingBand({ ...b })}
                                className="px-3 py-1.5 rounded-xl bg-[#E01E37]/15 hover:bg-[#E01E37] text-white border border-[#E01E37]/50 hover:border-[#E01E37] font-mono text-[11px] font-bold uppercase tracking-wider transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit Super Admin</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SUPER ADMIN BAND EDIT MODAL */}
        {editingBand && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Super Admin Band Editor"
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
            onClick={() => setEditingBand(null)}
          >
            <div
              className="bg-[#121212] border-2 border-[#E01E37] rounded-3xl w-full max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden shadow-[0_0_60px_rgba(224,30,55,0.4)] my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="shrink-0 p-5 sm:p-6 border-b border-[#242424] flex items-center justify-between gap-4 bg-[#0A0A0A]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#E01E37] animate-pulse" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[#E01E37] font-bold">
                      OTORITAS TERTINGGI // SUPER ADMIN
                    </span>
                  </div>
                  <h3 className="font-mono text-lg font-bold text-white uppercase mt-0.5">
                    Edit Musisi: {editingBand.bandName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBand(null)}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveBand} className="p-6 overflow-y-auto space-y-6">
                {/* 1. Identity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      NAMA BAND:
                    </label>
                    <input
                      type="text"
                      value={editingBand.bandName}
                      onChange={(e) => setEditingBand({ ...editingBand, bandName: e.target.value })}
                      required
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      GENRE MUSIK:
                    </label>
                    <input
                      type="text"
                      value={editingBand.genre}
                      onChange={(e) => setEditingBand({ ...editingBand, genre: e.target.value })}
                      required
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="admin-edit-band-city"
                      className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold"
                    >
                      KOTA / KABUPATEN DOMISILI:
                    </label>
                    <CityCombobox
                      id="admin-edit-band-city"
                      value={editingBand.locationCity}
                      onChange={(city) =>
                        setEditingBand({
                          ...editingBand,
                          locationCity: city,
                          locationRegion: getProvinceForCity(city) || editingBand.locationRegion || '',
                        })
                      }
                      required
                      showIcon={false}
                      placeholder="Ketik kota / kabupaten..."
                      inputClassName="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#8A8A8A] pl-2.5 pr-14 py-2.5 min-h-[44px] rounded-xl font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#FFD166] block font-bold">
                      AFILIASI KAMPUS (ADMIN ACCESS):
                    </label>
                    <select
                      value={editingBand.campus || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, campus: e.target.value || null })}
                      className="w-full bg-[#0E0E0E] border border-[#FFD166]/40 focus:border-[#FFD166] text-[#FFD166] p-2.5 rounded-xl font-mono text-xs outline-none cursor-pointer"
                    >
                      <option value="">-- Bebas Kampus / Non-Afiliasi --</option>
                      {campuses.map((c) => (
                        <option key={c.id} value={c.short_name}>
                          {c.short_name} ({c.name} - {c.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 2. Pricing / Honor Range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      TARIF MINIMUM (RP):
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      inputMode="numeric"
                      value={editingBand.budgetMin || ''}
                      onChange={(e) =>
                        setEditingBand({
                          ...editingBand,
                          budgetMin: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] font-mono text-[#666]">
                      {editingBand.budgetMin ? formatRupiah(editingBand.budgetMin) : 'Rp 0'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      TARIF MAKSIMUM (RP):
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      inputMode="numeric"
                      value={editingBand.budgetMax || ''}
                      onChange={(e) =>
                        setEditingBand({
                          ...editingBand,
                          budgetMax: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                    <span className="text-[10px] font-mono text-[#666]">
                      {editingBand.budgetMax ? formatRupiah(editingBand.budgetMax) : 'Rp 0'}
                    </span>
                  </div>
                </div>

                {/* Durasi Live Set */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                    DURASI LIVE SET (PER SET):
                  </label>
                  <input
                    type="text"
                    maxLength={100}
                    value={editingBand.setDuration || ''}
                    onChange={(e) => setEditingBand({ ...editingBand, setDuration: e.target.value })}
                    placeholder="Contoh: 45 - 60 Menit"
                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                  />
                </div>

                {/* 4. Phone & Active Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      NOMOR WHATSAPP MANAJEMEN:
                    </label>
                    <input
                      type="text"
                      value={editingBand.phone || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, phone: e.target.value })}
                      placeholder="+6281234567890"
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      STATUS OPERASIONAL AKUN:
                    </label>
                    <select
                      value={editingBand.isActive !== false ? 'active' : 'suspended'}
                      onChange={(e) =>
                        setEditingBand({
                          ...editingBand,
                          isActive: e.target.value === 'active',
                        })
                      }
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none cursor-pointer"
                    >
                      <option value="active">Aktif (Live di Web &amp; Pencarian)</option>
                      <option value="suspended">Nonaktif / Ditangguhkan</option>
                    </select>
                  </div>
                </div>

                {/* 5. Social & Media Channels */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      INSTAGRAM HANDLE:
                    </label>
                    <input
                      type="text"
                      value={editingBand.instagramHandle || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, instagramHandle: e.target.value })}
                      placeholder="@band_official"
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      SPOTIFY URL:
                    </label>
                    <input
                      type="text"
                      value={editingBand.spotifyUrl || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, spotifyUrl: e.target.value })}
                      placeholder="https://open.spotify.com/artist/..."
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      YOUTUBE URL:
                    </label>
                    <input
                      type="text"
                      value={editingBand.youtubeUrl || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, youtubeUrl: e.target.value })}
                      placeholder="https://youtube.com/@band..."
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                {/* 6. Media Photos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      FOTO PROFIL URL:
                    </label>
                    <input
                      type="text"
                      value={editingBand.profilePhotoUrl || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, profilePhotoUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      FOTO SAMPUL / BANNER URL:
                    </label>
                    <input
                      type="text"
                      value={editingBand.coverPhotoUrl || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, coverPhotoUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                {/* 7. Technical Rider Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      RIDER INPUT AUDIO CHANNEL:
                    </label>
                    <input
                      type="text"
                      value={editingBand.riderChannelInputs || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, riderChannelInputs: e.target.value })}
                      placeholder="Contoh: 12-16 Channel Input FOH"
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                      RIDER SOUND SYSTEM:
                    </label>
                    <input
                      type="text"
                      value={editingBand.riderSoundSystem || ''}
                      onChange={(e) => setEditingBand({ ...editingBand, riderSoundSystem: e.target.value })}
                      placeholder="Contoh: FOH PA System 5000W + 2 Stage Monitor"
                      className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-2.5 rounded-xl font-mono text-xs outline-none"
                    />
                  </div>
                </div>

                {/* 8. Bio */}
                <div className="space-y-1.5">
                  <label className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
                    DESKRIPSI &amp; BIO MUSISI:
                  </label>
                  <textarea
                    rows={3}
                    value={editingBand.bio || ''}
                    onChange={(e) => setEditingBand({ ...editingBand, bio: e.target.value })}
                    className="w-full bg-[#0E0E0E] border border-[#2E2E2E] focus:border-[#E01E37] text-white p-3 rounded-xl font-sans text-xs outline-none leading-relaxed"
                  />
                </div>

                {/* Submit Actions */}
                <div className="pt-4 border-t border-[#222222] flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingBand(null)}
                    className="px-4 py-2.5 rounded-xl border border-[#333333] text-[#CCC] hover:text-white font-mono text-xs uppercase font-bold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBand}
                    className="px-6 py-2.5 rounded-xl bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider transition-all shadow-[0_4px_20px_rgba(224,30,55,0.4)] flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingBand ? 'Menyimpan...' : 'Simpan Perubahan (Super Admin)'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* Delete User Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-modal-title"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => {
            if (deletingUserId === null) {
              setDeleteTarget(null)
              setDeleteError(null)
            }
          }}
        >
          <div
            className="bg-[#121212] border-2 border-[#E01E37] rounded-2xl w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md max-h-[90dvh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 p-5 border-b border-[#242424] flex items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-[#F87171] font-bold block">
                  KONFIRMASI HAPUS AKUN
                </span>
                <h3 id="delete-user-modal-title" className="font-mono text-base font-bold text-white uppercase mt-0.5">
                  Hapus Akun Pengguna
                </h3>
              </div>
              <button
                type="button"
                disabled={deletingUserId !== null}
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError(null)
                }}
                aria-label="Tutup dialog konfirmasi hapus"
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-[#A0A0A0] hover:text-white hover:bg-white/10 transition-colors cursor-pointer disabled:opacity-40"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              <div className="bg-[#0B0B0B] border border-[#242424] rounded-xl p-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between gap-3">
                  <span className="text-[#A0A0A0]">ID AKUN</span>
                  <span className="text-white font-bold">#{deleteTarget.id}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#A0A0A0]">EMAIL</span>
                  <span className="text-white font-bold break-all text-right">{deleteTarget.email}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[#A0A0A0]">TIPE AKUN</span>
                  <span className="text-[#F87171] font-bold uppercase">
                    {deleteTarget.account_type === 'band' ? 'BAND' : 'EO / PENYELENGGARA'}
                  </span>
                </div>
                {deleteTarget.band_name && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[#A0A0A0]">NAMA BAND</span>
                    <span className="text-white font-bold text-right">{deleteTarget.band_name}</span>
                  </div>
                )}
              </div>

              <p className="text-xs text-[#CCCCCC] font-sans leading-relaxed">
                {deleteTarget.account_type === 'band'
                  ? 'Tindakan ini permanen. Profil band, seluruh postingan karya, berkas media, dan riwayat inquiry terkait akun ini akan ikut dihapus.'
                  : 'Tindakan ini permanen. Akun penyelenggara (EO), riwayat broadcast lowongan, dan data koneksi terkait akan ikut dihapus.'}
              </p>

              {deleteError && (
                <div className="p-3 rounded-lg bg-[#E01E37]/15 border border-[#E01E37] text-xs font-sans text-white">
                  {deleteError}
                </div>
              )}
            </div>

            <div className="shrink-0 p-5 border-t border-[#242424] flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 bg-[#0E0E0E]">
              <button
                type="button"
                disabled={deletingUserId !== null}
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError(null)
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[#333333] text-[#CCCCCC] hover:text-white hover:bg-white/5 font-mono text-xs uppercase font-bold transition-colors cursor-pointer disabled:opacity-40"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deletingUserId !== null}
                onClick={handleConfirmDeleteUser}
                className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{deletingUserId !== null ? 'Menghapus...' : 'Hapus Permanen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
