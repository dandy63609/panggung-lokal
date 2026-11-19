import React from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, ArrowUpRight } from 'lucide-react'
import { Badge } from '../ui/Badge'

interface GenreStat {
  name: string
  percentage: number
  count: number
  color: string
}

interface GenreMatrixSectionProps {
  totalBands?: number
}

const genreData: GenreStat[] = [
  { name: 'Rock & Garage', percentage: 35, count: 5, color: '#E01E37' },
  { name: 'Indie Pop & Folk', percentage: 28, count: 4, color: '#00D9FF' },
  { name: 'Metal & Hardcore', percentage: 18, count: 3, color: '#FF6B35' },
  { name: 'Modern Pop', percentage: 12, count: 2, color: '#FFB627' },
  { name: 'Jazz & Blues', percentage: 7, count: 1, color: '#25D366' },
]

export const GenreMatrixSection: React.FC<GenreMatrixSectionProps> = ({ totalBands = 8 }) => {
  return (
    <section className="py-24 bg-[#0A0A0A] border-b border-[#242424]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
          <div className="space-y-3">
            <Badge variant="cyan" dot>
              04 // PETA MUSISI PER GENRE
            </Badge>
            <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight uppercase">
              DISTRIBUSI GENRE AKTIF
            </h2>
            <p className="text-sm sm:text-base text-[#9E9E9E] max-w-xl">
              Sebaran musisi lokal yang siap tampil di berbagai skena panggung musik Indonesia.
            </p>
          </div>

          <div className="text-xs font-mono text-[#757575] flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00D9FF]" />
            <span>DATA TERINKREMEN DARI DATABASE AKTIF</span>
          </div>
        </div>

        {/* Matrix Bar Container */}
        <div className="space-y-6 bg-[#141414] border border-[#262626] p-6 sm:p-8">
          {genreData.map((genre) => (
            <div key={genre.name} className="space-y-2">
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                <Link
                  to={`/cari-band?genre=${encodeURIComponent(genre.name.split(' ')[0])}`}
                  className="font-bold text-white hover:text-[#E01E37] flex items-center gap-1 group transition-colors"
                >
                  <span>{genre.name}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                </Link>
                <span className="text-[#9E9E9E]">
                  {genre.count} Band ({genre.percentage}%)
                </span>
              </div>

              {/* Progress Bar Track */}
              <div className="h-3 w-full bg-[#1F1F1F] overflow-hidden">
                <div
                  className="h-full transition-all duration-1000 ease-out"
                  style={{
                    width: `${genre.percentage}%`,
                    backgroundColor: genre.color,
                  }}
                />
              </div>
            </div>
          ))}

          <div className="pt-6 border-t border-[#222222] flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#757575]">
            <span>TOTAL BAND TERDATA: {totalBands} BAND TERVERIFIKASI</span>
            <span>PEMBARUAN OTOMATIS SETIAP PENDAFTARAN</span>
          </div>
        </div>
      </div>
    </section>
  )
}
