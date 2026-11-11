/**
 * Rate Limiter Middleware Tests
 * Tests for API and authentication rate limiting
 */

const request = require('supertest');
const express = require('express');
const { apiLimiter, authLimiter, uploadLimiter } = require('../../middleware/rateLimiter');

describe('Rate Limiter Middleware', () => {
  describe('apiLimiter', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use('/api/', apiLimiter);
      app.get('/api/test', (req, res) => {
        res.json({ success: true, message: 'Test endpoint' });
      });
    });

    it('should allow requests within rate limit', async () => {
      const response = await request(app).get('/api/test');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should block requests exceeding rate limit', async () => {
      // Make 100 requests (the limit)
      const requests = Array(100).fill(null).map(() => 
        request(app).get('/api/test')
      );
      await Promise.all(requests);

      // The 101st request should be blocked
      const response = await request(app).get('/api/test');
      
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toBe('Terlalu banyak permintaan, coba lagi nanti');
    }, 30000); // Increase timeout for this test

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/api/test');
      
      expect(response.headers['ratelimit-limit']).toBe('100');
      expect(parseInt(response.headers['ratelimit-remaining'])).toBeLessThanOrEqual(100);
      expect(response.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('authLimiter', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(express.json());
      app.post('/api/auth/login', authLimiter, (req, res) => {
        // Simulate failed login
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      });
    });

    it('should allow initial authentication attempts', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });
      
      expect(response.status).toBe(401); // Failed login, but not rate limited
      expect(response.headers['ratelimit-limit']).toBe('5');
    });

    it('should block excessive authentication attempts', async () => {
      // Make 5 failed login attempts
      const requests = Array(5).fill(null).map(() => 
        request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' })
      );
      await Promise.all(requests);

      // The 6th attempt should be rate limited
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });
      
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AUTH_RATE_LIMIT_EXCEEDED');
      expect(response.body.error.message).toBe('Terlalu banyak percobaan login, coba lagi nanti');
    }, 15000);

    it('should have stricter limits than API limiter', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });
      
      const authLimit = parseInt(response.headers['ratelimit-limit']);
      expect(authLimit).toBe(5);
      expect(authLimit).toBeLessThan(100); // Less than apiLimiter's 100
    });
  });

  describe('uploadLimiter', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.post('/api/upload', uploadLimiter, (req, res) => {
        res.json({ success: true, message: 'File uploaded' });
      });
    });

    it('should allow uploads within rate limit', async () => {
      const response = await request(app).post('/api/upload');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.headers['ratelimit-limit']).toBe('10');
    });

    it('should block excessive upload attempts', async () => {
      // Make 10 upload requests (the limit)
      const requests = Array(10).fill(null).map(() => 
        request(app).post('/api/upload')
      );
      await Promise.all(requests);

      // The 11th upload should be blocked
      const response = await request(app).post('/api/upload');
      
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_RATE_LIMIT_EXCEEDED');
    }, 15000);

    it('should have appropriate limits for uploads', async () => {
      const response = await request(app).post('/api/upload');
      
      const uploadLimit = parseInt(response.headers['ratelimit-limit']);
      expect(uploadLimit).toBe(10);
      expect(uploadLimit).toBeLessThan(100); // Less than general API limit
      expect(uploadLimit).toBeGreaterThan(5); // More than auth limit
    });
  });

  describe('Rate limiter configuration', () => {
    it('should export all three limiters', () => {
      expect(apiLimiter).toBeDefined();
      expect(authLimiter).toBeDefined();
      expect(uploadLimiter).toBeDefined();
    });

    it('should be functions (middleware)', () => {
      expect(typeof apiLimiter).toBe('function');
      expect(typeof authLimiter).toBe('function');
      expect(typeof uploadLimiter).toBe('function');
    });
  });
});
