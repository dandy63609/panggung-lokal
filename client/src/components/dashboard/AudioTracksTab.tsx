import React, { useState, useRef } from 'react'
import {
  Music,
  Plus,
  Trash2,
  Upload,
  Play,
  Pause,
  Loader2,
  Disc,
  CheckCircle2,
  X,
  FileAudio,
  Radio,
  ExternalLink,
  Edit2,
  Check,
} from 'lucide-react'
import { authClient } from '../../lib/auth'
import type { MediaFile } from '../../types'

interface AudioTracksTabProps {
  mediaFiles: MediaFile[]
  bandName?: string
  onRefresh: () => void
  showToast: (text: string, type?: 'success' | 'error') => void
}

export const AudioTracksTab: React.FC<AudioTracksTabProps> = ({
  mediaFiles,
  bandName,
  onRefresh,
  showToast,
}) => {
  const audioTracks = mediaFiles.filter((m) => m.file_type === 'audio')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [trackTitle, setTrackTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [audioUrlInput, setAudioUrlInput] = useState('')
  const [inputMode, setInputMode] = useState<'upload' | 'url'>('upload')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Track inline title editing state
  const [editingTrackId, setEditingTrackId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false)

  // Track playback state in dashboard preview
  const [playingTrackId, setPlayingTrackId] = useState<number | null>(null)
  const activeAudioRef = useRef<HTMLAudioElement | null>(null)

  const handleTogglePlay = (track: MediaFile) => {
    if (playingTrackId === track.id) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause()
      }
      setPlayingTrackId(null)
      return
    }

    if (activeAudioRef.current) {
      activeAudioRef.current.pause()
    }

    const audio = new Audio(track.file_url)
    activeAudioRef.current = audio
    audio.play().catch(() => {
      showToast('Gagal memutar audio sampel.', 'error')
      setPlayingTrackId(null)
    })
    setPlayingTrackId(track.id)

    audio.onended = () => {
      setPlayingTrackId(null)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Yakin ingin menghapus track audio ini dari profil band Anda?')) return
    try {
      setDeletingId(id)
      if (playingTrackId === id && activeAudioRef.current) {
        activeAudioRef.current.pause()
        setPlayingTrackId(null)
      }
      const res = await authClient.deleteBandMedia(id)
      if (res.success) {
        showToast('Track audio berhasil dihapus.', 'success')
        onRefresh()
      } else {
        showToast(res.message || 'Gagal menghapus track audio.', 'error')
      }
    } catch {
      showToast('Gagal menghubungi server untuk menghapus audio.', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleStartEditTitle = (track: MediaFile) => {
    setEditingTrackId(track.id)
    setEditingTitle(track.title || '')
  }

  const handleSaveTitle = async (trackId: number) => {
    if (!editingTitle.trim()) {
      showToast('Judul lagu tidak boleh kosong.', 'error')
      return
    }

    try {
      setIsUpdatingTitle(true)
      const res = await authClient.updateBandMedia(trackId, { title: editingTitle.trim() })
      if (res.success) {
        showToast('Judul lagu berhasil diperbarui!', 'success')
        setEditingTrackId(null)
        onRefresh()
      } else {
        showToast(res.message || 'Gagal memperbarui judul lagu.', 'error')
      }
    } catch {
      showToast('Gagal memperbarui judul audio.', 'error')
    } finally {
      setIsUpdatingTitle(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanTitle = trackTitle.trim() || `${bandName || 'Band'} - Master Demo Sample`

    let finalFileUrl = ''

    if (inputMode === 'upload') {
      if (!selectedFile) {
        showToast('Pilih berkas audio (MP3/WAV) terlebih dahulu.', 'error')
        return
      }

      setIsSubmitting(true)
      try {
        const uploadRes = await authClient.uploadSingleMultipart(selectedFile, '/api/upload/media')
        if (!uploadRes.success || !uploadRes.fileUrl) {
          showToast(uploadRes.message || 'Gagal mengunggah berkas audio.', 'error')
          setIsSubmitting(false)
          return
        }
        finalFileUrl = uploadRes.fileUrl
      } catch {
        showToast('Terjadi kesalahan saat mengunggah audio ke server.', 'error')
        setIsSubmitting(false)
        return
      }
    } else {
      const cleanUrl = audioUrlInput.trim()
      if (!cleanUrl || !cleanUrl.startsWith('http')) {
        showToast('Masukkan URL audio yang valid (diawali http:// atau https://).', 'error')
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
        showToast('Sampel audio berhasil ditambahkan dan aktif di profil publik!', 'success')
        setIsAddModalOpen(false)
        setTrackTitle('')
        setSelectedFile(null)
        setAudioUrlInput('')
        onRefresh()
      } else {
        showToast(mediaRes.message || 'Gagal menyimpan data audio.', 'error')
      }
    } catch {
      showToast('Gagal menghubungkan audio ke profil band.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#242424]">
        <div>
          <div className="flex items-center gap-2">
            <Disc className="w-5 h-5 text-[#E01E37] animate-spin" style={{ animationDuration: '6s' }} />
            <h2 className="font-display text-2xl tracking-wider text-white">
              SAMPEL AUDIO RESMI &amp; POTONGAN LAGU
            </h2>
          </div>
          <p className="text-xs text-[#808080] font-sans mt-1">
            Potongan demo lagu ini langsung diputar oleh Event Organizer (EO) saat meninjau profil band Anda di Reffband.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider min-h-[44px] flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(224,30,55,0.3)] shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Unggah Sampel Lagu</span>
        </button>
      </div>

      {/* Info Badge */}
      <div className="p-4 bg-[#141414] border border-[#262626] rounded-xl flex items-start gap-3">
        <Radio className="w-4 h-4 text-[#E01E37] shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="text-white font-mono font-bold">
            Live Master Demo Player (320 Kbps)
          </p>
          <p className="text-[#888] font-sans leading-relaxed">
            Penyelenggara acara mendengarkan kualitas aransemen, vokal, dan energi live band Anda dari bagian ini. Disarankan mengunggah potongan lagu durasi 30-60 detik bagian reff atau intro yang paling menarik.
          </p>
        </div>
      </div>

      {/* Audio Tracks Grid / List */}
      {audioTracks.length === 0 ? (
        <div className="p-10 text-center bg-[#111111] border border-[#242424] rounded-2xl space-y-4">
          <FileAudio className="w-12 h-12 text-[#666] mx-auto" />
          <div className="space-y-1 max-w-md mx-auto">
            <h3 className="font-mono text-sm font-bold text-white uppercase">
              Menggunakan Sampel Bawaan (Default Demo)
            </h3>
            <p className="text-xs text-[#808080] font-sans">
              Profil publik band Anda saat ini memutar sampel instrumen default. Tambahkan potongan lagu asli band Anda agar Event Organizer lebih yakin untuk mengundang band Anda manggung!
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-5 py-2.5 rounded-full bg-[#E01E37] hover:bg-[#C71B30] text-white font-mono text-xs font-bold uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Potongan Lagu Anda Sekarang</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {audioTracks.map((track, idx) => {
            const isPlaying = playingTrackId === track.id
            const isDeleting = deletingId === track.id
            const isEditing = editingTrackId === track.id

            return (
              <div
                key={track.id}
                className="bg-[#121212] border border-[#262626] hover:border-[#E01E37]/50 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleTogglePlay(track)}
                    aria-label={isPlaying ? 'Jeda preview audio' : 'Putar preview audio'}
                    className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                      isPlaying
                        ? 'bg-[#E01E37] text-white shadow-[0_0_15px_rgba(224,30,55,0.5)]'
                        : 'bg-[#1F1F1F] text-white hover:bg-[#E01E37]'
                    }`}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-white" />
                    ) : (
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[#E01E37] font-bold uppercase tracking-wider">
                        TRACK #{idx + 1}
                      </span>
                      {idx === 0 && (
                        <span className="px-1.5 py-0.2 bg-[#25D366]/20 text-[#25D366] font-mono text-[9px] font-bold uppercase tracking-wider rounded">
                          TRACK UTAMA DI PROFIL
                        </span>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="bg-[#0E0E0E] border border-[#E01E37] rounded px-2.5 py-1 text-xs text-white font-mono focus:outline-none min-w-[200px]"
                          placeholder="Judul lagu..."
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveTitle(track.id)}
                          disabled={isUpdatingTitle}
                          className="p-1.5 rounded bg-[#E01E37] hover:bg-[#C71B30] text-white cursor-pointer disabled:opacity-50"
                          title="Simpan judul"
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
                      <h4 className="font-mono text-sm font-bold text-white truncate">
                        {track.title || `${bandName || 'Band'} - Master Cut`}
                      </h4>
                    )}
                    <p className="font-mono text-[11px] text-[#707070] truncate">
                      {track.file_url}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 self-end sm:self-center shrink-0">
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => handleStartEditTitle(track)}
                      className="px-2.5 py-1.5 rounded bg-[#202020] hover:bg-[#2A2A2A] text-[#A0A0A0] hover:text-white font-mono text-xs uppercase font-bold tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
                      title="Ubah judul lagu"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#E01E37]" />
                      <span>Ganti Judul</span>
                    </button>
                  )}

                  <a
                    href={track.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-[#A0A0A0] hover:text-white transition-colors"
                    title="Buka link berkas audio"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleDelete(track.id)}
                    disabled={isDeleting}
                    className="px-3 py-1.5 rounded bg-[#1F1F1F] hover:bg-[#E01E37] text-[#A0A0A0] hover:text-white font-mono text-xs uppercase font-bold tracking-wider transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                    title="Hapus track audio ini"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    <span>Hapus</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Tambah / Unggah Sampel Audio */}
      {isAddModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !isSubmitting && setIsAddModalOpen(false)}
        >
          <div
            className="bg-[#121212] border-2 border-[#E01E37] w-full max-w-lg rounded-2xl p-6 sm:p-7 space-y-5 relative shadow-[0_0_50px_rgba(224,30,55,0.3)] max-h-[90dvh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#242424]">
              <div className="flex items-center gap-2">
                <Music className="w-4 h-4 text-[#E01E37]" />
                <h3 className="font-mono text-sm font-bold uppercase text-white tracking-wider">
                  UNGGAH POTONGAN LAGU (DEMO AUDIO)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isSubmitting}
                className="p-1 text-[#808080] hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              {/* Judul Track */}
              <div className="space-y-1.5">
                <label className="text-[#A0A0A0] uppercase tracking-wider block">
                  Judul Lagu / Keterangan Track
                </label>
                <input
                  type="text"
                  value={trackTitle}
                  onChange={(e) => setTrackTitle(e.target.value)}
                  placeholder={`Contoh: ${bandName || 'Reffband'} - Potongan Single (Live Reff)`}
                  required
                  className="w-full bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#E01E37] rounded px-3 py-2 text-white outline-none font-sans"
                />
              </div>

              {/* Mode Input Selector */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setInputMode('upload')}
                  className={`flex-1 py-2 text-center rounded border transition-colors cursor-pointer ${
                    inputMode === 'upload'
                      ? 'bg-[#E01E37] text-white border-[#E01E37] font-bold'
                      : 'bg-[#181818] text-[#888] border-[#2E2E2E]'
                  }`}
                >
                  Unggah Berkas (MP3/WAV)
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`flex-1 py-2 text-center rounded border transition-colors cursor-pointer ${
                    inputMode === 'url'
                      ? 'bg-[#E01E37] text-white border-[#E01E37] font-bold'
                      : 'bg-[#181818] text-[#888] border-[#2E2E2E]'
                  }`}
                >
                  Masukkan URL Audio
                </button>
              </div>

              {/* Input Berkas */}
              {inputMode === 'upload' ? (
                <div className="space-y-2">
                  <label className="border-2 border-dashed border-[#2E2E2E] hover:border-[#E01E37] bg-[#141414] rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors block">
                    <Upload className="w-8 h-8 text-[#E01E37] mb-2" />
                    <span className="text-white font-bold block mb-1">
                      {selectedFile ? selectedFile.name : 'Pilih Berkas Audio dari Perangkat'}
                    </span>
                    <span className="text-[10px] text-[#707070]">
                      Format didukung: MP3, WAV, OGG, M4A (Maks. 25 MB)
                    </span>
                    <input
                      type="file"
                      accept="audio/*,.mp3,.wav,.ogg,.m4a"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) setSelectedFile(file)
                      }}
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <div className="flex items-center justify-between px-3 py-2 bg-[#1A1A1A] rounded text-[#A0A0A0]">
                      <span>Ukuran: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      <button
                        type="button"
                        onClick={() => setSelectedFile(null)}
                        className="text-[#E01E37] hover:underline"
                      >
                        Ganti Berkas
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[#A0A0A0] uppercase tracking-wider block">
                    URL Tautan Berkas Audio Langsung
                  </label>
                  <input
                    type="url"
                    value={audioUrlInput}
                    onChange={(e) => setAudioUrlInput(e.target.value)}
                    placeholder="https://example.com/audio/sample-track.mp3"
                    className="w-full bg-[#1A1A1A] border border-[#2E2E2E] focus:border-[#E01E37] rounded px-3 py-2 text-white outline-none font-sans"
                  />
                  <p className="text-[10px] text-[#707070] font-sans">
                    Pastikan tautan dapat diakses publik dan langsung mengarah ke berkas suara.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222222]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded bg-transparent hover:bg-white/5 border border-white/10 text-[#A0A0A0] hover:text-white transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded bg-[#E01E37] hover:bg-[#C71B30] text-white font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Simpan &amp; Tampilkan di Profil</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
