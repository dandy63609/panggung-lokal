import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Menu, X, ArrowUpRight, Search, LogOut, LayoutDashboard, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from './ui/Button'
import { authClient, type AuthUser } from '../lib/auth'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [berandaSubmenuOpen, setBerandaSubmenuOpen] = useState(false)
  const [mobileBerandaOpen, setMobileBerandaOpen] = useState(true)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authClient.getUser())
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [navSearchQuery, setNavSearchQuery] = useState(() => searchParams.get('q') || searchParams.get('search') || '')
  const navRef = useRef<HTMLElement>(null)
  const isCariBand = location.pathname.startsWith('/cari-band') || location.pathname.startsWith('/search')
  const isHome = location.pathname === '/'

  useEffect(() => {
    const qParam = searchParams.get('q') || searchParams.get('search') || ''
    setNavSearchQuery(qParam)
  }, [searchParams])

  useEffect(() => {
    const handleAuth = () => {
      setCurrentUser(authClient.getUser())
    }
    window.addEventListener('auth-change', handleAuth)
    window.addEventListener('storage', handleAuth)
    return () => {
      window.removeEventListener('auth-change', handleAuth)
      window.removeEventListener('storage', handleAuth)
    }
  }, [])

  // Close desktop submenu when clicking outside the navigation
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setBerandaSubmenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Close desktop submenu if navigating away from home
  useEffect(() => {
    if (!isHome) {
      setBerandaSubmenuOpen(false)
    }
  }, [location.pathname, isHome])

  const handleScrollToSection = (sectionId: string) => {
    if (isHome) {
      const el = document.getElementById(sectionId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  const handleBerandaClick = () => {
    if (!isHome) {
      navigate('/')
      setBerandaSubmenuOpen(true)
    } else {
      setBerandaSubmenuOpen(prev => !prev)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = navSearchQuery.trim()
    if (trimmed) {
      navigate(`/cari-band?q=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/cari-band')
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0D0D0D]/95 backdrop-blur-md border-b border-[#2C2C2C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand / Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src="/logo.png"
            alt="reffband"
            className="h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-display text-2xl text-white tracking-wider leading-none">
              REFF<span className="text-[#E01E37]">BAND</span>
            </span>
            <span className="text-[10px] font-mono text-[#A0A0A0] tracking-widest uppercase mt-0.5">
              Platform Band Indonesia
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav ref={navRef} className="hidden lg:flex items-center gap-6 xl:gap-8">
          <div className="flex items-center">
            {/* Beranda Toggle Button */}
            <button
              type="button"
              onClick={handleBerandaClick}
              className={`inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider transition-colors py-2 cursor-pointer ${
                isHome
                  ? 'font-bold text-white border-b-2 border-[#E01E37]'
                  : 'font-medium text-[#A0A0A0] hover:text-white'
              }`}
              title="Klik untuk membuka/menutup menu Beranda"
              aria-expanded={berandaSubmenuOpen}
            >
              <span>Beranda</span>
              <ChevronRight
                className={`w-3.5 h-3.5 text-[#E01E37] transition-transform duration-300 ${
                  berandaSubmenuOpen ? 'rotate-90' : 'rotate-0'
                }`}
              />
            </button>

            {/* Horizontal Slide-out Submenu (shifts Cari Band to the right) */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out flex items-center ${
                berandaSubmenuOpen
                  ? 'max-w-[460px] opacity-100 ml-3'
                  : 'max-w-0 opacity-0 ml-0 pointer-events-none'
              }`}
            >
              <div className="flex items-center gap-1 px-2.5 py-1 bg-[#161616] border border-[#2E2E2E] rounded-full whitespace-nowrap shadow-lg">
                <Link
                  to="/#tentang"
                  onClick={() => handleScrollToSection('tentang')}
                  className="text-[11px] font-mono tracking-wider uppercase text-[#B0B0B0] hover:text-white hover:bg-[#242424] px-2.5 py-1 rounded-full transition-colors"
                >
                  Tentang
                </Link>
                <span className="text-[#3A3A3A] text-xs select-none">•</span>
                <Link
                  to="/#stage"
                  onClick={() => handleScrollToSection('stage')}
                  className="text-[11px] font-mono tracking-wider uppercase text-[#B0B0B0] hover:text-white hover:bg-[#242424] px-2.5 py-1 rounded-full transition-colors"
                >
                  Technical Rider
                </Link>
                <span className="text-[#3A3A3A] text-xs select-none">•</span>
                <Link
                  to="/#faq"
                  onClick={() => handleScrollToSection('faq')}
                  className="text-[11px] font-mono tracking-wider uppercase text-[#B0B0B0] hover:text-white hover:bg-[#242424] px-2.5 py-1 rounded-full transition-colors"
                >
                  FAQ
                </Link>
                <span className="text-[#3A3A3A] text-xs select-none">•</span>
                <Link
                  to="/#pengaduan"
                  onClick={() => handleScrollToSection('pengaduan')}
                  className="text-[11px] font-mono tracking-wider uppercase text-[#B0B0B0] hover:text-white hover:bg-[#242424] px-2.5 py-1 rounded-full transition-colors"
                >
                  Pengaduan
                </Link>
              </div>
            </div>
          </div>

          {/* Cari Band - shifts naturally to the right as the sub-menu expands */}
          <Link
            to="/cari-band"
            className={`text-xs font-mono uppercase tracking-wider transition-colors py-2 whitespace-nowrap ${
              isCariBand
                ? 'font-bold text-white border-b-2 border-[#E01E37]'
                : 'font-medium text-[#A0A0A0] hover:text-white'
            }`}
          >
            Cari Band
          </Link>
        </nav>

        {/* Right Auth & Actions */}
        <div className="hidden lg:flex items-center gap-3">
          {currentUser ? (
            <div className="flex items-center gap-2.5">
              {/* Quick Search Input with custom keyword (Hanya saat user sudah login) */}
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={navSearchQuery}
                  onChange={(e) => setNavSearchQuery(e.target.value)}
                  placeholder="Cari nama band..."
                  className="w-36 md:w-44 lg:w-48 xl:w-56 bg-[#161616] hover:bg-[#1D1D1D] focus:bg-[#202020] text-white text-xs font-mono placeholder-[#777777] pl-8 pr-7 py-2 border border-[#2E2E2E] focus:border-[#E01E37] focus:outline-none transition-all rounded-sm min-h-[44px]"
                  aria-label="Cari nama band"
                />
                <button
                  type="submit"
                  className="absolute left-2.5 text-[#A0A0A0] hover:text-[#E01E37] transition-colors cursor-pointer"
                  title="Tekan Enter atau klik untuk mencari band"
                  aria-label="Tombol cari"
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
                {navSearchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setNavSearchQuery('')
                      if (isCariBand) {
                        navigate('/cari-band')
                      }
                    }}
                    className="absolute right-2 text-[#777777] hover:text-white p-0.5 cursor-pointer"
                    title="Hapus kata kunci"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </form>

              {currentUser.accountType === 'band' ? (
                <Link
                  to="/dashboard-band"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] hover:border-[#E01E37] text-white text-xs font-mono tracking-wider transition-all min-h-[44px]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#E01E37]" />
                  <span className="font-bold">DASHBOARD</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#E01E37]/20 text-[#E01E37] font-bold">
                    MUSISI
                  </span>
                </Link>
              ) : currentUser.accountType === 'admin' ? (
                <Link
                  to="/admin"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] hover:border-[#E01E37] text-white text-xs font-mono tracking-wider transition-all min-h-[44px]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#E01E37]" />
                  <span className="font-bold">ADMIN KPI</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#E01E37]/20 text-[#E01E37] font-bold">
                    ADMIN
                  </span>
                </Link>
              ) : (
                <Link
                  to="/cari-band"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-[#1C1C1C] hover:bg-[#252525] border border-[#333333] hover:border-[#E01E37] text-white text-xs font-mono tracking-wider transition-all min-h-[44px]"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-[#E01E37]" />
                  <span className="font-bold">EXPLORE</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-[#2A2A2A] text-[#A0A0A0]">
                    {currentUser.accountType.toUpperCase()}
                  </span>
                </Link>
              )}

              <button
                type="button"
                onClick={() => authClient.logout()}
                className="p-2.5 text-[#A0A0A0] hover:text-[#E01E37] hover:bg-[#1C1C1C] border border-[#2C2C2C] transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Keluar / Logout"
                aria-label="Keluar akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/masuk"
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5] hover:text-white transition-colors min-h-[44px] flex items-center"
              >
                Masuk
              </Link>

              <Link to="/daftar">
                <Button
                  variant="primary"
                  size="sm"
                  icon={<ArrowUpRight className="w-4 h-4" />}
                >
                  Daftar
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden min-w-[44px] min-h-[44px] p-2 flex items-center justify-center text-[#F5F5F5] hover:text-white hover:bg-[#1A1A1A] border border-[#2C2C2C] rounded-sm"
          aria-label="Toggle Menu"
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#141414] border-b border-[#2C2C2C] px-4 pt-4 pb-6 space-y-3">
          {/* Quick Search Mobile (Hanya saat user sudah login) */}
          {currentUser && (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setMobileMenuOpen(false)
                const trimmed = navSearchQuery.trim()
                if (trimmed) {
                  navigate(`/cari-band?q=${encodeURIComponent(trimmed)}`)
                } else {
                  navigate('/cari-band')
                }
              }}
              className="relative flex items-center mb-1"
            >
              <input
                type="text"
                value={navSearchQuery}
                onChange={(e) => setNavSearchQuery(e.target.value)}
                placeholder="Cari nama band..."
                className="w-full bg-[#1A1A1A] text-white text-xs font-mono placeholder-[#777777] pl-9 pr-8 py-2.5 border border-[#2C2C2C] focus:border-[#E01E37] focus:outline-none rounded-sm min-h-[44px]"
                aria-label="Cari nama band"
              />
              <button
                type="submit"
                className="absolute left-3 text-[#A0A0A0] hover:text-[#E01E37]"
                title="Cari"
                aria-label="Cari"
              >
                <Search className="w-4 h-4" />
              </button>
              {navSearchQuery && (
                <button
                  type="button"
                  onClick={() => setNavSearchQuery('')}
                  className="absolute right-3 text-[#777777] hover:text-white p-1"
                  title="Hapus kata kunci"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </form>
          )}

          {/* Beranda Group with Accordion */}
          <div className="border border-[#2C2C2C] bg-[#1A1A1A] rounded-sm overflow-hidden">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                onClick={() => {
                  setMobileMenuOpen(false)
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                }}
                className={`flex-1 text-sm font-mono py-2.5 px-3 ${
                  isHome ? 'text-white font-bold bg-[#E01E37]/20' : 'text-[#F5F5F5]'
                }`}
              >
                Beranda
              </Link>
              <button
                type="button"
                onClick={() => setMobileBerandaOpen(prev => !prev)}
                className="px-3 py-2.5 text-[#A0A0A0] hover:text-white border-l border-[#2C2C2C]"
                aria-label="Toggle Beranda sub-menu"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    mobileBerandaOpen ? 'rotate-180 text-[#E01E37]' : 'text-[#A0A0A0]'
                  }`}
                />
              </button>
            </div>

            {mobileBerandaOpen && (
              <div className="border-t border-[#2C2C2C] bg-[#141414] px-3 py-2 space-y-1">
                <Link
                  to="/#tentang"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleScrollToSection('tentang')
                  }}
                  className="block text-xs font-mono text-[#A0A0A0] hover:text-[#E01E37] py-1.5 px-2 rounded hover:bg-[#1C1C1C]"
                >
                  ↳ Tentang reffband
                </Link>
                <Link
                  to="/#stage"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleScrollToSection('stage')
                  }}
                  className="block text-xs font-mono text-[#A0A0A0] hover:text-[#E01E37] py-1.5 px-2 rounded hover:bg-[#1C1C1C]"
                >
                  ↳ Technical Rider
                </Link>
                <Link
                  to="/#faq"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleScrollToSection('faq')
                  }}
                  className="block text-xs font-mono text-[#A0A0A0] hover:text-[#E01E37] py-1.5 px-2 rounded hover:bg-[#1C1C1C]"
                >
                  ↳ FAQ
                </Link>
                <Link
                  to="/#pengaduan"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    handleScrollToSection('pengaduan')
                  }}
                  className="block text-xs font-mono text-[#A0A0A0] hover:text-[#E01E37] py-1.5 px-2 rounded hover:bg-[#1C1C1C]"
                >
                  ↳ Pengaduan &amp; Saran
                </Link>
              </div>
            )}
          </div>

          <Link
            to="/cari-band"
            onClick={() => setMobileMenuOpen(false)}
            className={`block text-sm font-mono py-2.5 px-3 border ${
              isCariBand
                ? 'text-white bg-[#E01E37]/20 border-[#E01E37]'
                : 'text-[#F5F5F5] hover:text-[#E01E37] bg-[#1A1A1A] border-[#2C2C2C]'
            }`}
          >
            Cari Band
          </Link>
          {currentUser ? (
            <div className="pt-2 space-y-2">
              {currentUser.accountType === 'band' ? (
                <Link
                  to="/dashboard-band"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase text-white bg-[#E01E37] rounded-sm px-3"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Buka Dashboard (BAND)</span>
                </Link>
              ) : currentUser.accountType === 'admin' ? (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase text-white bg-[#E01E37] rounded-sm px-3"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Buka Konsol Admin (KPI)</span>
                </Link>
              ) : (
                <Link
                  to="/cari-band"
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase text-white bg-[#E01E37] rounded-sm px-3"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Jelajahi Band ({currentUser.accountType.toUpperCase()})</span>
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  authClient.logout()
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 text-xs font-mono font-bold uppercase text-[#A0A0A0] hover:text-white bg-[#222222] border border-[#2C2C2C] rounded-sm cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Akun</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 grid grid-cols-2 gap-2">
              <Link
                to="/masuk"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center justify-center text-xs font-mono font-bold uppercase text-[#F5F5F5] bg-[#222222] border border-[#2C2C2C] rounded-sm"
              >
                Masuk
              </Link>
              <Link
                to="/daftar"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] flex items-center justify-center text-xs font-mono font-bold uppercase text-white bg-[#E01E37] rounded-sm"
              >
                Daftar
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
