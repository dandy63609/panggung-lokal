const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { optionalAuth } = require('../middleware/auth');
const { parsePositiveInt } = require('../utils/validation');

const ALLOWED_ENTITY_TYPES = ['band_profile', 'band', 'user', 'post'];

/**
 * POST /api/reports
 * Submit a report against a band profile or user
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { reportedEntityType, reportedEntityId, reason } = req.body;

    if (!reportedEntityType || !reportedEntityId || !reason || typeof reason !== 'string' || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Tipe entitas, ID, dan alasan pelaporan wajib diisi'
      });
    }

    if (!ALLOWED_ENTITY_TYPES.includes(String(reportedEntityType))) {
      return res.status(400).json({
        success: false,
        message: 'Tipe entitas pelaporan tidak valid'
      });
    }

    const parsedEntityId = parsePositiveInt(reportedEntityId);
    if (!parsedEntityId) {
      return res.status(400).json({
        success: false,
        message: 'ID entitas pelaporan tidak valid'
      });
    }

    const reporterUserId = req.user?.id || null;

    const report = await Report.create({
      reporterUserId,
      reportedEntityType,
      reportedEntityId: parsedEntityId,
      reason: reason.trim()
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
