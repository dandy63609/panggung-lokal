const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const { getJwtSecret, generateToken } = require('../middleware/auth');

describe('Phase 3 Production Security & Boundary Hardening', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalJwtSecret;
    }
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  });

  describe('JWT & Demo Admin Production Guards', () => {
    it('throws when NODE_ENV is production and JWT_SECRET is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      expect(() => getJwtSecret()).toThrow(
        'JWT_SECRET environment variable must be configured in production'
      );
    });

    it('blocks hardcoded admin@admin.com / admin login in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'prod-test-secret-32-chars-minimum-value';

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@admin.com', password: 'admin' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('rejects weak default ADMIN_PASSWORD="admin" even if set in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'prod-test-secret-32-chars-minimum-value';
      process.env.ADMIN_PASSWORD = 'admin';

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@admin.com', password: 'admin' });

      expect(loginRes.status).toBe(401);
      expect(loginRes.body.success).toBe(false);

      const mockAdminToken = generateToken({
        id: 'mock-admin',
        email: 'admin@admin.com',
        accountType: 'admin',
        mockAdmin: true,
      });

      const adminRes = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect(adminRes.status).toBe(401);
      delete process.env.ADMIN_PASSWORD;
    });

    it('rejects mockAdmin token bypass in verifyToken when NODE_ENV is production', async () => {
      process.env.JWT_SECRET = 'prod-test-secret-32-chars-minimum-value';
      const mockAdminToken = generateToken({
        id: 'mock-admin',
        email: 'admin@admin.com',
        accountType: 'admin',
        mockAdmin: true,
      });

      process.env.NODE_ENV = 'production';
      const res = await request(app)
        .get('/api/admin/reports')
        .set('Authorization', `Bearer ${mockAdminToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('User.isOrganizer Role Parity', () => {
    it('recognizes both organizer and general accountType as organizer', () => {
      const legacyEo = new User({ id: 1, email: 'eo1@test.id', account_type: 'organizer' });
      const generalEo = new User({ id: 2, email: 'eo2@test.id', account_type: 'general' });
      const bandUser = new User({ id: 3, email: 'band@test.id', account_type: 'band' });

      expect(legacyEo.isOrganizer()).toBe(true);
      expect(generalEo.isOrganizer()).toBe(true);
      expect(bandUser.isOrganizer()).toBe(false);
    });
  });

  describe('Upload Multer Error Handling (/photo & /media)', () => {
    it('returns 400 JSON instead of 500 when uploading unsupported mimetype to /api/upload/photo', async () => {
      const bandToken = generateToken({
        id: 1,
        email: 'kelana@panggunglokal.id',
        accountType: 'band',
      });

      const res = await request(app)
        .post('/api/upload/photo')
        .set('Authorization', `Bearer ${bandToken}`)
        .attach('photo', Buffer.from('not-an-image'), {
          filename: 'malicious.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/Tipe file tidak didukung/i);
    });
  });

  describe('Route Parameter & Input Validation Guards', () => {
    const bandToken = generateToken({
      id: 1,
      email: 'kelana@panggunglokal.id',
      accountType: 'band',
    });

    const adminToken = generateToken({
      id: 'mock-admin',
      email: 'admin@admin.com',
      accountType: 'admin',
      mockAdmin: true,
    });

    it('rejects non-numeric IDs on post view, wa-click, and delete routes with 400', async () => {
      const viewRes = await request(app).post('/api/posts/not-a-number/view');
      expect(viewRes.status).toBe(400);

      const waRes = await request(app).post('/api/posts/-5/wa-click');
      expect(waRes.status).toBe(400);

      const delRes = await request(app)
        .delete('/api/posts/abc')
        .set('Authorization', `Bearer ${bandToken}`);
      expect(delRes.status).toBe(400);
    });

    it('rejects unsafe javascript: URLs in post slides and band media', async () => {
      const postRes = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          mediaType: 'photo',
          mediaUrl: '/uploads/valid.png',
          slides: [{ type: 'photo', url: 'javascript:alert(1)' }],
        });
      expect(postRes.status).toBe(400);

      const mediaRes = await request(app)
        .post('/api/bands/media')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          fileType: 'audio',
          fileUrl: 'javascript:alert(1)',
        });
      expect(mediaRes.status).toBe(400);
    });

    it('validates report entity IDs and admin report status values', async () => {
      const badReport = await request(app).post('/api/reports').send({
        reportedEntityType: 'band',
        reportedEntityId: 'invalid-id',
        reason: 'Spam',
      });
      expect(badReport.status).toBe(400);

      const badAdminStatus = await request(app)
        .put('/api/admin/reports/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'arbitrary_invalid_status' });
      expect(badAdminStatus.status).toBe(400);

      const badSuspendId = await request(app)
        .put('/api/admin/users/not-an-id/suspend')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(badSuspendId.status).toBe(400);
    });
  });
});
