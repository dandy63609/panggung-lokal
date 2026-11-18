import React from 'react'
import { X, Play, Eye, Phone } from 'lucide-react'
import { formatRupiah } from '../../lib/utils'
import type { Band, BandPost } from '../../types'

interface PostViewerModalProps {
  band: Pick<Band, 'bandName' | 'profilePhotoUrl'>
  activePost: BandPost | null
  onClose: () => void
}

export const PostViewerModal: React.FC<PostViewerModalProps> = ({
  band,
  activePost,
  onClose,
}) => {
  if (!activePost) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#101010] border border-[#242424] w-full max-w-3xl overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh] rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[#202020] flex items-center justify-between bg-[#0C0C0C]">
          <div className="flex items-center gap-3">
            <img
              src={band.profilePhotoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200'}
              alt={band.bandName}
              className="w-10 h-10 object-cover rounded-full border border-[#333]"
            />
            <div>
              <div className="font-mono font-bold text-white text-sm uppercase">{band.bandName}</div>
              <div className="font-mono text-[11px] text-white/60">
                {activePost.createdAt
                  ? new Date(activePost.createdAt).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'DOKUMENTASI RESMI'}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-colors rounded-full"
            aria-label="Tutup pratinjau karya"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black flex-1 min-h-[300px] max-h-[500px] flex items-center justify-center overflow-hidden">
          {activePost.mediaType === 'video' ? (
            <div className="w-full h-full flex items-center justify-center relative">
              <img
                src={activePost.mediaUrl || activePost.thumbnailUrl}
                alt="Video thumbnail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <span className="w-16 h-16 rounded-full bg-[#E01E37] text-white flex items-center justify-center shadow-lg">
                  <Play className="w-8 h-8 fill-white ml-1" />
                </span>
              </div>
            </div>
          ) : (
            <img
              src={activePost.mediaUrl || activePost.thumbnailUrl}
              alt="Dokumentasi karya band"
              className="w-full h-full object-contain max-h-[480px]"
            />
          )}
        </div>

        <div className="p-5 border-t border-[#202020] bg-[#0C0C0C] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#E01E37] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {activePost.viewsCount || 0} IMPRESI TAYANGAN
            </span>
            <span className="text-[#666] uppercase">REFFBAND ARCHIVE</span>
          </div>
          <p className="text-sm text-[#D4D4D4] leading-relaxed font-sans">
            {activePost.caption || 'Dokumentasi resmi panggung live musisi terkurasi.'}
          </p>
        </div>
      </div>
    </div>
  )
}

interface DirectBookingModalProps {
  isOpen: boolean
  band: Pick<Band, 'bandName' | 'locationCity'>
  setQuantity: number
  totalPrice: number
  onClose: () => void
  onConfirmWhatsApp: () => void
}

export const DirectBookingModal: React.FC<DirectBookingModalProps> = ({
  isOpen,
  band,
  setQuantity,
  totalPrice,
  onClose,
  onConfirmWhatsApp,
}) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121212] border-2 border-[#E01E37] w-full max-w-lg p-6 sm:p-8 relative shadow-[0_0_50px_rgba(224,30,55,0.3)] rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup modal booking"
          className="absolute top-4 right-4 w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#888] hover:text-white transition-colors rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#E01E37] font-bold block">
            KONTAK LANGSUNG // BOOKING RESMI
          </span>
          <h2 className="font-mono text-2xl font-bold uppercase text-white">{band.bandName}</h2>
        </div>

        <div className="bg-[#0A0A0A] border border-[#222222] p-4 space-y-2 mb-6 font-mono text-xs rounded-xl">
          <div className="flex justify-between py-1 border-b border-[#181818]">
            <span className="text-[#777] uppercase">FORMAT PANGGUNG</span>
            <span className="text-white font-bold uppercase">PERFORMA PANGGUNG LIVE</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#181818]">
            <span className="text-[#777] uppercase">DURASI PENAMPILAN</span>
            <span className="text-white font-bold uppercase">{setQuantity} SET PERFORMA</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#181818]">
            <span className="text-[#777] uppercase">KOTA VENUE</span>
            <span className="text-white font-bold uppercase">{band.locationCity}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="text-[#777] uppercase">TOTAL ESTIMASI BIAYA</span>
            <span className="text-[#E01E37] font-bold text-sm">{formatRupiah(totalPrice)}</span>
          </div>
        </div>

        <p className="text-xs text-[#999999] leading-relaxed mb-6 font-sans">
          Anda akan diarahkan langsung ke WhatsApp manajemen resmi band untuk konfirmasi jadwal, penyelarasan technical rider panggung, dan kesepakatan surat kontrak.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={onConfirmWhatsApp}
            className="w-full min-h-[44px] h-12 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 rounded-xl cursor-pointer"
          >
            <Phone className="w-4 h-4" />
            <span>HUBUNGI VIA WHATSAPP RESMI</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] h-10 bg-transparent hover:bg-white/5 border border-white/10 text-[#888] hover:text-white font-mono text-xs uppercase tracking-wider transition-all rounded-xl cursor-pointer"
          >
            KEMBALI KE PROFIL
          </button>
        </div>
      </div>
    </div>
  )
}
