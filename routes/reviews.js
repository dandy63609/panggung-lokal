const express = require('express');
const router = express.Router();
const db = require('../utils/db');
const BandProfile = require('../models/BandProfile');
const { verifyToken } = require('../middleware/auth');

function getRatingTier(rating) {
  const r = Number(rating) || 0;
  if (r >= 4.5) return 'Rekomendasi Favorit';
  if (r >= 3.0) return 'Sangat Baik';
  return 'Baik';
}

function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * GET /api/reviews/pending
 * Detect any booking made by current EO where event date has passed 00:00 midnight
 * and has not been reviewed yet (Gating trigger)
 */
router.get('/pending', verifyToken, async (req, res) => {
  try {
    const todayStr = getTodayStr();

    // Query unreviewed bookings for this user where event_date is on or before today
    const result = await db.query(
      `SELECT c.id as connection_id, c.band_profile_id, c.event_date, c.event_name, c.notes,
              bp.band_name, bp.profile_photo_url, bp.location_city, bp.genre
       FROM connections c
       JOIN band_profiles bp ON bp.id = c.band_profile_id
       WHERE c.organizer_user_id = $1
         AND c.event_date IS NOT NULL
         AND TRIM(c.event_date) != ''
         AND c.event_date <= $2
         AND (c.is_reviewed IS NULL OR c.is_reviewed = FALSE)
       ORDER BY c.event_date DESC`,
      [req.user.id, todayStr]
    );

    const pendingBookings = result.rows.map(row => ({
      connectionId: row.connection_id,
      bandProfileId: row.band_profile_id,
      bandName: row.band_name,
      profilePhotoUrl: row.profile_photo_url,
      locationCity: row.location_city,
      genre: row.genre,
      eventDate: row.event_date,
      eventName: row.event_name || 'Penampilan Live Stage',
      notes: row.notes,
      emailNotificationSent: true,
      notificationSubject: `Pemberitahuan Otomatis: Beri Rating & Ulasan untuk ${row.band_name}`,
      notificationTimestamp: `${row.event_date} 00:00:00 WIB`
    }));

    return res.json({
      success: true,
      pendingCount: pendingBookings.length,
      isGated: pendingBookings.length > 0,
      data: pendingBookings
    });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memeriksa status rating tertunda'
    });
  }
});

/**
 * POST /api/reviews
 * Submit rating (1 to 5) and review by EO
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const { bandProfileId, connectionId, rating, reviewText, eventDate } = req.body;

    const parsedBandId = parseInt(bandProfileId, 10);
    if (!Number.isInteger(parsedBandId) || parsedBandId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID profil band tidak valid'
      });
    }

    const numericRating = parseFloat(rating);
    if (isNaN(numericRating) || numericRating < 1.0 || numericRating > 5.0) {
      return res.status(400).json({
        success: false,
        message: 'Rating wajib diisi antara 1.0 sampai 5.0 bintang'
      });
    }

    const band = await BandProfile.findById(parsedBandId);
    if (!band) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    // Insert review
    const reviewResult = await db.query(
      `INSERT INTO reviews (band_profile_id, organizer_user_id, connection_id, rating, review_text, event_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        parsedBandId,
        req.user.id,
        connectionId ? parseInt(connectionId, 10) : null,
        numericRating,
        reviewText ? String(reviewText).trim() : 'Ulasan penampilan panggung terverifikasi.',
        eventDate || getTodayStr()
      ]
    );

    // If connectionId is provided, mark connection as reviewed
    if (connectionId) {
      await db.query(
        'UPDATE connections SET is_reviewed = TRUE WHERE id = $1 AND organizer_user_id = $2',
        [parseInt(connectionId, 10), req.user.id]
      );
    } else {
      // Mark any past matching connection for this band & user as reviewed
      await db.query(
        'UPDATE connections SET is_reviewed = TRUE WHERE band_profile_id = $1 AND organizer_user_id = $2',
        [parsedBandId, req.user.id]
      );
    }

    // Recalculate average rating & rating count for band profile
    const statsResult = await db.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE band_profile_id = $1',
      [parsedBandId]
    );

    const newAvg = statsResult.rows[0]?.avg_rating ? parseFloat(statsResult.rows[0].avg_rating) : numericRating;
    const newCount = statsResult.rows[0]?.count ? parseInt(statsResult.rows[0].count, 10) : 1;
    const roundedAvg = Math.round(newAvg * 10) / 10;

    await db.query(
      'UPDATE band_profiles SET rating_average = $1, rating_count = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [roundedAvg, newCount, parsedBandId]
    );

    const ratingTier = getRatingTier(roundedAvg);

    return res.status(201).json({
      success: true,
      message: `Rating bintang ${numericRating} (${ratingTier}) berhasil dikirimkan. Terima kasih atas ulasan Anda!`,
      data: {
        review: reviewResult.rows[0],
        bandRating: roundedAvg,
        bandRatingCount: newCount,
        ratingTier
      }
    });
  } catch (error) {
    console.error('Submit review error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengirimkan rating & ulasan'
    });
  }
});

/**
 * GET /api/reviews/band/:bandProfileId
 * List all reviews for a band
 */
