import React, { useState } from 'react'
import { Mail, Send, Check, Copy, ArrowUpRight } from 'lucide-react'
import { Badge } from '../ui/Badge'

export const FeedbackSection: React.FC = () => {
  const [copied, setCopied] = useState(false)
  const email = 'reffband1@gmail.com'

  const handleCopy = () => {
    navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <section id="pengaduan" className="py-24 bg-[#0A0A0A] border-b border-[#242424] relative overflow-hidden">
      {/* Background Subtle Grid Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] bg-[size:32px_32px]"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Heading & Description */}
          <div className="lg:col-span-7 space-y-5">
            <Badge variant="red" dot>
              06 // PUSAT PENGADUAN &amp; SARAN
            </Badge>

            <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight uppercase leading-none">
              SUARA ANDA MEMBANGUN <span className="text-[#E01E37]">REFFBAND</span>
            </h2>

            <p className="text-base text-[#A0A0A0] leading-relaxed max-w-xl font-sans">
              Menemukan kendala teknis, memiliki laporan terkait band/penyelenggara, atau memiliki kritik dan saran untuk pengembangan platform? Tim kami terbuka untuk setiap masukan demi ekosistem panggung musik yang lebih baik.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono text-[#757575]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#25D366]" />
                <span>Respon Maksimal 1x24 Jam</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00D9FF]" />
                <span>Terbuka untuk Musisi &amp; Penyelenggara</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Email Card */}
          <div className="lg:col-span-5">
            <div className="bg-[#121212] border border-[#262626] rounded-2xl p-6 sm:p-8 shadow-2xl relative group hover:border-[#E01E37]/60 transition-all">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#E01E37]/15 border border-[#E01E37]/40 flex items-center justify-center text-[#E01E37]">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-white uppercase tracking-wider">
                    Kanal Email Resmi
                  </h3>
                  <p className="text-xs text-[#757575] font-mono">
                    Pengaduan, Saran &amp; Masukan
                  </p>
                </div>
              </div>

              {/* Email Box with Copy Button */}
              <div className="p-3.5 bg-[#181818] border border-[#2E2E2E] rounded-lg flex items-center justify-between gap-3 mb-6">
                <span className="font-mono text-xs sm:text-sm text-white select-all font-bold tracking-wide break-all">
                  {email}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1.5 bg-[#242424] hover:bg-[#303030] text-xs font-mono text-[#A0A0A0] hover:text-white rounded border border-[#3A3A3A] transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Salin alamat email"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#25D366]" />
                      <span className="text-[#25D366]">Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin</span>
                    </>
                  )}
                </button>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <a
                  href={`mailto:${email}?subject=Pengaduan%2C%20Kritik%20%26%20Saran%20-%20Reffband`}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider rounded-sm transition-all shadow-[0_0_20px_rgba(224,30,55,0.3)] hover:shadow-[0_0_25px_rgba(224,30,55,0.5)] cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim Email Pengaduan</span>
                  <ArrowUpRight className="w-4 h-4 ml-auto" />
                </a>

                <p className="text-[11px] font-mono text-[#616161] text-center">
                  Subjek otomatis terformat ke aplikasi email Anda
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
