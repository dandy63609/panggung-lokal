export interface GenreFilterOption {
  category: string
  label: string
  keywords: string[]
}

export const BAND_GENRE_FILTERS: readonly GenreFilterOption[] = [
  {
    category: 'ROCK & GRUNGE',
    label: 'Rock & Grunge',
    keywords: ['rock', 'grunge'],
  },
  {
    category: 'INDIE & FOLK',
    label: 'Indie & Folk',
    keywords: ['indie', 'folk'],
  },
  {
    category: 'METAL & HARDCORE',
    label: 'Metal & Hardcore',
    keywords: ['metal', 'hardcore', 'thrash'],
  },
  {
    category: 'POP & RETRO',
    label: 'Pop & Retro',
    keywords: ['pop', 'city pop', 'retro'],
  },
  {
    category: 'DANGDUT FUSION',
    label: 'Dangdut Fusion',
    keywords: ['dangdut', 'koplo', 'fusion'],
  },
  {
    category: 'JAZZ & SOUL',
    label: 'Jazz & Soul',
    keywords: ['jazz', 'soul', 'funk'],
  },
] as const

export const BAND_GENRE_OPTIONS: readonly string[] = BAND_GENRE_FILTERS.map(
  (item) => item.label
)

export const CATALOG_FILTER_CATEGORIES: string[] = [
  'SEMUA',
  ...BAND_GENRE_FILTERS.map((item) => item.category),
]

/**
 * Checks whether a band's genre matches a catalog search filter category.
 */
export function matchesGenreCategory(
  genre: string | undefined | null,
  selectedCategory: string
): boolean {
  if (!selectedCategory || selectedCategory === 'SEMUA') return true
  const normalizedGenre = (genre || '').toLowerCase()
  const filterDef = BAND_GENRE_FILTERS.find(
    (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
  )
  if (!filterDef) {
    return normalizedGenre.includes(selectedCategory.toLowerCase())
  }
  return filterDef.keywords.some((kw) => normalizedGenre.includes(kw))
}

/**
 * Normalizes a band's stored genre string to match canonical dropdown casing when present.
 */
export function normalizeBandGenreSelection(currentGenre?: string | null): string {
  const trimmed = (currentGenre || '').trim()
  if (!trimmed) return BAND_GENRE_OPTIONS[0]
  const canonicalMatch = BAND_GENRE_OPTIONS.find(
    (opt) => opt.toLowerCase() === trimmed.toLowerCase()
  )
  return canonicalMatch || trimmed
}
