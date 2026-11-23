const request = require('supertest');
const app = require('../app');
const db = require('../utils/db');
const User = require('../models/User');
const { hashPassword } = require('../utils/password');
const {
  RESEND_API_URL,
  isEmailConfigured,
  getAppBaseUrl,
  buildPasswordResetUrl,
  sendPasswordResetEmail,
} = require('../utils/email');

describe('Transactional Email Utility (Resend) & Password Reset Flow', () => {
  const createdUserIds = [];

  afterAll(async () => {
    for (const userId of createdUserIds) {
      await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]).catch(() => {});
      await db.query('DELETE FROM users WHERE id = $1', [userId]).catch(() => {});
    }
  });

  describe('utils/email.js unit tests', () => {
    it('resolves app base URL from APP_URL, request host, or default', () => {
      expect(getAppBaseUrl(null, { APP_URL: 'https://reffband.studio/' })).toBe('https://reffband.studio');
      expect(
        getAppBaseUrl(
          {
            get: () => 'preview.reffband.studio',
            headers: { 'x-forwarded-proto': 'https' },
          },
          {}
        )
      ).toBe('https://preview.reffband.studio');
      expect(
        getAppBaseUrl(
          {
            get: () => 'localhost:3000',
            headers: {},
          },
          {}
        )
      ).toBe('http://localhost:3000');
      expect(getAppBaseUrl(null, {})).toBe('https://reffband.studio');
    });

    it('builds SPA reset link targeting /lupa-sandi?token=...', () => {
      expect(buildPasswordResetUrl('abc123', 'https://reffband.studio/')).toBe(
        'https://reffband.studio/lupa-sandi?token=abc123'
      );
    });

    it('skips sending when RESEND_API_KEY is not configured', async () => {
      expect(isEmailConfigured({})).toBe(false);
      const res = await sendPasswordResetEmail({
        to: 'user@example.com',
        resetUrl: 'https://reffband.studio/lupa-sandi?token=test',
        env: {},
      });
      expect(res).toEqual({
        sent: false,
        skipped: true,
        reason: 'RESEND_API_KEY is not configured',
      });
    });

    it('sends password reset email via Resend HTTP API and handles errors', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 're_msg_123' }),
      });

      const result = await sendPasswordResetEmail({
        to: 'band@example.com',
        resetUrl: 'https://reffband.studio/lupa-sandi?token=tok999',
        env: {
          RESEND_API_KEY: 're_test_key',
          EMAIL_FROM: 'Reffband <noreply@reffband.studio>',
        },
        fetchImpl: mockFetch,
      });

      expect(result).toEqual({ sent: true, id: 're_msg_123' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe(RESEND_API_URL);
      expect(options.method).toBe('POST');
      expect(options.headers.Authorization).toBe('Bearer re_test_key');
      const payload = JSON.parse(options.body);
      expect(payload.from).toBe('Reffband <noreply@reffband.studio>');
      expect(payload.to).toEqual(['band@example.com']);
      expect(payload.html).toContain('https://reffband.studio/lupa-sandi?token=tok999');
      expect(payload.text).toContain('https://reffband.studio/lupa-sandi?token=tok999');

      const failingFetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: async () => '{"message":"Domain not verified"}',
      });

      await expect(
        sendPasswordResetEmail({
          to: 'band@example.com',
          resetUrl: 'https://reffband.studio/lupa-sandi?token=tok999',
          env: { RESEND_API_KEY: 're_test_key' },
          fetchImpl: failingFetch,
        })
      ).rejects.toThrow(/Resend API error \(403\)/);
    });
  });

  describe('POST /api/auth/forgot-password & /api/auth/reset-password integration', () => {
    const originalEnv = { ...process.env };
    const originalFetch = global.fetch;
    let testEmail;
    let testUser;

    beforeAll(async () => {
      testEmail = `qa-reset-${Date.now()}@example.com`;
      const hash = await hashPassword('InitialPass123!');
      testUser = await User.create(testEmail, hash, 'band');
      createdUserIds.push(testUser.id);
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      global.fetch = originalFetch;
    });

    it('returns 503 in production when RESEND_API_KEY is missing instead of pretending email was sent', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.RESEND_API_KEY;

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.resetToken).toBeUndefined();
    });

    it('sends Resend email in production, hides resetToken from API response, and completes password reset', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 're_live_mock_key';
      process.env.EMAIL_FROM = 'Reffband <noreply@reffband.studio>';
      process.env.APP_URL = 'https://reffband.studio';

      let capturedResetUrl = '';
      global.fetch = jest.fn(async (url, opts) => {
        if (url === RESEND_API_URL) {
          const body = JSON.parse(opts.body);
          const match = body.text.match(/https:\/\/reffband\.studio\/lupa-sandi\?token=([a-f0-9]+)/i);
          capturedResetUrl = match ? match[0] : '';
          return {
            ok: true,
            status: 200,
            json: async () => ({ id: 're_email_ok' }),
          };
        }
        return originalFetch(url, opts);
      });

      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(forgotRes.body.resetToken).toBeUndefined();
      expect(capturedResetUrl).toContain('https://reffband.studio/lupa-sandi?token=');

      const token = new URL(capturedResetUrl).searchParams.get('token');
      expect(token).toBeTruthy();

      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'NewPassword456!' });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: testEmail, password: 'NewPassword456!' });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.success).toBe(true);
    });

    it('cleans up token and returns 503 when Resend delivery fails', async () => {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 're_live_mock_key';

      global.fetch = jest.fn(async (url) => {
        if (url === RESEND_API_URL) {
          return {
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'upstream error',
          };
        }
        return originalFetch(url);
      });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: testEmail });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);

      const unusedTokens = await db.query(
        'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND used = false',
        [testUser.id]
      );
      expect(unusedTokens.rows).toHaveLength(0);
    });
  });
});