router.get('/band/:bandProfileId', async (req, res) => {
  try {
    const bandProfileId = parseInt(req.params.bandProfileId, 10);
    if (!Number.isInteger(bandProfileId) || bandProfileId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID profil band tidak valid'
      });
    }

    const result = await db.query(
      `SELECT r.*, u.email as organizer_email
       FROM reviews r
       JOIN users u ON u.id = r.organizer_user_id
       WHERE r.band_profile_id = $1
       ORDER BY r.created_at DESC`,
      [bandProfileId]
    );

    const reviews = result.rows.map(row => {
      const email = row.organizer_email || 'eo@event.id';
      const maskedEmail = email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + '*'.repeat(Math.max(1, b.length)) + c);
      const numRating = parseFloat(row.rating) || 5.0;
      return {
        id: row.id,
        bandProfileId: row.band_profile_id,
        rating: numRating,
        ratingTier: getRatingTier(numRating),
        reviewText: row.review_text,
        eventDate: row.event_date,
        organizerEmail: maskedEmail,
        createdAt: row.created_at
      };
    });

    return res.json({
      success: true,
      data: reviews
    });
  } catch (error) {
    console.error('Get band reviews error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil ulasan band'
    });
  }
});

/**
 * POST /api/reviews/simulate-past-booking
 * Testing & Simulation trigger: Creates a past booking with yesterday's event date
 * so that the user can immediately experience the 00:00 automated email & login gating modal!
 */
router.post('/simulate-past-booking', verifyToken, async (req, res) => {
  try {
    const targetBandId = req.body.bandProfileId ? parseInt(req.body.bandProfileId, 10) : 1;
    const band = await BandProfile.findById(targetBandId) || (await BandProfile.getRecent(1))[0];
    if (!band) {
      return res.status(404).json({ success: false, message: 'Band tidak ditemukan untuk simulasi' });
    }

    // Set event date to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const conn = await db.query(
      `INSERT INTO connections (organizer_user_id, band_profile_id, connection_type, event_date, event_name, status, is_reviewed, notes)
       VALUES ($1, $2, 'direct_booking', $3, 'Pentas Seni Musik Kampus & Showcase', 'confirmed', FALSE, 'Simulasi booking untuk pengujian rating')
       RETURNING *`,
      [req.user.id, band.id, yStr]
    );

    return res.json({
      success: true,
      message: `Simulasi booking untuk ${band.bandName} pada tanggal ${yStr} berhasil dibuat. Sistem telah mensimulasikan pengiriman email otomatis pada 00.00 WIB, dan dialog rating wajib sekarang aktif!`,
      data: conn.rows[0]
    });
  } catch (error) {
    console.error('Simulate past booking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal membuat simulasi booking'
    });
  }
});

module.exports = router;
