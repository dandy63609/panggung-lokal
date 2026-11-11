const express = require('express');
const router = express.Router();
const Connection = require('../models/Connection');
const BandProfile = require('../models/BandProfile');
const { verifyToken, requireOrganizer, requireBand } = require('../middleware/auth');

/**
 * POST /api/connections
 * Record connection when organizer views band contact details or clicks contact
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bandProfileId, notes, connectionType } = req.body;

    if (!bandProfileId) {
      return res.status(400).json({
        success: false,
        message: 'ID profil band wajib disertakan'
      });
    }

    const band = await BandProfile.findById(bandProfileId);
    if (!band) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    // Record connection
    const connection = await Connection.create({
      organizerUserId: req.user.id,
      bandProfileId: band.id,
      connectionType: connectionType || 'contact_view',
      notes: notes || null
    });

    // Format WhatsApp link if phone is present
    let whatsappUrl = null;
    if (band.phone) {
      const cleanPhone = band.phone.replace(/[^0-9]/g, '');
      const waNumber = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
      const message = encodeURIComponent(`Halo ${band.bandName}, kami menemukan profil band Anda di Panggung Lokal dan tertarik untuk mengundang Anda manggung.`);
      whatsappUrl = `https://wa.me/${waNumber}?text=${message}`;
    }

    return res.status(201).json({
      success: true,
      message: 'Koneksi berhasil dicatat',
      data: {
        connectionId: connection.id,
        contact: {
          phone: band.phone,
          whatsappUrl,
          instagramHandle: band.instagramHandle,
          youtubeUrl: band.youtubeUrl,
          facebookUrl: band.facebookUrl
        }
      }
    });
  } catch (error) {
    console.error('Create connection error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mencatat koneksi'
    });
  }
});

/**
 * GET /api/connections/band/:bandProfileId
 * Get connections for a band profile (owner only)
 */
router.get('/band/:bandProfileId', requireBand, async (req, res) => {
  try {
    const bandProfileId = parseInt(req.params.bandProfileId, 10);
    const profile = await BandProfile.findByUserId(req.user.id);

    if (!profile || profile.id !== bandProfileId) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak'
      });
    }

    const connections = await Connection.getByBandProfile(bandProfileId);
    const stats = await Connection.getStatsForBand(bandProfileId);

    return res.json({
      success: true,
      data: connections,
      stats
    });
  } catch (error) {
    console.error('Get band connections error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data koneksi band'
    });
  }
});

/**
 * GET /api/connections/organizer
 * Get connections made by authenticated organizer
 */
router.get('/organizer', verifyToken, async (req, res) => {
  try {
    const connections = await Connection.getByOrganizer(req.user.id);

    return res.json({
      success: true,
      data: connections
    });
  } catch (error) {
    console.error('Get organizer connections error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil daftar band yang telah dihubungi'
    });
  }
});

module.exports = router;
