import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, Eye, Phone, ChevronLeft, ChevronRight, ImageOff, Film, Camera, Lock } from 'lucide-react'
import { formatRupiah } from '../../lib/utils'
import { isActualVideoSlide, parsePostSlides } from '../../lib/bandHelpers'
import type { Band, BandPost } from '../../types'
import type { AuthUser } from '../../lib/auth'

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
  const [slideState, setSlideState] = useState<{ postId: number | null; index: number }>({
    postId: activePost?.id ?? null,
    index: 0,
  })
  const [brokenUrls, setBrokenUrls] = useState<Record<string, boolean>>({})

  const slides = parsePostSlides(activePost, true)
  const rawIndex = slideState.postId === (activePost?.id ?? null) ? slideState.index : 0
  const safeIndex = slides.length > 0 ? Math.min(rawIndex, slides.length - 1) : 0

  useEffect(() => {
    if (!activePost) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowLeft' && slides.length > 1) {
        setSlideState({
          postId: activePost.id,
          index: safeIndex === 0 ? slides.length - 1 : safeIndex - 1,
        })
      } else if (e.key === 'ArrowRight' && slides.length > 1) {
        setSlideState({
          postId: activePost.id,
          index: safeIndex === slides.length - 1 ? 0 : safeIndex + 1,
        })
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePost, slides.length, safeIndex, onClose])

  if (!activePost) return null

  const currentSlide = slides[safeIndex] || {
    type: activePost.mediaType === 'video' ? 'video' : 'photo',
    url: activePost.mediaUrl || activePost.thumbnailUrl || '',
  }
  const isCurrentVideo = isActualVideoSlide(currentSlide.type, currentSlide.url)
  const isBroken = Boolean(currentSlide.url && brokenUrls[currentSlide.url])

  const goToPrev = () => {
    setSlideState({
      postId: activePost.id,
      index: safeIndex === 0 ? slides.length - 1 : safeIndex - 1,
    })
  }

  const goToNext = () => {
    setSlideState({
      postId: activePost.id,
      index: safeIndex === slides.length - 1 ? 0 : safeIndex + 1,
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau karya ${band.bandName}`}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-[#101010] border border-[#242424] w-full max-w-3xl overflow-hidden relative shadow-2xl flex flex-col max-h-[90dvh] rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 p-4 sm:p-5 border-b border-[#202020] flex items-center justify-between gap-3 bg-[#0C0C0C]">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={band.profilePhotoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200'}
              alt={band.bandName}
              className="w-10 h-10 object-cover rounded-full border border-[#333] shrink-0"
            />
            <div className="min-w-0">
              <div className="font-mono font-bold text-white text-sm uppercase truncate">
                {band.bandName}
              </div>
              <div className="font-mono text-[11px] text-white/60 flex items-center gap-2 flex-wrap">
                <span>
                  {activePost.createdAt
                    ? new Date(activePost.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'DOKUMENTASI RESMI'}
                </span>
                {slides.length > 1 && (
                  <span className="px-2 py-0.5 bg-[#E01E37]/20 border border-[#E01E37]/40 text-[#E01E37] text-[10px] font-bold rounded">
                    SLIDE {safeIndex + 1} / {slides.length}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#888] hover:text-white hover:bg-white/10 transition-colors rounded-full shrink-0 cursor-pointer"
            aria-label="Tutup pratinjau karya"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative bg-black flex-1 min-h-[260px] sm:min-h-[340px] max-h-[520px] flex items-center justify-center overflow-hidden">
          {isCurrentVideo ? (
            <video
              key={currentSlide.url}
              src={currentSlide.url}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full max-h-[500px] object-contain bg-black"
            />
          ) : isBroken || !currentSlide.url ? (
            <div className="flex flex-col items-center justify-center text-center p-6 text-[#808080]">
              <ImageOff className="w-10 h-10 mb-2" aria-hidden="true" />
              <span className="font-mono text-xs uppercase tracking-wider">
                Media foto tidak tersedia
              </span>
            </div>
          ) : (
            <img
              key={currentSlide.url}
              src={currentSlide.url}
              alt={`Dokumentasi karya band slide ${safeIndex + 1}`}
              onError={() =>
                setBrokenUrls((prev) => ({ ...prev, [currentSlide.url]: true }))
              }
              className="w-full h-full object-contain max-h-[500px]"
            />
          )}

          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-black/80 backdrop-blur-sm border border-white/15 rounded font-mono text-[10px] uppercase tracking-wider text-white flex items-center gap-1.5 pointer-events-none">
            {isCurrentVideo ? (
              <>
                <Film className="w-3 h-3 text-[#E01E37]" aria-hidden="true" />
                <span>VIDEO</span>
              </>
            ) : (
              <>
                <Camera className="w-3 h-3 text-white" aria-hidden="true" />
                <span>FOTO</span>
              </>
            )}
          </div>

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrev}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 min-w-[44px] min-h-[44px] bg-black/80 hover:bg-[#E01E37] text-white flex items-center justify-center border border-white/20 transition-colors rounded-full cursor-pointer"
                aria-label="Slide sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-11 h-11 min-w-[44px] min-h-[44px] bg-black/80 hover:bg-[#E01E37] text-white flex items-center justify-center border border-white/20 transition-colors rounded-full cursor-pointer"
                aria-label="Slide berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}
        </div>

        {slides.length > 1 && (
          <div className="shrink-0 px-4 py-2.5 bg-[#0A0A0A] border-t border-[#1E1E1E] flex items-center gap-2 overflow-x-auto">
            {slides.map((s, idx) => {
              const sIsVideo = s.type === 'video' || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(s.url || '')
              return (
                <button
                  key={`${s.url}-${idx}`}
                  type="button"
                  onClick={() => setSlideState({ postId: activePost.id, index: idx })}
                  className={`px-3 py-1.5 min-h-[36px] rounded font-mono text-[10px] uppercase tracking-wider shrink-0 flex items-center gap-1.5 border transition-colors cursor-pointer ${
                    idx === safeIndex
                      ? 'bg-[#E01E37] border-[#E01E37] text-white font-bold'
                      : 'bg-[#151515] border-[#2A2A2A] text-[#A0A0A0] hover:text-white'
                  }`}
                >
                  {sIsVideo ? <Film className="w-3 h-3" aria-hidden="true" /> : <Camera className="w-3 h-3" aria-hidden="true" />}
                  <span>Slide {idx + 1}</span>
                </button>
              )
            })}
          </div>
        )}

        <div className="shrink-0 p-4 sm:p-5 border-t border-[#202020] bg-[#0C0C0C] space-y-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#E01E37] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              {activePost.viewsCount || 0} IMPRESI TAYANGAN
            </span>
            <span className="text-[#666] uppercase">REFFBAND ARCHIVE</span>
          </div>
          <p className="text-sm text-[#D4D4D4] leading-relaxed font-sans whitespace-pre-wrap">
            {activePost.caption || 'Dokumentasi resmi panggung live musisi terkurasi.'}
          </p>
        </div>
      </div>
    </div>
  )
}

interface DirectBookingModalProps {
  isOpen: boolean
  band: Pick<Band, 'bandName' | 'locationCity' | 'phone' | 'setDuration'>
  setQuantity: number
  totalPrice: number
  currentUser?: AuthUser | null
  onClose: () => void
  onConfirmWhatsApp: (eventName: string) => void
}

export const DirectBookingModal: React.FC<DirectBookingModalProps> = ({
  isOpen,
  band,
  setQuantity,
  totalPrice,
  currentUser,
  onClose,
  onConfirmWhatsApp,
}) => {
  const [eventName, setEventName] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const cleanDigits = (band.phone || '').replace(/[^0-9]/g, '')
  const isMasked = Boolean(band.phone && band.phone.includes('x'))
  const hasReachablePhone = cleanDigits.length >= 6 && !isMasked

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Kontak booking ${band.bandName}`}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121212] border-2 border-[#E01E37] w-full max-w-lg p-6 sm:p-8 relative shadow-[0_0_50px_rgba(224,30,55,0.3)] rounded-2xl max-h-[90dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup modal booking"
          className="absolute top-4 right-4 w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#A0A0A0] hover:text-white transition-colors rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="space-y-1 mb-6">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[#E01E37] font-bold block">
            KONTAK LANGSUNG · BOOKING RESMI
          </span>
          <h2 className="font-mono text-2xl font-bold uppercase text-white">{band.bandName}</h2>
        </div>

        {/* Warning card if user is not authenticated */}
        {!currentUser && (
          <div className="bg-[#1C1214] border border-[#E01E37]/50 rounded-xl p-4 sm:p-5 mb-6 text-center space-y-2.5 shadow-lg">
            <div className="w-10 h-10 rounded-full bg-[#E01E37]/20 border border-[#E01E37]/60 text-[#E01E37] mx-auto flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-mono text-sm font-bold uppercase text-white tracking-wide">
              Login Diperlukan Untuk Berinteraksi
            </h3>
            <p className="text-xs text-[#C0C0C0] font-sans leading-relaxed">
              Anda sedang menjelajahi profil band. Untuk membuka nomor WhatsApp manajemen <strong className="text-white">{band.bandName}</strong> dan mengajukan penawaran booking panggung, silakan masuk ke akun Anda terlebih dahulu.
            </p>
          </div>
        )}

        <div className="bg-[#0A0A0A] border border-[#222222] p-4 space-y-3 mb-6 font-mono text-xs rounded-xl">
          <div className="flex justify-between py-1 border-b border-[#181818]">
            <span className="text-[#888] uppercase">FORMAT PANGGUNG</span>
            <span className="text-white font-bold uppercase">PERFORMA PANGGUNG LIVE</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#181818]">
            <span className="text-[#888] uppercase">DURASI PENAMPILAN</span>
            <span className="text-white font-bold uppercase">
              {setQuantity} SET PERFORMA
              {band.setDuration?.trim() ? ` (${band.setDuration.trim()} / SET)` : ''}
            </span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#181818]">
            <span className="text-[#888] uppercase">KOTA VENUE</span>
            <span className="text-white font-bold uppercase">{band.locationCity}</span>
          </div>

          {/* Nama Acara Input (Opsional) */}
          <div className="py-2 border-b border-[#181818] space-y-1">
            <label htmlFor="direct-wa-event-name" className="text-[#A0A0A0] text-[11px] uppercase tracking-wider block">
              NAMA ACARA / PENSI / FESTIVAL (OPSIONAL):
            </label>
            <input
              id="direct-wa-event-name"
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Contoh: Dies Natalis UNNES Fest 2026"
              className="w-full bg-[#181818] border border-[#333333] focus:border-[#E01E37] text-white placeholder-[#7A7A7A] p-2.5 rounded font-mono text-xs outline-none"
            />
          </div>

          <div className="flex justify-between pt-1">
            <span className="text-[#888] uppercase">TOTAL ESTIMASI BIAYA</span>
            <span className="text-[#E01E37] font-bold text-sm">
              {totalPrice > 0 ? formatRupiah(totalPrice) : 'Negosiasi'}
            </span>
          </div>
        </div>

        {currentUser && (
          <p className="text-xs text-[#A0A0A0] leading-relaxed mb-6 font-sans">
            {hasReachablePhone
              ? 'Anda akan diarahkan langsung ke WhatsApp manajemen resmi band untuk diskusi penampilan, penyelarasan technical rider panggung, dan kesepakatan kerja sama.'
              : isMasked
                ? 'Masuk menggunakan akun EO / Penyelenggara untuk membuka nomor WhatsApp lengkap manajemen band.'
                : 'Band ini belum mencantumkan nomor WhatsApp manajemen pada profilnya. Gunakan broadcast lowongan di bawah untuk menghubungi seluruh band.'}
          </p>
        )}

        {!currentUser ? (
          <div className="space-y-3">
            <Link
              to={`/masuk?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="w-full min-h-[44px] h-12 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 rounded-xl text-center"
            >
              <Lock className="w-4 h-4" />
              <span>MASUK / LOGIN UNTUK HUBUNGI BAND</span>
            </Link>
            <Link
              to={`/daftar?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
              className="w-full min-h-[44px] h-10 bg-[#1A1A1A] hover:bg-[#252525] border border-white/10 text-[#CCCCCC] hover:text-white font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center rounded-xl text-center"
            >
              <span>DAFTAR AKUN BARU</span>
            </Link>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] h-10 bg-transparent hover:bg-white/5 border border-white/10 text-[#A0A0A0] hover:text-white font-mono text-xs uppercase tracking-wider transition-all rounded-xl cursor-pointer"
            >
              KEMBALI KE PROFIL
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => onConfirmWhatsApp(eventName)}
              disabled={!hasReachablePhone}
              className="w-full min-h-[44px] h-12 bg-[#E01E37] hover:bg-[#C71B30] disabled:bg-[#2A2A2A] disabled:text-[#888] disabled:cursor-not-allowed disabled:shadow-none text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 rounded-xl cursor-pointer"
            >
              <Phone className="w-4 h-4" />
              <span>{hasReachablePhone ? 'HUBUNGI MANAJEMEN VIA WHATSAPP' : 'NOMOR WHATSAPP BELUM TERSEDIA'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full min-h-[44px] h-10 bg-transparent hover:bg-white/5 border border-white/10 text-[#A0A0A0] hover:text-white font-mono text-xs uppercase tracking-wider transition-all rounded-xl cursor-pointer"
            >
              KEMBALI KE PROFIL
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
