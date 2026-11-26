const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('../middleware/auth');

/**
 * GET /api/notifications
 * Fetch in-app notifications and unread count for authenticated user
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await Notification.listForUser(req.user);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil notifikasi',
    });
  }
});

/**
 * POST /api/notifications/read
 * Mark one or more notification keys as read
 */
router.post('/read', verifyToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids
      : req.body?.id
        ? [req.body.id]
        : [];
    await Notification.markRead(req.user.id, ids);
    const result = await Notification.listForUser(req.user);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menandai notifikasi telah dibaca',
    });
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read for authenticated user
 */
router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    await Notification.markAllRead(req.user, ids);
    const result = await Notification.listForUser(req.user);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menandai semua notifikasi telah dibaca',
    });
  }
});

module.exports = router;
