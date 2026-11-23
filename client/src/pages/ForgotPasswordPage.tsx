import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Lock,
  Mail,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const urlToken = searchParams.get('token') || ''
  const [prevUrlToken, setPrevUrlToken] = useState(urlToken)

  const [step, setStep] = useState<'request' | 'reset'>(urlToken ? 'reset' : 'request')
  const [email, setEmail] = useState('')
  const [token, setToken] = useState(urlToken)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  if (urlToken !== prevUrlToken) {
    setPrevUrlToken(urlToken)
    if (urlToken) {
      setToken(urlToken)
      setStep('reset')
    }
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setErrorMessage('Masukkan alamat email akun yang terdaftar.')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Format alamat email tidak valid.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail }),
      })
      const data = await res.json().catch(() => ({}))

      if (data.success) {
        if (data.resetToken) {
          setToken(data.resetToken)
          setSuccessMessage('Token pemulihan dibuat. Silakan atur kata sandi baru Anda di bawah ini.')
          setStep('reset')
        } else {
          setSuccessMessage(
            data.message || 'Jika email terdaftar, instruksi pemulihan kata sandi telah diproses.'
          )
        }
      } else {
        setErrorMessage(
          data.message || data.error?.message || 'Gagal memproses permintaan pemulihan kata sandi.'
        )
      }
    } catch {
      setErrorMessage('Terjadi kendala koneksi ke server auth. Silakan coba sesaat lagi.')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    if (!token.trim()) {
      setErrorMessage('Token reset kata sandi tidak ditemukan. Silakan ajukan permintaan ulang.')
      return
    }

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru minimal terdiri dari 6 karakter.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi tidak cocok.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      })
      const data = await res.json().catch(() => ({}))

      if (data.success) {
        setSuccessMessage('Kata sandi berhasil diperbarui! Mengalihkan ke halaman masuk...')
        setTimeout(() => {
          navigate('/masuk')
        }, 1200)
      } else {
        setErrorMessage(data.message || data.error?.message || 'Gagal memperbarui kata sandi.')
        setLoading(false)
      }
    } catch {
      setErrorMessage('Terjadi kendala koneksi ke server auth. Silakan coba sesaat lagi.')
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
          to="/masuk"
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#A0A0A0] hover:text-white transition-colors min-h-[44px] px-2 py-2"
        >
          <ArrowLeft className="w-4 h-4 text-[#E01E37]" />
          <span>Kembali ke Masuk</span>
        </Link>
        <span className="text-[11px] font-mono text-white flex items-center gap-1.5 px-2.5 py-1 bg-[#141414] border border-[#2E2E2E]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E01E37] animate-pulse" />
          RECOVERY MODE
        </span>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-[#111111] border border-[#262626] p-6 sm:p-8 relative shadow-2xl z-10">
        <div className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-[#E01E37] to-transparent" />

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#1A1A1A] border border-[#2F2F2F] text-[10px] font-mono uppercase tracking-widest text-[#E01E37] mb-3">
            <KeyRound className="w-3.5 h-3.5" />
            <span>reffband Security</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl tracking-wider text-white">
            {step === 'request' ? (
              <>
                LUPA <span className="text-[#E01E37]">SANDI</span>
              </>
            ) : (
              <>
                RESET <span className="text-[#E01E37]">SANDI</span>
              </>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-[#A0A0A0] font-sans mt-2 max-w-xs mx-auto">
            {step === 'request'
              ? 'Masukkan email akun terdaftar untuk membuat token pemulihan kata sandi.'
              : 'Buat kata sandi baru minimal 6 karakter untuk kembali mengakses akun Anda.'}
          </p>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div
            role="alert"
            aria-live="assertive"
            className="mb-6 p-3.5 bg-[#E01E37]/15 border border-[#E01E37] text-white text-xs font-sans flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 text-[#E01E37] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Success Banner */}
        {successMessage && (
          <div
            role="status"
            aria-live="polite"
            className="mb-6 p-3.5 bg-[#181818] border border-white text-white text-xs font-sans flex items-start gap-2.5"
          >
            <CheckCircle2 className="w-4 h-4 text-[#E01E37] shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">{successMessage}</div>
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} noValidate className="space-y-5">
            <div>
              <label
                htmlFor="forgot-email"
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
                  id="forgot-email"
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

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-widest py-3.5 px-6 min-h-[48px] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>MEMPROSES...</span>
                </>
              ) : (
                <>
                  <span>KIRIM TOKEN PEMULIHAN</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="reset-new-password"
                className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5 flex items-center justify-between"
              >
                <span>Kata Sandi Baru *</span>
                <span className="text-[10px] text-[#707070] font-mono">MIN 6 KARAKTER</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reset-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#606060] text-sm pl-10 pr-12 py-3 min-h-[44px] transition-colors outline-none font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 pl-2 flex items-center text-[#707070] hover:text-white transition-colors min-w-[44px] min-h-[44px] justify-center"
                  aria-label={showNewPassword ? 'Sembunyikan kata sandi baru' : 'Tampilkan kata sandi baru'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="reset-confirm-password"
                className="block text-xs font-mono uppercase tracking-wider text-[#D0D0D0] mb-1.5"
              >
                Ulangi Kata Sandi Baru *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#707070]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="reset-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ketik ulang kata sandi baru"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#606060] text-sm pl-10 pr-12 py-3 min-h-[44px] transition-colors outline-none font-sans"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 pl-2 flex items-center text-[#707070] hover:text-white transition-colors min-w-[44px] min-h-[44px] justify-center"
                  aria-label={showConfirmPassword ? 'Sembunyikan konfirmasi kata sandi' : 'Tampilkan konfirmasi kata sandi'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-widest py-3.5 px-6 min-h-[48px] flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(224,30,55,0.35)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>MENYIMPAN SANDI...</span>
                </>
              ) : (
                <>
                  <span>SIMPAN KATA SANDI BARU</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Switcher */}
        <div className="mt-6 pt-5 border-t border-[#222222] text-center">
          <p className="text-xs text-[#909090] font-sans">
            Ingat kata sandi akun Anda?{' '}
            <Link
              to="/masuk"
              className="text-[#E01E37] hover:underline font-mono font-bold uppercase tracking-wider ml-1 inline-flex items-center gap-1"
            >
              <span>Masuk Sekarang</span>
              <span>▸</span>
            </Link>
          </p>
        </div>
      </div>

      {/* Security Stamp */}
      <div className="mt-8 text-center z-10">
        <p className="text-[10px] font-mono text-[#555555] tracking-widest uppercase">
          SECURE CONNECTION // TOKEN RECOVERY // REFFBAND ENGINE
        </p>
      </div>
    </div>
  )
}
