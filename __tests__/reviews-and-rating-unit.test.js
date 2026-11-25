const request = require('supertest');
const app = require('../app');
const { getMemoryDb } = require('../utils/memoryDb');
const BandProfile = require('../models/BandProfile');

describe('Band Custom Tag, Platform Settings, and Super Admin Authority Unit Tests', () => {
  let pool;

  beforeAll(async () => {
    const { pool: p, ready } = getMemoryDb();
    pool = p;
    await ready;
  });

  test('Removed review and schedule endpoints return 404', async () => {
    const reviewsRes = await request(app).get('/api/reviews/pending');
    expect(reviewsRes.status).toBe(404);

    const schedulesRes = await request(app).get('/api/bands/1/schedules');
    expect(schedulesRes.status).toBe(404);
  });

  test('Band profile loads without deprecated rating fields', async () => {
    const band = await BandProfile.findById(1);
    expect(band).not.toBeNull();
    expect(band.rating).toBeUndefined();
    expect(band.ratingTier).toBeUndefined();
    expect(band.ratingOverride).toBeUndefined();
    expect(band.budgetMin).toBeDefined();
    expect(band.budgetMax).toBeDefined();
  });

  test('Platform settings hide campus affiliation by default and allow Admin to toggle', async () => {
    const initialRes = await pool.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    expect(initialRes.rows.length).toBe(1);
    expect(initialRes.rows[0].value).toBe('false');

    await pool.query(`
      INSERT INTO platform_settings (key, value, updated_at)
      VALUES ('show_campus_affiliation', 'true', CURRENT_TIMESTAMP)
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP
    `);

    const updatedRes = await pool.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    expect(updatedRes.rows[0].value).toBe('true');

    await pool.query(`
      UPDATE platform_settings SET value = 'false' WHERE key = 'show_campus_affiliation'
    `);
    const finalRes = await pool.query("SELECT value FROM platform_settings WHERE key = 'show_campus_affiliation'");
    expect(finalRes.rows[0].value).toBe('false');
  });

  test('Newly created band accounts default to tag Band Baru Ditambahkan', async () => {
    const userRes = await pool.query(
      `INSERT INTO users (email, password_hash, account_type) VALUES ('newband@test.com', 'hash', 'band') RETURNING id`
    );
    const userId = userRes.rows[0].id;

    const newBand = await BandProfile.create({
      userId,
      bandName: 'Band Pendatang Baru',
      genre: 'Indie Rock',
      locationCity: 'Semarang'
    });

    expect(newBand).toBeDefined();
    expect(newBand.bandName).toBe('Band Pendatang Baru');
    expect(newBand.customTag).toBe('Band Baru Ditambahkan');
    expect(newBand.rating).toBeUndefined();
    expect(newBand.ratingTier).toBeUndefined();

    const fetched = await BandProfile.findById(newBand.id);
    expect(fetched.customTag).toBe('Band Baru Ditambahkan');
  });

  test('Super Admin has full authority to edit tag, budget, rider, and contact without rating fields', async () => {
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

    expect(band.customTag).toBe('Band Baru Ditambahkan');

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
    expect(updated.customTag).toBe('Terkurasi');
    expect(updated.budgetMin).toBe(3500000);
    expect(updated.budgetMax).toBe(7000000);
    expect(updated.phone).toBe('+6281234567890');
    expect(updated.instagramHandle).toBe('@superjazz');
    expect(updated.riderChannelInputs).toBe('16 Channel Audio Input');
    expect(updated.riderSoundSystem).toBe('5000 Watt FOH Line Array');

    const tagCleared = await BandProfile.update(band.id, {
      customTag: null
    });
    expect(tagCleared.customTag).toBeNull();
  });
});
