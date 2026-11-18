import React from 'react'
import {
  Upload,
  X,
  FolderOpen,
  Sparkles,
  Film,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Settings,
  Sliders,
} from 'lucide-react'
import { BAND_GENRE_OPTIONS } from '../../lib/genres'
import type { BandPost, BandPostSlide, RiderItem } from '../../types'

export interface UploadedMediaItem {
  id: string
  file?: File
  type: 'photo' | 'video'
  previewUrl: string
  serverUrl?: string
  name: string
  size: string
  uploading: boolean
  error?: string
}

export interface EditProfileFormState {
  bandName: string
  genre: string
  locationCity: string
  phone: string
  bio: string
}

interface UploadMediaModalProps {
  isOpen: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  uploadedItems: UploadedMediaItem[]
  uploadCaption: string
  uploadSubmitting: boolean
  onClose: () => void
  onFilesSelected: (files: FileList | File[]) => void
  onRemoveItem: (id: string) => void
  onCaptionChange: (val: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export const UploadMediaModal: React.FC<UploadMediaModalProps> = ({
  isOpen,
  fileInputRef,
  uploadedItems,
  uploadCaption,
  uploadSubmitting,
  onClose,
  onFilesSelected,
  onRemoveItem,
  onCaptionChange,
  onSubmit,
}) => {
  if (!isOpen) return null

  const photoCount = uploadedItems.filter((i) => i.type === 'photo').length
  const videoCount = uploadedItems.filter((i) => i.type === 'video').length

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#121212] border border-[#2E2E2E] w-full max-w-2xl p-6 sm:p-8 relative shadow-2xl my-8">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) onFilesSelected(e.target.files)
            e.target.value = ''
          }}
        />

