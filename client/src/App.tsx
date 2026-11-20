import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom'
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
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute requiredRole="band">
                    <BandDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard-band.html"
                element={
                  <ProtectedRoute requiredRole="band">
                    <BandDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/account"
                element={
                  <ProtectedRoute requiredRole="band">
                    <BandDashboardPage />
                  </ProtectedRoute>
                }
              />
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
              <Route path="*" element={<HomePage stats={stats} />} />
            </Routes>
          </main>

          {/* Persistent Footer */}
          <Footer />
        </div>
      </BrowserRouter>
    </GoogleOAuthProvider>
  )
}
