import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google'
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Zap,
  ArrowLeft,
  Loader2,
  Music2,
  Building2,
} from 'lucide-react'
import { authClient } from '../lib/auth'
import { INDONESIA_CITIES } from '../lib/cities'

function getPostLoginRoute(accountType: string | undefined, fallback: string): string {
  if (fallback && fallback !== '/cari-band') return fallback
  if (accountType === 'band') return '/dashboard-band'
  if (accountType === 'admin') return '/admin'
  return fallback
}

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // Track redirect path if user was trying to access a protected page
  const searchParams = new URLSearchParams(location.search)
  const redirectParam = searchParams.get('redirect')
  const fromLocation = redirectParam || (location.state as { from?: string })?.from || '/cari-band'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // First-time Google onboarding state
  const [pendingGoogle, setPendingGoogle] = useState<{
    credential: string
    email: string
    name: string
  } | null>(null)
  const [googleBandName, setGoogleBandName] = useState('')
  const [googleCity, setGoogleCity] = useState('Bandung')

  const hasGoogleClient = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!email || !password) {
      setErrorMessage('Silakan masukkan email dan kata sandi Anda.')
      return
    }

    setLoading(true)

    try {
      const res = await authClient.login(email.trim(), password)
      if (res.success && res.user) {
        const destination = getPostLoginRoute(res.user.accountType, fromLocation)
        setSuccessMessage('Autentikasi terverifikasi. Mengalihkan ke konsol...')
        setTimeout(() => {
          navigate(destination)
        }, 800)
      } else {
        setErrorMessage(res.message || 'Email atau kata sandi tidak cocok. Silakan coba kembali.')
        setLoading(false)
      }
    } catch {
      setErrorMessage('Terjadi kendala koneksi ke server auth. Silakan coba sesaat lagi.')
      setLoading(false)
    }
  }

  const handleDemoLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setErrorMessage(null)
    // Automatically submit with selected credentials
    setLoading(true)
    authClient.login(demoEmail, demoPass).then((res) => {
      if (res.success && res.user) {
        const destination = getPostLoginRoute(res.user.accountType, fromLocation)
        setSuccessMessage(`Login berhasil sebagai ${demoEmail}. Mengalihkan...`)
        setTimeout(() => {
          navigate(destination)
        }, 800)
      } else {
        setErrorMessage(res.message || 'Demo login gagal.')
        setLoading(false)
      }
    }).catch(() => {
      setErrorMessage('Kendala koneksi demo login.')
      setLoading(false)
    })
  }

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    const credential = credentialResponse.credential
    if (!credential) {
      setErrorMessage('Google tidak mengembalikan token login yang valid.')
      return
    }
    setErrorMessage(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      const res = await authClient.loginWithGoogle({ credential })
      if (res.success && res.needsOnboarding && res.googleProfile) {
        setPendingGoogle({
          credential,
          email: res.googleProfile.email,
          name: res.googleProfile.name,
        })
        setGoogleBandName('')
        setLoading(false)
        return
      }

      if (res.success && res.user) {
        const destination = getPostLoginRoute(res.user.accountType, fromLocation)
        setSuccessMessage('Autentikasi Google terverifikasi. Mengalihkan...')
        setTimeout(() => {
          navigate(destination)
        }, 700)
      } else {
        setErrorMessage(res.message || 'Gagal masuk menggunakan Google.')
        setLoading(false)
      }
    } catch {
      setErrorMessage('Terjadi kendala saat menghubungkan akun Google.')
      setLoading(false)
    }
  }

  const handleCompleteGoogleOnboarding = async (chosenType: 'band' | 'general') => {
    if (!pendingGoogle) return
    if (chosenType === 'band' && !googleBandName.trim()) {
      setErrorMessage('Nama band wajib diisi. Masukkan nama panggung / band Anda.')
      return
    }

    setErrorMessage(null)
    setLoading(true)

    const res = await authClient.loginWithGoogle({
      credential: pendingGoogle.credential,
      accountType: chosenType,
      bandName: chosenType === 'band' ? googleBandName.trim() : undefined,
      locationCity: googleCity.trim() || 'Kota Semarang',
    })

    if (res.success && res.user) {
      const destination = getPostLoginRoute(res.user.accountType, fromLocation)
      setSuccessMessage('Akun Google berhasil dibuat! Mengalihkan ke ruang kerja...')
      setTimeout(() => {
        navigate(destination)
      }, 700)
    } else {
      setErrorMessage(res.message || 'Gagal menyelesaikan pendaftaran Google.')
      setLoading(false)
    }
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
      <div className="w-full max-w-md mb-6 flex items-center justify-between z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0] hover:text-white transition-colors min-h-[44px] px-2 py-2"
        >
          <ArrowLeft className="w-4 h-4 text-[#E01E37]" />
          <span>Kembali ke Beranda</span>
        </Link>
        <span className="text-[11px] font-mono text-white flex items-center gap-1.5 px-2.5 py-1 bg-[#141414] border border-[#2E2E2E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E01E37] animate-pulse" />
          SYSTEM ACCESS
        </span>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-[#111111] border border-[#262626] rounded-none p-6 sm:p-8 relative shadow-2xl z-10">
        {/* Top Accent Ribbon */}
        <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#E01E37] to-transparent" />

        {/* Title Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#1A1A1A] border border-[#2F2F2F] text-[10px] font-mono uppercase tracking-widest text-[#E01E37] mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>reffband Gateway</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-white">
            MASUK <span className="text-[#E01E37]">AKUN</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] font-sans mt-2 max-w-xs mx-auto">
            Masukkan alamat email dan kata sandi akun untuk mengakses dashboard panggung.
          </p>
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
            className="mb-6 p-3.5 bg-[#181818] border border-white text-white text-xs font-sans flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#E01E37] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed text-[#F5F5F5]">{successMessage}</div>
          </div>
        )}

        {/* Google First-Time Role Onboarding OR Standard Login Form */}
        {pendingGoogle ? (
          <div className="space-y-5 bg-[#0C0C0C] border border-[#262626] p-5">
            <div className="space-y-1">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#E01E37] font-bold block">
                AKUN GOOGLE BARU TERDETEKSI
              </span>
              <p className="text-xs text-white font-mono truncate">
                {pendingGoogle.email}
              </p>
              <p className="text-xs text-[#9E9E9E] font-sans">
                Pilih peran Anda di ekosistem Reffband untuk menyelesaikan pendaftaran:
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#B0B0B0] mb-1">
                  Nama Band / Nama Panggung * (Wajib untuk Musisi)
                </label>
                <input
                  type="text"
                  value={googleBandName}
                  onChange={(e) => setGoogleBandName(e.target.value)}
                  placeholder="Contoh: Nada Kota / The Semarang Waves"
                  className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-sm px-3.5 py-2.5 min-h-[44px] outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#B0B0B0] mb-1">
                  Kota Domisili
                </label>
                <select
                  value={googleCity}
                  onChange={(e) => setGoogleCity(e.target.value)}
                  className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-sm px-3 py-2.5 min-h-[44px] outline-none font-sans cursor-pointer"
                >
                  {INDONESIA_CITIES.map((c) => (
                    <option key={c} value={c} className="bg-[#181818] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleCompleteGoogleOnboarding('band')}
                className="w-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider py-3 px-4 min-h-[44px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Music2 className="w-4 h-4" />
                <span>Lanjutkan sebagai Musisi / Band</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleCompleteGoogleOnboarding('general')}
                className="w-full bg-[#181818] hover:bg-[#242424] border border-white/40 hover:border-white text-white font-mono text-xs font-bold uppercase tracking-wider py-3 px-4 min-h-[44px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Building2 className="w-4 h-4" />
                <span>Lanjutkan sebagai Penyelenggara / EO</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setPendingGoogle(null)
                  setErrorMessage(null)
                }}
                className="w-full text-[#808080] hover:text-white font-mono text-[11px] uppercase tracking-wider py-2 min-h-[44px] cursor-pointer"
              >
                Batal &amp; Kembali ke Form Login
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email Field */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-2 flex items-center justify-between"
            >
              <span>Email Akun *</span>
              <span className="text-[10px] text-[#707070] font-mono">STEP 01</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email"
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

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="login-password"
                className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] flex items-center gap-2"
              >
                <span>Kata Sandi *</span>
              </label>
              <Link
                to="/forgot-password"
                className="text-[11px] font-mono text-white/80 hover:text-[#E01E37] hover:underline transition-colors"
              >
                Lupa Sandi?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-widest py-3.5 px-6 min-h-[48px] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:translate-y-[1px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>MEMVERIFIKASI...</span>
              </>
            ) : (
              <>
                <span>MASUK SEKARANG</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
        )}

        {/* Google Auth Onboarding or Sign-In Divider */}
        {pendingGoogle ? null : hasGoogleClient && (
          <div className="mt-6">
            <div className="relative flex items-center justify-center mb-4">
              <div className="border-t border-[#262626] w-full" />
              <span className="bg-[#111111] px-3 text-[10px] font-mono uppercase tracking-widest text-[#707070] whitespace-nowrap">
                ATAU MASUK DENGAN GOOGLE
              </span>
              <div className="border-t border-[#262626] w-full" />
            </div>
            <div className="w-full flex justify-center min-h-[44px]">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setErrorMessage('Popup Google Sign-In dibatalkan atau gagal memuat.')}
                theme="filled_black"
                size="large"
                shape="rectangular"
                text="signin_with"
                width="300"
              />
            </div>
          </div>
        )}

        {/* Demo Accounts Quick-Fill Section (Local Development Only) */}
        {import.meta.env.DEV && (
        <div className="mt-8 pt-6 border-t border-dashed border-[#262626]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#E01E37] flex items-center gap-1.5 font-bold">
              <Zap className="w-3.5 h-3.5" />
              DEMO LOGIN PENGUJIAN
            </span>
            <span className="text-[10px] font-mono text-[#707070]">1-KLIK TEST</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('kelana@panggunglokal.id', 'Password123!')}
              disabled={loading}
              className="px-3 py-2.5 bg-[#181818] hover:bg-[#202020] border border-[#2E2E2E] hover:border-[#E01E37] text-left transition-all min-h-[44px] flex flex-col justify-center cursor-pointer group"
            >
              <span className="text-xs font-mono text-white group-hover:text-[#E01E37] font-bold">
                Band Kelana
              </span>
              <span className="text-[10px] text-[#808080] font-mono">Musisi / Rock</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('senjabersuara@panggunglokal.id', 'Password123!')}
              disabled={loading}
              className="px-3 py-2.5 bg-[#181818] hover:bg-[#202020] border border-[#2E2E2E] hover:border-[#E01E37] text-left transition-all min-h-[44px] flex flex-col justify-center cursor-pointer group"
            >
              <span className="text-xs font-mono text-white group-hover:text-[#E01E37] font-bold">
                Band Senja
              </span>
              <span className="text-[10px] text-[#808080] font-mono">Musisi / Folk</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('kafe.selatan@gmail.com', 'Password123!')}
              disabled={loading}
              className="px-3 py-2.5 bg-[#181818] hover:bg-[#202020] border border-[#2E2E2E] hover:border-white text-left transition-all min-h-[44px] flex flex-col justify-center cursor-pointer group"
            >
              <span className="text-xs font-mono text-white font-bold">
                EO Kafe Selatan
              </span>
              <span className="text-[10px] text-[#808080] font-mono">Penyelenggara</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('admin@admin.com', 'admin')}
              disabled={loading}
              className="px-3 py-2.5 bg-[#181818] hover:bg-[#202020] border border-[#2E2E2E] hover:border-[#E01E37] text-left transition-all min-h-[44px] flex flex-col justify-center cursor-pointer group"
            >
              <span className="text-xs font-mono text-white group-hover:text-[#E01E37] font-bold">
                Super Admin
              </span>
              <span className="text-[10px] text-[#808080] font-mono">Admin KPI</span>
            </button>
          </div>
        </div>
        )}

        {/* Footer Navigation Switcher */}
        <div className="mt-6 pt-5 border-t border-[#222222] text-center">
          <p className="text-xs text-[#909090] font-sans">
            Belum memiliki akun terdaftar?{' '}
            <Link
              to={redirectParam ? `/daftar?redirect=${encodeURIComponent(redirectParam)}` : '/daftar'}
              className="text-[#E01E37] hover:underline font-mono font-bold uppercase tracking-wider ml-1 inline-flex items-center gap-1"
            >
              <span>Daftar Sekarang</span>
              <span>▸</span>
            </Link>
          </p>
        </div>
      </div>

      {/* Security Telemetry Footer Stamp */}
      <div className="mt-8 text-center z-10">
        <p className="text-[10px] font-mono text-[#555555] tracking-widest uppercase">
          SECURE CONNECTION // SHA-256 JWT AUTH // REFFBAND ENGINE
        </p>
      </div>
    </div>
  )
}
