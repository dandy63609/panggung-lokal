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

  async uploadFile(file: File): Promise<{
    success: boolean
    fileUrl?: string
    fileType?: 'photo' | 'video'
    filename?: string
    message?: string
  }> {
    try {
      const formData = new FormData()
      const isPhoto = file.type.startsWith('image/')
      const uploadEndpoint = isPhoto ? '/api/upload/photo' : '/api/upload/media'
      formData.append(isPhoto ? 'photo' : 'media', file)

      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData,
      })
      const data = await res.json()
      if (data.success && data.fileUrl) {
        return {
          success: true,
          fileUrl: data.fileUrl,
          fileType: isPhoto ? 'photo' : 'video',
          filename: data.filename,
        }
      }
      return { success: false, message: data.message || 'Gagal mengunggah berkas' }
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
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // Ignore network errors on logout
    } finally {
      this.clearSession()
    }
  },
}
