import React from 'react'
import { Link } from 'react-router-dom'
import { Search, Music, Sliders, MessageSquare } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'

export const HowItWorksSection: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'PILIH & FILTER BAND',
      desc: 'Cari berdasarkan genre, kota asal (Bandung, Jakarta, Jogja, Surabaya), dan sesuaikan dengan alokasi anggaran acara Anda.',
      icon: Search,
      color: '#E01E37',
    },
    {
      step: '02',
      title: 'DENGARKAN AUDIO DEMO',
      desc: 'Simak rekaman live performance asli musisi langsung dari web player untuk memastikan kualitas vokal dan aransemen cocok.',
      icon: Music,
      color: '#FF6B35',
    },
    {
      step: '03',
      title: 'TINJAU TECHNICAL RIDER',
      desc: 'Pelajari daftar channel input mixer, mikrofon, dan tata letak panggung sebelum soundcheck demi kelancaran teknis di lokasi.',
      icon: Sliders,
      color: '#00D9FF',
    },
    {
      step: '04',
      title: 'BOOKING VIA WHATSAPP',
      desc: 'Hubungi manajer band secara langsung melalui tautan WhatsApp terenkripsi untuk negosiasi penampilan, rundown, dan pembayaran.',
      icon: MessageSquare,
      color: '#25D366',
    },
  ]

  return (
    <section className="py-24 bg-[#0D0D0D] border-b border-[#242424]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 mb-16 max-w-3xl">
          <Badge variant="green" dot>
            05 // CARA KERJA PLATFORM
          </Badge>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight uppercase">
            EMPAT LANGKAH MENUJU PANGGUNG
          </h2>
          <p className="text-sm sm:text-base text-[#9E9E9E] leading-relaxed">
            Alur kerja yang dirancang ringkas dan transparan bagi penyelenggara gig, event kampus, dan kafe live music.
          </p>
        </div>

        {/* 4 Cards Workflow Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => {
            const Icon = s.icon
            return (
              <div
                key={s.step}
                className="bg-[#141414] border border-[#262626] hover:border-[#383838] p-6 flex flex-col justify-between transition-colors relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span
                      className="font-mono text-2xl font-black"
                      style={{ color: s.color }}
                    >
                      {s.step}
                    </span>
                    <div
                      className="w-10 h-10 flex items-center justify-center border"
                      style={{
                        borderColor: `${s.color}40`,
                        backgroundColor: `${s.color}15`,
                        color: s.color,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-lg text-white mb-2 leading-tight">
                    {s.title}
                  </h3>
                  <p className="text-xs text-[#9E9E9E] leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-[#202020] text-[10px] font-mono text-[#616161] uppercase">
                  Tahap {idx + 1} dari 4
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA Bar */}
        <div className="mt-12 p-8 bg-[#161616] border border-[#2B2B2B] flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-display font-bold text-xl text-white">
              Punya Band dan Ingin Terdaftar di Reffband?
            </h4>
            <p className="text-xs text-[#9E9E9E]">
              Pendaftaran band gratis. Dapatkan profil digital dan panggung baru sekarang.
            </p>
          </div>
          <Link to="/daftar">
            <Button variant="primary" size="md">
              Daftar Sebagai Band
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
