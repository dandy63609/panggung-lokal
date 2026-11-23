import { INDONESIA_CITY_RECORDS, type IndonesiaCityRecord } from './indonesiaCities'

export { INDONESIA_CITY_RECORDS, type IndonesiaCityRecord }

export const INDONESIA_CITIES: readonly string[] = INDONESIA_CITY_RECORDS.map((c) => c.name)

export type IndonesiaCity = string

export const DEFAULT_CITY = 'Kota Semarang'

export interface CampusItem {
  id: number
  name: string
  shortName: string
  city: string
}

export const DEFAULT_CAMPUSES: CampusItem[] = [
  { id: 1, name: 'Universitas Negeri Semarang', shortName: 'UNNES', city: 'Kota Semarang' },
  { id: 2, name: 'Universitas Diponegoro', shortName: 'UNDIP', city: 'Kota Semarang' },
  { id: 3, name: 'Universitas Gadjah Mada', shortName: 'UGM', city: 'Kota Yogyakarta' },
  { id: 4, name: 'Universitas Negeri Yogyakarta', shortName: 'UNY', city: 'Kota Yogyakarta' },
]

// Common nicknames, abbreviations, and legacy labels mapped to official Kemendagri names
const CITY_ALIASES: Record<string, readonly string[]> = {
  'Kota Yogyakarta': ['jogja', 'yogya', 'kota jogja', 'diy', 'djogja'],
  'Kota Surakarta': ['solo', 'kota solo', 'surakarta'],
  'Kota Semarang': ['smg', 'semarang'],
  'Kota Administrasi Jakarta Pusat': ['jakarta', 'jkt', 'jakpus', 'jakarta pusat', 'dki'],
  'Kota Administrasi Jakarta Selatan': ['jakarta', 'jkt', 'jaksel', 'jakarta selatan', 'dki'],
  'Kota Administrasi Jakarta Barat': ['jakarta', 'jkt', 'jakbar', 'jakarta barat', 'dki'],
  'Kota Administrasi Jakarta Timur': ['jakarta', 'jkt', 'jaktim', 'jakarta timur', 'dki'],
  'Kota Administrasi Jakarta Utara': ['jakarta', 'jkt', 'jakut', 'jakarta utara', 'dki'],
  'Kabupaten Administrasi Kepulauan Seribu': ['kepulauan seribu', 'pulau seribu', 'jakarta', 'dki'],
  'Kota Bandung': ['bdg', 'bandung'],
  'Kota Surabaya': ['sby', 'suroboyo', 'surabaya'],
  'Kota Malang': ['mlg', 'malang'],
  'Kota Denpasar': ['dps', 'bali', 'denpasar'],
  'Kabupaten Badung': ['kuta', 'canggu', 'seminyak', 'bali'],
  'Kabupaten Gianyar': ['ubud', 'bali'],
  'Kota Medan': ['mdn', 'medan'],
  'Kota Makassar': ['mks', 'ujung pandang', 'makasar', 'makassar'],
  'Kota Palembang': ['plg', 'palembang'],
  'Kota Tangerang Selatan': ['tangsel', 'bsd', 'bintaro'],
  'Kota Tangerang': ['tgr', 'tangerang'],
  'Kota Bekasi': ['bks', 'bekasi'],
  'Kota Depok': ['dpk', 'depok'],
  'Kota Bogor': ['bgr', 'bogor'],
  'Kota Pekanbaru': ['pku', 'pekanbaru'],
  'Kota Padang': ['pdg', 'padang'],
  'Kota Batam': ['btm', 'batam'],
  'Kota Bandar Lampung': ['lampung', 'bdl', 'bandar lampung'],
  'Kota Balikpapan': ['bpn', 'balikpapan'],
  'Kota Samarinda': ['smd', 'samarinda'],
  'Kota Pontianak': ['ptk', 'pontianak'],
  'Kota Banjarmasin': ['bjm', 'banjarmasin'],
  'Kota Manado': ['mdo', 'manado'],
  'Kota Mataram': ['lombok', 'mataram'],
  'Kota Jayapura': ['jyp', 'jayapura'],
  'Kota Purwokerto': ['purwokerto'],
  'Kabupaten Banyumas': ['purwokerto', 'banyumas'],
  'Kabupaten Sleman': ['jogja', 'yogya', 'sleman'],
  'Kabupaten Bantul': ['jogja', 'yogya', 'bantul'],
  'Kota Cirebon': ['crb', 'cirebon'],
  'Kota Tasikmalaya': ['tasik', 'tasikmalaya'],
  'Kota Pekalongan': ['pekalongan'],
  'Kota Tegal': ['tegal'],
  'Kota Salatiga': ['salatiga'],
  'Kota Magelang': ['magelang'],
  'Kota Kediri': ['kediri'],
  'Kota Madiun': ['madiun'],
  'Kabupaten Sidoarjo': ['sidoarjo', 'sda'],
  'Kabupaten Gresik': ['gresik'],
  'Kabupaten Jember': ['jember'],
}

