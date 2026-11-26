import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  CalendarCheck,
  CalendarX,
  CheckCheck,
  Megaphone,
  MessageSquare,
  Star,
  Loader2,
  X,
} from 'lucide-react'
import { authClient, type AuthUser } from '../../lib/auth'

export interface AppNotificationItem {
  id: string
  type:
    | 'booking_inquiry'
    | 'schedule_confirmed'
    | 'schedule_cancelled'
    | 'job_broadcast'
    | 'review_reminder'
    | 'system'
  title: string
  message: string
  link: string
  badge?: string | null
  isRead: boolean
  createdAt?: string | null
}

interface NotificationBellProps {
  currentUser: AuthUser
}

function formatRelativeTime(iso?: string | null): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Baru saja'
  if (diffMin < 60) return `${diffMin} mnt lalu`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} jam lalu`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
}

function getNotificationMeta(type: AppNotificationItem['type']) {
  switch (type) {
    case 'booking_inquiry':
      return {
        icon: MessageSquare,
        iconBg: 'bg-[#E01E37]/15 text-[#FF6B7F] border-[#E01E37]/35',
        badgeClass: 'bg-[#E01E37]/15 text-[#FF6B7F] border-[#E01E37]/30',
      }
    case 'schedule_confirmed':
      return {
        icon: CalendarCheck,
        iconBg: 'bg-[#00D9FF]/15 text-[#00D9FF] border-[#00D9FF]/35',
        badgeClass: 'bg-[#00D9FF]/15 text-[#00D9FF] border-[#00D9FF]/30',
      }
    case 'schedule_cancelled':
      return {
        icon: CalendarX,
        iconBg: 'bg-red-500/15 text-red-400 border-red-500/35',
        badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',
      }
    case 'job_broadcast':
      return {
        icon: Megaphone,
        iconBg: 'bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/35',
        badgeClass: 'bg-[#FFD166]/15 text-[#FFD166] border-[#FFD166]/30',
      }
    case 'review_reminder':
      return {
        icon: Star,
        iconBg: 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/45',
        badgeClass: 'bg-[#FFD166]/20 text-[#FFD166] border-[#FFD166]/40',
      }
    default:
      return {
        icon: Bell,
        iconBg: 'bg-white/10 text-white border-white/20',
        badgeClass: 'bg-white/10 text-[#CCCCCC] border-white/20',
      }
  }
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser }) => {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<AppNotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const fetchNotifications = useCallback(async (showSpinner = false) => {
    if (!authClient.getToken()) return
    if (showSpinner) setLoading(true)
    try {
      const res = await fetch('/api/notifications', {
        headers: authClient.getAuthHeaders(),
      })
      if (!res.ok) return
      const json = await res.json()
      if (json.success && json.data) {
        setItems(Array.isArray(json.data.items) ? json.data.items : [])
        setUnreadCount(Number(json.data.unreadCount) || 0)
      }
    } catch {
      // Non-blocking network error
    } finally {
      if (showSpinner) setLoading(false)
    }
  }, [])

  // Initial fetch + periodic background refresh (60s) + window focus refresh
  useEffect(() => {
    fetchNotifications(false)
    const intervalId = window.setInterval(() => {
      fetchNotifications(false)
    }, 60000)

    const onFocus = () => fetchNotifications(false)
    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', onFocus)
    }
  }, [currentUser.id, fetchNotifications])

  // Close on click outside or Escape
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleToggle = () => {
    const nextOpen = !open
    setOpen(nextOpen)
    if (nextOpen) {
      fetchNotifications(items.length === 0)
    }
  }

  const handleMarkItemRead = async (item: AppNotificationItem) => {
    if (!item.isRead) {
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isRead: true } : it)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
      fetch('/api/notifications/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
        },
        body: JSON.stringify({ ids: [item.id] }),
      }).catch(() => {})
    }
    setOpen(false)
    if (item.link) {
      navigate(item.link)
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || markingAll) return
    setMarkingAll(true)
    const allIds = items.map((it) => it.id)
    setItems((prev) => prev.map((it) => ({ ...it, isRead: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authClient.getAuthHeaders(),
        },
        body: JSON.stringify({ ids: allIds }),
      })
    } catch {
      // Ignore
    } finally {
      setMarkingAll(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className={`relative p-2.5 border transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer ${
          open
            ? 'text-white bg-[#1F1F1F] border-[#E01E37]'
            : 'text-[#A0A0A0] hover:text-white hover:bg-[#1C1C1C] border-[#2C2C2C]'
        }`}
        title="Notifikasi"
        aria-label={unreadCount > 0 ? `Notifikasi (${unreadCount} belum dibaca)` : 'Notifikasi'}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-white' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#E01E37] text-white font-mono font-bold text-[10px] flex items-center justify-center shadow-[0_0_10px_rgba(224,30,55,0.75)] border border-[#0D0D0D]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Panel Notifikasi"
          className="fixed inset-x-3 top-[76px] sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+10px)] z-50 sm:w-[390px] bg-[#121212] border border-[#2E2E2E] rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.92)] overflow-hidden"
        >
          {/* Header */}
          <div className="px-4 py-3.5 bg-[#161616] border-b border-[#242424] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#E01E37]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Notifikasi
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#E01E37]/20 border border-[#E01E37]/40 text-[#FF6B7F] font-mono text-[10px] font-bold">
                  {unreadCount} baru
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAll}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider text-[#A0A0A0] hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
                  title="Tandai semua sudah dibaca"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-[#00D9FF]" />
                  <span>Tandai dibaca</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 text-[#808080] hover:text-white rounded sm:hidden cursor-pointer"
                aria-label="Tutup notifikasi"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-[#1E1E1E]">
            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-[#888]">
                <Loader2 className="w-5 h-5 animate-spin text-[#E01E37]" />
                <span className="font-mono text-[11px] uppercase tracking-wider">
                  Memuat notifikasi...
                </span>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 px-6 text-center space-y-2">
                <div className="w-11 h-11 rounded-full bg-[#1A1A1A] border border-[#282828] text-[#666] mx-auto flex items-center justify-center">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="font-mono text-xs font-bold uppercase text-white">
                  Belum Ada Notifikasi
                </p>
                <p className="text-xs text-[#8A8A8A] font-sans leading-relaxed">
                  Pembaruan booking masuk, konfirmasi jadwal, job broadcast, atau pengingat ulasan akan muncul di sini.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const meta = getNotificationMeta(item.type)
                const Icon = meta.icon
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleMarkItemRead(item)}
                    className={`w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      item.isRead
                        ? 'bg-[#121212] hover:bg-[#181818] opacity-75 hover:opacity-100'
                        : 'bg-[#181315] hover:bg-[#20171A]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${meta.iconBg}`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                          {item.badge && (
                            <span
                              className={`px-1.5 py-0.5 rounded border font-mono text-[9px] font-bold uppercase tracking-wider ${meta.badgeClass}`}
                            >
                              {item.badge}
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-[#777]">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                        {!item.isRead && (
                          <span
                            className="w-2 h-2 rounded-full bg-[#E01E37] shrink-0 shadow-[0_0_6px_rgba(224,30,55,0.8)]"
                            aria-label="Belum dibaca"
                          />
                        )}
                      </div>

                      <p className="font-mono text-xs font-bold text-white leading-snug line-clamp-1">
                        {item.title}
                      </p>
                      <p className="text-xs text-[#A8A8A8] font-sans leading-relaxed line-clamp-2">
                        {item.message}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
