const express = require('express');
const router = express.Router();
const BandProfile = require('../models/BandProfile');
const db = require('../utils/db');
const { verifyToken, requireBand } = require('../middleware/auth');

/**
 * GET /api/bands/stats
 * Platform indicators for Hero Section & Analytics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await BandProfile.getPlatformStats();
    return res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil statistik platform'
    });
  }
});

/**
 * GET /api/bands/search
 * Search bands with filters (date filter removed as per peer evaluation)
 */
router.get('/search', async (req, res) => {
  try {
    const { genre, location, budgetMin, budgetMax, search, page, limit } = req.query;

    const result = await BandProfile.search({
      genre,
      location,
      budgetMin,
      budgetMax,
      search,
      page,
      limit
    });

    return res.json({
      success: true,
      data: result.bands,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
        limit: result.limit
      }
    });
  } catch (error) {
    console.error('Band search error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal melakukan pencarian band'
    });
  }
});

/**
 * GET /api/bands/recent
 * Get recent bands for homepage
 */
router.get('/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 6;
    const bands = await BandProfile.getRecent(limit);

    return res.json({
      success: true,
      data: bands
    });
  } catch (error) {
    console.error('Get recent bands error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar band terkini'
    });
  }
});

/**
 * GET /api/bands/profile/:id
 * Get full band profile with availability and media
 */
router.get('/profile/:id', async (req, res) => {
  try {
    const profileId = parseInt(req.params.id, 10);
    if (isNaN(profileId)) {
      return res.status(400).json({
        success: false,
        message: 'ID Profil tidak valid'
      });
    }

    const band = await BandProfile.findById(profileId);
    if (!band) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    // Increment profile view count asynchronously
    BandProfile.incrementViews(profileId).catch(err => console.error('Error incrementing views:', err));

    // Fetch availability posts and media
    const availabilityPosts = await band.getAvailabilityPosts();
    const mediaFiles = await band.getMediaFiles();

    return res.json({
      success: true,
      data: {
        ...band,
        profileViews: band.profileViews + 1,
        availabilityPosts,
        mediaFiles
      }
    });
  } catch (error) {
    console.error('Get band profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil detail profil band'
    });
  }
});

/**
 * POST /api/bands/profile
 * Create band profile for authenticated band user
 */
router.post('/profile', requireBand, async (req, res) => {
  try {
    const {
      bandName,
      genre,
      locationCity,
      locationRegion,
      bio,
      budgetMin,
      budgetMax,
      profilePhotoUrl,
      coverPhotoUrl,
      phone,
      instagramHandle,
      facebookUrl,
      youtubeUrl,
      spotifyUrl,
      tiktokUrl,
      riderChannelInputs,
      riderSoundSystem,
      riderInstruments,
      riderHospitality
    } = req.body;

    if (!bandName || !genre || !locationCity) {
      return res.status(400).json({
        success: false,
        message: 'Nama band, genre, dan kota wajib diisi'
      });
    }

    // Check if user already has a profile
    const existing = await BandProfile.findByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Akun ini sudah memiliki profil band'
      });
    }

    const newProfile = await BandProfile.create({
      userId: req.user.id,
      bandName,
      genre,
      locationCity,
      locationRegion,
      bio,
      budgetMin: budgetMin ? parseInt(budgetMin, 10) : null,
      budgetMax: budgetMax ? parseInt(budgetMax, 10) : null,
      profilePhotoUrl,
      coverPhotoUrl,
      phone,
      instagramHandle,
      facebookUrl,
      youtubeUrl,
      spotifyUrl,
      tiktokUrl,
      riderChannelInputs,
      riderSoundSystem,
      riderInstruments,
      riderHospitality
    });

    return res.status(201).json({
      success: true,
      message: 'Profil band berhasil dibuat',
      data: newProfile
    });
  } catch (error) {
    console.error('Create profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat profil band'
    });
  }
});

