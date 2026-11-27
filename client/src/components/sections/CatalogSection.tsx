import React, { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Filter, ChevronRight, SlidersHorizontal, Lock, Search, X } from 'lucide-react'
import type { Band } from '../../types'
import { BandCard } from '../ui/BandCard'
import { FilterDrawer } from '../ui/FilterDrawer'
import type { FilterState } from '../ui/FilterDrawer'
import { CompareDrawer } from '../ui/CompareDrawer'
import { authClient, type AuthUser } from '../../lib/auth'
import { BAND_GENRE_FILTERS, CATALOG_FILTER_CATEGORIES, matchesGenreCategory } from '../../lib/genres'
import { matchesCityFilter } from '../../lib/cities'

interface CatalogSectionProps {
  initialBands?: Band[]
}

const CATEGORIES = CATALOG_FILTER_CATEGORIES

function resolveInitialCategory(genreParam: string | null): string {
  const clean = (genreParam || '').trim().toLowerCase()
  if (!clean) return 'SEMUA'
  const match = BAND_GENRE_FILTERS.find(
    (item) =>
      item.category.toLowerCase() === clean ||
      item.keywords.some((kw) => clean.includes(kw))
  )
  return match ? match.category : 'SEMUA'
}

const INITIAL_FILTERS: FilterState = {
  city: 'Semua',
  budgetRange: 'all',
}

