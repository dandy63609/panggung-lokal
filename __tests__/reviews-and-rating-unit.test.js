const { getMemoryDb } = require('../utils/memoryDb');
const BandProfile = require('../models/BandProfile');

describe('Band Rating, Reviews, and Super Admin Authority Unit Tests', () => {
  let pool;

  beforeAll(async () => {
    const { pool: p, ready } = getMemoryDb();
    pool = p;
    await ready;
  });

  test('BandProfile models calculate rating tier accurately', () => {
    expect(BandProfile.getRatingTier(5.0)).toBe('Rekomendasi Favorit');
    expect(BandProfile.getRatingTier(4.5)).toBe('Rekomendasi Favorit');
    expect(BandProfile.getRatingTier(4.4)).toBe('Sangat Baik');
    expect(BandProfile.getRatingTier(3.0)).toBe('Sangat Baik');
    expect(BandProfile.getRatingTier(2.9)).toBe('Baik');
    expect(BandProfile.getRatingTier(1.0)).toBe('Baik');
  });

  test('Band profile loads rating average, rating count, and rating tier', async () => {
    const band = await BandProfile.findById(1);
    expect(band).not.toBeNull();
    expect(band.rating).toBeGreaterThanOrEqual(4.5);
    expect(band.ratingTier).toBe('Rekomendasi Favorit');
    expect(band.budgetMin).toBeDefined();
    expect(band.budgetMax).toBeDefined();
  });

  test('Super Admin can override rating and update budget range', async () => {
    const updated = await BandProfile.update(1, {
      ratingOverride: 5.0,
      budgetMin: 4000000,
      budgetMax: 8000000
    });

    expect(updated).not.toBeNull();
    expect(updated.ratingOverride).toBe(5.0);
    expect(updated.rating).toBe(5.0);
    expect(updated.ratingTier).toBe('Rekomendasi Favorit');
    expect(updated.budgetMin).toBe(4000000);
    expect(updated.budgetMax).toBe(8000000);

    // Test low override switches tier to 'Baik'
    const lowOverride = await BandProfile.update(1, {
      ratingOverride: 2.0
    });
    expect(lowOverride.rating).toBe(2.0);
    expect(lowOverride.ratingTier).toBe('Baik');

    // Reset override back to null
    const reset = await BandProfile.update(1, {
      ratingOverride: null
    });
    expect(reset.ratingOverride).toBeNull();
    expect(reset.rating).toBe(reset.ratingAverage);
  });

  test('Reviews table records rating and pending reviews can be identified', async () => {
    // Insert past booking connection
    await pool.query(
      `INSERT INTO connections (organizer_user_id, band_profile_id, connection_type, event_date, event_name, status, is_reviewed)
       VALUES (9, 1, 'direct_booking', '2026-11-18', 'Pentas Musik Kampus', 'confirmed', FALSE)`
    );

    // Insert review
    const res = await pool.query(
      `INSERT INTO reviews (band_profile_id, organizer_user_id, rating, review_text, event_date)
       VALUES (1, 9, 4.9, 'Showcase memukau!', '2026-11-18') RETURNING *`
    );
    expect(res.rows.length).toBe(1);
    expect(parseFloat(res.rows[0].rating)).toBe(4.9);

    // Verify unreviewed past connection detection
    const pending = await pool.query(
      `SELECT c.*, bp.band_name 
       FROM connections c
       JOIN band_profiles bp ON bp.id = c.band_profile_id
       WHERE c.event_date IS NOT NULL 
         AND c.is_reviewed = FALSE`
    );
    expect(pending.rows.length).toBeGreaterThan(0);
    expect(pending.rows[0].band_name).toBeDefined();
  });

  test('Platform settings hide campus affiliation by default and allow Admin to toggle', async () => {
    // Check initial setting is 'false' (hidden by default)
    const initialRes = await pool.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    expect(initialRes.rows.length).toBe(1);
    expect(initialRes.rows[0].value).toBe('false');

    // Admin updates setting to 'true' (tampilkan ke publik)
    await pool.query(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('show_campus_affiliation', 'true', CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `);

    const updatedRes = await pool.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    expect(updatedRes.rows[0].value).toBe('true');

    // Reset back to 'false' as requested by user
    await pool.query(`
      UPDATE platform_settings SET value = 'false' WHERE key = 'show_campus_affiliation'
    `);
    const finalRes = await pool.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    expect(finalRes.rows[0].value).toBe('false');
  });

  test('Newly created band accounts default to tier Baik and tag Band Baru Ditambahkan', async () => {
    // Create new band user
    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, account_type) VALUES ('newband@test.com', 'hash', 'band') RETURNING id`
    );
    const userId = userRes.rows[0].id;

    // Create band profile for this new user
    const newBand = await BandProfile.create({
      userId,
      bandName: 'Band Pendatang Baru',
      genre: 'Indie Rock',
      locationCity: 'Semarang'
    });

    expect(newBand).toBeDefined();
    expect(newBand.bandName).toBe('Band Pendatang Baru');
    // Rating must be Baik, NOT Rekomendasi Favorit
    expect(newBand.ratingTier).toBe('Baik');
    expect(newBand.rating).toBeLessThan(3.0);
    expect(newBand.rating).toBeGreaterThanOrEqual(1.0);
    expect(newBand.ratingAverage).toBe(2.5);
    // Custom Tag must indicate newly added band
    expect(newBand.customTag).toBe('Band Baru Ditambahkan');

    // Verify when loaded by ID (e.g. when EO views profile)
    const fetched = await BandProfile.findById(newBand.id);
    expect(fetched.ratingTier).toBe('Baik');
    expect(fetched.customTag).toBe('Band Baru Ditambahkan');
  });

  test('Super Admin has full authority to edit and change everything including rating, tag, rider, and contact', async () => {
    // Create another band for testing admin edits
    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, account_type) VALUES ('adminedit@test.com', 'hash', 'band') RETURNING id`
    );
    const userId = userRes.rows[0].id;
    const band = await BandProfile.create({
      userId,
      bandName: 'Band Modifikasi Admin',
      genre: 'Jazz',
      locationCity: 'Yogyakarta'
    });

    expect(band.ratingTier).toBe('Baik');
    expect(band.customTag).toBe('Band Baru Ditambahkan');

    // Admin updates all fields: overrides rating to 5.0 (Rekomendasi Favorit), updates tag to 'Terkurasi', updates bio, phone, social, and rider
    const updated = await BandProfile.update(band.id, {
      bandName: 'Band Modifikasi Admin Super',
      genre: 'Modern Fusion Jazz',
      locationCity: 'Surakarta',
      locationRegion: 'Jawa Tengah',
      campus: 'UGM',
      bio: 'Profil yang telah diperbarui oleh Administrator',
      budgetMin: 3500000,
      budgetMax: 7000000,
      phone: '+6281234567890',
      ratingOverride: 5.0,
      customTag: 'Terkurasi',
      instagramHandle: '@superjazz',
      spotifyUrl: 'https://spotify.com/artist/jazz',
      youtubeUrl: 'https://youtube.com/@jazz',
      tiktokUrl: 'https://tiktok.com/@jazz',
      riderChannelInputs: '16 Channel Audio Input',
      riderSoundSystem: '5000 Watt FOH Line Array',
      riderInstruments: 'Drum Kit Pearl & Bass Amp Gallien-Krueger',
      riderHospitality: 'Air mineral botol & makanan berat kru'
    });

    expect(updated.bandName).toBe('Band Modifikasi Admin Super');
    expect(updated.genre).toBe('Modern Fusion Jazz');
    expect(updated.locationCity).toBe('Surakarta');
    expect(updated.campus).toBe('UGM');
    expect(updated.ratingOverride).toBe(5.0);
    expect(updated.rating).toBe(5.0);
    expect(updated.ratingTier).toBe('Rekomendasi Favorit');
    expect(updated.customTag).toBe('Terkurasi');
    expect(updated.phone).toBe('+6281234567890');
    expect(updated.instagramHandle).toBe('@superjazz');
    expect(updated.riderChannelInputs).toBe('16 Channel Audio Input');
    expect(updated.riderSoundSystem).toBe('5000 Watt FOH Line Array');

    // Admin can also clear tag entirely
    const tagCleared = await BandProfile.update(band.id, {
      customTag: null
    });
    expect(tagCleared.customTag).toBeNull();
  });
});
