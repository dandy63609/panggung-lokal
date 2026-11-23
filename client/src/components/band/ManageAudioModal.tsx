import React, { useState, useRef, useEffect } from 'react'
import {
  X,
  Music,
  Upload,
  Play,
  Pause,
  Trash2,
  Edit2,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Disc,
  Radio,
  FileAudio,
} from 'lucide-react'
import { authClient } from '../../lib/auth'
import type { MediaFile } from '../../types'

interface ManageAudioModalProps {
  isOpen: boolean
  onClose: () => void
  mediaFiles: MediaFile[]
  bandName?: string
  onUpdated: () => void
}

export const ManageAudioModal: React.FC<ManageAudioModalProps> = ({
  isOpen,
  onClose,
  mediaFiles,
  bandName = 'Band',
  onUpdated,
}) => {
  const audioTracks = mediaFiles.filter((m) => m.file_type === 'audio')

  // Upload state
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload')
  const [trackTitle, setTrackTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [audioUrlInput, setAudioUrlInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Preview playback state
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const previewAudioRef = useRef<HTMLAudioElement | null>(null)

  // Edit title state
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false)

  // Delete state
  const [deletingTrackId, setDeletingTrackId] = useState<number | null>(null)

  // Feedback banner
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen)

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen)
    if (!isOpen) {
      setTrackTitle('')
      setSelectedFile(null)
      setAudioUrlInput('')
      setPlayingTrackId(null)
      setEditingTrackId(null)
      setEditingTitle('')
      setFeedback(null)
    }
  }

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type })
    setTimeout(() => setFeedback(null), 4000)
  }

  // Stop audio preview when modal closes and close on Escape when open
  useEffect(() => {
    if (!isOpen) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
      }
      return
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
      }
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleTogglePlay = (track: MediaFile) => {
    if (playingTrackId === track.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause()
      }
      setPlayingTrackId(null)
      return
    }

    if (previewAudioRef.current) {
      previewAudioRef.current.pause()
    }

    const audio = new Audio(track.file_url)
    previewAudioRef.current = audio
    audio.play().catch(() => {
      showFeedback('Gagal memutar audio sampel.', 'error')
      setPlayingTrackId(null)
    })
    setPlayingTrackId(track.id)

    audio.onended = () => {
      setPlayingTrackId(null)
    }
  }

  const handleDelete = async (trackId: number) => {
    if (!window.confirm('Yakin ingin menghapus potongan lagu ini dari profil band Anda?')) return

    try {
      setDeletingTrackId(trackId)
      if (playingTrackId === trackId && previewAudioRef.current) {
        previewAudioRef.current.pause()
        setPlayingTrackId(null)
      }
      const res = await authClient.deleteBandMedia(trackId)
      if (res.success) {
        showFeedback('Potongan lagu berhasil dihapus dari profil.', 'success')
        onUpdated()
      } else {
        showFeedback(res.message || 'Gagal menghapus audio.', 'error')
      }
    } catch {
      showFeedback('Terjadi kesalahan saat menghapus audio.', 'error')
    } finally {
      setDeletingTrackId(null)
    }
  }

  const handleStartEditTitle = (track: MediaFile) => {
    setEditingTrackId(track.id)
    setEditingTitle(track.title || '')
  }

  const handleSaveTitle = async (trackId: number) => {
    if (!editingTitle.trim()) {
      showFeedback('Judul lagu tidak boleh kosong.', 'error')
      return
    }

    try {
      setIsUpdatingTitle(true)
      const res = await authClient.updateBandMedia(trackId, { title: editingTitle.trim() })
      if (res.success) {
        showFeedback('Judul potongan lagu berhasil diperbarui!', 'success')
        setEditingTrackId(null)
        onUpdated()
      } else {
        showFeedback(res.message || 'Gagal memperbarui judul lagu.', 'error')
      }
    } catch {
      showFeedback('Terjadi kesalahan saat menghubungi server.', 'error')
    } finally {
      setIsUpdatingTitle(false)
    }
  }

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTitle = trackTitle.trim() || `${bandName} - Master Demo Sample`

    let finalFileUrl = ''

    if (inputMode === 'upload') {
      if (!selectedFile) {
        showFeedback('Pilih file audio (MP3, WAV, M4A) dari perangkat Anda terlebih dahulu.', 'error')
        return
      }

      setIsSubmitting(true)
      try {
        const uploadRes = await authClient.uploadSingleMultipart(selectedFile, '/api/upload/media')
        if (!uploadRes.success || !uploadRes.fileUrl) {
          showFeedback(uploadRes.message || 'Gagal mengunggah file audio.', 'error')
          setIsSubmitting(false)
          return
        }
        finalFileUrl = uploadRes.fileUrl
      } catch {
        showFeedback('Terjadi kesalahan koneksi saat mengunggah file audio.', 'error')
        setIsSubmitting(false)
        return
      }
    } else {
      const cleanUrl = audioUrlInput.trim()
      if (!cleanUrl || !cleanUrl.startsWith('http')) {
        showFeedback('Masukkan URL audio yang valid (diawali http:// atau https://).', 'error')
        return
      }
      finalFileUrl = cleanUrl
      setIsSubmitting(true)
    }

    try {
      const mediaRes = await authClient.addBandMedia({
        fileType: 'audio',
        fileUrl: finalFileUrl,
        title: cleanTitle,
        displayOrder: audioTracks.length,
      })

      if (mediaRes.success) {
        showFeedback('Sampel audio baru berhasil dipasang di profil band Anda!', 'success')
        setTrackTitle('')
        setSelectedFile(null)
        setAudioUrlInput('')
        onUpdated()
      } else {
        showFeedback(mediaRes.message || 'Gagal menyimpan data audio.', 'error')
      }
    } catch {
      showFeedback('Gagal menghubungkan audio ke profil band.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-audio-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
    >
      <div className="relative w-full max-w-2xl bg-[#111111] border border-[#2A2A2A] rounded-2xl shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#242424] bg-[#141414] flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E01E37] animate-pulse" />
              <h2 id="manage-audio-title" className="font-mono text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                Kelola &amp; Edit Sampel Audio Profil
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#E01E37]/20 border border-[#E01E37]/40 text-[#E01E37] text-[10px] font-mono font-bold uppercase">
                Mode Pemilik
              </span>
            </div>
            <p className="text-xs text-[#888888] font-sans">
              Potongan lagu demo untuk diperdengarkan kepada Event Organizer (EO) saat meninjau profil band Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela kelola audio"
            className="min-w-[44px] min-h-[44px] rounded-full bg-[#202020] hover:bg-[#E01E37] text-[#A0A0A0] hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role={feedback.type === 'error' ? 'alert' : 'status'}
            aria-live={feedback.type === 'error' ? 'assertive' : 'polite'}
            className={`mx-6 mt-4 p-3 rounded-xl flex items-center gap-2 text-xs font-mono ${
              feedback.type === 'success'
                ? 'bg-[#102A1C] border border-[#25D366]/40 text-[#25D366]'
                : 'bg-[#2A1014] border border-[#E01E37]/40 text-[#E01E37]'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Section 1: Daftar Audio Saat Ini */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#E01E37]" />
                <span className="font-mono text-xs uppercase font-bold text-white tracking-wider">
                  Daftar Potongan Lagu Aktif ({audioTracks.length})
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#777]">
                Track 01 = Pemutaran Utama
              </span>
            </div>

            {audioTracks.length === 0 ? (
              <div className="p-6 bg-[#161616] border border-[#242424] rounded-xl text-center space-y-2">
                <FileAudio className="w-10 h-10 text-[#555] mx-auto" />
                <p className="text-xs text-[#999] font-sans">
                  Belum ada audio custom. Profil band Anda saat ini memutar demo bawaan.
                </p>
                <p className="text-[11px] text-[#666] font-mono">
                  Gunakan form di bawah untuk mengunggah lagu pertama band Anda!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {audioTracks.map((track, idx) => {
                  const isPlaying = playingTrackId === track.id
                  const isDeleting = deletingTrackId === track.id
                  const isEditing = editingTrackId === track.id

                  return (
                    <div
                      key={track.id}
                      className="p-3.5 bg-[#161616] border border-[#262626] hover:border-[#383838] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Play/Pause Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePlay(track)}
                          aria-label={isPlaying ? 'Jeda sampel audio' : 'Putar sampel audio'}
                          className={`w-9 h-9 min-w-[36px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isPlaying
                              ? 'bg-[#E01E37] text-white shadow-[0_0_12px_rgba(224,30,55,0.6)]'
                              : 'bg-[#222222] text-white hover:bg-[#E01E37]'
                          }`}
                        >
                          {isPlaying ? (
                            <Pause className="w-4 h-4 fill-white" />
                          ) : (
                            <Play className="w-4 h-4 fill-white ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] text-[#E01E37] font-bold uppercase">
                              TRACK #{idx + 1}
                            </span>
                            {idx === 0 && (
                              <span className="px-1.5 py-0.2 bg-[#25D366]/20 text-[#25D366] font-mono text-[9px] font-bold uppercase rounded">
                                UTAMA
                              </span>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="flex items-center gap-2 mt-1">
                              <input
                                type="text"
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                className="w-full bg-[#0E0E0E] border border-[#E01E37] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none"
                                placeholder="Judul potongan lagu..."
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveTitle(track.id)}
                                disabled={isUpdatingTitle}
                                className="p-1.5 rounded bg-[#E01E37] hover:bg-[#C71B30] text-white cursor-pointer disabled:opacity-50"
                                title="Simpan judul baru"
                              >
                                {isUpdatingTitle ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingTrackId(null)}
                                className="p-1.5 rounded bg-[#252525] hover:bg-[#333] text-[#A0A0A0] hover:text-white cursor-pointer"
                                title="Batal"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <p className="font-mono text-xs font-bold text-white truncate">
                              {track.title || `${bandName} - Master Sample`}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={() => handleStartEditTitle(track)}
                            className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#2A2A2A] text-[#A0A0A0] hover:text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                            title="Ubah judul lagu"
                          >
                            <Edit2 className="w-3 h-3 text-[#E01E37]" />
                            <span>Ganti Judul</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => handleDelete(track.id)}
                          disabled={isDeleting}
                          className="px-2.5 py-1 rounded bg-[#202020] hover:bg-[#E01E37] text-[#A0A0A0] hover:text-white font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          title="Hapus lagu ini"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <hr className="border-[#242424]" />

          {/* Section 2: Form Tambah Potongan Lagu Baru */}
          <form onSubmit={handleUploadSubmit} className="space-y-4">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-[#E01E37]" />
              <span className="font-mono text-xs uppercase font-bold text-white tracking-wider">
                Tambah Potongan Lagu Baru
              </span>
            </div>

            {/* Input Mode Toggle */}
            <div className="flex items-center gap-2 p-1 bg-[#161616] border border-[#242424] rounded-lg">
              <button
                type="button"
                onClick={() => setInputMode('upload')}
                className={`flex-1 py-1.5 rounded-md font-mono text-xs uppercase font-bold transition-all cursor-pointer ${
                  inputMode === 'upload'
                    ? 'bg-[#E01E37] text-white shadow'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                Unggah File Audio
              </button>
              <button
                type="button"
                onClick={() => setInputMode('url')}
                className={`flex-1 py-1.5 rounded-md font-mono text-xs uppercase font-bold transition-all cursor-pointer ${
                  inputMode === 'url'
                    ? 'bg-[#E01E37] text-white shadow'
                    : 'text-[#888888] hover:text-white'
                }`}
              >
                Input Link URL Audio
              </button>
            </div>

            {/* Track Title */}
            <div className="space-y-1.5">
              <label
                htmlFor="audio-track-title"
                className="block font-mono text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]"
              >
                Judul Potongan Lagu / Versi Demo *
              </label>
              <input
                id="audio-track-title"
                type="text"
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                placeholder="Contoh: Reff Single Baru (Live Master 45 Detik)"
                className="w-full bg-[#141414] border border-[#282828] focus:border-[#E01E37] rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-[#555] focus:outline-none transition-colors"
              />
            </div>

            {/* File Upload Mode */}
            {inputMode === 'upload' ? (
              <div className="space-y-2">
                <label className="block font-mono text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]">
                  Pilih Berkas Audio (MP3 / WAV / M4A) *
                </label>
                <div className="p-4 border-2 border-dashed border-[#2E2E2E] hover:border-[#E01E37]/60 rounded-xl bg-[#141414] text-center space-y-2 transition-colors">
                  <input
                    type="file"
                    id="audio-file-picker"
                    accept="audio/*,.mp3,.wav,.m4a,.ogg"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0])
                        if (!trackTitle.trim()) {
                          const baseName = e.target.files[0].name.replace(/\.[^/.]+$/, '')
                          setTrackTitle(baseName)
                        }
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor="audio-file-picker"
                    className="cursor-pointer inline-flex flex-col items-center gap-1.5 text-xs text-[#888] hover:text-white transition-colors"
                  >
                    <Disc className="w-8 h-8 text-[#E01E37] animate-pulse" />
                    <span className="font-mono text-white font-bold">
                      {selectedFile ? selectedFile.name : 'Klik untuk memilih file audio'}
                    </span>
                    <span className="text-[10px] text-[#666]">
                      Mendukung format MP3, WAV, M4A hingga 15MB
                    </span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label
                  htmlFor="audio-external-url"
                  className="block font-mono text-[11px] font-bold uppercase tracking-wider text-[#A0A0A0]"
                >
                  URL Audio Eksternal (HTTP/HTTPS) *
                </label>
                <input
                  id="audio-external-url"
                  type="url"
                  value={audioUrlInput}
                  onChange={(e) => setAudioUrlInput(e.target.value)}
                  placeholder="https://domain.com/sample-lagu.mp3"
                  className="w-full bg-[#141414] border border-[#282828] focus:border-[#E01E37] rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-[#555] focus:outline-none transition-colors"
                />
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-xl bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(224,30,55,0.4)] disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang Mengunggah &amp; Menyimpan...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Simpan &amp; Pasang di Profil Band</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#242424] bg-[#141414] flex items-center justify-between text-xs text-[#888] shrink-0">
          <div className="flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#E01E37]" />
            <span className="font-mono text-[11px]">Perubahan langsung aktif di etalase publik profil band Anda.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#222] hover:bg-[#2C2C2C] text-white font-mono text-xs uppercase font-bold cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}
