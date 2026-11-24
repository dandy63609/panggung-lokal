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

const DUMMY_ACCOUNT_EMAILS = [
  'kelana@panggunglokal.id',
  'senjabersuara@panggunglokal.id',
  'goyangpantura@panggunglokal.id',
  'distorsi@panggunglokal.id',
  'lembayung@panggunglokal.id',
  'suarahutan@panggunglokal.id',
  'rhythmofsumatra@panggunglokal.id',
  'midnightgroovers@panggunglokal.id',
  'kafe.selatan@gmail.com',
  'jogja.creatives@gmail.com',
  'surabaya.nightmarket@gmail.com',
  'admin@panggunglokal.id',
];

async function deleteBandProfileRecords(client, bandProfileId) {
  await client.query('DELETE FROM reviews WHERE band_profile_id = $1', [bandProfileId]);
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

async function deleteUserCascade(client, userId) {
  const profileRes = await client.query(
    'SELECT id FROM band_profiles WHERE user_id = $1',
    [userId]
  );
  const bandProfileId = profileRes.rows[0]?.id || null;

  if (bandProfileId) {
    await deleteBandProfileRecords(client, bandProfileId);
  }

  await client.query('DELETE FROM reviews WHERE organizer_user_id = $1', [userId]);
  await client.query('DELETE FROM connections WHERE organizer_user_id = $1', [userId]);
  await client.query('DELETE FROM job_broadcasts WHERE organizer_user_id = $1', [userId]);
  await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  await client.query('UPDATE reports SET reporter_user_id = NULL WHERE reporter_user_id = $1', [userId]);

  const delRes = await client.query(
    'DELETE FROM users WHERE id = $1 RETURNING id, email, account_type',
    [userId]
  );
  return delRes.rows[0] || null;
}

/**
 * DELETE /api/admin/dummy-users
 * Remove all seeded dummy accounts and any orphaned band profiles in one transaction
 */
router.delete('/dummy-users', async (req, res) => {
  try {
    const result = await db.transaction(async (client) => {
      const dummyUsersRes = await client.query(
        'SELECT id, email, account_type FROM users WHERE LOWER(email) = ANY($1)',
        [DUMMY_ACCOUNT_EMAILS]
      );

      const deletedUsers = [];
      for (const userRow of dummyUsersRes.rows) {
        if (String(userRow.id) === String(req.user.id) || userRow.account_type === 'admin') {
          continue;
        }
        const deleted = await deleteUserCascade(client, userRow.id);
        if (deleted) {
          deletedUsers.push(deleted);
        }
      }

      const orphanRes = await client.query(
        'SELECT id FROM band_profiles WHERE user_id NOT IN (SELECT id FROM users)'
      );
      for (const orphan of orphanRes.rows) {
        await deleteBandProfileRecords(client, orphan.id);
      }

      return {
        deletedUsers,
        deletedOrphanProfiles: orphanRes.rows.length,
      };
    });

    return res.json({
      success: true,
      message: `${result.deletedUsers.length} akun dummy dan ${result.deletedOrphanProfiles} profil yatim berhasil dihapus permanen`,
      data: result,
    });
  } catch (error) {
    console.error('Delete dummy users error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus akun dummy',
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

    const deletedUser = await db.transaction((client) => deleteUserCascade(client, userId));

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

/**
 * GET /api/admin/campuses
 * List master campus labels and bands with their campus affiliations
 */
router.get('/campuses', async (req, res) => {
  try {
    // Ensure table exists and has default campuses if empty
    try {
      const checkCount = await db.query('SELECT COUNT(*) as count FROM campuses');
      if (parseInt(checkCount.rows[0].count, 10) === 0) {
        await db.query(`
          INSERT INTO campuses (name, short_name, city) VALUES 
          ('Universitas Negeri Semarang', 'UNNES', 'Kota Semarang'),
          ('Universitas Diponegoro', 'UNDIP', 'Kota Semarang'),
          ('Universitas Gadjah Mada', 'UGM', 'Kota Jogja'),
          ('Universitas Negeri Yogyakarta', 'UNY', 'Kota Jogja')
        `);
      }
    } catch {
      // Create table if missing
      await db.query(`
        CREATE TABLE IF NOT EXISTS campuses (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          short_name VARCHAR(50) NOT NULL,
          city VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        INSERT INTO campuses (name, short_name, city) VALUES 
        ('Universitas Negeri Semarang', 'UNNES', 'Kota Semarang'),
        ('Universitas Diponegoro', 'UNDIP', 'Kota Semarang'),
        ('Universitas Gadjah Mada', 'UGM', 'Kota Jogja'),
        ('Universitas Negeri Yogyakarta', 'UNY', 'Kota Jogja')
      `);
    }

    const campusesRes = await db.query('SELECT * FROM campuses ORDER BY id ASC');
    const bandsRes = await db.query(`
      SELECT bp.id, bp.band_name, bp.location_city, bp.genre, bp.campus, bp.profile_views, u.email
      FROM band_profiles bp
      LEFT JOIN users u ON u.id = bp.user_id
      ORDER BY bp.id ASC
    `);

    return res.json({
      success: true,
      data: {
        campuses: campusesRes.rows,
        bands: bandsRes.rows
      }
    });
  } catch (error) {
    console.error('Admin get campuses error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data kampus dan musisi'
    });
  }
});

/**
 * POST /api/admin/campuses
 * Add a new campus label (Admin only)
 */
router.post('/campuses', async (req, res) => {
  try {
    const { name, shortName, city } = req.body;
    if (!name || !shortName || !city) {
      return res.status(400).json({
        success: false,
        message: 'Nama kampus, singkatan/kode, dan kota wajib diisi'
      });
    }

    const result = await db.query(
      'INSERT INTO campuses (name, short_name, city) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), shortName.trim().toUpperCase(), city.trim()]
    );

    return res.status(201).json({
      success: true,
      message: `Kampus ${shortName.trim().toUpperCase()} berhasil ditambahkan`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Admin add campus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menambahkan label kampus'
    });
  }
});

/**
 * DELETE /api/admin/campuses/:id
 * Delete a campus label (Admin only)
 */
router.delete('/campuses/:id', async (req, res) => {
  try {
    const campusId = parseInt(req.params.id, 10);
    if (!Number.isInteger(campusId) || campusId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID kampus tidak valid'
      });
    }

    const delRes = await db.query('DELETE FROM campuses WHERE id = $1 RETURNING id, short_name', [campusId]);
    if (delRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Kampus tidak ditemukan'
      });
    }

    return res.json({
      success: true,
      message: `Kampus ${delRes.rows[0].short_name} berhasil dihapus`
    });
  } catch (error) {
    console.error('Admin delete campus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal menghapus label kampus'
    });
  }
});

