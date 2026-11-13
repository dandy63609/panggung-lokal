/**
 * Security, Boundary Validation & Regression Tests
 * Verifies fixes from the SOLID Engineering Standard audit.
 */

const request = require('supertest');
const app = require('../../app');
const AuthService = require('../../services/authService');
const { generateToken } = require('../../middleware/auth');

describe('SOLID Security & Boundary Audit Verification', () => {
  let bandToken;
  let organizerToken;
  let adminToken;

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-123';
    bandToken = generateToken({ id: 1, email: 'kelana@panggunglokal.id', accountType: 'band' });
    organizerToken = generateToken({ id: 9, email: 'kafe.selatan@gmail.com', accountType: 'general' });
    adminToken = generateToken({ id: 'mock-admin', email: 'ops-admin@example.com', accountType: 'admin', mockAdmin: true });
  });

  describe('AuthService.checkAdminCredentials', () => {
    const savedAdminEmail = process.env.ADMIN_EMAIL;
    const savedAdminPass = process.env.ADMIN_PASSWORD;

    afterEach(() => {
      if (savedAdminEmail === undefined) delete process.env.ADMIN_EMAIL;
      else process.env.ADMIN_EMAIL = savedAdminEmail;

      if (savedAdminPass === undefined) delete process.env.ADMIN_PASSWORD;
      else process.env.ADMIN_PASSWORD = savedAdminPass;
    });

    it('rejects hardcoded default credentials when env vars are unset', () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;

      expect(AuthService.checkAdminCredentials('admin@admin.com', 'admin').isAdmin).toBe(false);
      expect(AuthService.checkAdminCredentials('admin@panggunglokal.id', 'Password123!').isAdmin).toBe(false);
    });

    it('rejects hardcoded bypasses even when env vars are configured', () => {
      process.env.ADMIN_EMAIL = 'ops@reffband.studio';
      process.env.ADMIN_PASSWORD = 'unique-configured-pass-value';

      expect(AuthService.checkAdminCredentials('admin@admin.com', 'admin').isAdmin).toBe(false);
      expect(AuthService.checkAdminCredentials('ops@reffband.studio', 'admin').isAdmin).toBe(false);
      expect(AuthService.checkAdminCredentials('ops@reffband.studio', 'Password123!').isAdmin).toBe(false);
    });

    it('accepts only exact configured env credentials', () => {
      process.env.ADMIN_EMAIL = 'ops@reffband.studio';
      process.env.ADMIN_PASSWORD = 'unique-configured-pass-value';

      const result = AuthService.checkAdminCredentials('OPS@reffband.studio ', 'unique-configured-pass-value');
      expect(result.isAdmin).toBe(true);
      expect(result.adminUser.accountType).toBe('admin');
      expect(result.adminUser.id).toBe('mock-admin');
    });
  });

  describe('Password Reset & /me Boundary Safety', () => {
    it('does not leak resetToken in POST /api/auth/forgot-password response', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'kelana@panggunglokal.id' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.resetToken).toBeUndefined();
    });

    it('returns admin metadata safely for GET /api/auth/me with mock-admin token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accountType).toBe('admin');
      expect(res.body.data.id).toBe('mock-admin');
    });
  });

  describe('Route Parameter & Media URL Boundary Validation', () => {
    it('returns 400 for non-integer post IDs on view, wa-click, and delete', async () => {
      const [viewRes, waRes, delRes] = await Promise.all([
        request(app).post('/api/posts/invalid-id/view'),
        request(app).post('/api/posts/12abc/wa-click'),
        request(app).delete('/api/posts/not-a-number').set('Authorization', `Bearer ${bandToken}`)
      ]);

      expect(viewRes.status).toBe(400);
      expect(waRes.status).toBe(400);
      expect(delRes.status).toBe(400);
    });

    it('rejects unsafe thumbnailUrl and nested slide URLs on POST /api/posts', async () => {
      const badThumb = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
          thumbnailUrl: 'javascript:alert(1)',
          caption: 'Bad thumb test'
        });

      expect(badThumb.status).toBe(400);

      const badSlide = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          slides: [
            { type: 'photo', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4' },
            { type: 'photo', url: '//evil.example.com/xss.png' }
          ],
          caption: 'Bad slide 2'
        });

      expect(badSlide.status).toBe(400);
    });

    it('validates media fileType, fileUrl, and ID on /api/bands/media', async () => {
      const badType = await request(app)
        .post('/api/bands/media')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({ fileType: 'executable', fileUrl: 'https://cdn.example.com/a.exe' });
      expect(badType.status).toBe(400);

      const badUrl = await request(app)
        .post('/api/bands/media')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({ fileType: 'photo', fileUrl: 'javascript:alert(1)' });
      expect(badUrl.status).toBe(400);

      const badDeleteId = await request(app)
        .delete('/api/bands/media/not-an-id')
        .set('Authorization', `Bearer ${bandToken}`);
      expect(badDeleteId.status).toBe(400);
    });

    it('validates IDs on connections and reports endpoints', async () => {
      const badConn = await request(app)
        .post('/api/connections')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({ bandProfileId: 'invalid' });
      expect(badConn.status).toBe(400);

      const badReportType = await request(app)
        .post('/api/reports')
        .send({ reportedEntityType: 'arbitrary_table', reportedEntityId: 1, reason: 'spam' });
      expect(badReportType.status).toBe(400);

      const badReportId = await request(app)
        .post('/api/reports')
        .send({ reportedEntityType: 'band_profile', reportedEntityId: 'abc', reason: 'spam' });
      expect(badReportId.status).toBe(400);
    });

    it('validates IDs and status on admin endpoints and includes general organizers in metrics', async () => {
      const metricsRes = await request(app)
        .get('/api/admin/metrics')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(metricsRes.status).toBe(200);
      expect(metricsRes.body.data.summary.totalOrganizers).toBeGreaterThanOrEqual(1);

      const badReportUpdate = await request(app)
        .put('/api/admin/reports/abc')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'resolved' });
      expect(badReportUpdate.status).toBe(400);

      const badStatusUpdate = await request(app)
        .put('/api/admin/reports/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'hacked_status' });
      expect(badStatusUpdate.status).toBe(400);

      const badSuspendId = await request(app)
        .put('/api/admin/users/abc/suspend')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(badSuspendId.status).toBe(400);

      const missingUserSuspend = await request(app)
        .put('/api/admin/users/999999/suspend')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(missingUserSuspend.status).toBe(404);
    });

    it('allows general accounts through /api/dashboard/organizer', async () => {
      const res = await request(app)
        .get('/api/dashboard/organizer')
        .set('Authorization', `Bearer ${organizerToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Production CORS Hardening', () => {
    it('omits Access-Control-Allow-Origin for untrusted origins in production while allowing reffband.studio', async () => {
      const prevEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const evilRes = await request(app)
          .get('/health')
          .set('Origin', 'https://evil-attacker.example.com');
        expect(evilRes.headers['access-control-allow-origin']).toBeUndefined();

        const validRes = await request(app)
          .get('/health')
          .set('Origin', 'https://reffband.studio');
        expect(validRes.headers['access-control-allow-origin']).toBe('https://reffband.studio');
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });
  });
});
