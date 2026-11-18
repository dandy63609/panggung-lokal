const express = require('express');
const router = express.Router();
const JobBroadcast = require('../models/JobBroadcast');
const { requireOrganizer, requireBand } = require('../middleware/auth');
const { validateEmail, validatePhone } = require('../utils/validation');

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * POST /api/broadcasts
 * Organizer broadcasts a gig booking inquiry to all registered band accounts.
 */
router.post('/', requireOrganizer, async (req, res) => {
  try {
    const {
      sourceBandProfileId,
      organizerName,
      organizerEmail,
      organizerPhone,
      eventDate,
      performStartTime,
      performEndTime,
      venueLocation,
      eventScale,
      eventDetails,
      attachments,
    } = req.body;

    if (
      !organizerName ||
      !organizerEmail ||
      !organizerPhone ||
      !eventDate ||
      !performStartTime ||
      !performEndTime ||
      !venueLocation ||
      !eventDetails
    ) {
      return res.status(400).json({
        success: false,
        message: 'Semua kolom utama jadwal, waktu tampil, lokasi venue, dan kontak EO wajib diisi',
      });
    }

    if (!validateEmail(String(organizerEmail).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Format email penyelenggara tidak valid',
      });
    }

    if (!validatePhone(String(organizerPhone).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Format nomor WhatsApp penyelenggara tidak valid',
      });
    }

    if (!TIME_PATTERN.test(String(performStartTime).trim()) || !TIME_PATTERN.test(String(performEndTime).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Format jam tampil harus menggunakan format HH:MM (contoh: 19:30)',
      });
    }

    let safeAttachments = [];
    if (attachments !== undefined) {
      if (!Array.isArray(attachments) || attachments.length > 3) {
        return res.status(400).json({
          success: false,
          message: 'Lampiran maksimal berisi 3 file',
        });
      }
      safeAttachments = attachments
        .filter((att) => att && typeof att.fileUrl === 'string' && att.fileUrl.startsWith('/uploads/'))
        .map((att) => ({
          fileUrl: att.fileUrl,
          originalName: String(att.originalName || 'lampiran').slice(0, 200),
          mimeType: String(att.mimeType || '').slice(0, 120),
          size: Number(att.size) || 0,
        }));
    }

    const scaleNum = Math.min(Math.max(parseInt(eventScale, 10) || 5, 1), 5);

    const created = await JobBroadcast.create({
      organizerUserId: req.user.id,
      sourceBandProfileId: sourceBandProfileId ? parseInt(sourceBandProfileId, 10) || null : null,
      organizerName: String(organizerName).trim().slice(0, 255),
      organizerEmail: String(organizerEmail).trim().slice(0, 255),
      organizerPhone: String(organizerPhone).trim().slice(0, 50),
      eventDate: String(eventDate).trim().slice(0, 50),
      performStartTime: String(performStartTime).trim(),
      performEndTime: String(performEndTime).trim(),
      venueLocation: String(venueLocation).trim().slice(0, 255),
      eventScale: scaleNum,
      eventDetails: String(eventDetails).trim(),
      attachments: safeAttachments,
    });

    return res.status(201).json({
      success: true,
      message: `Broadcast panggilan panggung berhasil dikirim ke ${created.recipientBandCount} band terdaftar`,
      data: created,
    });
  } catch (error) {
    console.error('Create job broadcast error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirim broadcast panggilan panggung',
    });
  }
});

/**
 * GET /api/broadcasts/band
 * Authenticated band accounts read incoming broadcast gig invitations.
 */
router.get('/band', requireBand, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const broadcasts = await JobBroadcast.listRecent(limit);

    return res.json({
      success: true,
      data: broadcasts,
    });
  } catch (error) {
    console.error('Get band broadcasts error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar notifikasi broadcast panggung',
    });
  }
});

module.exports = router;
