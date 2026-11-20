export const INDONESIA_CITIES = [
  'Bandung',
  'Jakarta',
  'Yogyakarta',
  'Surabaya',
  'Denpasar',
  'Semarang',
  'Malang',
  'Medan',
  'Makassar',
  'Solo',
  'Bogor',
  'Bekasi',
  'Tangerang',
  'Depok',
] as const

export type IndonesiaCity = (typeof INDONESIA_CITIES)[number]