// Shown first when search input is empty so common music scenes are one click away
const FEATURED_CITY_ORDER: readonly string[] = [
  'Kota Semarang',
  'Kota Yogyakarta',
  'Kota Bandung',
  'Kota Administrasi Jakarta Selatan',
  'Kota Administrasi Jakarta Pusat',
  'Kota Administrasi Jakarta Barat',
  'Kota Administrasi Jakarta Timur',
  'Kota Administrasi Jakarta Utara',
  'Kota Surabaya',
  'Kota Denpasar',
  'Kota Malang',
  'Kota Surakarta',
  'Kota Tangerang Selatan',
  'Kota Bekasi',
  'Kota Depok',
  'Kota Bogor',
  'Kota Medan',
  'Kota Makassar',
  'Kota Palembang',
  'Kota Balikpapan',
]

const FEATURED_RANK = new Map(FEATURED_CITY_ORDER.map((name, idx) => [name, idx]))

interface IndexedCity {
  record: IndonesiaCityRecord
  nameLower: string
  coreLower: string
  provinceLower: string
  isKota: boolean
  aliases: readonly string[]
  tokens: readonly string[]
}

function stripCityPrefix(value: string): string {
  return value
    .replace(/^(kota\s+administrasi|kabupaten\s+administrasi|kota|kabupaten|kab\.?)\s+/i, '')
    .trim()
}

function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const INDEXED_CITIES: readonly IndexedCity[] = INDONESIA_CITY_RECORDS.map((record) => {
  const nameLower = normalizeQuery(record.name)
  const coreLower = stripCityPrefix(nameLower)
  const provinceLower = normalizeQuery(record.province)
  const aliases = (CITY_ALIASES[record.name] || []).map(normalizeQuery)
  const tokens = Array.from(new Set([...coreLower.split(' '), ...aliases.flatMap((a) => a.split(' '))]))
  return {
    record,
    nameLower,
    coreLower,
    provinceLower,
    isKota: nameLower.startsWith('kota '),
    aliases,
    tokens,
  }
})

// Fast bounded Levenshtein distance for typo tolerance (returns > maxDist early)
function levenshteinBounded(a: string, b: string, maxDist: number): number {
  const lenA = a.length
  const lenB = b.length
  if (Math.abs(lenA - lenB) > maxDist) return maxDist + 1
  if (lenA === 0) return lenB
  if (lenB === 0) return lenA

  let prev = new Array<number>(lenB + 1)
  let curr = new Array<number>(lenB + 1)
  for (let j = 0; j <= lenB; j++) prev[j] = j

  for (let i = 1; i <= lenA; i++) {
    curr[0] = i
    let rowMin = i
    const chA = a.charCodeAt(i - 1)
    for (let j = 1; j <= lenB; j++) {
      const cost = chA === b.charCodeAt(j - 1) ? 0 : 1
      const v = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      curr[j] = v
      if (v < rowMin) rowMin = v
    }
    if (rowMin > maxDist) return maxDist + 1
    const tmp = prev
    prev = curr
    curr = tmp
  }
  return prev[lenB]
}

