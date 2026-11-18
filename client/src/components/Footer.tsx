import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

const CURRENT_YEAR = new Date().getFullYear()

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#080808] border-t border-[#242424] pt-16 pb-12 text-[#9E9E9E]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[#1E1E1E]">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
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
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2A2A2A] transition-colors text-xs font-mono font-bold"
                aria-label="Instagram reffband"
              >
                IG
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noreferrer"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2A2A2A] transition-colors text-xs font-mono font-bold"
                aria-label="YouTube reffband"
              >
                YT
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-[#141414] hover:bg-[#1E1E1E] text-white border border-[#2A2A2A] transition-colors text-xs font-mono font-bold"
                aria-label="GitHub Repository"
              >
                GH
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
                <Link to="/cari-band" className="hover:text-white transition-colors">Genre Rock & Metal</Link>
              </li>
              <li>
                <Link to="/cari-band" className="hover:text-white transition-colors">Indie Pop & Folk</Link>
              </li>
            </ul>
          </div>

          {/* Links 3 */}
          <div>
            <h4 className="font-mono text-xs text-white uppercase tracking-widest mb-4 font-bold">
              03 // Sistem
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
                  className="inline-flex items-center gap-1 text-[11px] text-[#E01E37] hover:underline"
                >
                  <span>Cek Status Server</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
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