        <div className="flex items-center justify-between pb-4 border-b border-[#242424] mb-5">
          <div className="flex items-center gap-2.5">
            <Upload className="w-5 h-5 text-[#E01E37]" />
            <div>
              <h3 className="font-display text-2xl tracking-wider text-white">
                UNGGAH KARYA // DIREKTORI LOKAL
              </h3>
              <span className="text-[11px] font-mono text-[#A0A0A0]">
                Pilih foto, video, atau campur keduanya dalam satu postingan panggung
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#808080] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 cursor-pointer"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {uploadedItems.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-8 sm:p-12 border-2 border-dashed border-[#3A3A3A] hover:border-[#E01E37] bg-[#151515] hover:bg-[#1A1A1A] transition-all text-center cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-[#202020] group-hover:bg-[#E01E37]/20 border border-[#2F2F2F] group-hover:border-[#E01E37] flex items-center justify-center mx-auto mb-4 transition-colors">
                <FolderOpen className="w-8 h-8 text-white group-hover:text-[#E01E37] transition-colors" />
              </div>
              <h4 className="font-display text-2xl text-white tracking-wider mb-2">
                PILIH FOTO ATAU VIDEO DARI KOMPUTER
              </h4>
              <p className="text-xs text-[#A0A0A0] font-sans max-w-md mx-auto mb-6 leading-relaxed">
                Klik untuk membuka direktori file lokal perangkat Anda. Mendukung berkas gambar (JPG, PNG, WebP) dan video live (MP4, WebM). Bisa memilih banyak berkas sekaligus atau mencampur foto & video dalam 1 postingan etalase.
              </p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                className="px-6 py-3.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold tracking-wider inline-flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(224,30,55,0.3)] min-h-[44px]"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Jelajahi Direktori Komputer</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-[#161616] border border-[#282828] flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-white font-bold">TOTAL: {uploadedItems.length} BERKAS</span>
                  <span className="text-[#808080]">//</span>
                  <span className="text-white">{photoCount} Foto</span>
                  <span className="text-[#808080]">+</span>
                  <span className="text-[#E01E37] font-bold">{videoCount} Video</span>
                </div>

                <div>
                  {photoCount > 0 && videoCount > 0 ? (
                    <span className="px-2.5 py-1 bg-[#E01E37]/15 border border-[#E01E37]/40 text-[#E01E37] text-[10px] font-mono uppercase font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      FORMAT CAMPURAN (FOTO + VIDEO)
                    </span>
                  ) : photoCount > 0 ? (
                    <span className="px-2.5 py-1 bg-white/10 border border-white/20 text-white text-[10px] font-mono uppercase font-bold">
                      GALERI FOTO ({uploadedItems.length} SLIDE)
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-[#E01E37]/15 border border-[#E01E37]/40 text-[#E01E37] text-[10px] font-mono uppercase font-bold">
                      VIDEO LIVE ({uploadedItems.length} SLIDE)
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-72 overflow-y-auto p-1 border border-[#222222] bg-[#0E0E0E]">
                {uploadedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="relative h-28 sm:h-32 bg-[#181818] border border-[#2E2E2E] group overflow-hidden flex flex-col"
                  >
                    {item.type === 'photo' ? (
                      <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full relative bg-black flex items-center justify-center">
                        <video src={item.previewUrl} className="w-full h-full object-cover opacity-80" muted />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-8 h-8 rounded-full bg-black/70 border border-white/20 flex items-center justify-center">
                            <Film className="w-4 h-4 text-[#E01E37]" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/85 backdrop-blur-sm text-[9px] font-mono uppercase text-white font-bold border border-white/10 flex items-center gap-1">
                      <span>#{index + 1}</span>
                      <span className={item.type === 'photo' ? 'text-white' : 'text-[#E01E37]'}>
                        {item.type === 'photo' ? 'FOTO' : 'VIDEO'}
                      </span>
                    </div>

                    {item.uploading && (
                      <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white">
                        <Loader2 className="w-5 h-5 text-[#E01E37] animate-spin mb-1" />
                        <span className="text-[9px] font-mono text-[#A0A0A0]">Mengunggah...</span>
                      </div>
                    )}

                    {item.error && (
                      <div className="absolute inset-0 bg-red-950/80 p-1 flex items-center justify-center text-[10px] text-white text-center font-mono">
                        {item.error}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/80 hover:bg-[#E01E37] text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Hapus berkas ini"
                      aria-label="Hapus berkas ini"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-28 sm:h-32 border-2 border-dashed border-[#3A3A3A] hover:border-[#E01E37] bg-[#141414] hover:bg-[#1C1214] transition-all flex flex-col items-center justify-center p-3 text-center cursor-pointer group min-h-[44px]"
                  title="Pilih foto atau video tambahan dari direktori"
                >
                  <div className="w-9 h-9 rounded-full bg-[#202020] group-hover:bg-[#E01E37] text-[#808080] group-hover:text-white flex items-center justify-center mb-1.5 transition-colors">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-white uppercase tracking-wider group-hover:text-[#E01E37]">
                    + TAMBAH MEDIA
                  </span>
                  <span className="text-[9px] font-mono text-[#707070] mt-0.5">
                    Foto / Video Direktori
                  </span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="upload-caption"
              className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5 flex items-center justify-between"
            >
              <span>Keterangan Karya / Momen Panggung</span>
              <span className="text-[10px] text-[#606060] font-mono">CAPTION</span>
            </label>
            <textarea
              id="upload-caption"
              rows={3}
              value={uploadCaption}
              onChange={(e) => onCaptionChange(e.target.value)}
              placeholder="Tuliskan cerita singkat momen konser, setlist lagu panggung, atau suasana live soundcheck..."
              className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs p-3 outline-none font-sans"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] text-white font-mono text-xs uppercase min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploadSubmitting || uploadedItems.length === 0}
              className="px-6 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold min-h-[44px] flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(224,30,55,0.3)]"
            >
              {uploadSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mempublikasikan...</span>
                </>
              ) : (
                <span>
                  Publikasikan Karya {uploadedItems.length > 0 ? `(${uploadedItems.length} Slide)` : ''} ▸
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface PostDetailModalProps {
  post: BandPost | null
  slides: BandPostSlide[]
  slideIndex: number
  onSlideIndexChange: React.Dispatch<React.SetStateAction<number>>
  onClose: () => void
  onDeletePost: (postId: number) => void
}

export const PostDetailModal: React.FC<PostDetailModalProps> = ({
  post,
  slides,
  slideIndex,
  onSlideIndexChange,
  onClose,
  onDeletePost,
}) => {
  if (!post) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2E2E2E] w-full max-w-xl p-6 relative shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#242424] mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-[#E01E37] font-bold">
              DETAIL KARYA // INSIGHT
            </span>
            {slides.length > 1 && (
              <span className="px-2 py-0.5 bg-[#E01E37]/15 border border-[#E01E37]/40 text-[#E01E37] text-[10px] font-mono">
                SLIDE {slideIndex + 1} DARI {slides.length}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#808080] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 cursor-pointer"
            aria-label="Tutup detail karya"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="h-72 w-full bg-black mb-4 overflow-hidden border border-[#222222] relative flex items-center justify-center">
          {slides[slideIndex]?.type === 'video' ? (
            <video src={slides[slideIndex]?.url} controls className="w-full h-full object-contain" />
          ) : (
            <img
              src={slides[slideIndex]?.url}
              alt={`Slide ${slideIndex + 1}`}
              className="w-full h-full object-contain"
            />
          )}

          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => onSlideIndexChange((prev) => (prev === 0 ? slides.length - 1 : prev - 1))}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/80 hover:bg-[#E01E37] text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
                aria-label="Slide sebelumnya"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => onSlideIndexChange((prev) => (prev === slides.length - 1 ? 0 : prev + 1))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/80 hover:bg-[#E01E37] text-white flex items-center justify-center border border-white/20 transition-colors cursor-pointer"
                aria-label="Slide berikutnya"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white border border-white/10">
                {slideIndex + 1} / {slides.length}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-xs">
          <div className="p-3 bg-[#181818] border border-[#282828]">
            <span className="text-[#808080] text-[10px] block mb-1">TOTAL TAYANGAN</span>
            <span className="text-white text-base font-bold">{post.viewsCount || 0}</span>
          </div>
          <div className="p-3 bg-[#181818] border border-[#282828]">
            <span className="text-[#808080] text-[10px] block mb-1">INQUIRY WHATSAPP</span>
            <span className="text-[#E01E37] text-base font-bold">{post.waClicksCount || 0}</span>
          </div>
        </div>

        <p className="text-xs text-[#C0C0C0] font-sans mb-6 leading-relaxed whitespace-pre-wrap">
          {post.caption || 'Tanpa keterangan teks.'}
        </p>

        <div className="flex items-center justify-between pt-3 border-t border-[#242424]">
          <button
            type="button"
            onClick={() => onDeletePost(post.id)}
            className="px-3.5 py-2 bg-red-950/30 hover:bg-red-900/50 text-[#E01E37] border border-[#E01E37]/40 text-xs font-mono uppercase min-h-[44px] flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus Karya Ini</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#222222] hover:bg-[#2A2A2A] text-white text-xs font-mono uppercase min-h-[44px] cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}

interface EditProfileModalProps {
  isOpen: boolean
  editForm: EditProfileFormState
  submitting: boolean
  onChange: (next: EditProfileFormState) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  editForm,
  submitting,
  onChange,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null

  const hasCustomGenre =
    Boolean(editForm.genre) &&
    !BAND_GENRE_OPTIONS.some((opt) => opt.toLowerCase() === editForm.genre.toLowerCase())

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#121212] border border-[#2E2E2E] w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 sm:p-8 relative shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-[#242424] mb-6">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-[#E01E37]" />
            <div>
              <h3 className="font-display text-2xl tracking-wider text-white">EDIT PROFIL BAND</h3>
              <p className="text-[11px] font-mono text-[#808080]">
                Identitas pokok dan deskripsi band yang ditampilkan di katalog dan panggung
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#808080] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 cursor-pointer"
            aria-label="Tutup edit profil"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-band-name"
              className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5"
            >
              Nama Band *
            </label>
            <input
              id="edit-band-name"
              type="text"
              value={editForm.bandName}
              onChange={(e) => onChange({ ...editForm, bandName: e.target.value })}
              required
              placeholder="Nama resmi grup band"
              className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs p-3 min-h-[44px] outline-none font-sans"
            />
          </div>

          <div>
            <label
              htmlFor="edit-band-genre"
              className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5"
            >
              Genre Musik *
            </label>
            <select
              id="edit-band-genre"
              value={editForm.genre}
              onChange={(e) => onChange({ ...editForm, genre: e.target.value })}
              required
              className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs p-3 min-h-[44px] outline-none font-sans cursor-pointer"
            >
              {hasCustomGenre && (
                <option value={editForm.genre} className="bg-[#181818] text-white">
                  {editForm.genre} (Saat Ini)
                </option>
              )}
              {BAND_GENRE_OPTIONS.map((opt) => (
                <option key={opt} value={opt} className="bg-[#181818] text-white">
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-[10px] font-mono text-[#737373] mt-1 block">
              Disinkronkan dengan kategori filter genre pada halaman pencarian band.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="edit-band-city"
                className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5"
              >
                Kota Domisili *
              </label>
              <input
                id="edit-band-city"
                type="text"
                value={editForm.locationCity}
                onChange={(e) => onChange({ ...editForm, locationCity: e.target.value })}
                required
                placeholder="Contoh: Bandung"
                className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs p-3 min-h-[44px] outline-none font-sans"
              />
            </div>

            <div>
              <label
                htmlFor="edit-band-phone"
                className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5"
              >
                Nomor WhatsApp Resmi *
              </label>
              <input
                id="edit-band-phone"
                type="text"
                value={editForm.phone}
                onChange={(e) => onChange({ ...editForm, phone: e.target.value })}
                placeholder="+628123456789"
                required
                className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs p-3 min-h-[44px] outline-none font-mono"
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#737373] -mt-2 block">
            Nomor kontak resmi yang dihubungi penyelenggara acara dan EO.
          </span>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="edit-band-bio"
                className="block text-xs font-mono uppercase tracking-wider text-[#A0A0A0]"
              >
                Deskripsi / Bio Band
              </label>
              <span className="text-[10px] font-mono text-[#737373]">
                {editForm.bio.length}/600 karakter
              </span>
            </div>
            <textarea
              id="edit-band-bio"
              rows={4}
              maxLength={600}
              value={editForm.bio}
              onChange={(e) => onChange({ ...editForm, bio: e.target.value })}
              placeholder="Ceritakan karakter musik, repertoar lagu, pengalaman panggung, atau ciri khas band Anda..."
              className="w-full bg-[#181818] border border-[#2E2E2E] focus:border-[#E01E37] text-white text-xs p-3 min-h-[104px] outline-none font-sans leading-relaxed resize-y"
            />
            <span className="text-[10px] font-mono text-[#737373] mt-1 block">
              Ditampilkan di kartu profil dashboard dan halaman detail publik band.
            </span>
          </div>

          <div className="pt-4 border-t border-[#242424] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#181818] hover:bg-[#222222] border border-[#2E2E2E] text-white font-mono text-xs uppercase min-h-[44px] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold min-h-[44px] flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface EditRiderModalProps {
  isOpen: boolean
  items: RiderItem[]
  submitting: boolean
  onItemChange: (index: number, field: 'title' | 'description', val: string) => void
  onAddItem: () => void
  onRemoveItem: (index: number) => void
  onClose: () => void
  onSubmit: (e: React.FormEvent) => void
}

export const EditRiderModal: React.FC<EditRiderModalProps> = ({
  isOpen,
  items,
  submitting,
  onItemChange,
  onAddItem,
  onRemoveItem,
  onClose,
  onSubmit,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm p-4 sm:p-6 flex items-center justify-center overflow-hidden">
      <div className="bg-[#121212] border border-[#2E2E2E] w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] flex flex-col shadow-2xl relative">
        <div className="shrink-0 bg-[#141414] border-b border-[#242424] p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sliders className="w-5 h-5 text-[#E01E37] shrink-0" />
            <div>
              <h3 className="font-display text-xl sm:text-2xl tracking-wider text-white">
                ATUR TECHNICAL RIDER
              </h3>
              <p className="text-xs text-[#808080] font-sans">
                Ubah judul, rincian teknis, hapus, atau tambah kategori kebutuhan panggung band.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#808080] hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center -mr-2 cursor-pointer transition-colors"
            aria-label="Tutup edit rider"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 overscroll-contain">
            {items.length === 0 ? (
              <div className="p-8 text-center bg-[#161616] border border-[#282828] space-y-2">
                <p className="text-xs font-mono text-[#808080]">
                  Belum ada poin kebutuhan panggung. Klik tombol di bawah untuk menambah poin pertama.
                </p>
              </div>
            ) : (
              items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-[#161616] border border-[#282828] focus-within:border-[#E01E37] transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-1">
                      <span className="font-mono text-xs font-bold text-[#E01E37] shrink-0">
                        {String(idx + 1).padStart(2, '0')} //
                      </span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => onItemChange(idx, 'title', e.target.value)}
                        placeholder="Judul Kebutuhan / Kategori (misal: Sound System, Channel FOH)"
                        className="flex-1 bg-[#101010] border border-[#333333] focus:border-[#E01E37] text-white text-xs font-mono font-bold px-3 py-2 outline-none transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(idx)}
                      className="text-[#808080] hover:text-[#E01E37] hover:bg-[#E01E37]/10 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      title="Hapus Kategori Ini"
                      aria-label={`Hapus kebutuhan ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-[#808080] uppercase tracking-wider mb-1.5">
                      Rincian Spesifikasi Teknis
                    </label>
                    <textarea
                      rows={3}
                      value={item.description}
                      onChange={(e) => onItemChange(idx, 'description', e.target.value)}
                      placeholder="Tuliskan detail alat, spesifikasi merk, tipe kabel, mikrofon, atau fasilitas yang wajib disediakan..."
                      className="w-full bg-[#101010] border border-[#333333] focus:border-[#E01E37] text-white text-xs font-sans p-3 outline-none leading-relaxed transition-colors resize-y"
                    />
                  </div>
                </div>
              ))
            )}

            <button
              type="button"
              onClick={onAddItem}
              className="w-full py-3.5 border-2 border-dashed border-[#333333] hover:border-[#E01E37] hover:bg-[#181818] text-white font-mono text-xs uppercase tracking-wider font-bold flex items-center justify-center gap-2 min-h-[48px] cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4 text-[#E01E37]" />
              <span>Tambah Kategori / Kebutuhan Rider</span>
            </button>
          </div>

          <div className="shrink-0 bg-[#141414] border-t border-[#242424] p-4 sm:p-5 flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-[#808080]">{items.length} Kebutuhan Rider</span>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[#1A1A1A] hover:bg-[#252525] border border-[#333333] text-white font-mono text-xs uppercase min-h-[44px] cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs uppercase font-bold min-h-[44px] flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-lg shadow-[#E01E37]/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <span>Simpan Spesifikasi Rider</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
