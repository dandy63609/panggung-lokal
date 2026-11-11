/**
 * App Security Integration Tests
 * Tests security middleware integration in the main app
 */

const request = require('supertest');
const app = require('../../app');

describe('App Security Middleware Integration', () => {
  describe('Helmet Security Headers', () => {
    it('should set security headers on all responses', async () => {
      const response = await request(app).get('/');
      
      // Helmet sets various security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['strict-transport-security']).toBeDefined();
    });

    it('should include HSTS header with correct settings', async () => {
      const response = await request(app).get('/health');
      
      const hsts = response.headers['strict-transport-security'];
      expect(hsts).toContain('max-age=31536000');
      expect(hsts).toContain('includeSubDomains');
      expect(hsts).toContain('preload');
    });
  });

  describe('CORS Configuration', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should allow configured origins', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });
  });

  describe('Rate Limiting on API Routes', () => {
    it('should apply rate limiting to API routes', async () => {
      // Make a request to an API endpoint
      const response = await request(app).get('/api/test-endpoint-that-does-not-exist');
      
      // Even for 404s, rate limit headers should be present
      expect(response.headers['ratelimit-limit']).toBeDefined();
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should not apply rate limiting to non-API routes', async () => {
      const response = await request(app).get('/health');
      
      // Health check should not have rate limit headers
      expect(response.headers['ratelimit-limit']).toBeUndefined();
    });

    it('should apply rate limiting to root API path', async () => {
      const response = await request(app).get('/api/');
      
      expect(response.headers['ratelimit-limit']).toBe('100');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });
  });

  describe('Combined Security Middleware', () => {
    it('should apply all security middleware in correct order', async () => {
      const response = await request(app).get('/health');
      
      // Should have helmet headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      
      // Should parse response correctly (body parser working)
      expect(response.body.status).toBe('ok');
      expect(response.body.timestamp).toBeDefined();
    });

    it('should handle requests with all security layers', async () => {
      const response = await request(app)
        .get('/api/non-existent')
        .set('Origin', 'http://localhost:3000');
      
      // Should have security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      
      // Should have CORS
      expect(response.headers['access-control-allow-origin']).toBeTruthy();
      
      // Should have rate limiting
      expect(response.headers['ratelimit-limit']).toBe('100');
      
      // Should return proper error format
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Error Handling with Security', () => {
    it('should not expose stack traces in production', async () => {
      // Save original NODE_ENV
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'production';
      
      const response = await request(app).get('/api/trigger-error-if-exists');
      
      // Restore NODE_ENV
      process.env.NODE_ENV = originalEnv;
      
      // Error response should not include stack
      expect(response.body.error).toBeDefined();
      expect(response.body.error.stack).toBeUndefined();
    });
  });

  describe('Content Security Policy', () => {
    it('should set Content-Security-Policy header', async () => {
      const response = await request(app).get('/');
      
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });
});
``