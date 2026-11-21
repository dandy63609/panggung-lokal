export const INDONESIA_CITIES = [
  'Kota Semarang',
  'Kota Jogja',
] as const

export type IndonesiaCity = (typeof INDONESIA_CITIES)[number]

export interface CampusItem {
  id: number
  name: string
  shortName: string
  city: 'Kota Semarang' | 'Kota Jogja'
}

export const DEFAULT_CAMPUSES: CampusItem[] = [
  { id: 1, name: 'Universitas Negeri Semarang', shortName: 'UNNES', city: 'Kota Semarang' },
  { id: 2, name: 'Universitas Diponegoro', shortName: 'UNDIP', city: 'Kota Semarang' },
  { id: 3, name: 'Universitas Gadjah Mada', shortName: 'UGM', city: 'Kota Jogja' },
  { id: 4, name: 'Universitas Negeri Yogyakarta', shortName: 'UNY', city: 'Kota Jogja' },
]
