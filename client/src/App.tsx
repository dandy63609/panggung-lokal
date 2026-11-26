import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate, Link } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { HomePage } from './pages/HomePage'
import { CariBandPage } from './pages/CariBandPage'
import { BandDetailPage } from './pages/BandDetailPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { BandDashboardPage } from './pages/BandDashboardPage'
import { AdminDashboardPage } from './pages/AdminDashboardPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ReviewGatingModal } from './components/ReviewGatingModal'
import { authClient } from './lib/auth'
import type { PlatformStats } from './types'

// Protected Route Guard for authenticated users
interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: 'band' | 'admin' | 'organizer'
}

function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const user = authClient.getUser()
  const location = useLocation()

  if (!user) {
    return <Navigate to={`/masuk?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />
  }

  if (requiredRole && user.accountType !== requiredRole) {
    if (user.accountType === 'band') {
      return <Navigate to="/dashboard-band" replace />
    }
    return <Navigate to="/cari-band" replace />
  }

  return <>{children}</>
}

// Automatically scrolls to top or target hash on route change
function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const targetId = hash.replace('#', '')
      const el = document.getElementById(targetId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
        return
      }
      const timeout = setTimeout(() => {
        const elDelayed = document.getElementById(targetId)
        if (elDelayed) {
          elDelayed.scrollIntoView({ behavior: 'smooth' })
        }
      }, 120)
      return () => clearTimeout(timeout)
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [pathname, hash])

  return null
}

export default function App() {
  // Activate Lenis smooth scroll coordinated with GSAP ticker
  useSmoothScroll()

  const [stats, setStats] = useState<PlatformStats>({
    totalBands: 8,
    totalGenres: 8,
    curatedBadge: '100% Terkurasi',
  })

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch('/api/bands/stats')
        if (res.ok) {
          const json = await res.json()
          if (json.success && json.data) {
            setStats(json.data)
          }
        }
      } catch {
        // Fallback stats already configured
      }
    }
    loadStats()
  }, [])

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <BrowserRouter>
        <ScrollToTop />
        <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] selection:bg-[#E01E37] selection:text-white flex flex-col font-sans overflow-x-clip w-full max-w-full">
          {/* Review Gating Modal: Mandatory Rating for EOs after event date passes */}
          <ReviewGatingModal />

          {/* Top Navigation Bar */}
          <Navbar />

          {/* Page Routing */}
          <main className="flex-1 overflow-x-clip w-full max-w-full">
            <Routes>
              <Route path="/" element={<HomePage stats={stats} />} />
              <Route path="/cari-band" element={<CariBandPage />} />
              <Route path="/search" element={<CariBandPage />} />
              <Route path="/search.html" element={<CariBandPage />} />
              <Route path="/band/:id" element={<BandDetailPage />} />
              <Route path="/profile/:id" element={<BandDetailPage />} />
              <Route path="/profile.html" element={<BandDetailPage />} />
              <Route path="/masuk" element={<LoginPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/login.html" element={<LoginPage />} />
              <Route path="/daftar" element={<RegisterPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/register.html" element={<RegisterPage />} />
              <Route path="/lupa-sandi" element={<ForgotPasswordPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/forgot-password.html" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password.html" element={<ForgotPasswordPage />} />
              <Route
                path="/dashboard-band"
                element={
                  <ProtectedRoute requiredRole="band">
                    <BandDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/dashboard" element={<Navigate to="/dashboard-band" replace />} />
              <Route path="/dashboard-band.html" element={<Navigate to="/dashboard-band" replace />} />
              <Route path="/account" element={<Navigate to="/dashboard-band" replace />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin.html"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard-admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="*"
                element={
                  <section
                    aria-labelledby="not-found-title"
                    className="min-h-[calc(100vh-160px)] bg-[#0A0A0A] text-white flex flex-col items-center justify-center px-4 py-20 text-center"
                  >
                    <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#E01E37] mb-3">
                      Error 404
                    </p>
                    <h1
                      id="not-found-title"
                      className="font-display text-4xl sm:text-6xl tracking-wide text-white mb-3"
                    >
                      Halaman Tidak Ditemukan
                    </h1>
                    <p className="text-sm text-[#A0A0A0] font-sans max-w-md mb-8 leading-relaxed">
                      Tautan yang Anda buka tidak tersedia atau sudah dipindahkan. Kembali ke beranda atau jelajahi katalog band lokal.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Link
                        to="/"
                        className="min-h-[44px] px-6 py-2.5 bg-[#E01E37] hover:bg-[#B8162B] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E01E37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                      >
                        Kembali ke Beranda
                      </Link>
                      <Link
                        to="/cari-band"
                        className="min-h-[44px] px-6 py-2.5 bg-[#1C1C1C] hover:bg-[#282828] border border-[#333333] text-white font-mono text-xs uppercase tracking-wider flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                      >
                        Jelajahi Band
                      </Link>
                    </div>
                  </section>
                }
              />
            </Routes>
          </main>

          {/* Persistent Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
