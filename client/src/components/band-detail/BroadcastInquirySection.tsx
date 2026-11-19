import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Star,
  CheckCircle2,
  Upload,
  Paperclip,
  FileText,
  Loader2,
  Lock,
  AlertCircle,
  Megaphone,
  X,
} from 'lucide-react'
import { authClient, type AuthUser } from '../../lib/auth'
import { formatFileSize } from '../../lib/bandHelpers'
import type { BroadcastAttachment } from '../../types'

const MAX_ATTACHMENTS = 3
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024
const ALLOWED_ATTACHMENT_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx']

interface BroadcastInquirySectionProps {
  sourceBandProfileId: number
  currentUser: AuthUser | null
}

function describeEventScale(rating: number): string {
  switch (rating) {
    case 5:
      return 'FESTIVAL SKALA BESAR (5/5)'
    case 4:
      return 'PENTAS SENI KAMPUS (4/5)'
    case 3:
      return 'GIG INTI / CAFE SHOW (3/5)'
    default:
      return 'INTIMATE ACOUSTIC (2/5)'
  }
}

export const BroadcastInquirySection: React.FC<BroadcastInquirySectionProps> = ({
  sourceBandProfileId,
  currentUser,
}) => {
  const [organizerName, setOrganizerName] = useState('')
  const [organizerPhone, setOrganizerPhone] = useState('')
  const [organizerEmail, setOrganizerEmail] = useState(() => currentUser?.email || '')
  const [prevUserEmail, setPrevUserEmail] = useState(() => currentUser?.email || '')
  const [eventDate, setEventDate] = useState('')
  const [performStartTime, setPerformStartTime] = useState('19:30')
  const [performEndTime, setPerformEndTime] = useState('21:00')
  const [venueLocation, setVenueLocation] = useState('')
  const [eventScale, setEventScale] = useState<number>(5)
  const [eventDetails, setEventDetails] = useState('')
  const [selectedAttachments, setSelectedAttachments] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [recipientCount, setRecipientCount] = useState<number>(0)

  const activeUserEmail = currentUser?.email || ''
  if (activeUserEmail !== prevUserEmail) {
    setPrevUserEmail(activeUserEmail)
    if (activeUserEmail && !organizerEmail) {
      setOrganizerEmail(activeUserEmail)
    }
  }

  const handleSelectAttachments = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    if (picked.length === 0) return

    setError('')
    const validFiles: File[] = []

    for (const file of picked) {
      const dotIdx = file.name.lastIndexOf('.')
      const ext = dotIdx >= 0 ? file.name.slice(dotIdx).toLowerCase() : ''
      if (!ALLOWED_ATTACHMENT_EXTS.includes(ext)) {
        setError('Format file lampiran harus PDF, JPG, PNG, WebP, DOC, atau DOCX.')
        continue
      }
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`File "${file.name}" melebihi batas maksimal 10 MB per file.`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length === 0) return

    setSelectedAttachments((prev) => {
      const merged = [...prev]
      for (const f of validFiles) {
        if (merged.length >= MAX_ATTACHMENTS) {
          setError(`Maksimal ${MAX_ATTACHMENTS} file lampiran dapat disertakan.`)
          break
        }
        const isDuplicate = merged.some((existing) => existing.name === f.name && existing.size === f.size)
        if (!isDuplicate) {
          merged.push(f)
        }
      }
      return merged
    })
  }

  const handleRemoveAttachment = (index: number) => {
    setSelectedAttachments((prev) => prev.filter((_, idx) => idx !== index))
    setError('')
  }

  const resetBroadcastForm = () => {
    setSubmitted(false)
    setError('')
    setOrganizerName('')
    setOrganizerPhone('')
    setOrganizerEmail(currentUser?.email || '')
    setEventDate('')
    setPerformStartTime('19:30')
    setPerformEndTime('21:00')
    setVenueLocation('')
    setEventScale(5)
    setEventDetails('')
    setSelectedAttachments([])
  }

  const handleSubmitBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!currentUser || !['organizer', 'general'].includes(currentUser.accountType)) {
      setError('Anda harus login menggunakan akun Penyelenggara / EO untuk mengirim broadcast.')
      return
    }

    setSubmitting(true)
    try {
      let uploadedAttachments: BroadcastAttachment[] = []
      if (selectedAttachments.length > 0) {
        const uploadRes = await authClient.uploadBroadcastAttachments(selectedAttachments)
        if (!uploadRes.success || !uploadRes.files) {
          setError(uploadRes.message || 'Gagal mengunggah file lampiran venue.')
          return
        }
        uploadedAttachments = uploadRes.files
      }

      const res = await authClient.createJobBroadcast({
        sourceBandProfileId,
        organizerName: organizerName.trim(),
        organizerEmail: organizerEmail.trim(),
        organizerPhone: organizerPhone.trim(),
        eventDate,
        performStartTime,
        performEndTime,
        venueLocation: venueLocation.trim(),
        eventScale,
        eventDetails: eventDetails.trim(),
        attachments: uploadedAttachments,
      })

      if (!res.success) {
        setError(res.message || 'Gagal mengirim broadcast panggilan panggung.')
        return
      }

      setRecipientCount(res.data?.recipientBandCount || 0)
      setSubmitted(true)
    } catch {
      setError('Terjadi kesalahan jaringan saat mengirim broadcast.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="broadcast-inquiry" className="w-full pb-20">
      <div className="border-4 border-[#E01E37] bg-[#E01E37] p-2 sm:p-3 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-[#E01E37] text-black py-4 px-4 sm:px-6 flex flex-col justify-between select-none">
          <div className="w-full flex items-center justify-between text-black font-mono font-black text-[8.5vw] sm:text-[6.8vw] md:text-[5.5vw] leading-none tracking-tight">
            <span>B</span><span>R</span><span>O</span><span>A</span><span>D</span><span>C</span><span>A</span><span>S</span><span>T</span><span>-</span><span>J</span><span>O</span><span>B</span>
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] sm:text-xs text-black/85 font-bold uppercase tracking-widest pt-2 border-t border-black/20 mt-2">
            <span>\ BROADCAST PANGGUNG KE SELURUH BAND TERDAFTAR</span>
            <span className="hidden sm:inline">NOTIFIKASI OTOMATIS SEMUA MUSISI AKTIF</span>
          </div>
        </div>

        <div className="bg-[#0D0D0D] p-6 sm:p-8 mt-2 rounded-xl">
          {!currentUser ? (
            <div className="py-10 px-4 text-center space-y-4">
              <div className="w-14 h-14 bg-[#E01E37]/10 border border-[#E01E37]/40 text-[#E01E37] mx-auto flex items-center justify-center rounded-full">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-mono text-lg sm:text-xl font-bold uppercase text-white">
                  Login Sebagai Penyelenggara (EO) Untuk Mengirim Broadcast
                </h3>
                <p className="text-xs sm:text-sm text-[#A0A0A0] max-w-xl mx-auto font-sans leading-relaxed">
                  Formulir ini mengirimkan undangan tampil lengkap dengan tanggal, jam performa, detail venue, serta lampiran file langsung ke kotak notifikasi semua band terdaftar di Reffband.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Link
                  to="/login"
                  className="min-h-[44px] px-6 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center rounded-xl transition-colors"
                >
                  Masuk Akun EO
                </Link>
                <Link
                  to="/register?role=organizer"
                  className="min-h-[44px] px-6 py-2.5 bg-[#181818] hover:bg-[#222222] border border-[#333333] text-white font-mono font-bold text-xs uppercase tracking-widest flex items-center justify-center rounded-xl transition-colors"
                >
                  Daftar Penyelenggara / EO
                </Link>
              </div>
            </div>
          ) : !['organizer', 'general'].includes(currentUser.accountType) ? (
            <div className="py-10 px-4 text-center space-y-3">
              <div className="w-14 h-14 bg-[#E01E37]/10 border border-[#E01E37]/40 text-[#E01E37] mx-auto flex items-center justify-center rounded-full">
                <Megaphone className="w-6 h-6" />
              </div>
              <h3 className="font-mono text-lg font-bold uppercase text-white">
                Khusus Akun Penyelenggara Acara (EO)
              </h3>
              <p className="text-xs sm:text-sm text-[#A0A0A0] max-w-xl mx-auto font-sans leading-relaxed">
                Saat ini Anda masuk menggunakan akun <strong className="text-white">{currentUser.email}</strong> ({currentUser.accountType.toUpperCase()}). Untuk mengirim broadcast lowongan tampil ke seluruh band, silakan masuk dengan akun Penyelenggara / EO. Pantau panggilan panggung masuk di Tab <strong className="text-white">Job Broadcast</strong> pada Dashboard Band Anda.
              </p>
            </div>
          ) : submitted ? (
            <div className="p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 bg-[#E01E37]/10 border border-[#E01E37] text-[#E01E37] mx-auto flex items-center justify-center font-mono font-bold text-2xl rounded-full">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="font-mono text-xl sm:text-2xl font-bold uppercase text-white">
                Broadcast Panggung Terkirim!
              </h3>
              <p className="text-sm text-[#A0A0A0] max-w-lg mx-auto leading-relaxed">
                Undangan panggung Anda untuk <strong className="text-white">{eventDate} ({performStartTime} - {performEndTime} WIB)</strong> di <strong className="text-white">{venueLocation}</strong> telah disiarkan ke <strong className="text-[#E01E37]">{recipientCount} akun band terdaftar</strong> di Reffband. Band yang berminat akan menghubungi WhatsApp Anda secara langsung.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetBroadcastForm}
                  className="min-h-[44px] px-6 py-2.5 bg-[#181818] hover:bg-[#222222] border border-[#333333] text-white font-mono font-bold text-xs uppercase tracking-widest rounded-xl cursor-pointer transition-colors"
                >
                  Kirim Broadcast Lainnya
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitBroadcast} className="space-y-6">
              <div className="p-3.5 bg-[#141414] border border-[#262626] rounded-lg flex items-start gap-3">
                <Megaphone className="w-4 h-4 text-[#E01E37] shrink-0 mt-0.5" />
                <p className="text-xs font-sans text-[#B0B0B0] leading-relaxed">
                  <strong className="text-white">Mode Broadcast Terbuka:</strong> Detail acara, waktu tampil, dan lampiran file yang dikirim lewat formulir ini akan langsung masuk ke ruang notifikasi <strong className="text-white">Job Broadcast</strong> seluruh akun band terdaftar di Reffband.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="p-3.5 bg-[#E01E37]/15 border border-[#E01E37]/60 text-white text-xs font-mono flex items-center gap-2.5 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 text-[#E01E37] shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="reviewName" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                      Nama Penyelenggara / Event Organizer *
                    </label>
                    <input
                      id="reviewName"
                      type="text"
                      required
                      value={organizerName}
                      onChange={(e) => setOrganizerName(e.target.value)}
                      placeholder="Contoh: BEM Fakultas Teknik / Festival Senja"
                      className="w-full min-h-[44px] h-11 px-3.5 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="reviewPhone" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                        Nomor WhatsApp Aktif *
                      </label>
                      <input
                        id="reviewPhone"
                        type="tel"
                        required
                        value={organizerPhone}
                        onChange={(e) => setOrganizerPhone(e.target.value)}
                        placeholder="0812xxxxxxxx"
                        className="w-full min-h-[44px] h-11 px-3.5 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="reviewEmail" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                        Email Resmi Penyelenggara *
                      </label>
                      <input
                        id="reviewEmail"
                        type="email"
                        required
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        placeholder="eo@acara-festival.com"
                        className="w-full min-h-[44px] h-11 px-3.5 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="venueLocation" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                      Lokasi / Nama Venue *
                    </label>
                    <input
                      id="venueLocation"
                      type="text"
                      required
                      value={venueLocation}
                      onChange={(e) => setVenueLocation(e.target.value)}
                      placeholder="Contoh: Gedung Sabuga ITB, Bandung / Panggung Utama Senayan"
                      className="w-full min-h-[44px] h-11 px-3.5 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label htmlFor="reviewDate" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                        Tanggal Acara *
                      </label>
                      <input
                        id="reviewDate"
                        type="date"
                        required
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full min-h-[44px] h-11 px-3 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="performStartTime" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                        Jam Mulai *
                      </label>
                      <input
                        id="performStartTime"
                        type="time"
                        required
                        value={performStartTime}
                        onChange={(e) => setPerformStartTime(e.target.value)}
                        className="w-full min-h-[44px] h-11 px-3 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                      />
                    </div>
                    <div>
                      <label htmlFor="performEndTime" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                        Jam Selesai *
                      </label>
                      <input
                        id="performEndTime"
                        type="time"
                        required
                        value={performEndTime}
                        onChange={(e) => setPerformEndTime(e.target.value)}
                        className="w-full min-h-[44px] h-11 px-3 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                      Skala Acara & Target Penonton
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setEventScale(star)}
                          aria-label={`Skala acara ${star} bintang`}
                          className={`min-h-[44px] min-w-[44px] h-11 w-11 flex items-center justify-center border transition-all rounded-lg cursor-pointer ${
                            eventScale >= star
                              ? 'bg-[#E01E37] border-[#E01E37] text-white shadow-[0_0_12px_rgba(224,30,55,0.5)]'
                              : 'bg-[#141414] border-[#2A2A2A] text-[#666] hover:border-[#555]'
                          }`}
                        >
                          <Star className="w-4 h-4 fill-current" />
                        </button>
                      ))}
                      <span className="font-mono text-xs text-[#AAA] ml-1">
                        {describeEventScale(eventScale)}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="reviewMessage" className="block font-mono text-xs uppercase tracking-wider text-[#999] mb-1.5">
                      Rincian Venue, Rundown & Permintaan Khusus *
                    </label>
                    <textarea
                      id="reviewMessage"
                      rows={4}
                      required
                      value={eventDetails}
                      onChange={(e) => setEventDetails(e.target.value)}
                      placeholder="Jelaskan kapasitas penonton, spesifikasi sound system FOH/backline venue, estimasi honor/fee band, serta ketentuan khusus rundown..."
                      className="w-full p-3.5 bg-[#141414] border border-[#2A2A2A] text-white font-mono text-xs focus:border-[#E01E37] focus:outline-none transition-colors rounded-lg"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="venueAttachments" className="block font-mono text-xs uppercase tracking-wider text-[#999]">
                        Lampiran File Detail Venue / Rundown (Opsional)
                      </label>
                      <span className="font-mono text-[10px] text-[#737373]">
                        {selectedAttachments.length}/{MAX_ATTACHMENTS} file
                      </span>
                    </div>

                    <label
                      htmlFor="venueAttachments"
                      className={`w-full min-h-[44px] px-4 py-3 bg-[#141414] hover:bg-[#1A1A1A] border border-dashed ${
                        selectedAttachments.length >= MAX_ATTACHMENTS
                          ? 'border-[#2A2A2A] opacity-60 cursor-not-allowed'
                          : 'border-[#3A3A3A] hover:border-[#E01E37] cursor-pointer'
                      } rounded-lg flex items-center justify-between gap-3 transition-colors`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Upload className="w-4 h-4 text-[#E01E37] shrink-0" />
                        <span className="font-mono text-xs text-[#D0D0D0] truncate">
                          Pilih PDF, JPG, PNG, WebP, atau DOC/DOCX
                        </span>
                      </div>
                      <span className="font-mono text-[10px] uppercase text-[#888] shrink-0">
                        Maks 10 MB/file
                      </span>
                    </label>
                    <input
                      id="venueAttachments"
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      disabled={selectedAttachments.length >= MAX_ATTACHMENTS}
                      onChange={handleSelectAttachments}
                      className="sr-only"
                    />

                    {selectedAttachments.length > 0 && (
                      <ul className="mt-2.5 space-y-2">
                        {selectedAttachments.map((file, idx) => (
                          <li
                            key={`${file.name}-${file.size}`}
                            className="flex items-center justify-between gap-2 px-3 py-2 bg-[#161616] border border-[#2C2C2C] rounded-lg"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className="w-4 h-4 text-[#E01E37] shrink-0" />
                              <div className="min-w-0">
                                <div className="font-mono text-xs text-white truncate">{file.name}</div>
                                <div className="font-mono text-[10px] text-[#737373]">
                                  {formatFileSize(file.size)}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(idx)}
                              aria-label={`Hapus lampiran ${file.name}`}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#888] hover:text-[#E01E37] transition-colors cursor-pointer shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-[#1E1E1E] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="font-mono text-xs text-[#777] flex items-center gap-2">
                  <Paperclip className="w-3.5 h-3.5 text-[#E01E37] shrink-0" />
                  <span>Dikirim serentak ke seluruh akun band terdaftar di platform Reffband.</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] h-12 px-8 bg-[#E01E37] hover:bg-[#C71B30] disabled:opacity-60 text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_25px_rgba(224,30,55,0.5)] flex items-center justify-center gap-2 rounded-xl cursor-pointer shrink-0"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>MENGIRIM BROADCAST...</span>
                    </>
                  ) : (
                    <>
                      <span>KIRIM BROADCAST KE SEMUA BAND</span>
                      <span>▶</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