/**
 * PUT /api/bands/profile
 * Update band profile for authenticated owner
 */
router.put('/profile', requireBand, async (req, res) => {
  try {
    const profile = await BandProfile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band belum dibuat'
      });
    }

    const {
      bandName,
      genre,
      locationCity,
      locationRegion,
      bio,
      budgetMin,
      budgetMax,
      profilePhotoUrl,
      coverPhotoUrl,
      phone,
      instagramHandle,
      facebookUrl,
      youtubeUrl,
      spotifyUrl,
      tiktokUrl,
      riderChannelInputs,
      riderSoundSystem,
      riderInstruments,
      riderHospitality
    } = req.body;

    const updated = await BandProfile.update(profile.id, {
      bandName: bandName !== undefined ? bandName : profile.bandName,
      genre: genre !== undefined ? genre : profile.genre,
      locationCity: locationCity !== undefined ? locationCity : profile.locationCity,
      locationRegion: locationRegion !== undefined ? locationRegion : profile.locationRegion,
      bio: bio !== undefined ? bio : profile.bio,
      budgetMin: budgetMin !== undefined ? (budgetMin ? parseInt(budgetMin, 10) : null) : profile.budgetMin,
      budgetMax: budgetMax !== undefined ? (budgetMax ? parseInt(budgetMax, 10) : null) : profile.budgetMax,
      profilePhotoUrl: profilePhotoUrl !== undefined ? profilePhotoUrl : profile.profilePhotoUrl,
      coverPhotoUrl: coverPhotoUrl !== undefined ? coverPhotoUrl : profile.coverPhotoUrl,
      phone: phone !== undefined ? phone : profile.phone,
      instagramHandle: instagramHandle !== undefined ? instagramHandle : profile.instagramHandle,
      facebookUrl: facebookUrl !== undefined ? facebookUrl : profile.facebookUrl,
      youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : profile.youtubeUrl,
      spotifyUrl: spotifyUrl !== undefined ? spotifyUrl : profile.spotifyUrl,
      tiktokUrl: tiktokUrl !== undefined ? tiktokUrl : profile.tiktokUrl,
      riderChannelInputs: riderChannelInputs !== undefined ? riderChannelInputs : profile.riderChannelInputs,
      riderSoundSystem: riderSoundSystem !== undefined ? riderSoundSystem : profile.riderSoundSystem,
      riderInstruments: riderInstruments !== undefined ? riderInstruments : profile.riderInstruments,
      riderHospitality: riderHospitality !== undefined ? riderHospitality : profile.riderHospitality
    });

    return res.json({
      success: true,
      message: 'Profil band berhasil diperbarui',
      data: updated
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui profil band'
    });
  }
});

/**
 * POST /api/bands/media
 * Add media file (audio track or stage documentation photo/video)
 */
router.post('/media', requireBand, async (req, res) => {
  try {
    const profile = await BandProfile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    const { fileType, fileUrl, title, displayOrder } = req.body;
    if (!fileType || !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Tipe file dan URL wajib diisi'
      });
    }

    const created = await profile.addMediaFile({
      fileType,
      fileUrl,
      title: title || 'Dokumentasi Panggung',
      displayOrder: displayOrder || 0
    });

    return res.status(201).json({
      success: true,
      message: 'Media berhasil ditambahkan',
      data: created
    });
  } catch (error) {
    console.error('Add media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan media'
    });
  }
});

/**
 * DELETE /api/bands/media/:id
 * Delete a media file owned by the band
 */
router.delete('/media/:id', requireBand, async (req, res) => {
  try {
    const profile = await BandProfile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    const mediaId = parseInt(req.params.id, 10);
    const result = await db.query(
      'DELETE FROM media_files WHERE id = $1 AND band_profile_id = $2 RETURNING id',
      [mediaId, profile.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Media tidak ditemukan atau bukan milik band Anda'
      });
    }

    return res.json({
      success: true,
      message: 'Media berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus media'
    });
  }
});

module.exports = router;
