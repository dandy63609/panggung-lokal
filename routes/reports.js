const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const { extractOptionalUser } = require('../middleware/auth');

router.post('/', async (req, res) => {
  try {
    const { reportedEntityType, reportedEntityId, reason } = req.body;
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';
    const trimmedEntityType =
      typeof reportedEntityType === 'string' ? reportedEntityType.trim() : '';

    if (!trimmedEntityType || !reportedEntityId || !trimmedReason) {
      return res.status(400).json({
        success: false,
        message: 'Tipe entitas, ID, dan alasan pelaporan wajib diisi'
      });
    }

    const parsedEntityId = parseInt(reportedEntityId, 10);
    if (!Number.isInteger(parsedEntityId) || parsedEntityId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID entitas yang dilaporkan tidak valid'
      });
    }

    const decoded = extractOptionalUser(req, { allowCookie: false });
    const reporterUserId = decoded ? decoded.id : null;

    const report = await Report.create({
      reporterUserId,
      reportedEntityType: trimmedEntityType.slice(0, 50),
      reportedEntityId: parsedEntityId,
      reason: trimmedReason.slice(0, 1000)
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
