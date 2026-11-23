import React, { useState, useEffect } from 'react'
import { Star, Mail, AlertTriangle, CheckCircle2, Lock } from 'lucide-react'
import { authClient } from '../lib/auth'
import { getRatingTierBadge } from '../lib/ratingHelpers'
import type { PendingReviewBooking } from '../types'

interface ReviewGatingModalProps {
  onSuccess?: () => void
}

export const ReviewGatingModal: React.FC<ReviewGatingModalProps> = ({ onSuccess }) => {
  const [pendingBookings, setPendingBookings] = useState<PendingReviewBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Current review form state
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number | null>(null)
  const [reviewText, setReviewText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const activeRating = hoverRating !== null ? hoverRating : rating
  const tierInfo = getRatingTierBadge(activeRating)

  // Fetch pending unreviewed bookings for logged-in EO
  const checkPendingReviews = async () => {
    const user = authClient.getUser()
    if (!user || user.accountType === 'band' || user.accountType === 'admin') {
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/reviews/pending', {
        headers: authClient.getAuthHeaders(),
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.data)) {
        setPendingBookings(data.data)
      }
    } catch (err) {
      console.warn('Failed to fetch pending reviews:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkPendingReviews()
  }, [])

  if (loading || pendingBookings.length === 0) {
    return null
  }

  const currentBooking = pendingBookings[currentIndex]
  if (!currentBooking) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating < 1 || rating > 5) {
      setErrorMessage('Silakan pilih rating antara 1 hingga 5 bintang')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
        },
        body: JSON.stringify({
          bandProfileId: currentBooking.bandProfileId,
          connectionId: currentBooking.connectionId,
          rating,
          reviewText: reviewText || 'Penampilan panggung live sangat memuaskan.',
          eventDate: currentBooking.eventDate,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal mengirim rating')
      }

      // Remove current reviewed booking
      const nextQueue = pendingBookings.filter((_, idx) => idx !== currentIndex)
      setPendingBookings(nextQueue)
      setReviewText('')
      setRating(5)

      if (nextQueue.length === 0) {
        if (onSuccess) onSuccess()
      } else {
        setCurrentIndex(0)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat menyimpan rating')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Wajib Memberikan Rating Penampilan Musisi"
      className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="bg-[#121212] border-2 border-[#E01E37] w-full max-w-xl p-6 sm:p-8 rounded-3xl relative shadow-[0_0_60px_rgba(224,30,55,0.35)] my-auto space-y-6">
        {/* Urgent Header Lock Tag */}
        <div className="flex items-center justify-between border-b border-[#222222] pb-4">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#E01E37]/20 border border-[#E01E37] flex items-center justify-center text-[#E01E37]">
              <Lock className="w-4 h-4" />
            </span>
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#E01E37] font-bold block">
                AKSES SEMENTARA TERKUNCI · WAJIB ISI ULASAN
              </span>
              <h2 className="font-mono font-bold text-lg sm:text-xl text-white uppercase tracking-tight">
                Rating Penampilan Musisi
              </h2>
            </div>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-white/10 text-[#CCCCCC]">
            {currentIndex + 1} / {pendingBookings.length}
          </span>
        </div>

        {/* Automated Email Notice Alert */}
        <div className="bg-[#1A1412] border border-[#FFD166]/40 p-4 rounded-2xl flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FFD166]/20 border border-[#FFD166]/60 text-[#FFD166] flex items-center justify-center shrink-0 mt-0.5">
            <Mail className="w-4 h-4" />
          </div>
          <div className="space-y-1 font-sans text-xs">
            <span className="font-mono font-bold text-[#FFD166] uppercase tracking-wider block">
              📧 Notifikasi Otomatis Reffband Terkirim
            </span>
            <p className="text-[#C0C0C0] leading-relaxed">
              Email otomatis telah dikirim ke akun Anda pada pukul <strong className="text-white">00.00 WIB</strong> setelah tanggal tampil <strong className="text-white">{currentBooking.eventDate}</strong>. Anda wajib memberikan ulasan dan rating terlebih dahulu sebelum dapat mengakses menu utama Reffband.
            </p>
          </div>
        </div>

        {/* Band Booking Info Card */}
        <div className="bg-[#0A0A0A] border border-[#222222] p-4 rounded-2xl flex items-center gap-4">
          <img
            src={currentBooking.profilePhotoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=200&auto=format&fit=crop'}
            alt={currentBooking.bandName}
            className="w-16 h-16 rounded-xl object-cover border border-white/10 shrink-0"
          />
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] text-white bg-[#E01E37] px-2 py-0.5 rounded font-bold uppercase">
                {currentBooking.genre || 'MUSISI'}
              </span>
              <span className="font-mono text-[10px] text-[#A0A0A0] bg-white/5 px-2 py-0.5 rounded">
                {currentBooking.locationCity || 'KOTA SEMARANG'}
              </span>
            </div>
            <h3 className="font-mono font-bold text-white text-base truncate uppercase">
              {currentBooking.bandName}
            </h3>
            <div className="font-mono text-[11px] text-[#888]">
              Acara: <span className="text-[#DDD]">{currentBooking.eventName}</span> ({currentBooking.eventDate})
            </div>
          </div>
        </div>

        {/* Rating Submission Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Star Rating Selector */}
          <div className="space-y-2 text-center py-2 bg-[#0E0E0E] border border-white/5 rounded-2xl p-4">
            <span className="font-mono text-xs uppercase tracking-wider text-[#A0A0A0] block font-bold">
              PILIH BINTANG PENAMPILAN (1 - 5 BINTANG)
            </span>

            {/* Stars Row */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
              {[1, 2, 3, 4, 5].map((starVal) => {
                const isFilled = starVal <= activeRating
                return (
                  <button
                    key={starVal}
                    type="button"
                    onClick={() => setRating(starVal)}
                    onMouseEnter={() => setHoverRating(starVal)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`Beri bintang ${starVal}`}
                    className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 sm:w-10 sm:h-10 transition-colors ${
                        isFilled
                          ? 'fill-[#FFD166] text-[#FFD166] drop-shadow-[0_0_10px_rgba(255,209,102,0.5)]'
                          : 'text-[#333] hover:text-[#555]'
                      }`}
                    />
                  </button>
                )
              })}
            </div>

            {/* Live Tier Representation Display */}
            <div className="pt-2 flex flex-col items-center gap-1">
              <span className={`inline-block font-mono text-xs sm:text-sm font-bold px-4 py-1.5 rounded-full border uppercase tracking-wider ${tierInfo.bgClass}`}>
                Status Profil: {tierInfo.label}
              </span>
              <span className="text-[11px] text-[#A0A0A0] font-sans">
                {tierInfo.description}
              </span>
              <span className="text-[10px] text-[#777] font-sans mt-0.5">
                Representasi kata status di atas yang akan tampil di profil publik musisi. Bintang tersimpan aman untuk evaluasi internal.
              </span>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="space-y-1.5">
            <label className="font-mono text-xs uppercase tracking-wider text-[#CCCCCC] block font-bold">
              ULASAN & CATATAN PERFORMA PANGGUNG (EO):
            </label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Contoh: Energi panggung sangat luar biasa, penonton kampus antusias, soundcheck tepat waktu sesuai rundown acara..."
              rows={3}
              required
              className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl font-sans text-xs outline-none leading-relaxed transition-colors placeholder:text-[#555]"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[48px] h-12 bg-[#E01E37] hover:bg-[#C71B30] disabled:bg-[#333] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 rounded-xl cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'MENYIMPAN RATING...'
                : 'KIRIM RATING & BUKA AKSES MENU UTAMA'}
            </span>
          </button>
        </form>
      </div>
    </div>
  )
}
