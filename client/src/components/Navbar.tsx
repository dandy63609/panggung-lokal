import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ArrowUpRight, Search, LogOut, LayoutDashboard } from 'lucide-react'
import { Button } from './ui/Button'
import { authClient, type AuthUser } from '../lib/auth'

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authClient.getUser())
  const location = useLocation()
  const isCariBand = location.pathname.startsWith('/cari-band') || location.pathname.startsWith('/search')
  const isHome = location.pathname === '/'

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
        <nav className="hidden lg:flex items-center gap-8">
          <Link
            to="/"
            className={`text-xs font-mono uppercase tracking-wider transition-colors py-2 ${
              isHome
                ? 'font-bold text-white border-b-2 border-[#E01E37]'
                : 'font-medium text-[#A0A0A0] hover:text-white'
            }`}
          >
            Beranda
          </Link>
          <Link
            to="/cari-band"
            className={`text-xs font-mono uppercase tracking-wider transition-colors py-2 ${
              isCariBand
                ? 'font-bold text-white border-b-2 border-[#E01E37]'
                : 'font-medium text-[#A0A0A0] hover:text-white'
            }`}
          >
            Cari Band
          </Link>
          <a
            href="/#tentang"
            className="text-xs font-mono font-medium text-[#A0A0A0] hover:text-white uppercase tracking-wider transition-colors py-2"
          >
            Tentang
          </a>
          <a
            href="/#stage"
            className="text-xs font-mono font-medium text-[#A0A0A0] hover:text-white uppercase tracking-wider transition-colors py-2"
          >
            Technical Rider
          </a>
          <a
            href="/#faq"
            className="text-xs font-mono font-medium text-[#A0A0A0] hover:text-white uppercase tracking-wider transition-colors py-2"
          >
            FAQ
          </a>
        </nav>

        {/* Right Auth & Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <Link
            to="/cari-band"
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-all min-h-[44px] rounded-sm border ${
              isCariBand
                ? 'bg-[#E01E37] text-white border-[#E01E37]'
                : 'text-[#F5F5F5] bg-[#1A1A1A] hover:bg-[#222222] border-[#2C2C2C] hover:border-[#E01E37]'
            }`}
          >
            <Search className={`w-3.5 h-3.5 ${isCariBand ? 'text-white' : 'text-[#E01E37]'}`} />
            <span>Cari</span>
          </Link>

          {currentUser ? (
            <div className="flex items-center gap-2">
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
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block text-sm font-mono py-2.5 px-3 border ${
              isHome
                ? 'text-white bg-[#E01E37]/20 border-[#E01E37]'
                : 'text-white bg-[#1A1A1A] border-[#2C2C2C]'
            }`}
          >
            Beranda
          </Link>
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
          <a
            href="/#tentang"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-mono text-[#A0A0A0] hover:text-[#E01E37] py-2.5 px-3 bg-[#1A1A1A] border border-[#2C2C2C]"
          >
            Tentang reffband
          </a>
          <a
            href="/#stage"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-mono text-[#A0A0A0] hover:text-[#E01E37] py-2.5 px-3 bg-[#1A1A1A] border border-[#2C2C2C]"
          >
            Technical Rider
          </a>
          <a
            href="/#faq"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-mono text-[#A0A0A0] hover:text-[#E01E37] py-2.5 px-3 bg-[#1A1A1A] border border-[#2C2C2C]"
          >
            FAQ
          </a>
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
