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
});
