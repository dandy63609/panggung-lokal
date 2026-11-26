const express = require('express');
const router = express.Router();
const BandProfile = require('../models/BandProfile');
const BandPost = require('../models/BandPost');
const db = require('../utils/db');
const { validatePhone } = require('../utils/validation');
const { requireBand, extractOptionalUser } = require('../middleware/auth');

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

const maskPhoneForGuest = (phone) => {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (trimmed.length <= 4) return 'xxxx';
  return `${trimmed.substring(0, 4)}xxxx`;
};

const sanitizeBandForVisitor = (band, isAuthenticated) => {
  if (isAuthenticated || !band) return band;
  return {
    ...band,
    phone: maskPhoneForGuest(band.phone)
  };
};

/**
 * GET /api/bands/search
 * Search bands with filters (public guest preview supported; phone is masked for guests)
 */
router.get('/search', async (req, res) => {
  try {
    const { genre, location, budgetMin, budgetMax, search, page, limit } = req.query;
    const user = extractOptionalUser(req);
    const isAuthenticated = !!user;

    const result = await BandProfile.search({
      genre,
      location,
      budgetMin,
      budgetMax,
      search,
      page,
      limit: limit || 50
    });

    const bands = result.bands.map((band) => sanitizeBandForVisitor(band, isAuthenticated));

    return res.json({
      success: true,
      data: bands,
      isSneakPeek: !isAuthenticated,
      message: null,
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
 * Get recent bands for homepage & related bands (public guest preview supported; phone masked for guests)
 */
router.get('/recent', async (req, res) => {
  try {
    const user = extractOptionalUser(req);
    const isAuthenticated = !!user;

    const requestedLimit = parseInt(req.query.limit, 10) || 6;
    const bands = await BandProfile.getRecent(requestedLimit);
    const safeBands = bands.map((band) => sanitizeBandForVisitor(band, isAuthenticated));

    return res.json({
      success: true,
      data: safeBands,
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
 * Get full band profile with Instagram-style posts and media by numeric ID or URL slug
 */
router.get('/profile/:id', async (req, res) => {
  try {
    const rawIdentifier = req.params.id;
    if (!rawIdentifier || typeof rawIdentifier !== 'string' || !rawIdentifier.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Identifier profil tidak valid'
      });
    }

    const band = await BandProfile.findByIdOrSlug(rawIdentifier);
    if (!band) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    const user = extractOptionalUser(req);
    const isAuthenticated = !!user;
    const isSneakPeek = !isAuthenticated;

    // View tracking rules:
    // Only increment profile views if the visitor is NOT the owner of this band!
    // ("fitur view di hitung kalo ada akun eo atau musisi lain intinya orang lain bukan akun kita yang buka")
    const isOwner = Boolean(
      user &&
      band.userId &&
      String(user.id) === String(band.userId)
    );
    const isPreview = req.query.preview === 'true' || isOwner;

    let updatedProfileViews = band.profileViews;
    if (!isPreview) {
      BandProfile.incrementViews(band.id).catch(err => console.error('Error incrementing views:', err));
      updatedProfileViews = band.profileViews + 1;
    }

    // Fetch Instagram-style posts and media files
    const posts = await BandPost.findByBandProfileId(band.id);
    const mediaFiles = await band.getMediaFiles();

    const displayPhone = isSneakPeek
      ? maskPhoneForGuest(band.phone)
      : band.phone;

    return res.json({
      success: true,
      isSneakPeek,
      data: {
        ...band,
        phone: displayPhone,
        profileViews: updatedProfileViews,
        posts,
        mediaFiles,
        isOwner
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
      setDuration,
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
      setDuration: setDuration !== undefined && setDuration !== null ? String(setDuration).trim() : null,
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
    const profile = await BandProfile.findOrCreateForUser(req.user, {
      bandName: req.body?.bandName,
      genre: req.body?.genre,
      locationCity: req.body?.locationCity,
      bio: req.body?.bio,
    });
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
      setDuration,
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
      riderItems,
      stageVisualPostId
    } = req.body;

    if (bandName !== undefined && String(bandName).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Nama band wajib diisi'
      });
    }

    if (phone !== undefined && phone !== null && String(phone).trim() !== '' && !validatePhone(String(phone).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Format nomor WhatsApp/telepon tidak valid (gunakan awalan 08 atau +62)'
      });
    }

    const parsedBudgetMin =
      budgetMin !== undefined && budgetMin !== null && budgetMin !== ''
        ? parseInt(budgetMin, 10)
        : budgetMin === null || budgetMin === ''
          ? null
          : profile.budgetMin;
    const parsedBudgetMax =
      budgetMax !== undefined && budgetMax !== null && budgetMax !== ''
        ? parseInt(budgetMax, 10)
        : budgetMax === null || budgetMax === ''
          ? null
          : profile.budgetMax;

    if (
      (parsedBudgetMin !== null && (isNaN(parsedBudgetMin) || parsedBudgetMin < 0)) ||
      (parsedBudgetMax !== null && (isNaN(parsedBudgetMax) || parsedBudgetMax < 0))
    ) {
      return res.status(400).json({
        success: false,
        message: 'Tarif harus berupa angka non-negatif yang valid'
      });
    }

    if (parsedBudgetMin !== null && parsedBudgetMax !== null && parsedBudgetMin > parsedBudgetMax) {
      return res.status(400).json({
        success: false,
        message: 'Tarif minimum tidak boleh lebih besar dari tarif maksimum'
      });
    }

    let nextStageVisualPostId;
    if (stageVisualPostId !== undefined) {
      if (stageVisualPostId === null || stageVisualPostId === '') {
        nextStageVisualPostId = null;
      } else {
        const parsedPostId = parseInt(stageVisualPostId, 10);
        if (!Number.isInteger(parsedPostId) || parsedPostId <= 0) {
          return res.status(400).json({
            success: false,
            message: 'ID postingan Stage Visual tidak valid'
          });
        }
        const ownedPost = await BandPost.findById(parsedPostId);
        if (!ownedPost || ownedPost.bandProfileId !== profile.id) {
          return res.status(404).json({
            success: false,
            message: 'Postingan tidak ditemukan atau bukan milik band Anda'
          });
        }
        nextStageVisualPostId = parsedPostId;
      }
    }

    const updated = await BandProfile.update(profile.id, {
      bandName: bandName !== undefined ? bandName : profile.bandName,
      genre: genre !== undefined ? genre : profile.genre,
      locationCity: locationCity !== undefined ? locationCity : profile.locationCity,
      locationRegion: locationRegion !== undefined ? locationRegion : profile.locationRegion,
      bio: bio !== undefined ? bio : profile.bio,
      budgetMin: parsedBudgetMin,
      budgetMax: parsedBudgetMax,
      setDuration: setDuration !== undefined ? (setDuration !== null ? String(setDuration).trim() : '') : undefined,
      profilePhotoUrl: profilePhotoUrl !== undefined ? profilePhotoUrl : profile.profilePhotoUrl,
      coverPhotoUrl: coverPhotoUrl !== undefined ? coverPhotoUrl : profile.coverPhotoUrl,
      phone: phone !== undefined ? phone : profile.phone,
      instagramHandle: instagramHandle !== undefined ? instagramHandle : profile.instagramHandle,
      facebookUrl: facebookUrl !== undefined ? facebookUrl : profile.facebookUrl,
      youtubeUrl: youtubeUrl !== undefined ? youtubeUrl : profile.youtubeUrl,
      spotifyUrl: spotifyUrl !== undefined ? spotifyUrl : profile.spotifyUrl,
      tiktokUrl: tiktokUrl !== undefined ? tiktokUrl : profile.tiktokUrl,
      riderChannelInputs: riderChannelInputs !== undefined ? riderChannelInputs : undefined,
      riderSoundSystem: riderSoundSystem !== undefined ? riderSoundSystem : undefined,
      riderInstruments: riderInstruments !== undefined ? riderInstruments : undefined,
      riderHospitality: riderHospitality !== undefined ? riderHospitality : undefined,
      riderItems: riderItems !== undefined ? riderItems : undefined,
      stageVisualPostId: nextStageVisualPostId
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
    const profile = await BandProfile.findOrCreateForUser(req.user);
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

    const isSafeUrl =
      typeof fileUrl === 'string' && (fileUrl.startsWith('/') || /^https?:\/\//i.test(fileUrl));
    if (!isSafeUrl) {
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
    const mediaId = parseInt(req.params.id, 10);
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID media tidak valid'
      });
    }

    const profile = await BandProfile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

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

/**
 * PUT /api/bands/media/:id
 * Update media title or display order
 */
router.put('/media/:id', requireBand, async (req, res) => {
  try {
    const mediaId = parseInt(req.params.id, 10);
    if (!Number.isInteger(mediaId) || mediaId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID media tidak valid'
      });
    }

    const profile = await BandProfile.findByUserId(req.user.id);
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    const { title, displayOrder } = req.body;
    const result = await db.query(
      `UPDATE media_files 
       SET title = COALESCE($1, title), 
           display_order = COALESCE($2, display_order)
       WHERE id = $3 AND band_profile_id = $4
       RETURNING *`,
      [
        title !== undefined && title !== null && title.trim() !== '' ? title.trim() : null,
        displayOrder !== undefined && Number.isInteger(displayOrder) ? displayOrder : null,
        mediaId,
        profile.id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Media tidak ditemukan atau bukan milik band Anda'
      });
    }

    return res.json({
      success: true,
      message: 'Media berhasil diperbarui',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update media error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui media'
    });
  }
});

module.exports = router;