/**
 * PUT /api/admin/bands/:id/campus
 * Assign or revoke a campus label for a band profile (Admin only)
 */
router.put('/bands/:id/campus', async (req, res) => {
  try {
    const bandId = parseInt(req.params.id, 10);
    if (!Number.isInteger(bandId) || bandId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID band tidak valid'
      });
    }

    const campusValue = req.body.campus ? String(req.body.campus).trim().toUpperCase() : null;

    const result = await db.query(
      'UPDATE band_profiles SET campus = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, band_name, campus',
      [campusValue, bandId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    const updatedBand = result.rows[0];
    const message = campusValue
      ? `Label kampus ${campusValue} berhasil diberikan kepada band ${updatedBand.band_name}`
      : `Label kampus untuk band ${updatedBand.band_name} berhasil dicabut`;

    return res.json({
      success: true,
      message,
      data: updatedBand
    });
  } catch (error) {
    console.error('Admin assign campus error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui label kampus band'
    });
  }
});

/**
 * GET /api/admin/bands
 * List all band profiles with full details for Super Admin management
 */
router.get('/bands', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT bp.*, u.email as user_email, u.is_active as user_is_active
      FROM band_profiles bp
      JOIN users u ON u.id = bp.user_id
      ORDER BY bp.id ASC
    `);

    const bands = result.rows.map(row => {
      const count = row.rating_count !== null && row.rating_count !== undefined ? Number(row.rating_count) : 0;
      const override = row.rating_override !== null && row.rating_override !== undefined ? Number(row.rating_override) : null;
      let avg = row.rating_average !== null && row.rating_average !== undefined ? Number(row.rating_average) : 2.5;
      let customTag = row.custom_tag ? String(row.custom_tag).trim() : null;

      if (count === 0 && override === null) {
        avg = 2.5;
        if (!customTag) {
          customTag = 'Band Baru Ditambahkan';
        }
      }

      const effectiveRating = override !== null ? override : avg;
      const rounded = Number(effectiveRating.toFixed(1));
      let tier = 'Baik';
      if (rounded >= 4.5) tier = 'Rekomendasi Favorit';
      else if (rounded >= 3.0) tier = 'Sangat Baik';

      return {
        id: row.id,
        userId: row.user_id,
        bandName: row.band_name,
        genre: row.genre,
        locationCity: row.location_city,
        locationRegion: row.location_region,
        campus: row.campus,
        bio: row.bio,
        budgetMin: row.budget_min,
        budgetMax: row.budget_max,
        profilePhotoUrl: row.profile_photo_url,
        coverPhotoUrl: row.cover_photo_url,
        phone: row.phone,
        instagramHandle: row.instagram_handle,
        facebookUrl: row.facebook_url,
        youtubeUrl: row.youtube_url,
        spotifyUrl: row.spotify_url,
        tiktokUrl: row.tiktok_url,
        riderChannelInputs: row.rider_channel_inputs,
        riderSoundSystem: row.rider_sound_system,
        riderInstruments: row.rider_instruments,
        riderHospitality: row.rider_hospitality,
        riderItems: row.rider_items,
        customTag: customTag,
        profileViews: row.profile_views || 0,
        ratingAverage: avg,
        ratingCount: count,
        ratingOverride: override,
        rating: rounded,
        ratingTier: tier,
        userEmail: row.user_email,
        isActive: Boolean(row.user_is_active),
        createdAt: row.created_at
      };
    });

    return res.json({
      success: true,
      data: bands
    });
  } catch (error) {
    console.error('Admin get bands error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data musisi admin'
    });
  }
});

/**
 * PUT /api/admin/bands/:id
 * Super Admin Full Authority: Update ANY aspect of a band profile:
 * rating override, pricing, campus, verification/active status, name, genre, city, bio
 */
router.put('/bands/:id', async (req, res) => {
  try {
    const bandId = parseInt(req.params.id, 10);
    if (!Number.isInteger(bandId) || bandId <= 0) {
      return res.status(400).json({
        success: false,
        message: 'ID band tidak valid'
      });
    }

    const {
      bandName,
      genre,
      locationCity,
      locationRegion,
      campus,
      bio,
      budgetMin,
      budgetMax,
      phone,
      ratingOverride,
      ratingAverage,
      ratingCount,
      customTag,
      profilePhotoUrl,
      coverPhotoUrl,
      instagramHandle,
      facebookUrl,
      youtubeUrl,
      spotifyUrl,
      tiktokUrl,
      riderChannelInputs,
      riderSoundSystem,
      riderInstruments,
      riderHospitality,
      riderItems,
      isActive
    } = req.body;

    const existingRes = await db.query('SELECT * FROM band_profiles WHERE id = $1', [bandId]);
    if (existingRes.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil band tidak ditemukan'
      });
    }

    const current = existingRes.rows[0];

    // Prepare fields to update
    const fields = [];
    const values = [];
    let idx = 1;

    if (bandName !== undefined) {
      fields.push(`band_name = $${idx++}`);
      values.push(String(bandName).trim());
    }
    if (genre !== undefined) {
      fields.push(`genre = $${idx++}`);
      values.push(String(genre).trim());
    }
    if (locationCity !== undefined) {
      fields.push(`location_city = $${idx++}`);
      values.push(String(locationCity).trim());
    }
    if (locationRegion !== undefined) {
      fields.push(`location_region = $${idx++}`);
      values.push(String(locationRegion).trim());
    }
    if (campus !== undefined) {
      fields.push(`campus = $${idx++}`);
      values.push(campus ? String(campus).trim().toUpperCase() : null);
    }
    if (bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(bio ? String(bio).trim() : null);
    }
    if (budgetMin !== undefined) {
      fields.push(`budget_min = $${idx++}`);
      values.push(budgetMin ? parseInt(String(budgetMin), 10) : 0);
    }
    if (budgetMax !== undefined) {
      fields.push(`budget_max = $${idx++}`);
      values.push(budgetMax ? parseInt(String(budgetMax), 10) : 0);
    }
    if (phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(phone ? String(phone).trim() : null);
    }
    if (ratingOverride !== undefined) {
      fields.push(`rating_override = $${idx++}`);
      const rNum = parseFloat(ratingOverride);
      values.push(!isNaN(rNum) && rNum >= 1.0 && rNum <= 5.0 ? Math.round(rNum * 10) / 10 : null);
    }
    if (ratingAverage !== undefined) {
      fields.push(`rating_average = $${idx++}`);
      const aNum = parseFloat(ratingAverage);
      values.push(!isNaN(aNum) && aNum >= 1.0 && aNum <= 5.0 ? Math.round(aNum * 10) / 10 : 2.5);
    }
    if (ratingCount !== undefined) {
      fields.push(`rating_count = $${idx++}`);
      values.push(Math.max(0, parseInt(String(ratingCount), 10) || 0));
    }
    if (customTag !== undefined) {
      fields.push(`custom_tag = $${idx++}`);
      values.push(customTag !== null && String(customTag).trim() ? String(customTag).trim() : null);
    }
    if (profilePhotoUrl !== undefined) {
      fields.push(`profile_photo_url = $${idx++}`);
      values.push(profilePhotoUrl ? String(profilePhotoUrl).trim() : null);
    }
    if (coverPhotoUrl !== undefined) {
      fields.push(`cover_photo_url = $${idx++}`);
      values.push(coverPhotoUrl ? String(coverPhotoUrl).trim() : null);
    }
    if (instagramHandle !== undefined) {
      fields.push(`instagram_handle = $${idx++}`);
      values.push(instagramHandle ? String(instagramHandle).trim() : null);
    }
    if (facebookUrl !== undefined) {
      fields.push(`facebook_url = $${idx++}`);
      values.push(facebookUrl ? String(facebookUrl).trim() : null);
    }
    if (youtubeUrl !== undefined) {
      fields.push(`youtube_url = $${idx++}`);
      values.push(youtubeUrl ? String(youtubeUrl).trim() : null);
    }
    if (spotifyUrl !== undefined) {
      fields.push(`spotify_url = $${idx++}`);
      values.push(spotifyUrl ? String(spotifyUrl).trim() : null);
    }
    if (tiktokUrl !== undefined) {
      fields.push(`tiktok_url = $${idx++}`);
      values.push(tiktokUrl ? String(tiktokUrl).trim() : null);
    }
    if (riderChannelInputs !== undefined) {
      fields.push(`rider_channel_inputs = $${idx++}`);
      values.push(riderChannelInputs ? String(riderChannelInputs).trim() : null);
    }
    if (riderSoundSystem !== undefined) {
      fields.push(`rider_sound_system = $${idx++}`);
      values.push(riderSoundSystem ? String(riderSoundSystem).trim() : null);
    }
    if (riderInstruments !== undefined) {
      fields.push(`rider_instruments = $${idx++}`);
      values.push(riderInstruments ? String(riderInstruments).trim() : null);
    }
    if (riderHospitality !== undefined) {
      fields.push(`rider_hospitality = $${idx++}`);
      values.push(riderHospitality ? String(riderHospitality).trim() : null);
    }
    if (riderItems !== undefined) {
      fields.push(`rider_items = $${idx++}`);
      values.push(typeof riderItems === 'string' ? riderItems : JSON.stringify(riderItems));
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(bandId);

    const updateQuery = `UPDATE band_profiles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const updateRes = await db.query(updateQuery, values);
    const updated = updateRes.rows[0];

    // If isActive boolean is passed, also update user active status
    if (typeof isActive === 'boolean' && current.user_id) {
      await db.query('UPDATE users SET is_active = $1 WHERE id = $2', [isActive, current.user_id]);
    }

    const avg = updated.rating_average !== null && updated.rating_average !== undefined ? Number(updated.rating_average) : 2.5;
    const override = updated.rating_override !== null && updated.rating_override !== undefined ? Number(updated.rating_override) : null;
    const effectiveRating = override !== null ? override : avg;
    const rounded = Number(effectiveRating.toFixed(1));
    let tier = 'Baik';
    if (rounded >= 4.5) tier = 'Rekomendasi Favorit';
    else if (rounded >= 3.0) tier = 'Sangat Baik';

    return res.json({
      success: true,
      message: `Profil band ${updated.band_name} berhasil diperbarui oleh Administrator`,
      data: {
        id: updated.id,
        userId: updated.user_id,
        bandName: updated.band_name,
        genre: updated.genre,
        locationCity: updated.location_city,
        locationRegion: updated.location_region,
        campus: updated.campus,
        bio: updated.bio,
        budgetMin: updated.budget_min,
        budgetMax: updated.budget_max,
        phone: updated.phone,
        customTag: updated.custom_tag || null,
        profilePhotoUrl: updated.profile_photo_url || null,
        coverPhotoUrl: updated.cover_photo_url || null,
        instagramHandle: updated.instagram_handle || null,
        facebookUrl: updated.facebook_url || null,
        youtubeUrl: updated.youtube_url || null,
        spotifyUrl: updated.spotify_url || null,
        tiktokUrl: updated.tiktok_url || null,
        riderChannelInputs: updated.rider_channel_inputs || null,
        riderSoundSystem: updated.rider_sound_system || null,
        riderInstruments: updated.rider_instruments || null,
        riderHospitality: updated.rider_hospitality || null,
        riderItems: updated.rider_items || null,
        ratingOverride: override,
        ratingAverage: avg,
        ratingCount: updated.rating_count,
        rating: rounded,
        ratingTier: tier,
        updatedAt: updated.updated_at
      }
    });
  } catch (error) {
    console.error('Admin update band error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui data band oleh administrator'
    });
  }
});