// Checks if all characters in needle appear in order inside haystack
function subsequenceScore(needle: string, haystack: string): number {
  let ni = 0
  let consecutive = 0
  let bestConsecutive = 0
  for (let hi = 0; hi < haystack.length && ni < needle.length; hi++) {
    if (haystack[hi] === needle[ni]) {
      ni++
      consecutive++
      if (consecutive > bestConsecutive) bestConsecutive = consecutive
    } else {
      consecutive = 0
    }
  }
  if (ni !== needle.length) return 0
  return 180 + bestConsecutive * 10 - Math.min(haystack.length - needle.length, 40)
}

/**
 * Search and rank Indonesia's 514 Kota & Kabupaten by closeness to the user's input.
 * Supports exact/prefix/substring matches, province lookup, nicknames (Jogja, Solo, Jaksel, Sby),
 * and typo-tolerant fuzzy matching.
 */
export function searchIndonesiaCities(query: string, limit = 50): IndonesiaCityRecord[] {
  const q = normalizeQuery(query)
  if (!q) {
    const sorted = [...INDONESIA_CITY_RECORDS].sort((a, b) => {
      const rankA = FEATURED_RANK.get(a.name)
      const rankB = FEATURED_RANK.get(b.name)
      if (rankA !== undefined && rankB !== undefined) return rankA - rankB
      if (rankA !== undefined) return -1
      if (rankB !== undefined) return 1
      return a.name.localeCompare(b.name, 'id')
    })
    return sorted.slice(0, limit)
  }

  const wantsKab = q.startsWith('kab ') || q.startsWith('kabupaten ')
  const wantsKota = q.startsWith('kota ')
  const qCore = stripCityPrefix(q)
  const qWords = q.split(' ').filter(Boolean)

  const scored: { record: IndonesiaCityRecord; score: number; isKota: boolean }[] = []

  for (const item of INDEXED_CITIES) {
    let score = 0

    // 1. Exact full name or exact alias
    if (item.nameLower === q || item.aliases.includes(q)) {
      score = 1000
    } else if (qCore && item.coreLower === qCore) {
      // 2. Exact core city name (e.g. "semarang" -> Kota Semarang, Kabupaten Semarang)
      score = 940
      if (wantsKab && !item.isKota) score += 35
      else if (wantsKota && item.isKota) score += 35
      else if (!wantsKab && item.isKota) score += 20
    } else if (qCore && item.coreLower.startsWith(qCore)) {
      // 3. Core name starts with typed text
      score = 860 - Math.min(item.coreLower.length - qCore.length, 40)
      if (wantsKab && !item.isKota) score += 30
      else if (wantsKota && item.isKota) score += 30
      else if (!wantsKab && item.isKota) score += 15
    } else if (item.nameLower.startsWith(q) || item.aliases.some((a) => a.startsWith(q))) {
      // 4. Full name or alias prefix
      score = 780
      if (item.isKota && !wantsKab) score += 12
    } else if (
      item.tokens.some((t) => t.startsWith(qCore || q)) ||
      (qWords.length > 1 && qWords.every((w) => item.nameLower.includes(w) || item.provinceLower.includes(w) || item.aliases.some((a) => a.includes(w))))
    ) {
      // 5. Word-start or multi-word match (e.g. "jakarta sel" or "bandung jawa")
      score = 680
      if (item.isKota && !wantsKab) score += 10
    } else if (
      (qCore && item.coreLower.includes(qCore)) ||
      item.nameLower.includes(q) ||
      item.aliases.some((a) => a.includes(q))
    ) {
      // 6. Substring match inside name or alias
      score = 580
      if (item.isKota && !wantsKab) score += 10
    } else if (item.provinceLower.startsWith(q) || item.provinceLower.includes(q)) {
      // 7. Province match (e.g. "bali", "jawa tengah", "papua")
      score = item.provinceLower.startsWith(q) ? 460 : 410
      if (item.isKota) score += 10
    } else if ((qCore || q).length >= 3) {
      // 8. Typo-tolerant fuzzy match (Levenshtein + subsequence)
      const target = qCore || q
      const maxDist = target.length >= 6 ? 2 : 1
      let bestDist = maxDist + 1

      const dCore = levenshteinBounded(target, item.coreLower, maxDist)
      if (dCore < bestDist) bestDist = dCore

      for (const tok of item.tokens) {
        if (tok.length < 3) continue
        const dTok = levenshteinBounded(target, tok, maxDist)
        if (dTok < bestDist) bestDist = dTok
        if (tok.length > target.length) {
          const dPrefix = levenshteinBounded(target, tok.slice(0, target.length), maxDist)
          if (dPrefix < bestDist) bestDist = dPrefix
        }
      }

      if (bestDist <= maxDist) {
        score = 340 - bestDist * 65 + (item.isKota && !wantsKab ? 8 : 0)
      } else if (target.length >= 3) {
        const compactTarget = target.replace(/\s+/g, '')
        const compactCore = item.coreLower.replace(/\s+/g, '')
        const sub = subsequenceScore(compactTarget, compactCore)
        if (sub > 0) {
          score = sub
        }
      }
    }

    if (score > 0) {
      scored.push({ record: item.record, score, isKota: item.isKota })
    }
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    if (a.isKota !== b.isKota) return a.isKota ? -1 : 1
    return a.record.name.localeCompare(b.record.name, 'id')
  })

  return scored.slice(0, limit).map((s) => s.record)
}

