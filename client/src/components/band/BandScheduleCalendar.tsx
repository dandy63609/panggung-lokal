import React, { useState, useMemo } from 'react'
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Building,
  CheckCircle2,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react'
import type { BandSchedule } from '../../types'
import { authClient } from '../../lib/auth'

interface BandScheduleCalendarProps {
  schedules: BandSchedule[]
  bandName: string
  bandId?: number
  isOwner?: boolean
  onAddScheduleClick?: () => void
  onScheduleDeleted?: (id: number) => void
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
]

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

export const BandScheduleCalendar: React.FC<BandScheduleCalendarProps> = ({
  schedules = [],
  bandName,
  bandId,
  isOwner = false,
  onAddScheduleClick,
  onScheduleDeleted,
}) => {
  // Current viewing month/year for the calendar
  const [currentDate, setCurrentDate] = useState(() => new Date(2026, 10, 1)) // Nov 2026
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDateFilter(null)
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDateFilter(null)
  }

  // Days in current month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay()
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const days: Array<{
      dayNumber: number
      isCurrentMonth: boolean
      dateStr: string
      hasSchedule: boolean
      schedulesForDay: BandSchedule[]
    }> = []

    // Previous month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i
      const prevMonthDate = new Date(year, month - 1, d)
      const dateStr = prevMonthDate.toISOString().split('T')[0]
      const daySchedules = schedules.filter((s) => s.eventDate === dateStr)
      days.push({
        dayNumber: d,
        isCurrentMonth: false,
        dateStr,
        hasSchedule: daySchedules.length > 0,
        schedulesForDay: daySchedules,
      })
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0')
      const dStr = String(d).padStart(2, '0')
      const dateStr = `${year}-${mStr}-${dStr}`
      const daySchedules = schedules.filter((s) => s.eventDate === dateStr)
      days.push({
        dayNumber: d,
        isCurrentMonth: true,
        dateStr,
        hasSchedule: daySchedules.length > 0,
        schedulesForDay: daySchedules,
      })
    }

    // Next month padding to fill a 35 or 42 grid
    const remaining = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) {
      const nextMonthDate = new Date(year, month + 1, i)
      const dateStr = nextMonthDate.toISOString().split('T')[0]
      const daySchedules = schedules.filter((s) => s.eventDate === dateStr)
      days.push({
        dayNumber: i,
        isCurrentMonth: false,
        dateStr,
        hasSchedule: daySchedules.length > 0,
        schedulesForDay: daySchedules,
      })
    }

    return days
  }, [year, month, schedules])

  // Filtered schedules for the active month or selected day
  const displayedSchedules = useMemo(() => {
    if (selectedDateFilter) {
      return schedules.filter((s) => s.eventDate === selectedDateFilter)
    }
    // Filter for current viewing month
    const mStr = String(month + 1).padStart(2, '0')
    const prefix = `${year}-${mStr}`
    const inMonth = schedules.filter((s) => s.eventDate && s.eventDate.startsWith(prefix))
    if (inMonth.length > 0) return inMonth
    // If no events in this month, return upcoming events
    return schedules
  }, [schedules, selectedDateFilter, year, month])

  const handleDelete = async (id: number) => {
    if (!window.confirm('Apakah Anda yakin ingin membatalkan dan menghapus jadwal manggung ini?')) {
      return
    }

    setDeletingId(id)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/bands/schedules/${id}`, {
        method: 'DELETE',
        headers: authClient.getAuthHeaders(),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Gagal menghapus jadwal manggung')
      }
      if (onScheduleDeleted) onScheduleDeleted(id)
    } catch (err: any) {
      setDeleteError(err.message || 'Terjadi kesalahan saat menghapus jadwal')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-')
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
        return d.toLocaleDateString('id-ID', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      }
      return dateStr
    } catch {
      return dateStr
    }
  }

  return (
    <section
      id="jadwal-manggung"
      className="bg-[#0D0D0D] border-2 border-[#E01E37]/60 rounded-3xl p-5 sm:p-8 space-y-6 shadow-[0_0_50px_rgba(224,30,55,0.2)] relative overflow-hidden"
    >
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#E01E37]/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#222222]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E01E37]/20 border border-[#E01E37] text-[#E01E37] font-mono text-[11px] font-bold uppercase tracking-wider">
              <CalendarIcon className="w-3.5 h-3.5" />
              KALENDER PANGGUNG LIVE RESMI
            </span>
            <span className="font-mono text-[11px] text-[#A0A0A0] bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
              {schedules.length} Jadwal Terkonfirmasi
            </span>
          </div>
          <h2 className="font-mono text-xl sm:text-2xl font-bold uppercase text-white tracking-tight flex items-center gap-2">
            <span>Jadwal Manggung & Ketersediaan {bandName}</span>
          </h2>
          <p className="text-xs text-[#A0A0A0] font-sans max-w-2xl leading-relaxed">
            Jadwal penampilan langsung yang telah <strong>terkonfirmasi resmi</strong> setelah kesepakatan manggung. Silakan periksa tanggal dan jam sebelum menghubungi band via WhatsApp untuk memastikan tidak terjadi bentrok jadwal.
          </p>
        </div>

        {/* Action Button: Band Owner can input new schedule directly */}
        {isOwner && onAddScheduleClick && (
          <button
            type="button"
            onClick={onAddScheduleClick}
            className="shrink-0 min-h-[46px] px-5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_4px_20px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>+ INPUT JADWAL MANGGUNG</span>
          </button>
        )}
      </div>

      {deleteError && (
        <div className="p-3 bg-red-950/40 border border-red-800 text-red-200 text-xs rounded-xl font-mono">
          {deleteError}
        </div>
      )}

      {/* Main Grid: Interactive Mini-Calendar + Detailed Gig Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Visual Calendar Grid (5 cols) */}
        <div className="lg:col-span-5 bg-[#121212] border border-[#262626] rounded-2xl p-4 sm:p-5 space-y-4">
          {/* Month Switcher */}
          <div className="flex items-center justify-between pb-3 border-b border-[#222]">
            <h3 className="font-mono font-bold text-sm uppercase text-white tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FFD166]" />
              <span>{MONTH_NAMES[month]} {year}</span>
            </h3>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Bulan sebelumnya"
                className="w-8 h-8 rounded-lg bg-[#1F1F1F] hover:bg-[#2B2B2B] text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                aria-label="Bulan berikutnya"
                className="w-8 h-8 rounded-lg bg-[#1F1F1F] hover:bg-[#2B2B2B] text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 text-center font-mono text-[10px] text-[#777] font-bold uppercase tracking-wider">
            {DAY_NAMES.map((d, i) => (
              <div key={i} className="py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-xs">
            {calendarDays.map((cd, idx) => {
              const isSelected = selectedDateFilter === cd.dateStr
              const hasGigs = cd.hasSchedule

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    if (hasGigs) {
                      setSelectedDateFilter(isSelected ? null : cd.dateStr)
                    }
                  }}
                  disabled={!hasGigs && !cd.isCurrentMonth}
                  className={`min-h-[38px] rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-mono ${
                    hasGigs
                      ? isSelected
                        ? 'bg-[#E01E37] text-white font-bold ring-2 ring-white shadow-[0_0_15px_rgba(224,30,55,0.7)] cursor-pointer scale-105'
                        : 'bg-[#E01E37]/25 text-white border border-[#E01E37] font-bold hover:bg-[#E01E37]/50 cursor-pointer shadow-[0_0_10px_rgba(224,30,55,0.3)]'
                      : cd.isCurrentMonth
                        ? 'bg-[#181818] text-[#A0A0A0] hover:text-white'
                        : 'text-[#444] opacity-40'
                  }`}
                  title={
                    hasGigs
                      ? `${cd.schedulesForDay.length} Jadwal Manggung (${cd.dateStr})`
                      : cd.dateStr
                  }
                >
                  <span>{cd.dayNumber}</span>
                  {hasGigs && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFD166] mt-0.5 animate-pulse" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend and Filter Reset */}
          <div className="pt-3 border-t border-[#222] flex items-center justify-between text-[11px] font-mono text-[#888]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#E01E37] border border-white/20 inline-block" />
                <span>Manggung (Booked)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-[#181818] border border-white/10 inline-block" />
                <span>Tersedia</span>
              </span>
            </div>

            {selectedDateFilter && (
              <button
                type="button"
                onClick={() => setSelectedDateFilter(null)}
                className="text-[#FFD166] hover:underline font-bold"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Confirmed Gig List (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#CCCCCC] font-bold uppercase tracking-wider">
              {selectedDateFilter
                ? `JADWAL PADA TANGGAL ${selectedDateFilter}`
                : `DAFTAR JADWAL PENAMPILAN (${displayedSchedules.length})`}
            </span>
            <span className="text-[#888]">OFFICIAL LIVE GIGS</span>
          </div>

          {displayedSchedules.length === 0 ? (
            <div className="bg-[#121212] border border-[#242424] rounded-2xl p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E01E37]/10 border border-[#E01E37]/30 text-[#E01E37] mx-auto flex items-center justify-center">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h4 className="font-mono text-sm font-bold uppercase text-white">
                Belum Ada Jadwal Manggung Publik
              </h4>
              <p className="text-xs text-[#888] font-sans max-w-sm mx-auto leading-relaxed">
                {isOwner
                  ? 'Anda belum menambahkan tanggal manggung. Klik tombol "+ Input Jadwal Manggung" di atas untuk mempublikasikan jadwal live stage Anda!'
                  : 'Musisi ini saat ini memiliki ketersediaan terbuka untuk periode ini. Ajukan tawaran booking via WhatsApp sebelum jadwal terisi!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedSchedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="bg-[#121212] border border-[#282828] hover:border-[#E01E37]/60 rounded-2xl p-4 sm:p-5 transition-all shadow-sm space-y-3 relative group"
                >
                  {/* Top Bar: Date & Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="font-mono text-[10px] uppercase font-bold text-[#FFD166] tracking-wider block">
                        📅 {formatDisplayDate(schedule.eventDate)}
                      </span>
                      <h4 className="font-mono font-bold text-base text-white uppercase tracking-tight">
                        {schedule.eventName}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#E01E37]/15 border border-[#E01E37]/50 text-[#E01E37] font-mono text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>TERKONFIRMASI</span>
                      </span>

                      {/* Owner Delete Button */}
                      {isOwner && onScheduleDeleted && (
                        <button
                          type="button"
                          onClick={() => handleDelete(schedule.id)}
                          disabled={deletingId === schedule.id}
                          className="w-8 h-8 rounded-lg bg-red-950/30 hover:bg-red-900/50 text-red-400 border border-red-800/40 flex items-center justify-center transition-colors cursor-pointer"
                          aria-label="Batalkan / Hapus jadwal ini"
                          title="Hapus jadwal manggung ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Metadata: Time & Venue */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-[#CCCCCC] bg-[#0A0A0A] p-3 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#FFD166] shrink-0" />
                      <span>
                        Jam: <strong className="text-white">{schedule.startTime} - {schedule.endTime}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2 truncate">
                      <MapPin className="w-4 h-4 text-[#E01E37] shrink-0" />
                      <span className="truncate">
                        Venue: <strong className="text-white">{schedule.venue || schedule.locationCity || 'Venue Terjadwal'}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Optional Organizer & Notes */}
                  {(schedule.organizerName || schedule.notes) && (
                    <div className="text-[11px] font-sans text-[#999] pt-1 space-y-1">
                      {schedule.organizerName && (
                        <div className="font-mono text-[10px] text-[#A0A0A0] uppercase">
                          Penyelenggara: <strong className="text-white">{schedule.organizerName}</strong>
                        </div>
                      )}
                      {schedule.notes && (
                        <p className="leading-relaxed italic text-[#BBB]">
                          "{schedule.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