/**
 * GET /api/admin/settings
 * Super Admin: Get platform feature settings
 */
router.get('/settings', async (req, res) => {
  try {
    const result = await db.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    const showCampusAffiliation = result.rows.length > 0 ? result.rows[0].value === 'true' : false;
    return res.json({
      success: true,
      data: {
        showCampusAffiliation
      }
    });
  } catch (error) {
    console.error('Admin get settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil pengaturan platform'
    });
  }
});

/**
 * PUT /api/admin/settings
 * Super Admin: Update platform feature settings (e.g. toggle campus visibility)
 */
router.put('/settings', async (req, res) => {
  try {
    const { showCampusAffiliation } = req.body;
    const strVal = showCampusAffiliation ? 'true' : 'false';

    await db.query(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('show_campus_affiliation', $1, CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `, [strVal]);

    return res.json({
      success: true,
      message: `Pengaturan berhasil diperbarui: Afiliasi kampus sekarang ${showCampusAffiliation ? 'DITAMPILKAN KE PUBLIK' : 'DISEMBUNYIKAN DARI PUBLIK'}.`,
      data: {
        showCampusAffiliation: Boolean(showCampusAffiliation)
      }
    });
  } catch (error) {
    console.error('Admin update settings error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memperbarui pengaturan platform'
    });
  }
});

module.exports = router;
