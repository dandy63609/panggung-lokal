const express = require('express');
const request = require('supertest');
const app = require('../app');
const db = require('../utils/db');
const { buildPgPoolConfig, shouldAllowMemoryFallback } = db;
const { hashPassword } = require('../utils/password');
const User = require('../models/User');
const BandProfile = require('../models/BandProfile');
const { generateToken } = require('../middleware/auth');
const { authLimiter, apiLimiter, uploadLimiter } = require('../middleware/rateLimiter');

describe('QA Band Audit Regression Fixes', () => {
  const createdUserIds = [];
  const createdProfileIds = [];

  async function deleteProfileAndChildren(profileId) {
    await db.query('DELETE FROM connections WHERE band_profile_id = $1', [profileId]).catch(() => {});
    await db.query('DELETE FROM media_files WHERE band_profile_id = $1', [profileId]).catch(() => {});
    await db.query('DELETE FROM band_posts WHERE band_profile_id = $1', [profileId]).catch(() => {});
    await db.query('DELETE FROM band_profiles WHERE id = $1', [profileId]);
  }

  afterAll(async () => {
    for (const profileId of createdProfileIds) {
      await deleteProfileAndChildren(profileId).catch(() => {});
    }
    for (const userId of createdUserIds) {
      await db.query('DELETE FROM connections WHERE organizer_user_id = $1', [userId]).catch(() => {});
      const profiles = await db.query('SELECT id FROM band_profiles WHERE user_id = $1', [userId]);
      for (const row of profiles.rows) {
        await deleteProfileAndChildren(row.id).catch(() => {});
      }
      await db.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
  });

  describe('1. pg-mem TRIM() registration & removed /api/reviews endpoint', () => {
    it('registers TRIM() cleanly in pg-mem', async () => {
      const res = await db.query("SELECT TRIM('  reffband  ') AS trimmed");
      expect(res.rows[0].trimmed).toBe('reffband');
    });

    it('returns 404 for removed /api/reviews/pending endpoint', async () => {
      const res = await request(app).get('/api/reviews/pending');
      expect(res.status).toBe(404);
    });
  });

  describe('2. Orphaned band account self-healing', () => {
    let orphanUser;
    let orphanEmail;
    let orphanToken;

    beforeAll(async () => {
      const passwordHash = await hashPassword('Password123!');
      orphanEmail = `qa-orphan-band-${Date.now()}@example.com`;
      orphanUser = await User.create(orphanEmail, passwordHash, 'band');
      createdUserIds.push(orphanUser.id);
      orphanToken = generateToken(orphanUser);
    });

    async function dropOrphanProfileIfExists() {
      const existing = await BandProfile.findByUserId(orphanUser.id);
      if (existing) {
        await deleteProfileAndChildren(existing.id);
      }
    }

    it('self-heals missing band profile during POST /api/auth/login', async () => {
      await dropOrphanProfileIfExists();
      expect(await BandProfile.findByUserId(orphanUser.id)).toBeNull();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: orphanEmail, password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bandProfile).toBeTruthy();
      expect(res.body.bandProfile.userId).toBe(orphanUser.id);
    });

    it('self-heals missing band profile during GET /api/auth/me', async () => {
      await dropOrphanProfileIfExists();
      expect(await BandProfile.findByUserId(orphanUser.id)).toBeNull();

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${orphanToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bandProfile).toBeTruthy();
      expect(res.body.bandProfile.userId).toBe(orphanUser.id);
    });

    it('self-heals missing band profile during POST /api/bands/media', async () => {
      await dropOrphanProfileIfExists();

      const res = await request(app)
        .post('/api/bands/media')
        .set('Authorization', `Bearer ${orphanToken}`)
        .send({
          fileType: 'audio',
          fileUrl: 'https://example.com/audio/demo-single.mp3',
          title: 'Demo Single Orphan',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(await BandProfile.findByUserId(orphanUser.id)).toBeTruthy();
    });

    it('self-heals missing band profile during POST /api/posts and GET /api/posts/my-performance', async () => {
      await dropOrphanProfileIfExists();

      const postRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${orphanToken}`)
        .send({
          mediaType: 'photo',
          mediaUrl: 'https://example.com/images/stage-photo.jpg',
          caption: 'Stage test',
        });

      expect(postRes.status).toBe(201);
      expect(postRes.body.success).toBe(true);

      await dropOrphanProfileIfExists();

      const perfRes = await request(app)
        .get('/api/posts/my-performance')
        .set('Authorization', `Bearer ${orphanToken}`);

      expect(perfRes.status).toBe(200);
      expect(perfRes.body.success).toBe(true);
      expect(perfRes.body.data).toBeTruthy();
    });
  });

  describe('3. PUT /api/bands/profile validation', () => {
    let bandUser;
    let bandToken;

    beforeAll(async () => {
      const passwordHash = await hashPassword('Password123!');
      bandUser = await User.create(`qa-profile-val-${Date.now()}@example.com`, passwordHash, 'band');
      createdUserIds.push(bandUser.id);
      bandToken = generateToken(bandUser);

      const profile = await BandProfile.create({
        userId: bandUser.id,
        bandName: 'Valid Awal Band',
        genre: 'Pop & Retro',
        locationCity: 'Kota Jogja',
      });
      createdProfileIds.push(profile.id);
    });

    it('rejects whitespace-only bandName', async () => {
      const res = await request(app)
        .put('/api/bands/profile')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({ bandName: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Nama band wajib diisi');
    });

    it('rejects malformed non-empty phone numbers', async () => {
      const res = await request(app)
        .put('/api/bands/profile')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({ phone: 'abc-invalid' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Format nomor WhatsApp/telepon tidak valid');
    });

    it('accepts valid bandName and Indonesian phone number', async () => {
      const res = await request(app)
        .put('/api/bands/profile')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({ bandName: 'Band Teruji', phone: '081234567890' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bandName).toBe('Band Teruji');
      expect(res.body.data.phone).toBe('081234567890');
    });
  });

  describe('4. GET /api/bands/search genre category keyword expansion', () => {
    let searcherToken;
    let grungeBand;
    let dangdutBand;

    beforeAll(async () => {
      const passwordHash = await hashPassword('Password123!');
      const ts = Date.now();
      const searcher = await User.create(`qa-searcher-${ts}@example.com`, passwordHash, 'general');
      createdUserIds.push(searcher.id);
      searcherToken = generateToken(searcher);

      const u1 = await User.create(`qa-grunge-${ts}@example.com`, passwordHash, 'band');
      const u2 = await User.create(`qa-koplo-${ts}@example.com`, passwordHash, 'band');
      createdUserIds.push(u1.id, u2.id);

      grungeBand = await BandProfile.create({
        userId: u1.id,
        bandName: `Grunge Unit ${ts}`,
        genre: 'Alternative / Grunge',
        locationCity: 'Kota Semarang',
      });
      dangdutBand = await BandProfile.create({
        userId: u2.id,
        bandName: `Koplo Project ${ts}`,
        genre: 'Dangdut Koplo',
        locationCity: 'Kota Jogja',
      });
      createdProfileIds.push(grungeBand.id, dangdutBand.id);
    });

    it('matches Alternative / Grunge when searching genre=rock or genre=ROCK & GRUNGE', async () => {
      const rockRes = await request(app)
        .get('/api/bands/search?genre=rock&limit=50')
        .set('Authorization', `Bearer ${searcherToken}`);

      expect(rockRes.status).toBe(200);
      expect(rockRes.body.data.some((b) => b.id === grungeBand.id)).toBe(true);

      const categoryRes = await request(app)
        .get(`/api/bands/search?genre=${encodeURIComponent('ROCK & GRUNGE')}&limit=50`)
        .set('Authorization', `Bearer ${searcherToken}`);

      expect(categoryRes.status).toBe(200);
      expect(categoryRes.body.data.some((b) => b.id === grungeBand.id)).toBe(true);
    });

    it('matches Dangdut Koplo when searching genre=DANGDUT FUSION', async () => {
      const res = await request(app)
        .get(`/api/bands/search?genre=${encodeURIComponent('DANGDUT FUSION')}&limit=50`)
        .set('Authorization', `Bearer ${searcherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.some((b) => b.id === dangdutBand.id)).toBe(true);
    });

    it('returns empty array for unknown custom genre strings', async () => {
      const res = await request(app)
        .get('/api/bands/search?genre=GenreCustomUnik999')
        .set('Authorization', `Bearer ${searcherToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('5. Rate limiter top-level message field', () => {
    it('exports limiters cleanly and exposes top-level message alongside error.message on 429', async () => {
      expect(typeof apiLimiter).toBe('function');
      expect(typeof uploadLimiter).toBe('function');

      const isolatedApp = express();
      isolatedApp.set('trust proxy', 1);
      isolatedApp.post('/test-auth', authLimiter, (req, res) => {
        res.status(401).json({ success: false, message: 'Unauthorized' });
      });

      const syntheticIp = '198.51.100.77';
      for (let i = 0; i < 5; i += 1) {
        const res = await request(isolatedApp)
          .post('/test-auth')
          .set('X-Forwarded-For', syntheticIp);
        expect(res.status).toBe(401);
      }

      const limitedRes = await request(isolatedApp)
        .post('/test-auth')
        .set('X-Forwarded-For', syntheticIp);

      expect(limitedRes.status).toBe(429);
      expect(limitedRes.body.success).toBe(false);
      expect(limitedRes.body.message).toBe('Terlalu banyak percobaan login, coba lagi nanti');
      expect(limitedRes.body.error.message).toBe(limitedRes.body.message);
    });
  });

  describe('6. utils/db.js buildPgPoolConfig & shouldAllowMemoryFallback', () => {
    it('configures remote SSL and serverless pool limit when VERCEL and remote DATABASE_URL are set', () => {
      const cfg = buildPgPoolConfig({
        DATABASE_URL: 'postgresql://postgres:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
        VERCEL: '1',
      });

      expect(cfg.connectionString).toContain('pooler.supabase.com:6543');
      expect(cfg.ssl).toEqual({ rejectUnauthorized: false });
      expect(cfg.max).toBe(3);
      expect(cfg.connectionTimeoutMillis).toBe(5000);
      expect(
        shouldAllowMemoryFallback({
          VERCEL: '1',
          DATABASE_URL: 'postgresql://postgres:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres',
        })
      ).toBe(false);
    });

    it('disables SSL for localhost DATABASE_URL and uses local defaults when DATABASE_URL is empty', () => {
      const localUrlCfg = buildPgPoolConfig({
        DATABASE_URL: 'postgresql://localhost:5432/panggung_lokal',
      });

      expect(localUrlCfg.ssl).toBe(false);
      expect(localUrlCfg.max).toBe(10);
      expect(localUrlCfg.connectionTimeoutMillis).toBe(2000);

      const fallbackCfg = buildPgPoolConfig({
        DB_HOST: 'db.local',
        DB_PORT: '5433',
        DB_NAME: 'testdb',
        DB_USER: 'tester',
        DB_PASSWORD: 'pw',
      });

      expect(fallbackCfg).toEqual({
        host: 'db.local',
        port: 5433,
        database: 'testdb',
        user: 'tester',
        password: 'pw',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 1000,
      });

      expect(shouldAllowMemoryFallback({ VERCEL: '1', DATABASE_URL: '' })).toBe(true);
      expect(shouldAllowMemoryFallback({})).toBe(true);
    });
  });

  describe('7. Band dashboard recentConnections fields without event_date or rating fields', () => {
    it('returns real organizerEmail, eventName, and createdAt in GET /api/dashboard/band', async () => {
      const passwordHash = await hashPassword('Password123!');
      const ts = Date.now();
      const bUser = await User.create(`qa-conn-band-${ts}@example.com`, passwordHash, 'band');
      const eUser = await User.create(`qa-conn-eo-${ts}@example.com`, passwordHash, 'general');
      createdUserIds.push(bUser.id, eUser.id);

      const profile = await BandProfile.create({
        userId: bUser.id,
        bandName: `QA Inquiry Band ${ts}`,
        genre: 'Rock & Grunge',
        locationCity: 'Kota Semarang',
      });
      createdProfileIds.push(profile.id);
      expect(profile.customTag).toBeUndefined();

      await db.query(
        `INSERT INTO connections (organizer_user_id, band_profile_id, connection_type, event_name, status, notes)
         VALUES ($1, $2, 'whatsapp_direct', 'QA Direct Inquiry Event', 'inquiry', 'Soundcheck jam 16:00')`,
        [eUser.id, profile.id]
      );

      const bToken = generateToken(bUser);
      const dashRes = await request(app)
        .get('/api/dashboard/band')
        .set('Authorization', `Bearer ${bToken}`);

      expect(dashRes.status).toBe(200);
      expect(dashRes.body.success).toBe(true);
      expect(dashRes.body.data.profile.rating).toBeUndefined();
      expect(dashRes.body.data.schedules).toBeUndefined();
      expect(dashRes.body.data.recentConnections).toHaveLength(1);
      const conn = dashRes.body.data.recentConnections[0];
      expect(conn.organizerEmail).toBe(eUser.email);
      expect(conn.eventName).toBe('QA Direct Inquiry Event');
      expect(conn.createdAt).toBeTruthy();
      expect(conn.status).toBe('inquiry');
    });
  });
});
