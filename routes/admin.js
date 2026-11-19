const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const Report = require('../models/Report');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

/**
 * GET /api/admin/metrics
 * Comprehensive business metrics for digital business analysis
 */
router.get('/metrics', async (req, res) => {
  try {
    const totalUsersResult = await db.query('SELECT COUNT(*) as count FROM users');
    const totalBandsResult = await db.query('SELECT COUNT(*) as count FROM users WHERE account_type = $1', ['band']);
    const totalOrganizersResult = await db.query("SELECT COUNT(*) as count FROM users WHERE account_type IN ('organizer', 'general')");
    const totalBandProfilesResult = await db.query('SELECT COUNT(*) as count FROM band_profiles');
    let totalActivePosts = 0;
    try {
      const postsResult = await db.query('SELECT COUNT(*) as count FROM band_posts');
      totalActivePosts = parseInt(postsResult.rows[0].count, 10) || 0;
    } catch {
      totalActivePosts = 0;
    }
    const totalConnectionsResult = await db.query('SELECT COUNT(*) as count FROM connections');
    const totalViewsResult = await db.query('SELECT COALESCE(SUM(profile_views), 0) as views FROM band_profiles');

    const totalViews = parseInt(totalViewsResult.rows[0].views, 10) || 0;
    const totalConnections = parseInt(totalConnectionsResult.rows[0].count, 10) || 0;
    const conversionRate = totalViews > 0 ? ((totalConnections / totalViews) * 100).toFixed(2) : '0.00';

    // Registered users (Band & EO accounts) with optional band profile name
    const recentUsersResult = await db.query(
      `SELECT u.id, u.email, u.account_type, u.created_at, u.is_active,
              bp.id AS band_profile_id, bp.band_name
       FROM users u
       LEFT JOIN band_profiles bp ON bp.user_id = u.id
       ORDER BY u.created_at DESC
       LIMIT 100`
    );

    // Pending reports
    const pendingReports = await Report.findPending();

    return res.json({
      success: true,
      data: {
        summary: {
          totalUsers: parseInt(totalUsersResult.rows[0].count, 10),
          totalBands: parseInt(totalBandsResult.rows[0].count, 10),
          totalOrganizers: parseInt(totalOrganizersResult.rows[0].count, 10),
          totalBandProfiles: parseInt(totalBandProfilesResult.rows[0].count, 10),
          totalActivePosts,
          totalConnections,
          totalProfileViews: totalViews,
          conversionRate: `${conversionRate}%`
        },
        recentUsers: recentUsersResult.rows,
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

const VALID_REPORT_STATUSES = ['pending', 'resolved', 'dismissed'];

router.put('/reports/:id', async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID laporan tidak valid'
      });
    }

    const { status, adminNotes } = req.body;
    if (!status || !VALID_REPORT_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status laporan harus berupa pending, resolved, atau dismissed'
      });
    }

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

router.put('/users/:id/suspend', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID pengguna tidak valid'
      });
    }

    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menangguhkan akun admin sendiri'
      });
    }

    const hasExplicitState = req.body && typeof req.body.isActive === 'boolean';
    const nextState = hasExplicitState ? req.body.isActive : false;

    const result = await db.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id',
      [nextState, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan'
      });
    }

    return res.json({
      success: true,
      message: nextState ? 'Akun berhasil diaktifkan kembali' : 'Akun berhasil dinonaktifkan',
      isActive: nextState
    });
  } catch (error) {
    console.error('Suspend user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui status akun'
    });
  }
});

/**
 * DELETE /api/admin/users/:id
 * Permanently delete a band or organizer/general user account and its owned records
 */
router.delete('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID pengguna tidak valid'
      });
    }

    if (String(req.user.id) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Tidak dapat menghapus akun admin yang sedang digunakan'
      });
    }

    const existingResult = await db.query(
      'SELECT id, email, account_type FROM users WHERE id = $1',
      [userId]
    );
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan'
      });
    }

    const targetUser = existingResult.rows[0];
    if (targetUser.account_type === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Tidak dapat menghapus akun administrator'
      });
    }

    const deletedUser = await db.transaction(async (client) => {
      const profileRes = await client.query(
        'SELECT id FROM band_profiles WHERE user_id = $1',
        [userId]
      );
      const bandProfileId = profileRes.rows[0]?.id || null;

      if (bandProfileId) {
        await client.query('DELETE FROM connections WHERE band_profile_id = $1', [bandProfileId]);
        await client.query('DELETE FROM media_files WHERE band_profile_id = $1', [bandProfileId]);
        await client.query('DELETE FROM band_posts WHERE band_profile_id = $1', [bandProfileId]);
        await client.query(
          'UPDATE job_broadcasts SET source_band_profile_id = NULL WHERE source_band_profile_id = $1',
          [bandProfileId]
        );
        await client.query(
          "DELETE FROM reports WHERE LOWER(reported_entity_type) IN ('band', 'band_profile') AND reported_entity_id = $1",
          [bandProfileId]
        );
        await client.query('DELETE FROM band_profiles WHERE id = $1', [bandProfileId]);
      }

      await client.query('DELETE FROM connections WHERE organizer_user_id = $1', [userId]);
      await client.query('DELETE FROM job_broadcasts WHERE organizer_user_id = $1', [userId]);
      await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      await client.query('UPDATE reports SET reporter_user_id = NULL WHERE reporter_user_id = $1', [userId]);

      const delRes = await client.query(
        'DELETE FROM users WHERE id = $1 RETURNING id, email, account_type',
        [userId]
      );
      return delRes.rows[0] || null;
    });

    if (!deletedUser) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan'
      });
    }

    return res.json({
      success: true,
      message: `Akun ${deletedUser.email} berhasil dihapus permanen`,
      data: {
        id: deletedUser.id,
        email: deletedUser.email,
        accountType: deletedUser.account_type
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus akun pengguna'
    });
  }
});

module.exports = router;
