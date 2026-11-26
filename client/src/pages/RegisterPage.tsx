import React, { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import {
  Lock,
  Mail,
  Music2,
  Building2,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Guitar,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { authClient, type RegisterPayload } from '../lib/auth'
import { BAND_GENRE_OPTIONS } from '../lib/genres'
import { getProvinceForCity, resolveIndonesiaCity } from '../lib/cities'
import { CityCombobox } from '../components/ui/CityCombobox'

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const urlRole = searchParams.get('role')
  const redirectParam = searchParams.get('redirect')
  const [prevUrlRole, setPrevUrlRole] = useState(urlRole)

  const [accountType, setAccountType] = useState<'band' | 'general'>(() => {
    return urlRole === 'general' || urlRole === 'organizer' ? 'general' : 'band'
  })
  if (urlRole !== prevUrlRole) {
    setPrevUrlRole(urlRole)
    if (urlRole === 'band') setAccountType('band')
    else if (urlRole === 'general' || urlRole === 'organizer') setAccountType('general')
  }

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Band-specific fields & Organizer optional name
  const [bandName, setBandName] = useState('')
  const [orgName, setOrgName] = useState('')
  const [genre, setGenre] = useState(BAND_GENRE_OPTIONS[1])
  const [locationCity, setLocationCity] = useState<string>('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [existingUser] = useState(() => (authClient.getToken() ? authClient.getUser() : null))

  const hasGoogleClient = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

  const getResolvedCitySelection = () => {
    const trimmed = locationCity.trim()
    if (!trimmed) return { city: '', province: undefined as string | undefined }
    const resolved = resolveIndonesiaCity(trimmed)
    const finalCity = resolved ? resolved.name : trimmed
    const province = resolved?.province || getProvinceForCity(finalCity) || undefined
    return { city: finalCity, province }
  }

  const handleGoogleRegister = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential
    if (!credential) {
      setErrorMessage('Google tidak mengembalikan token pendaftaran yang valid.')
      return
    }

    const { city: resolvedCity, province: resolvedProvince } = getResolvedCitySelection()
    if (accountType === 'band' && !resolvedCity) {
      setErrorMessage('Silakan pilih Kota / Kabupaten domisili band terlebih dahulu sebelum mendaftar dengan Google.')
      return
    }

    setErrorMessage(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const res = await authClient.loginWithGoogle({
        credential,
        accountType,
        bandName: accountType === 'band' ? bandName.trim() || undefined : undefined,
        genre: accountType === 'band' ? genre : undefined,
        locationCity: resolvedCity || undefined,
        locationRegion: resolvedProvince,
      })

      if (res.success && res.user) {
        setSuccessMessage('Pendaftaran Google berhasil. Mengalihkan ke ruang kerja...')
        setTimeout(() => {
          if (res.user?.accountType === 'band') {
            navigate('/dashboard-band')
          } else {
            navigate(redirectParam || '/cari-band')
          }
        }, 700)
      } else {
        setErrorMessage(res.message || 'Gagal mendaftar menggunakan Google.')
        setLoading(false)
      }
    } catch {
      setErrorMessage('Terjadi kendala koneksi saat autentikasi Google.')
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const cleanEmail = email.trim()
    if (!cleanEmail || !password) {
      setErrorMessage('Email dan kata sandi wajib diisi.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Format alamat email tidak valid.')
      return
    }

    if (password.length < 6) {
      setErrorMessage('Kata sandi minimal harus terdiri dari 6 karakter.')
      return
    }

    if (accountType === 'band' && !bandName.trim()) {
      setErrorMessage('Nama band wajib diisi untuk akun musisi.')
      return
    }

    const { city: resolvedCity, province: resolvedProvince } = getResolvedCitySelection()
    if (!resolvedCity) {
      setErrorMessage('Kota / Kabupaten domisili wajib dipilih.')
      return
    }
    if (resolvedCity !== locationCity) {
      setLocationCity(resolvedCity)
    }

    setLoading(true)

    const payload: RegisterPayload = {
      email: email.trim(),
      password,
      accountType,
      bandName: accountType === 'band' ? bandName.trim() : undefined,
      genre: accountType === 'band' ? genre : undefined,
      locationCity: resolvedCity,
      locationRegion: resolvedProvince,
    }

    try {
      const res = await authClient.register(payload)
      if (res.success && res.user) {
        setSuccessMessage('Registrasi berhasil. Mengalihkan ke ruang kerja...')
        setTimeout(() => {
          if (res.user?.accountType === 'band') {
            navigate('/dashboard-band')
          } else {
            navigate(redirectParam || '/cari-band')
          }
        }, 700)
      } else {
        setErrorMessage(res.message || 'Gagal mendaftarkan akun. Silakan periksa kembali formulir.')
        setLoading(false)
      }
    } catch {
      setErrorMessage('Terjadi kendala koneksi ke server auth. Silakan coba sesaat lagi.')
      setLoading(false)
    }
  }

  if (existingUser) {
    const destination =
      existingUser.accountType === 'band'
        ? '/dashboard-band'
        : existingUser.accountType === 'admin'
          ? '/admin'
          : redirectParam || '/cari-band'
    return <Navigate to={destination} replace />
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#0A0A0A] relative flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background Grid Pattern & Ambience */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:32px_32px]"
        aria-hidden="true"
      />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-[#E01E37]/10 blur-[120px] rounded-full pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Back Nav Link */}
      <div className="w-full max-w-lg mb-6 flex items-center justify-between z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0] hover:text-white transition-colors min-h-[44px] px-2 py-2"
        >
          <ArrowLeft className="w-4 h-4 text-[#E01E37]" />
          <span>Kembali ke Beranda</span>
        </Link>
        <span className="text-[11px] font-mono text-white flex items-center gap-1.5 px-2.5 py-1 bg-[#141414] border border-[#2E2E2E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E01E37] animate-pulse" />
          ONBOARDING TALENT
        </span>
      </div>

      {/* Main Registration Card */}
      <div className="w-full max-w-lg bg-[#111111] border border-[#262626] rounded-none p-6 sm:p-8 relative shadow-2xl z-10">
        {/* Top Accent Ribbon */}
        <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#E01E37] to-transparent" />

        {/* Title Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#1A1A1A] border border-[#2F2F2F] text-[10px] font-mono uppercase tracking-widest text-[#E01E37] mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pendaftaran Akun Baru</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-white">
            DAFTAR <span className="text-[#E01E37]">AKUN</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] font-sans mt-2 max-w-sm mx-auto">
            Pilih jenis akun, lengkapi identitas, dan mulailah terkoneksi dengan ekosistem panggung live.
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="mb-6">
          <label className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-2.5">
            PILIH TIPE AKUN:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType('band')}
              className={`p-3.5 text-left border transition-all cursor-pointer min-h-[48px] flex items-start gap-3 ${
                accountType === 'band'
                  ? 'bg-[#1C1214] border-[#E01E37] text-white shadow-[0_0_15px_rgba(224,30,55,0.2)]'
                  : 'bg-[#161616] border-[#2A2A2A] text-[#909090] hover:text-white hover:border-[#404040]'
              }`}
            >
              <div
                className={`p-2 rounded-none mt-0.5 ${
                  accountType === 'band' ? 'bg-[#E01E37] text-white' : 'bg-[#222222] text-[#808080]'
                }`}
              >
                <Music2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>MUSISI / BAND</span>
                  {accountType === 'band' && (
                    <span className="w-2 h-2 rounded-full bg-[#E01E37]" />
                  )}
                </div>
                <div className="text-[11px] text-[#A0A0A0] font-sans mt-0.5 leading-snug">
                  Profil talent, showcase audio, rider & direct booking.
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setAccountType('general')}
              className={`p-3.5 text-left border transition-all cursor-pointer min-h-[48px] flex items-start gap-3 ${
                accountType === 'general'
                  ? 'bg-[#181818] border-white text-white shadow-[0_0_15px_rgba(255,255,255,0.12)]'
                  : 'bg-[#161616] border-[#2A2A2A] text-[#909090] hover:text-white hover:border-[#404040]'
              }`}
            >
              <div
                className={`p-2 rounded-none mt-0.5 ${
                  accountType === 'general' ? 'bg-white text-black' : 'bg-[#222222] text-[#808080]'
                }`}
              >
                <Building2 className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between">
                  <span>PENYELENGGARA / EO</span>
                  {accountType === 'general' && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
                <div className="text-[11px] text-[#A0A0A0] font-sans mt-0.5 leading-snug">
                  Kurasi musisi, kirim broadcast lowongan & penawaran panggung.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div
            role="alert"
            className="mb-6 p-3.5 bg-[#E01E37]/15 border border-[#E01E37] text-white text-xs font-sans flex items-start gap-2.5 rounded-none"
          >
            <AlertCircle className="w-4 h-4 text-[#E01E37] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success Notification */}
        {successMessage && (
          <div
            role="status"
            className="mb-6 p-3.5 bg-[#181818] border border-white text-white text-xs font-sans flex items-start gap-2.5 rounded-none"
          >
            <CheckCircle2 className="w-4 h-4 text-[#E01E37] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed text-[#F5F5F5]">{successMessage}</div>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5 flex items-center justify-between"
            >
              <span>Email Akun *</span>
              <span className="text-[10px] text-[#707070] font-mono">KONTAK RESMI</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                required
                autoComplete="email"
                className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#606060] text-sm pl-10 pr-4 py-3 min-h-[44px] transition-colors outline-none font-sans"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5 flex items-center justify-between"
            >
              <span>Kata Sandi *</span>
              <span className="text-[10px] text-[#707070] font-mono">MIN 6 KARAKTER</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#606060] text-sm pl-10 pr-12 py-3 min-h-[44px] transition-colors outline-none font-sans"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 pl-2 flex items-center text-[#707070] hover:text-white transition-colors min-w-[44px] min-h-[44px] justify-center"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Band Specific Fields */}
          {accountType === 'band' ? (
            <>
              {/* Nama Band */}
              <div>
                <label
                  htmlFor="reg-band-name"
                  className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5 flex items-center justify-between"
                >
                  <span>Nama Band / Musisi *</span>
                  <span className="text-[10px] text-[#E01E37] font-mono">STAGE IDENTITY</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                    <Guitar className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-band-name"
                    type="text"
                    value={bandName}
                    onChange={(e) => setBandName(e.target.value)}
                    placeholder="Contoh: Nada Semarang / Jogja Harmoni"
                    maxLength={100}
                    required
                    className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#606060] text-sm pl-10 pr-4 py-3 min-h-[44px] transition-colors outline-none font-sans"
                  />
                </div>
              </div>

              {/* Genre & City Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Genre */}
                <div>
                  <label
                    htmlFor="reg-genre"
                    className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5"
                  >
                    Genre Musik *
                  </label>
                  <select
                    id="reg-genre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white text-sm px-3.5 py-3 min-h-[44px] transition-colors outline-none font-sans cursor-pointer"
                  >
                    {BAND_GENRE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt} className="bg-[#181818] text-white">
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Kota Domisili */}
                <div>
                  <label
                    htmlFor="reg-city"
                    className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5"
                  >
                    Kota / Kabupaten Domisili *
                  </label>
                  <CityCombobox
                    id="reg-city"
                    value={locationCity}
                    onChange={setLocationCity}
                    required
                    placeholder="Ketik kota / kabupaten (contoh: Semarang, Bandung)"
                  />
                </div>
              </div>
            </>
          ) : (
            /* General / Organizer Fields */
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="reg-org-name"
                  className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5"
                >
                  Nama Organisasi / EO
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-org-name"
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Contoh: Kafe Selatan Events"
                    className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#606060] text-sm pl-10 pr-4 py-3 min-h-[44px] transition-colors outline-none font-sans"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="reg-city-org"
                  className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5"
                >
                  Kota / Kabupaten Domisili *
                </label>
                <CityCombobox
                  id="reg-city-org"
                  value={locationCity}
                  onChange={setLocationCity}
                  required
                  placeholder="Ketik kota / kabupaten..."
                />
              </div>
            </div>
          )}

          {/* Ethics / Terms Note */}
          <div className="pt-2">
            <p className="text-[11px] text-[#7A7A7A] font-sans leading-relaxed">
              Dengan mendaftarkan akun, Anda menyetujui standar kurasi portofolio, verifikasi kontak, dan transparansi rider panggung Reffband.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-widest py-3.5 px-6 min-h-[48px] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:translate-y-[1px] mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MENDAFTARKAN AKUN...</span>
              </>
            ) : (
              <>
                <span>DAFTARKAN AKUN SEKARANG</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Google Instant Signup Section */}
        {hasGoogleClient && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-3">
              <div className="border-t border-[#262626] w-full" />
              <span className="bg-[#111111] px-3 text-[10px] font-mono uppercase tracking-widest text-[#707070] whitespace-nowrap">
                ATAU DAFTAR INSTAN DENGAN GOOGLE
              </span>
              <div className="border-t border-[#262626] w-full" />
            </div>
            <p className="text-[11px] text-center text-[#9E9E9E] font-mono mb-3">
              Tipe akun: <span className="text-white font-bold">{accountType === 'band' ? 'MUSISI / BAND' : 'PENYELENGGARA / EO'}</span>
              {accountType === 'band' && (
                <>
                  {' · '}Kota:{' '}
                  <span className={locationCity ? 'text-white font-bold' : 'text-[#FF6B7F] font-bold'}>
                    {locationCity || 'Pilih kota di atas dulu'}
                  </span>
                </>
              )}
            </p>
            <div className="w-full flex justify-center min-h-[44px]">
              <GoogleLogin
                onSuccess={handleGoogleRegister}
                onError={() => setErrorMessage('Popup Google Sign-Up dibatalkan atau gagal memuat.')}
                theme="filled_black"
                size="large"
                shape="rectangular"
                text="signup_with"
                width="300"
              />
            </div>
          </div>
        )}

        {/* Footer Navigation Switcher */}
        <div className="mt-7 pt-5 border-t border-[#222222] text-center">
          <p className="text-xs text-[#909090] font-sans">
            Sudah memiliki akun terdaftar?{' '}
            <Link
              to={redirectParam ? `/masuk?redirect=${encodeURIComponent(redirectParam)}` : '/masuk'}
              className="text-[#E01E37] hover:underline font-mono font-bold uppercase tracking-wider ml-1 inline-flex items-center gap-1"
            >
              <span>Masuk di Sini</span>
              <span>▸</span>
            </Link>
          </p>
        </div>
      </div>

      {/* Security Telemetry Footer Stamp */}
      <div className="mt-8 text-center z-10">
        <p className="text-[10px] font-mono text-[#555555] tracking-widest uppercase">
          SECURE PROTOCOL // ENCRYPTED STORAGE // REFFBAND TALENT GATE
        </p>
      </div>
    </div>
  )
}