export const CatalogSection: React.FC<CatalogSectionProps> = ({ initialBands }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [searchQuery, setSearchQuery] = useState<string>(() =>
    (searchParams.get('q') || searchParams.get('search') || '').trim()
  )
  const [bands, setBands] = useState<Band[]>(initialBands || [])
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    resolveInitialCategory(searchParams.get('genre'))
  )

  // Synchronize category filter and search query whenever query param in URL changes
  useEffect(() => {
    const genreParam = searchParams.get('genre')
    setSelectedCategory(genreParam ? resolveInitialCategory(genreParam) : 'SEMUA')
    const qParam = searchParams.get('q') || searchParams.get('search') || ''
    setSearchQuery(qParam.trim())
  }, [searchParams])
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [comparedBands, setComparedBands] = useState<Band[]>([])
  const [loading, setLoading] = useState<boolean>(!initialBands)
  const [visibleCount, setVisibleCount] = useState<number>(9)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authClient.getUser())

  // Fetch live bands from backend API (supports both authenticated users and public guest preview)
  useEffect(() => {
    let cancelled = false

    async function fetchBands() {
      try {
        setLoading(true)
        const qParam = (searchParams.get('q') || searchParams.get('search') || '').trim()
        const genreParam = (searchParams.get('genre') || '').trim()
        const params = new URLSearchParams({ limit: '50' })
        if (qParam) params.set('search', qParam)
        if (genreParam && genreParam.toUpperCase() !== 'SEMUA') params.set('genre', genreParam)
        const res = await fetch(`/api/bands/search?${params.toString()}`, {
          headers: authClient.getAuthHeaders(),
        })
        if (res.ok && !cancelled) {
          const json = await res.json()
          const apiBands: Band[] = Array.isArray(json.data)
            ? json.data
            : json.data?.bands || []

          if (json.success) {
            setBands([...apiBands].sort((a, b) => a.id - b.id))
            return
          }
        }
        if (!cancelled) {
          setBands([])
        }
      } catch {
        if (!cancelled) {
          setBands([])
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    if (!initialBands || initialBands.length === 0) {
      fetchBands()
    }

    const onAuthChange = () => {
      const u = authClient.getUser()
      setCurrentUser(u)
      if (!initialBands || initialBands.length === 0) {
        fetchBands()
      }
    }
    window.addEventListener('auth-change', onAuthChange)
    window.addEventListener('storage', onAuthChange)
    return () => {
      cancelled = true
      window.removeEventListener('auth-change', onAuthChange)
      window.removeEventListener('storage', onAuthChange)
    }
  }, [initialBands, currentUser, searchParams])

  // Count active extra filters
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filters.city !== 'Semua') count++
    if (filters.budgetRange !== 'all') count++
    return count
  }, [filters])

  // Filter bands by search keyword, category, and drawer filters
  const filteredBands = useMemo(() => {
    return bands.filter((band) => {
      // 0. Keyword search filter (band name, genre, bio, city, or campus label)
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const nameMatch = (band.bandName || (band as unknown as { name?: string }).name || '').toLowerCase().includes(q)
        const genreMatch = (band.genre || '').toLowerCase().includes(q)
        const bioMatch = (band.bio || '').toLowerCase().includes(q)
        const cityMatch = (band.locationCity || '').toLowerCase().includes(q)
        const campusMatch = (band.campus || '').toLowerCase().includes(q)
        if (!nameMatch && !genreMatch && !bioMatch && !cityMatch && !campusMatch) return false
      }

      // 1. Category Tab
      if (!matchesGenreCategory(band.genre, selectedCategory)) {
        return false
      }

      // 2. City / Kabupaten filter (supports all 514 Indonesia regions + legacy aliases)
      if (!matchesCityFilter(band.locationCity, filters.city)) {
        return false
      }

      // 4. Budget range
      const minBudget = Number(band.budgetMin || 0)
      if (filters.budgetRange === '100kto1m') {
        if (!minBudget || minBudget < 100000 || minBudget > 1000000) return false
      } else if (filters.budgetRange === 'under3m') {
        if (minBudget && minBudget >= 3000000) return false
      } else if (filters.budgetRange === '3to6m') {
        if (!minBudget || minBudget < 3000000 || minBudget > 6000000) return false
      } else if (filters.budgetRange === '6to10m') {
        if (!minBudget || minBudget < 6000000 || minBudget > 10000000) return false
      } else if (filters.budgetRange === 'above10m') {
        if (!minBudget || minBudget < 10000000) return false
      }

      return true
    })
  }, [bands, selectedCategory, filters, searchQuery])

  // Toggle compare item
  const handleToggleCompare = (band: Band) => {
    setComparedBands((prev) => {
      const exists = prev.some((b) => b.id === band.id)
      if (exists) {
        return prev.filter((b) => b.id !== band.id)
      }
      if (prev.length >= 4) {
        return prev
      }
      return [...prev, band]
    })
  }

  // Sliced bands for display
  const displayBands = filteredBands.slice(0, visibleCount)

  return (
    <section id="cari-band" className="relative w-full bg-black border-b border-[#202020] pt-6 pb-20 px-5">
      {/* Subtle stage grid line pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-[1440px] mx-auto space-y-12 relative z-10">
        {/* 1. CATALOG HEADER (Exact Gencherry CatalogHeader: No dot, Stretched Edge-to-Edge Wordmark, Single-line Subtitle) */}
        <div className="space-y-3 pt-2">
          {/* Eyebrow type line */}
          <h1 className="font-mono text-xs uppercase tracking-widest text-white/80 animate-type-reveal">
            KATALOG RESMI BAND LOKAL
          </h1>

          {/* Stretched Display Wordmark spanning edge to edge */}
          <div className="w-full flex items-center justify-between text-white font-mono font-black text-[10vw] sm:text-[8vw] md:text-[6.8vw] leading-none tracking-tight select-none my-3">
            <span>R</span><span>E</span><span>F</span><span>F</span><span>B</span><span>A</span><span>N</span><span>D</span>
          </div>

          {/* Subtitle description line */}
          <p className="font-mono text-xs text-[#A0A0A0] uppercase tracking-wider truncate">
            KURASI MUSISI TERVERIFIKASI • 100% SIAP TAMPIL • BOOKING LANGSUNG TANPA PERANTARA BROKER
          </p>
        </div>

        {!currentUser && (
          <div className="bg-[#141113] border border-[#E01E37]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#E01E37]/15 border border-[#E01E37]/40 text-[#E01E37] flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                    Mode Pratinjau Publik
                  </span>
                  <span className="font-mono text-[9px] text-[#FF6B7F] font-bold tracking-widest uppercase bg-[#E01E37]/15 px-2 py-0.5 rounded border border-[#E01E37]/30">
                    Akses Tamu
                  </span>
                </div>
                <p className="text-[#A0A0A0] text-xs font-sans leading-relaxed mt-0.5">
                  Jelajahi katalog, sampel audio, dan technical rider band secara bebas. Masuk atau daftar gratis untuk membuka nomor WhatsApp, booking, dan kirim broadcast acara.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
              <Link
                to="/masuk?redirect=/cari-band"
                className="flex-1 sm:flex-none min-h-[42px] px-5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(224,30,55,0.35)]"
              >
                <span>Masuk</span>
              </Link>
              <Link
                to="/daftar?redirect=/cari-band"
                className="flex-1 sm:flex-none min-h-[42px] px-5 bg-[#202020] hover:bg-[#2A2A2A] border border-[#3A3A3A] text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <span>Daftar Gratis</span>
              </Link>
            </div>
          </div>
        )}

        <>
          {/* 2. STICKY FILTER BAR */}
            <div className="sticky top-20 z-30 pt-2 pb-4">
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-black/90 backdrop-blur-md pointer-events-none"
              />
              <div className="flex items-center gap-2">
                {/* Horizontal Category Tabs Bar with Mask Fade */}
                <div className="category-mask flex items-center gap-3 overflow-x-auto no-scrollbar px-4 py-2 bg-[#141414] border border-[#242424] flex-1">
                  {CATEGORIES.map((cat, idx) => {
                    const active = selectedCategory === cat
                    return (
                      <React.Fragment key={cat}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat)
                            const next = new URLSearchParams(searchParams)
                            if (cat === 'SEMUA') {
                              next.delete('genre')
                            } else {
                              next.set('genre', cat)
                            }
                            setSearchParams(next)
                          }}
                          className={`min-h-[44px] px-2 font-mono text-xs uppercase tracking-wider whitespace-nowrap transition-colors shrink-0 flex items-center ${
                            active
                              ? 'text-[#E01E37] font-bold'
                              : 'text-[#8A8A8A] hover:text-white'
                          }`}
                        >
                          {cat}
                        </button>
                        {idx < CATEGORIES.length - 1 && (
                          <span className="text-[#333333] font-mono text-xs select-none">/</span>
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>

                {/* Square Filter Button with Count Badge */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setFilterDrawerOpen(!filterDrawerOpen)}
                    aria-expanded={filterDrawerOpen}
                    aria-label="Buka drawer filter parameter"
                    className={`w-11 h-[44px] flex items-center justify-center border transition-colors bg-[#141414] ${
                      activeFilterCount > 0
                        ? 'border-[#E01E37] text-white'
                        : 'border-[#242424] text-[#A0A0A0] hover:text-white hover:border-[#383838]'
                    }`}
                  >
                    <SlidersHorizontal className="w-4 h-4 text-[#E01E37]" />
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#E01E37] text-white font-bold text-[9px] flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </button>

                  {/* Filter Popover Dropdown */}
                  <FilterDrawer
                    isOpen={filterDrawerOpen}
                    onClose={() => setFilterDrawerOpen(false)}
                    filters={filters}
                    onFilterChange={setFilters}
                    onReset={() => setFilters(INITIAL_FILTERS)}
                    matchCount={filteredBands.length}
                  />
                </div>
              </div>

              {/* Active Search Query Chip */}
              {searchQuery && (
                <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-[#141414] border border-[#E01E37]/50 rounded-sm w-fit">
                  <Search className="w-3.5 h-3.5 text-[#E01E37]" />
                  <span className="font-mono text-xs text-[#A0A0A0]">Kata kunci:</span>
                  <span className="font-mono text-xs font-bold text-white uppercase">"{searchQuery}"</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      const next = new URLSearchParams(searchParams)
                      next.delete('q')
                      next.delete('search')
                      setSearchParams(next)
                    }}
                    className="ml-1 p-0.5 text-[#A0A0A0] hover:text-white hover:bg-[#222222] rounded transition-colors cursor-pointer"
                    title="Hapus kata kunci pencarian"
                    aria-label="Hapus kata kunci"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* 3. PROPORTIONAL & UNIFORM BAND GRID (Consistent, Equal Layout For Each Band) */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-[#141414] border border-[#242424] aspect-[16/18] animate-pulse p-4 flex flex-col justify-between">
                    <div className="w-full aspect-[16/10] bg-[#1E1E1E]" />
                    <div className="space-y-2 mt-4">
                      <div className="h-4 bg-[#242424] w-3/4" />
                      <div className="h-3 bg-[#1C1C1C] w-1/2" />
                    </div>
                    <div className="h-8 bg-[#1C1C1C] w-full mt-4" />
                  </div>
                ))}
              </div>
            ) : displayBands.length > 0 ? (
              <div className="space-y-6">
                {/* Real-time Status Counter */}
                <div className="flex items-center justify-between text-xs font-mono text-[#808080] pb-2 border-b border-[#1E1E1E]">
                  <span>
                    MENAMPILKAN <strong className="text-white">{displayBands.length}</strong> DARI <strong className="text-white">{filteredBands.length}</strong> BAND TERDAFTAR
                  </span>
                  <span className="text-[#E01E37]">STATUS: REAL-TIME AKTIF</span>
                </div>

                {/* Proportional 3-Column Uniform Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                  {displayBands.map((band) => (
                    <BandCard
                      key={band.id}
                      band={band}
                      isCompared={comparedBands.some((b) => b.id === band.id)}
                      onToggleCompare={handleToggleCompare}
                      accentTag={band.genre?.toUpperCase()}
                      glassTag={band.locationCity?.toUpperCase()}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-16 text-center bg-[#141414] border border-[#242424] space-y-4">
                <Filter className="w-10 h-10 text-[#E01E37] mx-auto opacity-70" />
                <p className="font-mono text-sm text-[#A0A0A0] uppercase tracking-wider">
                  {searchQuery
                    ? `Tidak ada band yang sesuai dengan kata kunci "${searchQuery}".`
                    : 'Tidak ada band yang sesuai dengan kombinasi filter saat ini.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('SEMUA')
                    setFilters(INITIAL_FILTERS)
                    setSearchQuery('')
                    const next = new URLSearchParams(searchParams)
                    next.delete('q')
                    next.delete('search')
                    next.delete('genre')
                    setSearchParams(next)
                  }}
                  className="min-h-[44px] px-6 bg-[#E01E37] text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Reset Semua Filter &amp; Pencarian
                </button>
              </div>
            )}

            {displayBands.length < filteredBands.length && (
              <div className="w-full max-w-md mx-auto pt-8 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((prev) => prev + 3)}
                  className="w-full h-[52px] bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono font-bold text-xs uppercase tracking-widest transition-all shadow-[0_4px_20px_rgba(224,30,55,0.4)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>MUAT LEBIH BANYAK BAND</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
      </div>

      {/* 5. FLOATING COMPARE DRAWER (Gencherry CompareFab Adaptation) */}
      <CompareDrawer
        comparedBands={comparedBands}
        onRemove={(id) => setComparedBands((prev) => prev.filter((b) => b.id !== id))}
        onClear={() => setComparedBands([])}
      />
    </section>
  )
}
