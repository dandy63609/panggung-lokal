process.env.DB_CLIENT = 'memory';

const request = require('supertest');
const app = require('../app');
const db = require('../utils/db');
const { generateToken } = require('../middleware/auth');

describe('Admin User Deletion (Band & EO) & New Band Profile Routing API', () => {
  const createdUserIds = [];

  const adminToken = generateToken({
    id: 'mock-admin',
    email: 'admin@admin.com',
    accountType: 'admin',
    mockAdmin: true,
  });

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await db.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
  });

  it('registers a new band and returns its own profile (never Kelana Ombak) on search & detail routes', async () => {
    const suffix = Date.now();
    const bandRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `bandbaru.${suffix}@test.id`,
        password: 'Password123!',
        accountType: 'band',
        bandName: `Nada Harmoni ${suffix}`,
        genre: 'Math Rock',
        locationCity: 'Semarang',
      })
      .expect(201);

    createdUserIds.push(bandRes.body.user.id);
    const newBandToken = bandRes.body.token;
    const newProfileId = bandRes.body.bandProfile.id;
    expect(newProfileId).toBeGreaterThan(8);

    // Update phone on new band profile
    await request(app)
      .put('/api/bands/profile')
      .set('Authorization', `Bearer ${newBandToken}`)
      .send({ phone: '+6281999888777', budgetMin: 4200000 })
      .expect(200);

    // Register an EO account to inspect catalog and detail profile
    const eoRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `eobaru.${suffix}@test.id`,
        password: 'Password123!',
        accountType: 'general',
      })
      .expect(201);

    createdUserIds.push(eoRes.body.user.id);
    const eoToken = eoRes.body.token;

    // Newly created band appears in search catalog for EO
    const searchRes = await request(app)
      .get('/api/bands/search?limit=50')
      .set('Authorization', `Bearer ${eoToken}`)
      .expect(200);

    expect(searchRes.body.isSneakPeek).toBe(false);
    const foundInCatalog = searchRes.body.data.find((b) => b.id === newProfileId);
    expect(foundInCatalog).toBeDefined();
    expect(foundInCatalog.bandName).toBe(`Nada Harmoni ${suffix}`);

    // Fetching /api/bands/profile/:newId as EO returns that exact band with unmasked phone
    const detailRes = await request(app)
      .get(`/api/bands/profile/${newProfileId}`)
      .set('Authorization', `Bearer ${eoToken}`)
      .expect(200);

    expect(detailRes.body.data.id).toBe(newProfileId);
    expect(detailRes.body.data.bandName).toBe(`Nada Harmoni ${suffix}`);
    expect(detailRes.body.data.genre).toBe('Math Rock');
    expect(detailRes.body.data.locationCity).toBe('Semarang');
    expect(detailRes.body.data.phone).toBe('+6281999888777');
    expect(detailRes.body.data.bandName).not.toBe('Kelana Ombak');
  });

  it('allows admin to permanently delete both Band and EO accounts with cascade cleanup', async () => {
    const suffix = Date.now() + 1;

    // 1. Register a fresh Band user with a post
    const bandRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `delband.${suffix}@test.id`,
        password: 'Password123!',
        accountType: 'band',
        bandName: `Band Dihapus ${suffix}`,
        genre: 'Pop Punk',
        locationCity: 'Solo',
      })
      .expect(201);

    const bandUserId = bandRes.body.user.id;
    const bandToken = bandRes.body.token;
    const bandProfileId = bandRes.body.bandProfile.id;
    createdUserIds.push(bandUserId);

    await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        mediaType: 'photo',
        mediaUrl: '/uploads/sample.jpg',
        caption: 'Postingan sebelum dihapus admin',
        slides: [{ type: 'photo', url: '/uploads/sample.jpg' }],
      })
      .expect(201);

    // 2. Register a fresh EO (general) user with a job broadcast
    const eoRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `deleo.${suffix}@test.id`,
        password: 'Password123!',
        accountType: 'general',
      })
      .expect(201);

    const eoUserId = eoRes.body.user.id;
    const eoToken = eoRes.body.token;
    createdUserIds.push(eoUserId);

    const broadcastRes = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', `Bearer ${eoToken}`)
      .send({
        organizerName: 'EO Dihapus Admin',
        organizerEmail: eoRes.body.user.email,
        organizerPhone: '08123450000',
        eventDate: '2026-12-25',
        performStartTime: '20:00',
        performEndTime: '21:30',
        venueLocation: 'Surakarta',
        eventDetails: 'Event untuk uji hapus akun EO',
      })
      .expect(201);

    const broadcastId = broadcastRes.body.data.id;

    // Non-admin cannot delete accounts
    await request(app)
      .delete(`/api/admin/users/${eoUserId}`)
      .set('Authorization', `Bearer ${bandToken}`)
      .expect(403);

    await request(app)
      .delete(`/api/admin/users/${bandUserId}`)
      .set('Authorization', `Bearer ${eoToken}`)
      .expect(403);

    // Metrics endpoint includes newly registered Band & EO users (and band_name)
    const metricsBefore = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const metricsBandUser = metricsBefore.body.data.recentUsers.find((u) => u.id === bandUserId);
    const metricsEoUser = metricsBefore.body.data.recentUsers.find((u) => u.id === eoUserId);
    expect(metricsBandUser).toBeDefined();
    expect(metricsBandUser.band_name).toBe(`Band Dihapus ${suffix}`);
    expect(metricsBandUser.band_profile_id).toBe(bandProfileId);
    expect(metricsEoUser).toBeDefined();

    // Admin deletes the Band user
    const delBandRes = await request(app)
      .delete(`/api/admin/users/${bandUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(delBandRes.body.success).toBe(true);
    expect(delBandRes.body.data.id).toBe(bandUserId);

    // Band profile now returns 404, token is rejected with 401, and search excludes it
    await request(app).get(`/api/bands/profile/${bandProfileId}`).expect(404);
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${bandToken}`)
      .expect(401);

    // Admin deletes the EO user
    const delEoRes = await request(app)
      .delete(`/api/admin/users/${eoUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(delEoRes.body.success).toBe(true);
    expect(delEoRes.body.data.id).toBe(eoUserId);

    // EO token and owned broadcast are removed
    await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${eoToken}`)
      .expect(401);

    const broadcastCheck = await db.query('SELECT id FROM job_broadcasts WHERE id = $1', [broadcastId]);
    expect(broadcastCheck.rows).toHaveLength(0);

    // Subsequent delete returns 404 and invalid ID returns 400
    await request(app)
      .delete(`/api/admin/users/${eoUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(404);

    await request(app)
      .delete('/api/admin/users/not-an-id')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);
  });

  it('prevents deleting another admin user account', async () => {
    const adminUserInsert = await db.query(
      "INSERT INTO users (email, password_hash, account_type, is_active) VALUES ($1, $2, 'admin', true) RETURNING id",
      [`superadmin.${Date.now()}@test.id`, 'hashed-secret']
    );
    const tempAdminId = adminUserInsert.rows[0].id;
    createdUserIds.push(tempAdminId);

    const res = await request(app)
      .delete(`/api/admin/users/${tempAdminId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });
});
