/**
 * End-to-End API Integration Tests for Panggung Lokal Platform Flow
 *
 * Scenarios:
 * 1. EO / Public Band Search by canonical genre & viewing detailed band profile
 * 2. EO direct contact interaction tracking (WhatsApp CTA click)
 * 3. Band Instagram-style portfolio creation, impressions, and conversion tracking
 * 4. Band customizable dynamic technical rider & profile updates
 * 5. Security & boundary validation (budget range, URL protocol safety, role guards)
 */

const request = require('supertest');
const app = require('../../app');
const { generateToken } = require('../../middleware/auth');

describe('E2E Band Platform & WhatsApp Direct Contact Flow', () => {
  let bandToken;
  let organizerToken;
  let createdPostId;

  const bandUser = {
    id: 1,
    email: 'kelana@panggunglokal.id',
    accountType: 'band'
  };

  const organizerUser = {
    id: 9,
    email: 'kafe.selatan@gmail.com',
    accountType: 'general'
  };

  beforeAll(() => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-123';
    bandToken = generateToken(bandUser);
    organizerToken = generateToken(organizerUser);
  });

  describe('Scenario 1: EO Discovery & Band Search', () => {
    it('should search bands by canonical genre and return matching results', async () => {
      const res = await request(app)
        .get('/api/bands/search')
        .query({ genre: 'Indie' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      
      // Every returned band should have genre matching Indie
      res.body.data.forEach(band => {
        expect(band.genre.toLowerCase()).toContain('indie');
      });
    });

    it('should retrieve full band profile with social links, rider items, and portfolio', async () => {
      const res = await request(app)
        .get('/api/bands/profile/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();

      const band = res.body.data;
      expect(band.id).toBe(1);
      expect(band.bandName).toBeTruthy();
      expect(band.phone).toBeTruthy();
      expect(Array.isArray(band.riderItems)).toBe(true);
      expect(Array.isArray(band.posts)).toBe(true);
    });
  });

  describe('Scenario 2: EO Direct Contact via WhatsApp CTA Tracking', () => {
    it('should record connection when EO clicks WhatsApp direct contact CTA', async () => {
      const res = await request(app)
        .post('/api/connections')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          bandProfileId: 1,
          notes: 'Penyelenggara mengklik Hubungi Band Langsung (WhatsApp)'
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.connectionId).toBeDefined();
      expect(res.body.data.contact).toBeDefined();
      expect(res.body.data.contact.whatsappUrl).toContain('https://wa.me/');
    });
  });

  describe('Scenario 3: Band Instagram-style Portfolio & Performance Metrics', () => {
    it('should allow band account to publish a photo/video post', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4',
          caption: 'Live performance set at Dago Festival 2026'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.caption).toBe('Live performance set at Dago Festival 2026');

      createdPostId = res.body.data.id;
    });

    it('should track view impression on the created post', async () => {
      const res = await request(app)
        .post(`/api/posts/${createdPostId}/view`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.viewsCount).toBeGreaterThanOrEqual(1);
    });

    it('should track WhatsApp direct click conversion on the created post', async () => {
      const res = await request(app)
        .post(`/api/posts/${createdPostId}/wa-click`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.waClicksCount).toBeGreaterThanOrEqual(1);
    });

    it('should retrieve band posts including the new post and performance metrics', async () => {
      const res = await request(app)
        .get('/api/posts/band/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const target = res.body.data.find(p => p.id === createdPostId);
      expect(target).toBeDefined();
      expect(target.viewsCount).toBeGreaterThanOrEqual(1);
      expect(target.waClicksCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Scenario 4: Band Customizable Dynamic Technical Rider & Profile Update', () => {
    it('should update profile with dynamic rider items and canonical genre', async () => {
      const customRider = [
        { title: 'Audio Mixer Channel', description: 'Minimal 16 channel input analog/digital' },
        { title: 'Wireless Microphone', description: '2 unit Shure Beta 58A' },
        { title: 'Stage Monitor', description: '3 unit active aux monitor mix' }
      ];

      const res = await request(app)
        .put('/api/bands/profile')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          bandName: 'The Groove Waves',
          genre: 'Rock',
          locationCity: 'Bandung',
          budgetMin: 4000000,
          budgetMax: 8000000,
          phone: '+6281298765432',
          riderItems: customRider
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.genre).toBe('Rock');
      expect(res.body.data.riderItems).toHaveLength(3);
      expect(res.body.data.riderItems[0].title).toBe('Audio Mixer Channel');
    });

    it('should verify updated rider items are visible on public profile', async () => {
      const res = await request(app)
        .get('/api/bands/profile/1');

      expect(res.status).toBe(200);
      expect(res.body.data.genre).toBe('Rock');
      expect(res.body.data.riderItems).toHaveLength(3);
      expect(res.body.data.riderItems[1].title).toBe('Wireless Microphone');
      expect(res.body.data.riderItems[1].description).toBe('2 unit Shure Beta 58A');
    });
  });

  describe('Scenario 5: Validation, Security & Role Boundaries', () => {
    it('should reject profile update when budgetMin exceeds budgetMax', async () => {
      const res = await request(app)
        .put('/api/bands/profile')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          budgetMin: 9000000,
          budgetMax: 3000000
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Tarif minimum tidak boleh lebih besar');
    });

    it('should reject post creation with unsafe media URL scheme', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${bandToken}`)
        .send({
          mediaType: 'photo',
          mediaUrl: 'javascript:alert(document.cookie)',
          caption: 'Exploit attempt'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('tidak aman');
    });

    it('should forbid organizer/general accounts from publishing band posts', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Authorization', `Bearer ${organizerToken}`)
        .send({
          mediaType: 'photo',
          mediaUrl: 'https://images.unsplash.com/photo-test.jpg',
          caption: 'Unauthorized post'
        });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });
});
