const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const BandProfile = require('../models/BandProfile');
const BandPost = require('../models/BandPost');
const { generateToken } = require('../middleware/auth');

describe('View Tracking Owner Guard Tests', () => {
  let bandOwnerUser;
  let bandOwnerToken;
  let testBandProfile;
  let testPost;

  let eoUser;
  let eoToken;

  let otherMusicianUser;
  let otherMusicianToken;

  beforeAll(async () => {
    // 1. Create Band Owner
    bandOwnerUser = await User.create(
      `band_owner_${Date.now()}@test.com`,
      '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      'band'
    );
    bandOwnerToken = generateToken(bandOwnerUser);

    testBandProfile = await BandProfile.create({
      userId: bandOwnerUser.id,
      bandName: `The Audited Band ${Date.now()}`,
      genre: 'Rock Alternative',
      locationCity: 'Jakarta',
      bio: 'Band for testing view tracking guard',
      budgetMin: 5000000,
      budgetMax: 10000000,
      phone: '081234567890'
    });

    testPost = await BandPost.create({
      bandProfileId: testBandProfile.id,
      mediaType: 'image',
      mediaUrl: 'https://example.com/post-photo.jpg',
      caption: 'Soundcheck stage live demo'
    });

    // 2. Create Event Organizer (EO)
    eoUser = await User.create(
      `eo_visitor_${Date.now()}@test.com`,
      '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      'organizer'
    );
    eoToken = generateToken(eoUser);

    // 3. Create Another Musician / Band
    otherMusicianUser = await User.create(
      `other_musician_${Date.now()}@test.com`,
      '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
      'band'
    );
    otherMusicianToken = generateToken(otherMusicianUser);
  });

  describe('Band Profile Views (/api/bands/profile/:id)', () => {
    it('does NOT increment profile views when viewed by the band owner themselves', async () => {
      const initialBand = await BandProfile.findById(testBandProfile.id);
      const initialViews = Number(initialBand.profileViews) || 0;

      const res = await request(app)
        .get(`/api/bands/profile/${testBandProfile.id}`)
        .set('Authorization', `Bearer ${bandOwnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(true);
      expect(res.body.data.profileViews).toBe(initialViews);

      // Verify database record has not changed
      const currentBand = await BandProfile.findById(testBandProfile.id);
      expect(Number(currentBand.profileViews)).toBe(initialViews);
    });

    it('does NOT increment views when preview query parameter is set (even for guest)', async () => {
      const initialBand = await BandProfile.findById(testBandProfile.id);
      const initialViews = Number(initialBand.profileViews) || 0;

      const res = await request(app)
        .get(`/api/bands/profile/${testBandProfile.id}?preview=true`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.profileViews).toBe(initialViews);

      const currentBand = await BandProfile.findById(testBandProfile.id);
      expect(Number(currentBand.profileViews)).toBe(initialViews);
    });

    it('DOES increment profile views when viewed by an Event Organizer (EO)', async () => {
      const initialBand = await BandProfile.findById(testBandProfile.id);
      const initialViews = Number(initialBand.profileViews) || 0;

      const res = await request(app)
        .get(`/api/bands/profile/${testBandProfile.id}`)
        .set('Authorization', `Bearer ${eoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(false);
      expect(res.body.data.profileViews).toBe(initialViews + 1);

      // Allow async increment to settle
      await new Promise(resolve => setTimeout(resolve, 50));
      const currentBand = await BandProfile.findById(testBandProfile.id);
      expect(Number(currentBand.profileViews)).toBe(initialViews + 1);
    });

    it('DOES increment profile views when viewed by another Musician / Band account', async () => {
      const initialBand = await BandProfile.findById(testBandProfile.id);
      const initialViews = Number(initialBand.profileViews) || 0;

      const res = await request(app)
        .get(`/api/bands/profile/${testBandProfile.id}`)
        .set('Authorization', `Bearer ${otherMusicianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(false);
      expect(res.body.data.profileViews).toBe(initialViews + 1);

      await new Promise(resolve => setTimeout(resolve, 50));
      const currentBand = await BandProfile.findById(testBandProfile.id);
      expect(Number(currentBand.profileViews)).toBe(initialViews + 1);
    });

    it('DOES increment profile views when viewed by an unauthenticated public visitor / guest', async () => {
      const initialBand = await BandProfile.findById(testBandProfile.id);
      const initialViews = Number(initialBand.profileViews) || 0;

      const res = await request(app)
        .get(`/api/bands/profile/${testBandProfile.id}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(false);
      expect(res.body.data.profileViews).toBe(initialViews + 1);

      await new Promise(resolve => setTimeout(resolve, 50));
      const currentBand = await BandProfile.findById(testBandProfile.id);
      expect(Number(currentBand.profileViews)).toBe(initialViews + 1);
    });
  });

  describe('Band Post Views (/api/posts/:id/view)', () => {
    it('does NOT increment post views when viewed by the band owner themselves', async () => {
      const initialPost = await BandPost.findById(testPost.id);
      const initialViews = Number(initialPost.viewsCount) || 0;

      const res = await request(app)
        .post(`/api/posts/${testPost.id}/view`)
        .set('Authorization', `Bearer ${bandOwnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(true);
      expect(res.body.data.viewsCount).toBe(initialViews);

      const currentPost = await BandPost.findById(testPost.id);
      expect(Number(currentPost.viewsCount)).toBe(initialViews);
    });

    it('DOES increment post views when viewed by an Event Organizer (EO)', async () => {
      const initialPost = await BandPost.findById(testPost.id);
      const initialViews = Number(initialPost.viewsCount) || 0;

      const res = await request(app)
        .post(`/api/posts/${testPost.id}/view`)
        .set('Authorization', `Bearer ${eoToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(false);
      expect(res.body.data.viewsCount).toBe(initialViews + 1);

      const currentPost = await BandPost.findById(testPost.id);
      expect(Number(currentPost.viewsCount)).toBe(initialViews + 1);
    });

    it('DOES increment post views when viewed by another Musician / Band account', async () => {
      const initialPost = await BandPost.findById(testPost.id);
      const initialViews = Number(initialPost.viewsCount) || 0;

      const res = await request(app)
        .post(`/api/posts/${testPost.id}/view`)
        .set('Authorization', `Bearer ${otherMusicianToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(false);
      expect(res.body.data.viewsCount).toBe(initialViews + 1);

      const currentPost = await BandPost.findById(testPost.id);
      expect(Number(currentPost.viewsCount)).toBe(initialViews + 1);
    });

    it('DOES increment post views when viewed by an unauthenticated visitor', async () => {
      const initialPost = await BandPost.findById(testPost.id);
      const initialViews = Number(initialPost.viewsCount) || 0;

      const res = await request(app)
        .post(`/api/posts/${testPost.id}/view`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isOwner).toBe(false);
      expect(res.body.data.viewsCount).toBe(initialViews + 1);

      const currentPost = await BandPost.findById(testPost.id);
      expect(Number(currentPost.viewsCount)).toBe(initialViews + 1);
    });
  });
});
