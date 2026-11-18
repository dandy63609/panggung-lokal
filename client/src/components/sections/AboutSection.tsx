import React from 'react'
import { Sparkles, Users, SlidersHorizontal, ShieldCheck } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export const AboutSection: React.FC = () => {
  return (
    <section id="tentang" className="py-24 bg-[#0D0D0D] border-b border-[#242424] relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[#E01E37]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="space-y-3 mb-16 max-w-3xl">
          <Badge variant="red" dot>
            01 // TENTANG REFFBAND
          </Badge>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight uppercase">
            MENGAPA REFFBAND DIBUAT?
          </h2>
          <p className="text-base sm:text-lg text-[#A0A0A0] leading-relaxed">
            Selama bertahun-tahun, ekosistem musik independen di Indonesia terhambat oleh minimnya transparansi dan ketergantungan pada relasi informal. Reffband hadir sebagai jembatan digital terbuka yang menghubungkan musisi berbakat langsung dengan panggung tempat mereka layak bersinar.
          </p>
        </div>

        {/* Narrative Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-16">
          {/* Left Feature Summary / Logo Centerpiece */}
          <div className="lg:col-span-5 bg-[#141414] border border-[#2A2A2A] p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="Logo Reffband"
                  className="h-16 w-auto object-contain"
                />
                <div>
                  <h3 className="font-display font-bold text-xl text-white">
                    REFF<span className="text-[#E01E37]">BAND</span>
                  </h3>
                  <span className="text-xs font-mono text-[#E01E37] tracking-wider uppercase">
                    Inisiatif Terbuka Musik Lokal
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-sm text-[#B0B0B0] leading-relaxed">
                <p>
                  Banyak band potensial kesulitan mendapatkan panggung karena tidak memiliki jaringan manajerial yang mapan, sementara kafe dan penyelenggara acara kampus sering kesulitan mencari penampil yang cocok dengan tema dan anggaran mereka.
                </p>
                <p>
                  Reffband memotong mata rantai birokrasi dan perantara berbayar. Di sini, setiap band memiliki panggung digital mandiri dengan spesifikasi teknis panggung (technical rider) yang transparan dan jalur kontak langsung via WhatsApp.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-[#242424] flex items-center justify-between text-xs font-mono text-[#757575]">
              <span>TIDAK ADA BIAYA PERANTARA</span>
              <span className="text-[#25D366] font-bold">100% DIRECT BOOKING</span>
            </div>
          </div>

          {/* Right 2 Audience Breakdown Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Audience 1: Musisi */}
            <div className="bg-[#161616] border border-[#2A2A2A] hover:border-[#E01E37]/50 transition-colors p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#E01E37]/15 border border-[#E01E37]/30 flex items-center justify-center text-[#E01E37]">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-xl text-white">
                  UNTUK MUSISI LOKAL
                </h4>
                <p className="text-xs font-mono text-[#E01E37] uppercase tracking-wider">
                  Eksposur Mandiri & Bebas
                </p>
                <ul className="space-y-2.5 text-xs text-[#9E9E9E]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#E01E37] font-bold">✓</span>
                    <span>Halaman profil band lengkap dengan audio player dan portofolio live.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#E01E37] font-bold">✓</span>
                    <span>Technical rider panggung yang terstandarisasi agar sound engineer siap.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#E01E37] font-bold">✓</span>
                    <span>Tautan langsung ke WhatsApp manajer band tanpa komisi agen.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-[#242424]">
                <a href="/register.html" className="w-full block">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Daftarkan Band Anda
                  </Button>
                </a>
              </div>
            </div>

            {/* Audience 2: Penyelenggara */}
            <div className="bg-[#161616] border border-[#2A2A2A] hover:border-[#00D9FF]/50 transition-colors p-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-[#00D9FF]/15 border border-[#00D9FF]/30 flex items-center justify-center text-[#00D9FF]">
                  <SlidersHorizontal className="w-6 h-6" />
                </div>
                <h4 className="font-display font-bold text-xl text-white">
                  UNTUK PENYELENGGARA
                </h4>
                <p className="text-xs font-mono text-[#00D9FF] uppercase tracking-wider">
                  Kurasi Cepat & Tepat
                </p>
                <ul className="space-y-2.5 text-xs text-[#9E9E9E]">
                  <li className="flex items-start gap-2">
                    <span className="text-[#00D9FF] font-bold">✓</span>
                    <span>Filter pencarian spesifik berdasarkan genre musik, kota asal, dan estimasi honor.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00D9FF] font-bold">✓</span>
                    <span>Periksa kebutuhan panggung sebelum menghubungi band.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-[#00D9FF] font-bold">✓</span>
                    <span>Komunikasi instan untuk konfirmasi tanggal manggung dan kesepakatan acara.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-6 mt-6 border-t border-[#242424]">
                <a href="/search.html" className="w-full block">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    Jelajahi Musisi
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Core Values Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="p-4 bg-[#121212] border border-[#222222] flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-[#25D366] shrink-0" />
            <div>
              <div className="text-xs font-bold text-white uppercase font-mono">Transparansi Penuh</div>
              <div className="text-[11px] text-[#757575]">Spesifikasi rider dan rate terbuka</div>
            </div>
          </div>
          <div className="p-4 bg-[#121212] border border-[#222222] flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#E01E37] shrink-0" />
            <div>
              <div className="text-xs font-bold text-white uppercase font-mono">Bebas Biaya Perantara</div>
              <div className="text-[11px] text-[#757575]">Kontak langsung tanpa potongan fee</div>
            </div>
          </div>
          <div className="p-4 bg-[#121212] border border-[#222222] flex items-center gap-3">
            <Users className="w-5 h-5 text-[#00D9FF] shrink-0" />
            <div>
              <div className="text-xs font-bold text-white uppercase font-mono">Komunitas Terbuka</div>
              <div className="text-[11px] text-[#757575]">Mendukung regenerasi musisi lokal</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
