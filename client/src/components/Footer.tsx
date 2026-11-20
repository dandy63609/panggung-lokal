import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight, Mail } from 'lucide-react'
import { InstagramIcon } from './ui/SocialIcons'
import { authClient } from '../lib/auth'

const CURRENT_YEAR = new Date().getFullYear()

export const Footer: React.FC = () => {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const user = authClient.getUser()
    setIsAdmin(user?.accountType === 'admin')
  }, [])

  return (
    <footer className="w-full bg-[#080808] border-t border-[#242424] pt-16 pb-12 text-[#9E9E9E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 md:grid-cols-2 ${isAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-10 pb-12 border-b border-[#1E1E1E]`}>
          {/* Brand Col */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="reffband"
                className="h-10 w-auto object-contain"
              />
              <span className="font-display font-extrabold text-white text-xl tracking-wider">
                REFF<span className="text-[#E01E37]">BAND</span>
              </span>
            </div>
            <p className="text-sm text-[#757575] leading-relaxed max-w-sm">
              Infrastruktur digital terbuka yang menghubungkan band independen Indonesia dengan penyelenggara acara panggung, kafe, dan festival kampus secara langsung tanpa perantara.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href="https://www.instagram.com/reffband.official/"
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#141414] hover:bg-[#1E1E1E] hover:border-[#E01E37] text-white border border-[#2A2A2A] transition-all rounded-sm shadow-sm group"
                aria-label="Instagram @reffband.official"
                title="Instagram @reffband.official"
              >
                <InstagramIcon className="w-5 h-5 text-white transition-transform group-hover:scale-110" />
              </a>
            </div>
          </div>

          {/* Links 1 */}
          <div>
            <h4 className="font-mono text-xs text-white uppercase tracking-widest mb-4 font-bold">
              01 // Navigasi
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li>
                <a href="/#tentang" className="hover:text-white transition-colors">Tentang Platform</a>
              </li>
              <li>
                <a href="/cari-band" className="hover:text-white transition-colors">Katalog Musisi</a>
              </li>
              <li>
                <a href="/#stage" className="hover:text-white transition-colors">Technical Rider</a>
              </li>
              <li>
                <a href="/#faq" className="hover:text-white transition-colors">Tanya Jawab</a>
              </li>
              <li>
                <a href="/#pengaduan" className="hover:text-white transition-colors">Pengaduan &amp; Saran</a>
              </li>
            </ul>
          </div>

          {/* Links 2 */}
          <div>
            <h4 className="font-mono text-xs text-white uppercase tracking-widest mb-4 font-bold">
              02 // Ekosistem
            </h4>
            <ul className="space-y-2.5 text-xs font-mono">
              <li>
                <Link to="/daftar" className="hover:text-white transition-colors">Daftarkan Band</Link>
              </li>
              <li>
                <Link to="/masuk" className="hover:text-white transition-colors">Portal Penyelenggara</Link>
              </li>
              <li>
                <Link to="/cari-band?genre=rock" className="hover:text-white transition-colors">Genre Rock & Metal</Link>
              </li>
              <li>
                <Link to="/cari-band?genre=indie" className="hover:text-white transition-colors">Indie Pop & Folk</Link>
              </li>
            </ul>
          </div>

          {/* Links 3 - Pengaduan, Kritik & Saran */}
          <div>
            <h4 className="font-mono text-xs text-white uppercase tracking-widest mb-4 font-bold">
              03 // Pengaduan
            </h4>
            <div className="space-y-2.5 text-xs font-mono">
              <p className="text-[11px] text-[#757575] leading-relaxed">
                Punya pengaduan kendala, kritik, atau saran pengembangan?
              </p>
              <div className="pt-1">
                <a
                  href="mailto:reffband1@gmail.com?subject=Pengaduan%2C%20Kritik%20%26%20Saran%20-%20Reffband"
                  className="inline-flex items-center gap-1.5 text-xs text-white hover:text-[#E01E37] transition-colors break-all group font-bold"
                  title="Kirim email ke reffband1@gmail.com"
                >
                  <Mail className="w-3.5 h-3.5 text-[#E01E37] shrink-0" />
                  <span className="underline underline-offset-4 decoration-[#333333] group-hover:decoration-[#E01E37]">
                    reffband1@gmail.com
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Links 4 - Hanya tampil khusus akun Admin */}
          {isAdmin && (
            <div>
              <h4 className="font-mono text-xs text-[#00D9FF] uppercase tracking-widest mb-4 font-bold">
                04 // Sistem (Admin)
              </h4>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#E01E37] animate-pulse" />
                  <span className="text-white">API Gateway Aktif</span>
                </div>
                <p className="text-[11px] text-[#616161]">
                  Node.js Express 5 + PostgreSQL
                </p>
                <div className="pt-2">
                  <a
                    href="/health"
                    className="inline-flex items-center gap-1 text-[11px] text-[#00D9FF] hover:underline"
                  >
                    <span>Cek Status Gateway</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#616161]">
          <div>
            © {CURRENT_YEAR} reffband. Seluruh hak cipta dilindungi.
          </div>
          <div className="flex gap-6">
            <span>Standar Aksesibilitas WCAG AA</span>
            <span>Versi Produksi 1.0.0</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
