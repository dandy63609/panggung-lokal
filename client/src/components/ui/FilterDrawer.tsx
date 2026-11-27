import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check } from 'lucide-react'
import { CityCombobox } from './CityCombobox'

export interface FilterState {
  city: string
  budgetRange: string
}

interface FilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  onFilterChange: (filters: FilterState) => void
  onReset: () => void
  matchCount: number
}

const BUDGET_OPTIONS = [
  { id: 'all', label: 'Semua Rate' },
  { id: '100kto1m', label: '100rb - 1 Juta' },
  { id: 'under3m', label: '< 3 Juta' },
  { id: '3to6m', label: '3 - 6 Juta' },
  { id: '6to10m', label: '6 - 10 Juta' },
  { id: 'above10m', label: '> 10 Juta' },
]

export const FilterDrawer: React.FC<FilterDrawerProps> = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
  matchCount,
}) => {
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = (e: MediaQueryListEvent | MediaQueryList) => setIsMobileViewport(e.matches)
    sync(mq)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  // Lock page scroll while mobile sheet is open
  useEffect(() => {
    if (!isOpen || !isMobileViewport || typeof document === 'undefined') return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, isMobileViewport])

  // Close on Escape key (unless an inner combobox listbox is currently open)
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.querySelector('[role="combobox"][aria-expanded="true"]')) {
          return
        }
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const backdropClass = isMobileViewport
    ? 'fixed inset-0 z-[60] bg-black/70'
    : 'fixed inset-0 z-40 bg-transparent'

  const backdrop = (
    <div
      onClick={onClose}
      className={backdropClass}
      aria-hidden="true"
    />
  )

  const drawerDialog = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Filter Spesifikasi Band"
      className={
        isMobileViewport
          ? 'fixed inset-x-0 bottom-0 z-[70] w-full max-h-[calc(100dvh-16px)] overflow-y-auto overscroll-contain bg-[#141414] border-t border-[#323232] rounded-t-2xl shadow-[0_-20px_50px_rgba(0,0,0,0.9)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col justify-between space-y-5'
          : 'absolute right-0 top-[calc(100%+8px)] z-50 w-[480px] overflow-visible bg-[#141414] border border-[#323232] shadow-[0_20px_50px_rgba(0,0,0,0.9)] p-6 flex flex-col justify-between space-y-6'
      }
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#242424]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#E01E37]" />
          <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#E01E37]">
            FILTER SPESIFIKASI
          </h4>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onReset}
            className="min-h-[44px] px-2 font-mono text-xs uppercase tracking-wider text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
          >
            Reset Semua
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel filter"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 text-[#A0A0A0] hover:text-white md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Section 1: Kota / Kabupaten Domisili */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <label
            htmlFor="filter-city-combobox"
            className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0] block"
          >
            Kota / Kabupaten Domisili
          </label>
          {filters.city !== 'Semua' && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, city: 'Semua' })}
              className="font-mono text-[11px] text-[#FF6B7F] hover:text-white transition-colors cursor-pointer"
            >
              Semua Kota
            </button>
          )}
        </div>
        <CityCombobox
          id="filter-city-combobox"
          value={filters.city}
          onChange={(city) => onFilterChange({ ...filters, city })}
          allowAll
          allLabel="Semua Kota / Kabupaten"
          placeholder="Ketik kota/kabupaten (contoh: Semarang, Bandung, Bali)..."
          inputClassName="w-full bg-[#1C1C1C] border border-[#2E2E2E] focus:border-[#E01E37] focus:ring-1 focus:ring-[#E01E37] text-white placeholder-[#8A8A8A] text-xs pl-10 pr-14 py-2.5 min-h-[44px] transition-colors outline-none font-sans"
        />
      </div>

      {/* Filter Section 2: Rekomendasi Kami (Budget / Honor Range) */}
      <div className="space-y-3">
        <label className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0] block">
          Rekomendasi Kami
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {BUDGET_OPTIONS.map((opt) => {
            const active = filters.budgetRange === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onFilterChange({ ...filters, budgetRange: opt.id })}
                className={`min-h-[44px] px-2.5 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors border text-center cursor-pointer ${
                  active
                    ? 'bg-[#E01E37] text-white border-[#E01E37] font-bold shadow-[0_0_12px_rgba(224,30,55,0.4)]'
                    : 'bg-[#1C1C1C] text-[#A0A0A0] border-[#2A2A2A] hover:text-white hover:border-[#404040]'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom Apply CTA */}
      <div className="pt-4 border-t border-[#242424]">
        <button
          type="button"
          onClick={onClose}
          className="w-full h-[52px] bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(224,30,55,0.3)]"
        >
          <span>TERAPKAN FILTER ({matchCount} BAND)</span>
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  )

  if (typeof document !== 'undefined' && isMobileViewport) {
    return createPortal(
      <>
        {backdrop}
        {drawerDialog}
      </>,
      document.body
    )
  }

  return (
    <>
      {backdrop}
      {drawerDialog}
    </>
  )
}
