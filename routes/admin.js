const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const Report = require('../models/Report');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

/**
 * Fetch total posts across posts table or legacy availability table
 * @private
 */
async function fetchTotalPosts() {
  try {
    const postsRes = await db.query('SELECT COUNT(*) as count FROM band_posts');
    return parseInt(postsRes.rows[0].count, 10) || 0;
  } catch (e) {
    try {
      const legacyRes = await db.query('SELECT COUNT(*) as count FROM availability_posts WHERE is_active = true');
      return parseInt(legacyRes.rows[0].count, 10) || 0;
    } catch (err) {
      return 0;
    }
  }
}

/**
 * GET /api/admin/metrics
 * Comprehensive business metrics for digital business analysis
 */
router.get('/metrics', async (req, res) => {
  try {
    const [
      totalUsersRes,
      totalBandsRes,
      totalOrganizersRes,
      totalBandProfilesRes,
      totalConnectionsRes,
      totalViewsRes,
      recentUsersRes,
      pendingReports,
      totalPosts
    ] = await Promise.all([
      db.query('SELECT COUNT(*) as count FROM users'),
      db.query('SELECT COUNT(*) as count FROM users WHERE account_type = $1', ['band']),
      db.query('SELECT COUNT(*) as count FROM users WHERE account_type = $1', ['organizer']),
      db.query('SELECT COUNT(*) as count FROM band_profiles'),
      db.query('SELECT COUNT(*) as count FROM connections'),
      db.query('SELECT COALESCE(SUM(profile_views), 0) as views FROM band_profiles'),
      db.query('SELECT id, email, account_type, created_at, is_active FROM users ORDER BY created_at DESC LIMIT 10'),
      Report.findPending(),
      fetchTotalPosts()
    ]);

    const totalViews = parseInt(totalViewsRes.rows[0].views, 10) || 0;
    const totalConnections = parseInt(totalConnectionsRes.rows[0].count, 10) || 0;
    const conversionRate = totalViews > 0 ? ((totalConnections / totalViews) * 100).toFixed(2) : '0.00';

    return res.json({
      success: true,
      data: {
        summary: {
          totalUsers: parseInt(totalUsersRes.rows[0].count, 10),
          totalBands: parseInt(totalBandsRes.rows[0].count, 10),
          totalOrganizers: parseInt(totalOrganizersRes.rows[0].count, 10),
          totalBandProfiles: parseInt(totalBandProfilesRes.rows[0].count, 10),
          totalActivePosts: totalPosts,
          totalConnections,
          totalProfileViews: totalViews,
          conversionRate: `${conversionRate}%`
        },
        recentUsers: recentUsersRes.rows,
        pendingReports
      }
    });
  } catch (error) {
    console.error('Admin metrics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil metrik bisnis'
    });
  }
});

/**
 * GET /api/admin/reports
 * Get list of pending reports
 */
router.get('/reports', async (req, res) => {
  try {
    const reports = await Report.findPending();
    return res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Admin reports error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil laporan'
    });
  }
});

/**
 * PUT /api/admin/reports/:id
 * Update status of a moderation report
 */
router.put('/reports/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { status, adminNotes } = req.body;

    const updated = await Report.updateStatus(reportId, status, adminNotes);
    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan'
      });
    }

    return res.json({
      success: true,
      message: 'Status laporan berhasil diperbarui',
      data: updated
    });
  } catch (error) {
    console.error('Update report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui laporan'
    });
  }
});

/**
 * PUT /api/admin/users/:id/suspend
 * Suspend a user account
 */
router.put('/users/:id/suspend', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    await db.query('UPDATE users SET is_active = false WHERE id = $1', [userId]);

    return res.json({
      success: true,
      message: 'Akun berhasil dinonaktifkan'
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menonaktifkan akun'
    });
  }
});

module.exports = router;
