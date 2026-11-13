const express = require('express');
const router = express.Router();
const BandProfile = require('../models/BandProfile');
const BandPost = require('../models/BandPost');
const BandService = require('../services/bandService');
const { optionalAuth, requireBand } = require('../middleware/auth');
const { parsePositiveInt, isSafeMediaUrl } = require('../utils/validation');

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
 * Search bands with filters and sneak peek gating for guests
 */
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { genre, location, budgetMin, budgetMax, search, page, limit } = req.query;
    const isAuthenticated = !!req.user;
    const isSneakPeek = !isAuthenticated;

    const result = await BandProfile.search({
      genre,
      location,
      budgetMin,
      budgetMax,
      search,
      page,
      limit: isAuthenticated ? limit : 2
    });

    const responseBands = BandService.formatBandList(result.bands, isAuthenticated, 2);

    return res.json({
      success: true,
      data: responseBands,
      isSneakPeek,
      message: isSneakPeek ? 'Pratinjau (Sneak Peek) 2 band. Silakan login untuk melihat seluruh katalog & kontak WhatsApp.' : null,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: isSneakPeek ? 1 : result.totalPages,
        limit: isSneakPeek ? 2 : result.limit
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
 * Get recent bands for homepage (sneak peek for guests)
 */
router.get('/recent', optionalAuth, async (req, res) => {
  try {
    const isAuthenticated = !!req.user;
    const requestedLimit = parseInt(req.query.limit, 10) || 6;
    const limit = isAuthenticated ? requestedLimit : 2;

    const bands = await BandProfile.getRecent(limit);
    const responseBands = BandService.formatBandList(bands, isAuthenticated, 2);

    return res.json({
      success: true,
      data: responseBands,
      isSneakPeek: !isAuthenticated
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
 * Get full band profile with Instagram-style posts and media
 */
router.get('/profile/:id', optionalAuth, async (req, res) => {
  try {
    const profileId = parsePositiveInt(req.params.id);
    if (!profileId) {
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

    const isAuthenticated = !!req.user;
    const isSneakPeek = !isAuthenticated;

    // Fetch Instagram-style posts and media files in parallel
    const [posts, mediaFiles] = await Promise.all([
      BandPost.findByBandProfileId(band.id),
      band.getMediaFiles()
    ]);

    const formattedBand = BandService.formatBand(band, isAuthenticated);

    return res.json({
      success: true,
      isSneakPeek,
      data: {
        ...formattedBand,
        profileViews: band.profileViews + 1,
        posts,
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

    const existing = await BandProfile.findByUserId(req.user.id);
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Akun ini sudah memiliki profil band'
      });
    }

    const parsedBudgetMin = budgetMin ? parseInt(budgetMin, 10) : null;
    const parsedBudgetMax = budgetMax ? parseInt(budgetMax, 10) : null;
    const budgetValidation = BandService.validateBudgetRange(parsedBudgetMin, parsedBudgetMax);
    if (!budgetValidation.valid) {
      return res.status(400).json({
        success: false,
        message: budgetValidation.message
      });
    }

    if ((profilePhotoUrl && !isSafeMediaUrl(profilePhotoUrl)) || (coverPhotoUrl && !isSafeMediaUrl(coverPhotoUrl))) {
      return res.status(400).json({
        success: false,
        message: 'Format URL foto profil atau sampul tidak aman'
      });
    }

    const newProfile = await BandProfile.create({
      userId: req.user.id,
      bandName,
      genre,
      locationCity,
      locationRegion,
      bio,
      budgetMin: parsedBudgetMin,
      budgetMax: parsedBudgetMax,
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
    const profile = await BandService.getOrCreateProfile(req.user.id);
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
      riderHospitality,
      riderItems
    } = req.body;

    const parsedBudgetMin = budgetMin !== undefined ? (budgetMin ? parseInt(budgetMin, 10) : null) : profile.budgetMin;
    const parsedBudgetMax = budgetMax !== undefined ? (budgetMax ? parseInt(budgetMax, 10) : null) : profile.budgetMax;

    const budgetValidation = BandService.validateBudgetRange(parsedBudgetMin, parsedBudgetMax);
    if (!budgetValidation.valid) {
      return res.status(400).json({
        success: false,
        message: budgetValidation.error
      });
    }

    const updated = await BandProfile.update(profile.id, {
      bandName: bandName !== undefined ? bandName : profile.bandName,
      genre: genre !== undefined ? genre : profile.genre,
      locationCity: locationCity !== undefined ? locationCity : profile.locationCity,
      locationRegion: locationRegion !== undefined ? locationRegion : profile.locationRegion,
      bio: bio !== undefined ? bio : profile.bio,
      budgetMin: parsedBudgetMin,
      budgetMax: parsedBudgetMax,
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
      riderHospitality: riderHospitality !== undefined ? riderHospitality : profile.riderHospitality,
      riderItems: riderItems !== undefined ? riderItems : profile.riderItems
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
    const profile = await BandService.getOrCreateProfile(req.user.id);
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

    const allowedFileTypes = ['photo', 'image', 'video', 'audio', 'media'];
    if (!allowedFileTypes.includes(String(fileType).toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: 'Tipe file media tidak valid'
      });
    }

    if (!isSafeMediaUrl(fileUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Format URL media tidak aman atau tidak valid'
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

    const mediaId = parsePositiveInt(req.params.id);
    if (!mediaId) {
      return res.status(400).json({
        success: false,
        message: 'ID media tidak valid'
      });
    }
    const deleted = await BandProfile.deleteMediaFile(mediaId, profile.id);

    if (!deleted) {
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
