/**
 * Authentication client and session management for Reffband.
 * Synchronizes with local storage and fires 'auth-change' events for reactive UI.
 */

import type { BandDashboardData, Band } from '../types'

export interface AuthUser {
  id: number | string
  email: string
  accountType: 'band' | 'general' | 'organizer' | 'admin'
  createdAt?: string
  bandProfile?: {
    id?: number
    bandName?: string
    slug?: string
    genre?: string
    locationCity?: string
  } | null
}

export interface AuthResponse {
  success: boolean
  message?: string
  token?: string
  user?: AuthUser
  bandProfile?: AuthUser['bandProfile']
}

export interface RegisterPayload {
  email: string
  password: string
  accountType: 'band' | 'general'
  bandName?: string
  genre?: string
  locationCity?: string
}

export interface GoogleAuthPayload {
  credential: string
  accountType?: 'band' | 'general'
  bandName?: string
  genre?: string
  locationCity?: string
}

export interface GoogleAuthResponse extends AuthResponse {
  needsOnboarding?: boolean
  googleProfile?: {
    email: string
    name: string
    picture?: string | null
  }
}

const TOKEN_KEY = 'panggung_lokal_token'
const USER_KEY = 'panggung_lokal_user'

export const authClient = {
  getToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },

  getUser(): AuthUser | null {
    try {
      const stored = localStorage.getItem(USER_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  },

  setSession(token: string, user: AuthUser): void {
    try {
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      window.dispatchEvent(new Event('auth-change'))
    } catch (e) {
      console.error('Failed to save session to localStorage', e)
    }
  },

  clearSession(): void {
    try {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      window.dispatchEvent(new Event('auth-change'))
    } catch (e) {
      console.error('Failed to clear session', e)
    }
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data: AuthResponse = await res.json()
      if (data.success && data.token && data.user) {
        const fullUser: AuthUser = {
          ...data.user,
          bandProfile: data.bandProfile || null,
        }
        this.setSession(data.token, fullUser)
      }
      return data
    } catch {
      return {
        success: false,
        message: 'Gagal menghubungi server. Periksa koneksi internet Anda.',
      }
    }
  },

  async register(payload: RegisterPayload): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: AuthResponse = await res.json()
      if (data.success && data.token && data.user) {
        const fullUser: AuthUser = {
          ...data.user,
          bandProfile: data.bandProfile || null,
        }
        this.setSession(data.token, fullUser)
      }
      return data
    } catch {
      return {
        success: false,
        message: 'Gagal menghubungi server. Periksa koneksi internet Anda.',
      }
    }
  },

  async loginWithGoogle(payload: GoogleAuthPayload): Promise<GoogleAuthResponse> {
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data: GoogleAuthResponse = await res.json()
      if (data.success && data.token && data.user && !data.needsOnboarding) {
        const fullUser: AuthUser = {
          ...data.user,
          bandProfile: data.bandProfile || null,
        }
        this.setSession(data.token, fullUser)
      }
      return data
    } catch {
      return {
        success: false,
        message: 'Gagal menghubungi server untuk autentikasi Google.',
      }
    }
  },

  async getBandDashboard(retries = 2): Promise<{ success: boolean; data?: BandDashboardData; message?: string }> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch('/api/dashboard/band', {
          headers: this.getAuthHeaders(),
        })
        if (res.ok) {
          return await res.json()
        }
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 300))
          continue
        }
        return await res.json().catch(() => ({ success: false, message: 'Gagal memuat data dashboard band' }))
      } catch {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 300))
          continue
        }
        return { success: false, message: 'Gagal terhubung ke server dashboard' }
      }
    }
    return { success: false, message: 'Gagal terhubung ke server dashboard' }
  },

  async updateBandProfile(profileData: Partial<Band>): Promise<{ success: boolean; data?: Band; message?: string }> {
    try {
      const res = await fetch('/api/bands/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(profileData),
      })
      const data = await res.json()
      if (data.success && data.data) {
        const user = this.getUser()
        if (user) {
          user.bandProfile = {
            id: data.data.id,
            bandName: data.data.bandName,
            genre: data.data.genre,
            locationCity: data.data.locationCity,
          }
          this.setSession(this.getToken() || '', user)
        }
      }
      return data
    } catch {
      return { success: false, message: 'Gagal memperbarui profil band' }
    }
  },

  async parseResponseJson<T = Record<string, any>>(res: Response): Promise<T | null> {
    const contentType = res.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return null
    }
    try {
      return (await res.json()) as T
    } catch {
      return null
    }
  },

  resolveUploadErrorMessage(res: Response, jsonBody: Record<string, any> | null, fallback: string): string {
    if (jsonBody?.error?.message) return jsonBody.error.message
    if (jsonBody?.message) return jsonBody.message
    if (res.status === 413) {
      return 'Ukuran berkas melebihi batas unggah server (maks. 4.5 MB). Gunakan unggah cloud langsung.'
    }
    if (res.status === 401) {
      return 'Sesi login Anda berakhir. Silakan masuk kembali.'
    }
    if (res.status === 429) {
      return 'Terlalu banyak permintaan unggah. Tunggu beberapa menit lalu coba lagi.'
    }
    return `${fallback} (HTTP ${res.status})`
  },

  validateUploadFileClient(file: File): { valid: boolean; fileType: 'photo' | 'video' | 'audio'; mimeType: string; message?: string } {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const rawMime = (file.type || '').split(';')[0].trim().toLowerCase()
    const extMimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      m4v: 'video/x-m4v',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
    }
    const mimeType = (rawMime && rawMime !== 'application/octet-stream' ? rawMime : extMimeMap[ext]) || rawMime || 'application/octet-stream'
    const isVideo = mimeType.startsWith('video/')
    const isAudio = mimeType.startsWith('audio/')
    const fileType: 'photo' | 'video' | 'audio' = isVideo ? 'video' : isAudio ? 'audio' : 'photo'

    const maxBytes = isVideo ? 50 * 1024 * 1024 : isAudio ? 20 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxBytes) {
      const limitLabel = isVideo ? '50 MB' : isAudio ? '20 MB' : '10 MB'
      return { valid: false, fileType, mimeType, message: `Ukuran berkas melebihi batas ${limitLabel}` }
    }
    return { valid: true, fileType, mimeType }
  },

  async uploadSingleMultipart(file: File, endpoint?: string): Promise<{
    success: boolean
    fileUrl?: string
    fileType?: 'photo' | 'video'
    filename?: string
    message?: string
  }> {
    const meta = this.validateUploadFileClient(file)
    const isPhoto = meta.fileType === 'photo'
    const targetEndpoint = endpoint || (isPhoto ? '/api/upload/photo' : '/api/upload/media')
    const formData = new FormData()
    formData.append(isPhoto ? 'photo' : 'media', file)

    const res = await fetch(targetEndpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: formData,
    })
    const data = await this.parseResponseJson(res)
    if (res.ok && data?.success && data.fileUrl) {
      return {
        success: true,
        fileUrl: data.fileUrl,
        fileType: isPhoto ? 'photo' : 'video',
        filename: data.filename,
      }
    }
    return {
      success: false,
      message: this.resolveUploadErrorMessage(res, data, 'Gagal mengunggah berkas'),
    }
  },

  async uploadFileToSignedUrl(
    file: File,
    descriptor: {
      mode?: string
      signedUrl?: string
      publicUrl?: string
      filename?: string
      fileType?: 'photo' | 'video' | 'audio'
      mimeType?: string
      fallbackEndpoint?: string
    }
  ): Promise<{
    success: boolean
    fileUrl?: string
    fileType?: 'photo' | 'video'
    filename?: string
    message?: string
  }> {
    const isDirect =
      descriptor.mode === 'direct' ||
      (descriptor.mode !== 'multipart' && Boolean(descriptor.signedUrl && descriptor.publicUrl))

    if (!isDirect || !descriptor.signedUrl || !descriptor.publicUrl) {
      return this.uploadSingleMultipart(file, descriptor.fallbackEndpoint)
    }

    const meta = this.validateUploadFileClient(file)
    const putRes = await fetch(descriptor.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': descriptor.mimeType || meta.mimeType,
      },
      body: file,
    })

    if (!putRes.ok) {
      const errText = await putRes.text().catch(() => '')
      return {
        success: false,
        message: `Gagal mengunggah berkas ke cloud (${putRes.status})${errText ? `: ${errText.slice(0, 80)}` : ''}`,
      }
    }

    return {
      success: true,
      fileUrl: descriptor.publicUrl,
      fileType: meta.fileType === 'video' ? 'video' : 'photo',
      filename: descriptor.filename,
    }
  },

  async uploadFile(file: File): Promise<{
    success: boolean
    fileUrl?: string
    fileType?: 'photo' | 'video'
    filename?: string
    message?: string
  }> {
    const meta = this.validateUploadFileClient(file)
    if (!meta.valid) {
      return { success: false, message: meta.message }
    }

    try {
      const signRes = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          filename: file.name,
          mimeType: meta.mimeType,
          fileSize: file.size,
          category: meta.fileType === 'photo' ? 'photo' : 'media',
        }),
      })
      const signData = await this.parseResponseJson(signRes)
      if (!signRes.ok || !signData?.success) {
        return {
          success: false,
          message: this.resolveUploadErrorMessage(signRes, signData, 'Gagal menyiapkan unggahan berkas'),
        }
      }
      return await this.uploadFileToSignedUrl(file, signData)
    } catch {
      return { success: false, message: 'Gagal menghubungi server untuk upload berkas' }
    }
  },

  async requestBatchSignedUploads(files: File[]): Promise<{
    success: boolean
    items?: Array<Record<string, any>>
    message?: string
  }> {
    try {
      const payloadFiles = files.map((file) => {
        const meta = this.validateUploadFileClient(file)
        return {
          filename: file.name,
          mimeType: meta.mimeType,
          fileSize: file.size,
          category: meta.fileType === 'photo' ? 'photo' : 'media',
        }
      })

      const res = await fetch('/api/upload/signed-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({ files: payloadFiles }),
      })
      const data = await this.parseResponseJson(res)
      if (!res.ok || !data?.success || !Array.isArray(data.items)) {
        return {
          success: false,
          message: this.resolveUploadErrorMessage(res, data, 'Gagal menyiapkan unggahan berkas'),
        }
      }
      return { success: true, items: data.items }
    } catch {
      return { success: false, message: 'Gagal menghubungi server untuk upload berkas' }
    }
  },

  async createPost(postData: {
    mediaType: string
    mediaUrl: string
    thumbnailUrl?: string
    caption?: string
    slides?: any[]
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(postData),
      })
      return await res.json()
    } catch {
      return { success: false, message: 'Gagal mengunggah karya musik' }
    }
  },

  async addSlidesToPost(
    postId: number,
    payload: { slides: Array<{ type: 'photo' | 'video' | 'audio'; url: string }>; caption?: string }
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch(`/api/posts/${postId}/slides`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })
      return await res.json()
    } catch {
      return { success: false, message: 'Gagal menambahkan media ke carousel karya' }
    }
  },

  async deletePost(postId: number): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      })
      return await res.json()
    } catch {
      return { success: false, message: 'Gagal menghapus postingan' }
    }
  },

  async uploadBroadcastAttachments(files: File[]): Promise<{
    success: boolean
    files?: Array<{ fileUrl: string; originalName: string; mimeType: string; size: number }>
    message?: string
  }> {
    try {
      const formData = new FormData()
      files.forEach((f) => formData.append('attachments', f))

      const res = await fetch('/api/upload/attachment', {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData,
      })
      return await res.json()
    } catch {
      return { success: false, message: 'Gagal mengunggah lampiran file' }
    }
  },

  async createJobBroadcast(payload: {
    sourceBandProfileId?: number
    organizerName: string
    organizerEmail: string
    organizerPhone: string
    eventDate: string
    performStartTime: string
    performEndTime: string
    venueLocation: string
    eventScale: number
    eventDetails: string
    attachments: Array<{ fileUrl: string; originalName: string; mimeType: string; size: number }>
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      const res = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })
      return await res.json()
    } catch {
      return { success: false, message: 'Gagal mengirim broadcast panggilan panggung' }
    }
  },

  async logout(): Promise<void> {
    try {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {})
    } catch {
      // Ignore network errors on logout
    } finally {
      this.clearSession()
      window.location.replace('/masuk')
    }
  },
}
