const express = require('express');
const router = express.Router();
const BandProfile = require('../models/BandProfile');
const BandPost = require('../models/BandPost');
const Connection = require('../models/Connection');
const JobBroadcast = require('../models/JobBroadcast');
const { requireBand, verifyToken } = require('../middleware/auth');

/**
 * GET /api/dashboard/band
 * Get comprehensive Instagram-style dashboard data for band
 */
router.get('/band', requireBand, async (req, res) => {
  try {
    const bandProfile = await BandProfile.findOrCreateForUser(req.user);
    if (!bandProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band belum dibuat'
      });
    }

    // Instagram-style posts and performance analytics
    const performance = await BandPost.getPerformanceSummaryByBandId(bandProfile.id);

    // Media files (audio tracks & stage documentation)
    const mediaFiles = await bandProfile.getMediaFiles();

    // Recent inquiries / WhatsApp connections
    const recentConnections = await Connection.getByBandProfile(bandProfile.id, 10);
    const connectionStats = await Connection.getStatsForBand(bandProfile.id);

    // Incoming open gig broadcasts from Event Organizers
    const jobBroadcasts = await JobBroadcast.listRecent(50);

    const profileViews = Number(bandProfile.profileViews) || 0;
    const postViews = Number(performance.totalViews) || 0;
    const totalWaClicks = Math.max(Number(connectionStats.total || 0), Number(performance.totalWaClicks || 0));
    // Total tayangan adalah gabungan tayangan profil publik band + tayangan postingan karya
    const totalViews = Math.max(profileViews + postViews, totalWaClicks);

    return res.json({
      success: true,
      data: {
        profile: bandProfile,
        stats: {
          profileViews,
          postViews,
          totalConnections: connectionStats.total || performance.totalWaClicks,
          totalPosts: performance.totalPosts,
          totalViews,
          totalWaClicks
        },
        posts: performance.posts,
        mediaFiles,
        recentConnections,
        jobBroadcasts
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
