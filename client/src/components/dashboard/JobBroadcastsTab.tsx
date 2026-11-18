import React from 'react'
import { Megaphone, Calendar, Clock, MapPin, Mail, Paperclip, FileText, Download, Phone } from 'lucide-react'
import { formatFileSize, formatWhatsAppPhone } from '../../lib/bandHelpers'
import type { JobBroadcast } from '../../types'

interface JobBroadcastsTabProps {
  jobBroadcasts: JobBroadcast[]
  bandName?: string
}

export const JobBroadcastsTab: React.FC<JobBroadcastsTabProps> = ({ jobBroadcasts, bandName }) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-wider text-white">
            NOTIFIKASI JOB BROADCAST PANGGUNG
          </h2>
          <p className="text-xs text-[#808080] font-sans">
            Panggilan panggung terbuka dari penyelenggara acara yang disiarkan ke seluruh band terdaftar di Reffband.
          </p>
        </div>
        <span className="px-3 py-1 bg-[#141414] border border-[#262626] font-mono text-[11px] text-[#A0A0A0] uppercase tracking-wider shrink-0">
          {jobBroadcasts.length} PANGGILAN TERSEDIA
        </span>
      </div>

      {jobBroadcasts.length === 0 ? (
        <div className="p-12 text-center bg-[#111111] border border-[#242424] space-y-3">
          <Megaphone className="w-10 h-10 text-[#606060] mx-auto" />
          <div className="space-y-1">
            <h3 className="font-mono text-sm font-bold text-white uppercase">
              Belum Ada Job Broadcast Masuk
            </h3>
            <p className="text-xs font-sans text-[#808080] max-w-md mx-auto">
              Saat Penyelenggara Acara (EO) mengirimkan broadcast jadwal panggung baru, undangan tampil beserta waktu dan lampiran venue akan muncul di sini.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {jobBroadcasts.map((job) => {
            const waPhone = formatWhatsAppPhone(job.organizerPhone)
            const waText = encodeURIComponent(
              `Halo ${job.organizerName}, kami dari band ${bandName || 'Reffband'} melihat Job Broadcast Anda di Reffband untuk acara pada ${job.eventDate} (${job.performStartTime} - ${job.performEndTime} WIB) di ${job.venueLocation}. Kami tertarik dan siap tampil!`
            )
            const waHref = waPhone ? `https://wa.me/${waPhone}?text=${waText}` : '#'

            return (
              <article
                key={job.id}
                className="bg-[#121212] border border-[#262626] hover:border-[#E01E37]/60 transition-colors p-5 sm:p-6 space-y-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#222222]">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 bg-[#E01E37]/15 border border-[#E01E37]/50 text-[#E01E37] font-mono text-[10px] font-bold uppercase tracking-wider">
                        BROADCAST TERBUKA
                      </span>
                      <span className="px-2 py-0.5 bg-[#1C1C1C] border border-[#2E2E2E] text-white font-mono text-[10px] uppercase tracking-wider">
                        SKALA ACARA {job.eventScale || 5}/5
                      </span>
                    </div>
                    <h3 className="font-display text-xl sm:text-2xl text-white tracking-wide pt-1">
                      {job.organizerName}
                    </h3>
                  </div>

                  <div className="text-[11px] font-mono text-[#737373] shrink-0">
                    Dikirim{' '}
                    {job.createdAt
                      ? new Date(job.createdAt).toLocaleDateString('id-ID', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Baru saja'}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-3 bg-[#161616] border border-[#242424] space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-[#E01E37]" />
                      TANGGAL ACARA
                    </span>
                    <div className="font-mono text-xs font-bold text-white">{job.eventDate}</div>
                  </div>

                  <div className="p-3 bg-[#161616] border border-[#242424] space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-[#E01E37]" />
                      WAKTU TAMPIL
                    </span>
                    <div className="font-mono text-xs font-bold text-white">
                      {job.performStartTime} - {job.performEndTime} WIB
                    </div>
                  </div>

                  <div className="p-3 bg-[#161616] border border-[#242424] space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-[#E01E37]" />
                      LOKASI / VENUE
                    </span>
                    <div className="font-mono text-xs font-bold text-white break-words">
                      {job.venueLocation}
                    </div>
                  </div>

                  <div className="p-3 bg-[#161616] border border-[#242424] space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-[#E01E37]" />
                      KONTAK PENYELENGGARA
                    </span>
                    <div className="font-mono text-xs text-white truncate" title={job.organizerEmail}>
                      {job.organizerEmail}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-[#0E0E0E] border border-[#222222] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#737373] block">
                    RINCIAN VENUE, RUNDOWN & KETENTUAN
                  </span>
                  <p className="text-xs sm:text-sm text-[#D0D0D0] font-sans leading-relaxed whitespace-pre-line">
                    {job.eventDetails}
                  </p>
                </div>

                {job.attachments && job.attachments.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#8A8A8A] flex items-center gap-1.5">
                      <Paperclip className="w-3 h-3 text-[#E01E37]" />
                      LAMPIRAN FILE DETAIL VENUE ({job.attachments.length})
                    </span>
                    <div className="flex flex-wrap gap-2.5">
                      {job.attachments.map((att, attIdx) => (
                        <a
                          key={`${att.fileUrl}-${attIdx}`}
                          href={att.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={att.originalName}
                          className="min-h-[44px] px-3.5 py-2 bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] hover:border-[#E01E37] text-white font-mono text-xs flex items-center gap-2.5 transition-colors max-w-full"
                        >
                          <FileText className="w-4 h-4 text-[#E01E37] shrink-0" />
                          <span className="truncate max-w-[200px] sm:max-w-[280px]">
                            {att.originalName}
                          </span>
                          {att.size > 0 && (
                            <span className="text-[10px] text-[#808080] shrink-0">
                              ({formatFileSize(att.size)})
                            </span>
                          )}
                          <Download className="w-3.5 h-3.5 text-[#A0A0A0] shrink-0" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[#222222] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="font-mono text-xs text-[#808080] flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#E01E37] shrink-0" />
                    <span>WhatsApp EO: {job.organizerPhone}</span>
                  </div>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-5 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors shadow-[0_0_15px_rgba(224,30,55,0.25)] shrink-0"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Hubungi WhatsApp EO</span>
                  </a>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
