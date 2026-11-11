const express = require('express');
const router = express.Router();
const AvailabilityPost = require('../models/AvailabilityPost');
const BandProfile = require('../models/BandProfile');
const { requireBand } = require('../middleware/auth');
const { validateDateRange } = require('../utils/validation');

/**
 * GET /api/availability/band/:bandProfileId
 * Get active availability posts for a band
 */
router.get('/band/:bandProfileId', async (req, res) => {
  try {
    const bandProfileId = parseInt(req.params.bandProfileId, 10);
    const posts = await AvailabilityPost.findByBandProfileId(bandProfileId, true);

    return res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Get availability posts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil jadwal ketersediaan'
    });
  }
});

/**
 * POST /api/availability
 * Create new availability post (for authenticated band user)
 */
router.post('/', requireBand, async (req, res) => {
  try {
    const { startDate, endDate, notes } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal mulai dan tanggal selesai wajib diisi'
      });
    }

    if (!validateDateRange(startDate, endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Tanggal selesai tidak boleh sebelum tanggal mulai'
      });
    }

    // Get band profile for authenticated user
    const bandProfile = await BandProfile.findByUserId(req.user.id);
    if (!bandProfile) {
      return res.status(400).json({
        success: false,
        message: 'Silakan lengkapi profil band Anda terlebih dahulu'
      });
    }

    const post = await AvailabilityPost.create({
      bandProfileId: bandProfile.id,
      startDate,
      endDate,
      notes
    });

    return res.status(201).json({
      success: true,
      message: 'Jadwal ketersediaan berhasil diposting',
      data: post
    });
  } catch (error) {
    console.error('Create availability post error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat jadwal ketersediaan'
    });
  }
});

/**
 * DELETE /api/availability/:id
 * Delete availability post (owner only)
 */
router.delete('/:id', requireBand, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    const post = await AvailabilityPost.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Jadwal ketersediaan tidak ditemukan'
      });
    }

    const bandProfile = await BandProfile.findByUserId(req.user.id);
    if (!bandProfile || bandProfile.id !== post.bandProfileId) {
      return res.status(403).json({
        success: false,
        message: 'Anda tidak memiliki hak untuk menghapus jadwal ini'
      });
    }

    await AvailabilityPost.delete(postId);

    return res.json({
      success: true,
      message: 'Jadwal ketersediaan berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete availability post error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus jadwal ketersediaan'
    });
  }
});

module.exports = router;
