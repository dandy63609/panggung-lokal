export interface PlatformStats {
  totalBands: number
  totalGenres: number
  curatedBadge: string
}

export interface RiderItem {
  title: string
  description: string
}

export interface BandPostSlide {
  type: string
  url: string
}

export interface BandPost {
  id: number
  bandProfileId?: number
  mediaType?: string
  mediaUrl?: string
  thumbnailUrl?: string
  caption?: string
  viewsCount?: number
  waClicksCount?: number
  createdAt?: string
  slides?: BandPostSlide[] | string
}

export interface MediaFile {
  id: number
  band_profile_id?: number
  file_type: string
  file_url: string
  title: string
  display_order?: number
  thumbnail_url?: string | null
  created_at?: string
}

export interface Band {
  id: number
  userId?: number
  bandName: string
  slug?: string
  genre: string
  locationCity: string
  locationRegion?: string
  campus?: string | null
  bio?: string
  budgetMin?: number | null
  budgetMax?: number | null
  rating?: number
  ratingAverage?: number
  ratingCount?: number
  ratingOverride?: number | null
  ratingTier?: 'Baik' | 'Sangat Baik' | 'Rekomendasi Favorit' | string
  reviews?: BandReview[]
  profilePhotoUrl?: string
  coverPhotoUrl?: string
  phone?: string
  instagramHandle?: string
  youtubeUrl?: string
  spotifyUrl?: string
  tiktokUrl?: string
  riderChannelInputs?: string
  riderSoundSystem?: string
  riderInstruments?: string
  riderHospitality?: string
  riderItems?: RiderItem[]
  profileViews?: number
  stageVisualPostId?: number | null
  posts?: BandPost[]
  mediaFiles?: MediaFile[]
  schedules?: BandSchedule[]
  isOwner?: boolean
}

export interface SearchBandsResponse {
  success: boolean
  data?: {
    bands: Band[]
    pagination?: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
  message?: string
}

export interface StatsResponse {
  success: boolean
  data: PlatformStats
}

export interface RecentConnection {
  id?: number
  organizerUserId?: number
  bandProfileId?: number
  connectionType?: string
  eventDate?: string | null
  eventName?: string | null
  notes?: string | null
  status?: string
  isReviewed?: boolean
  createdAt?: string
  organizerEmail?: string
  organizer_email?: string
  event_type?: string
  event_name?: string
  event_date?: string
  created_at?: string
}

export interface BroadcastAttachment {
  fileUrl: string
  originalName: string
  mimeType: string
  size: number
}

export interface JobBroadcast {
  id: number
  organizerUserId: number
  sourceBandProfileId?: number | null
  organizerName: string
  organizerEmail: string
  organizerPhone: string
  eventDate: string
  performStartTime: string
  performEndTime: string
  venueLocation: string
  eventScale: number
  eventDetails: string
  attachments: BroadcastAttachment[]
  recipientBandCount: number
  createdAt: string
}

export interface BandDashboardStats {
  profileViews: number
  totalConnections: number
  totalPosts: number
  totalViews: number
  totalWaClicks: number
}

export interface BandDashboardData {
  profile: Band
  stats: BandDashboardStats
  posts: BandPost[]
  mediaFiles?: MediaFile[]
  recentConnections: RecentConnection[]
  schedules?: BandSchedule[]
  jobBroadcasts?: JobBroadcast[]
}

export interface BandSchedule {
  id: number
  bandProfileId: number
  organizerUserId?: number | null
  eventDate: string
  startTime: string
  endTime: string
  eventName: string
  venue?: string | null
  locationCity?: string | null
  organizerName?: string | null
  notes?: string | null
  status: 'confirmed' | 'completed' | 'cancelled' | string
  createdAt?: string
  organizerEmail?: string
  bandName?: string
}

export interface CampusRecord {
  id: number
  name: string
  short_name: string
  city: string
  created_at?: string
}

export interface BandReview {
  id: number
  bandProfileId: number
  rating: number
  ratingTier: 'Baik' | 'Sangat Baik' | 'Rekomendasi Favorit' | string
  reviewText: string
  eventDate?: string
  organizerEmail?: string
  createdAt: string
}

export interface PendingReviewBooking {
  connectionId: number
  bandProfileId: number
  bandName: string
  profilePhotoUrl?: string
  locationCity?: string
  genre?: string
  eventDate: string
  eventName: string
  notes?: string
  emailNotificationSent?: boolean
  notificationSubject?: string
  notificationTimestamp?: string
}

