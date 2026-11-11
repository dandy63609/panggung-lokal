const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { verifyToken } = require('../middleware/auth');

/**
 * POST /api/reports
 * Submit a report against a band profile or user
 */
router.post('/', async (req, res) => {
  try {
    const { reportedEntityType, reportedEntityId, reason } = req.body;

    if (!reportedEntityType || !reportedEntityId || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Tipe entitas, ID, dan alasan pelaporan wajib diisi'
      });
    }

    let reporterUserId = null;
    // Optional auth check
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const jwtSecret = process.env.JWT_SECRET || 'panggung-lokal-dev-secret-key-2026';
        const decoded = jwt.verify(authHeader.substring(7), jwtSecret);
        reporterUserId = decoded.id;
      } catch (e) {
        // Continue anonymously
      }
    }

    const report = await Report.create({
      reporterUserId,
      reportedEntityType,
      reportedEntityId: parseInt(reportedEntityId, 10),
      reason
    });

    return res.status(201).json({
      success: true,
      message: 'Laporan Anda telah diterima dan akan ditinjau oleh tim moderasi',
      data: report
    });
  } catch (error) {
    console.error('Submit report error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim laporan'
    });
  }
});

module.exports = router;
