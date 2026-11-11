const express = require('express');
const router = express.Router();
const BandProfile = require('../models/BandProfile');
const AvailabilityPost = require('../models/AvailabilityPost');
const Connection = require('../models/Connection');
const { requireBand, verifyToken } = require('../middleware/auth');

/**
 * GET /api/dashboard/band
 * Get comprehensive dashboard data for band
 */
router.get('/band', requireBand, async (req, res) => {
  try {
    const bandProfile = await BandProfile.findByUserId(req.user.id);
    if (!bandProfile) {
      return res.status(404).json({
        success: false,
        message: 'Profil band belum dibuat'
      });
    }

    // Active availability posts
    const activePosts = await bandProfile.getAvailabilityPosts();

    // Media files (audio tracks & stage documentation)
    const mediaFiles = await bandProfile.getMediaFiles();

    // Recent connections
    const recentConnections = await Connection.getByBandProfile(bandProfile.id, 10);
    const connectionStats = await Connection.getStatsForBand(bandProfile.id);

    return res.json({
      success: true,
      data: {
        profile: bandProfile,
        stats: {
          profileViews: bandProfile.profileViews,
          totalConnections: connectionStats.total,
          activePostsCount: activePosts.length
        },
        activePosts,
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
 * Get organizer dashboard data
 */
router.get('/organizer', verifyToken, async (req, res) => {
  try {
    const contactedBands = await Connection.getByOrganizer(req.user.id, 20);

    return res.json({
      success: true,
      data: {
        stats: {
          totalContacted: contactedBands.length
        },
        contactedBands
      }
    });
  } catch (error) {
    console.error('Organizer dashboard error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data dashboard penyelenggara'
    });
  }
});

module.exports = router;
