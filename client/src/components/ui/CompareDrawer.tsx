import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Sliders, X, Phone, ArrowUpRight, Trash2 } from 'lucide-react'
import type { Band } from '../../types'
import { formatRupiah } from '../../lib/utils'
import { authClient } from '../../lib/auth'
import { formatWhatsAppPhone, getBandProfileUrl } from '../../lib/bandHelpers'

interface CompareDrawerProps {
  comparedBands: Band[]
  onRemove: (bandId: number) => void
  onClear: () => void
}

export const CompareDrawer: React.FC<CompareDrawerProps> = ({
  comparedBands,
  onRemove,
  onClear,
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleWaClick = (targetBand: Band, url: string) => {
    try {
      const user = authClient.getUser()
      if (user && targetBand.id) {
        fetch('/api/connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authClient.getAuthHeaders(),
          },
          body: JSON.stringify({
            bandProfileId: targetBand.id,
            connectionType: 'compare_whatsapp',
            notes: `Comparison drawer WA contact: ${targetBand.bandName}`,
          }),
        }).catch(() => {})
      }
    } catch {
      // Non-blocking
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (comparedBands.length === 0) return null

  return (
    <>
      {/* 1. FLOATING ACTION BUTTON (Compare FAB) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Buka komparasi ${comparedBands.length} band`}
          className="relative w-14 h-14 bg-[#E01E37] hover:bg-[#C71B30] text-white flex items-center justify-center shadow-[0_4px_24px_rgba(224,30,55,0.7)] transition-all hover:scale-105"
        >
          <Sliders className="w-6 h-6" />

          {/* Badge Count */}
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#141414] border-2 border-[#E01E37] text-white font-mono text-[11px] font-bold flex items-center justify-center rounded-full">
            {comparedBands.length}
          </span>
        </button>
      </div>

      {/* 2. COMPARISON BOTTOM DRAWER */}
      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs"
            aria-hidden="true"
          />

          <section
            role="dialog"
            aria-label="Panel Komparasi Band"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-[#141414] border-t-2 border-[#E01E37] shadow-[0_-20px_50px_rgba(0,0,0,0.95)] overflow-y-auto p-6 md:p-8"
          >
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 bg-[#E01E37]" />
                  <h3 className="font-mono text-sm md:text-base font-bold uppercase tracking-wider text-white">
                    KOMPARASI TEKNIS BAND ({comparedBands.length} TERPILIH)
                  </h3>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={onClear}
                    className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] hover:text-[#E01E37] transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Semua</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    aria-label="Tutup komparasi"
                    className="p-1.5 bg-[#202020] text-white hover:bg-[#303030] transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Grid of Compared Bands */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {comparedBands.map((band) => {
                  const isMasked = Boolean(band.phone && band.phone.includes('x'))
                  const cleanPhone = formatWhatsAppPhone(band.phone, '')
                  const canChatWa = Boolean(cleanPhone && !isMasked)
                  const waUrl = canChatWa
                    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Halo Management ${band.bandName}, kami tertarik mengundang Anda tampil melalui Reffband.`)}`
                    : null
                  const budgetText = band.budgetMin && band.budgetMax
                    ? `${formatRupiah(band.budgetMin)} - ${formatRupiah(band.budgetMax)}`
                    : band.budgetMin
                    ? `Mulai ${formatRupiah(band.budgetMin)}`
                    : 'Hubungi untuk rate'

                  return (
                    <div
                      key={band.id}
                      className="bg-[#1A1A1A] border border-[#2E2E2E] p-4 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span className="font-mono text-[10px] uppercase font-bold text-[#E01E37] bg-[#E01E37]/15 px-2 py-0.5 border border-[#E01E37]/30">
                              {band.genre || 'INDIE'}
                            </span>
                            <h4 className="font-mono text-base font-bold uppercase text-white">
                              {band.bandName}
                            </h4>
                            <p className="font-mono text-[11px] text-[#A0A0A0]">
                              {band.locationCity || 'INDONESIA'}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => onRemove(band.id)}
                            aria-label={`Hapus ${band.bandName}`}
                            className="p-1 text-[#808080] hover:text-[#E01E37] transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Specs Table */}
                        <div className="bg-[#121212] p-3 border border-[#262626] space-y-2 text-xs font-mono">
                          <div className="flex justify-between text-[#A0A0A0]">
                            <span>Estimasi Fee:</span>
                            <span className="text-white font-bold">{budgetText}</span>
                          </div>
                          <div className="flex justify-between text-[#A0A0A0]">
                            <span>Level Suara FOH:</span>
                            <span className="text-[#00D9FF]">
                              {band.genre?.toLowerCase().includes('metal')
                                ? '120 dB SPL'
                                : band.genre?.toLowerCase().includes('dangdut')
                                ? '118 dB SPL'
                                : band.genre?.toLowerCase().includes('rock')
                                ? '112 dB SPL'
                                : '96 dB SPL'}
                            </span>
                          </div>
                          <div className="flex justify-between text-[#A0A0A0]">
                            <span>Soundcheck:</span>
                            <span className="text-[#25D366]">TERKALIBRASI</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#262626]">
                        <Link
                          to={getBandProfileUrl(band)}
                          onClick={() => setIsOpen(false)}
                          className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#262626] hover:bg-[#333333] transition-colors"
                        >
                          <span>Rider</span>
                          <ArrowUpRight className="w-3.5 h-3.5 text-[#E01E37]" />
                        </Link>

                        {waUrl ? (
                          <button
                            type="button"
                            onClick={() => handleWaClick(band, waUrl)}
                            className="min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white bg-[#25D366] hover:bg-[#1EBE5D] transition-colors cursor-pointer"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>WA</span>
                          </button>
                        ) : isMasked ? (
                          <Link
                            to="/masuk"
                            onClick={() => setIsOpen(false)}
                            title="Masuk akun untuk membuka nomor WhatsApp lengkap"
                            className="min-h-[44px] flex items-center justify-center gap-1 text-xs font-mono font-bold uppercase tracking-wider text-[#A0A0A0] hover:text-white bg-[#222222] hover:bg-[#2A2A2A] border border-[#333333] transition-colors"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#E01E37]" />
                            <span>Masuk</span>
                          </Link>
                        ) : (
                          <span
                            className="min-h-[44px] flex items-center justify-center text-xs font-mono text-[#666] bg-[#222222]"
                            title="Nomor WhatsApp belum dicantumkan"
                          >
                            N/A
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  )
}