/**
 * Normalizes legacy city labels (e.g. "Kota Jogja" -> "Kota Yogyakarta")
 * while leaving valid official names intact.
 */
export function normalizeLegacyCity(city: string): string {
  const trimmed = (city || '').trim()
  if (!trimmed) return ''
  const lower = normalizeQuery(trimmed)
  if (lower === 'kota jogja' || lower === 'jogja' || lower === 'yogyakarta') {
    return 'Kota Yogyakarta'
  }
  if (lower === 'jakarta selatan') return 'Kota Administrasi Jakarta Selatan'
  if (lower === 'jakarta pusat') return 'Kota Administrasi Jakarta Pusat'
  if (lower === 'jakarta barat') return 'Kota Administrasi Jakarta Barat'
  if (lower === 'jakarta timur') return 'Kota Administrasi Jakarta Timur'
  if (lower === 'jakarta utara') return 'Kota Administrasi Jakarta Utara'
  if (lower === 'bandung') return 'Kota Bandung'
  if (lower === 'surabaya') return 'Kota Surabaya'
  if (lower === 'denpasar') return 'Kota Denpasar'
  if (lower === 'malang') return 'Kota Malang'
  if (lower === 'medan') return 'Kota Medan'
  if (lower === 'semarang') return 'Kota Semarang'
  return trimmed
}

/**
 * Checks whether a band's stored locationCity matches a selected filter city,
 * accounting for legacy short names ("Kota Jogja" <-> "Kota Yogyakarta", "Bandung" <-> "Kota Bandung").
 */
export function matchesCityFilter(bandCity: string | undefined, filterCity: string): boolean {
  if (!filterCity || filterCity === 'Semua') return true
  const rawBand = normalizeQuery(bandCity || '')
  const rawFilter = normalizeQuery(filterCity)
  if (!rawBand) return false

  if (rawBand === rawFilter) return true

  const normBand = normalizeQuery(normalizeLegacyCity(bandCity || ''))
  const normFilter = normalizeQuery(normalizeLegacyCity(filterCity))
  if (normBand === normFilter) return true

  // Allow exact core match when band stored a short name without prefix (e.g. "Bandung" vs "Kota Bandung")
  const bandHasPrefix = /^(kota|kabupaten|kab)\s/.test(rawBand)
  if (!bandHasPrefix && stripCityPrefix(normFilter) === rawBand) {
    return true
  }

  return false
}
