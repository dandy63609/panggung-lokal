const express = require('express');
const router = express.Router();
const BandPost = require('../models/BandPost');
const Connection = require('../models/Connection');
const BandService = require('../services/bandService');
const { requireBand, verifyToken } = require('../middleware/auth');

/**
 * GET /api/dashboard/band
 * Get comprehensive Instagram-style dashboard data for band
 */
router.get('/band', requireBand, async (req, res) => {
  try {
    const bandProfile = await BandService.getOrCreateProfile(req.user.id);
    if (!bandProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band belum dibuat'
      });
    }

    // Fetch dashboard components in parallel for optimal throughput
    const [performance, mediaFiles, recentConnections, connectionStats] = await Promise.all([
      BandPost.getPerformanceSummaryByBandId(bandProfile.id),
      bandProfile.getMediaFiles(),
      Connection.getByBandProfile(bandProfile.id, 10),
      Connection.getStatsForBand(bandProfile.id)
    ]);

    return res.json({
      success: true,
      data: {
        profile: bandProfile,
        stats: {
          profileViews: bandProfile.profileViews,
          totalConnections: connectionStats.total || performance.totalWaClicks,
          totalPosts: performance.totalPosts,
          totalViews: performance.totalViews,
          totalWaClicks: performance.totalWaClicks
        },
        posts: performance.posts,
        mediaFiles,
        recentConnections
      }
    });
  } catch (error) {
    console.error('Band dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard band'
    });
  }
});

/**
 * GET /api/dashboard/organizer
 * Redirect organizer to search
 */
router.get('/organizer', verifyToken, async (req, res) => {
  return res.json({
    success: true,
    redirect: '/search.html',
    message: 'Dashboard penyelenggara telah disederhanakan ke halaman Cari Band'
  });
});

module.exports = router;
