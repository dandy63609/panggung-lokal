import React, { useState, useEffect } from 'react'
import { Calendar, Clock, MapPin, Building, FileText, CheckCircle2, X, AlertTriangle, UserCheck } from 'lucide-react'
import { authClient } from '../../lib/auth'
import type { BandSchedule, RecentConnection } from '../../types'

interface ManageScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (newSchedule: BandSchedule) => void
  defaultCity?: string
  initialDate?: string
  recentInquiries?: RecentConnection[]
}

export const ManageScheduleModal: React.FC<ManageScheduleModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultCity = 'Kota Semarang',
  initialDate,
  recentInquiries = [],
}) => {
  const [eventDate, setEventDate] = useState(() => {
    if (initialDate) return initialDate
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return d.toISOString().split('T')[0]
  })
  const [startTime, setStartTime] = useState('19:00')
  const [endTime, setEndTime] = useState('21:30')
  const [eventName, setEventName] = useState('')
  const [venue, setVenue] = useState('')
  const [locationCity, setLocationCity] = useState(defaultCity)
  const [organizerName, setOrganizerName] = useState('')
  const [organizerUserId, setOrganizerUserId] = useState<number | null>(null)
  const [notes, setNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      if (initialDate) setEventDate(initialDate)
      setErrorMessage(null)
    }
  }, [isOpen, initialDate])

  if (!isOpen) return null

  const handleSelectInquiry = (inq: RecentConnection) => {
    if (inq.event_date) setEventDate(inq.event_date)
    if (inq.event_type) setEventName(inq.event_type)
    if (inq.organizer_email) setOrganizerName(inq.organizer_email)
    if (inq.id) setOrganizerUserId(inq.id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventDate || !startTime || !endTime || !eventName.trim()) {
      setErrorMessage('Harap lengkapi tanggal manggung, jam tampil, dan nama acara.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/bands/schedules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
        },
        body: JSON.stringify({
          eventDate,
          startTime,
          endTime,
          eventName: eventName.trim(),
          venue: venue.trim() || undefined,
          locationCity: locationCity.trim() || undefined,
          organizerName: organizerName.trim() || undefined,
          organizerUserId: organizerUserId || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menyimpan jadwal manggung')
      }

      onSuccess(data.data)
      onClose()
    } catch (err: any) {
      setErrorMessage(err.message || 'Terjadi kesalahan saat mempublikasikan jadwal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Input Konfirmasi Jadwal Manggung Band"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[#121212] border-2 border-[#E01E37] w-full max-w-xl p-6 sm:p-8 relative shadow-[0_0_60px_rgba(224,30,55,0.35)] rounded-2xl my-auto space-y-6 max-h-[92dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup form jadwal manggung"
          className="absolute top-4 right-4 w-11 h-11 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#A0A0A0] hover:text-white transition-colors rounded-full cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#E01E37]/20 border border-[#E01E37] flex items-center justify-center text-[#E01E37]">
              <Calendar className="w-4 h-4" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[#E01E37] font-bold">
              MANAJEMEN MUSISI · KALENDER PANGGUNG
            </span>
          </div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold uppercase text-white">
            Input Jadwal Manggung Terkonfirmasi
          </h2>
          <p className="text-xs text-[#A0A0A0] font-sans leading-relaxed">
            Setelah mencapai kesepakatan via WhatsApp atau kontrak resmi, masukkan tanggal dan jam manggung di sini. Jadwal akan <strong>langsung terlihat di kalender publik</strong> agar calon pemesan lain tahu ketersediaan band Anda.
          </p>
        </div>

        {/* Quick Fill from Recent Inquiries if any */}
        {recentInquiries && recentInquiries.length > 0 && (
          <div className="bg-[#181818] border border-[#2B2B2B] p-3 rounded-xl space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#FFD166] font-bold uppercase">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Pilih Dari Inquiry EO Masuk (Otomatis Isi Data):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentInquiries.slice(0, 3).map((inq, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectInquiry(inq)}
                  className="text-left px-2.5 py-1.5 bg-[#222] hover:bg-[#E01E37]/20 border border-white/10 hover:border-[#E01E37] rounded-lg text-[11px] font-mono text-[#DDD] transition-colors"
                >
                  <span className="text-[#FFD166] block font-bold">{inq.organizer_email || `Inquiry #${idx + 1}`}</span>
                  <span className="text-[10px] text-[#888]">{inq.event_date || 'Tanggal belum ditentukan'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
          {/* Tanggal Manggung */}
          <div className="space-y-1.5">
            <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#E01E37]" />
              <span>Tanggal Manggung / Perform (Wajib) *</span>
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors"
            />
          </div>

          {/* Jam Mulai & Jam Selesai */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FFD166]" />
                <span>Jam Mulai Tampil *</span>
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="19:00 WIB"
                required
                className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors placeholder:text-[#555]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#FFD166]" />
                <span>Jam Selesai Tampil *</span>
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="21:30 WIB"
                required
                className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors placeholder:text-[#555]"
              />
            </div>
          </div>

          {/* Nama Acara */}
          <div className="space-y-1.5">
            <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#E01E37]" />
              <span>Nama Acara / Panggung (Wajib) *</span>
            </label>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="Contoh: Dies Natalis UNNES Music Fest 2026"
              required
              className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors placeholder:text-[#555]"
            />
          </div>

          {/* Venue & Kota */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#FFD166]" />
                <span>Venue / Lokasi Panggung</span>
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Contoh: Auditorium Imam Bardjo"
                className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors placeholder:text-[#555]"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold">
                Kota Penampilan
              </label>
              <input
                type="text"
                value={locationCity}
                onChange={(e) => setLocationCity(e.target.value)}
                placeholder="Kota Semarang / Kota Jogja"
                className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors placeholder:text-[#555]"
              />
            </div>
          </div>

          {/* Nama EO / Pemesan */}
          <div className="space-y-1.5">
            <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold">
              Nama EO / Pemesan (Penyelenggara)
            </label>
            <input
              type="text"
              value={organizerName}
              onChange={(e) => setOrganizerName(e.target.value)}
              placeholder="Contoh: BEM KM UNNES / Panitia Festival"
              className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors placeholder:text-[#555]"
            />
          </div>

          {/* Catatan / Rundown */}
          <div className="space-y-1.5">
            <label className="text-[#CCCCCC] uppercase tracking-wider block font-bold flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#A0A0A0]" />
              <span>Catatan Tambahan / Rundown</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Soundcheck jam 16:00 WIB, FOH monitor stereo, durasi 2 set penampilan..."
              rows={2}
              className="w-full bg-[#0A0A0A] border border-[#2B2B2B] focus:border-[#E01E37] text-white p-3 rounded-xl outline-none transition-colors placeholder:text-[#555] font-sans text-xs"
            />
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-h-[48px] bg-[#E01E37] hover:bg-[#C71B30] disabled:bg-[#333] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 rounded-xl cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'MENYIMPAN...' : 'KONFIRMASI & PUBLIKASIKAN JADWAL'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] px-5 bg-transparent hover:bg-white/5 border border-white/10 text-[#A0A0A0] hover:text-white font-mono text-xs uppercase tracking-wider transition-all rounded-xl cursor-pointer"
            >
              BATAL
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
