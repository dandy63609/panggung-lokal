const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const BandProfile = require('../models/BandProfile');
const { generateToken } = require('../middleware/auth');

describe('QA Scenario Explorer - Runtime Verification Suite', () => {
  let testBandUser;
  let testBandProfile;
  let bandToken;
  let testOrganizerUser;
  let organizerToken;

  beforeAll(async () => {
    // Setup test users and band profile
    const unique = Date.now();
    testBandUser = await User.create(
      `test_musisi_${unique}@reffband.studio`,
      'Password123!',
      'band'
    );
    bandToken = generateToken(testBandUser);

    testBandProfile = await BandProfile.create({
      userId: testBandUser.id,
      bandName: `Reffband QA ${unique}`,
      genre: 'Rock Alternative',
      locationCity: 'Bandung',
      bio: 'Profil band untuk pengujian skenario QA runtime.',
      budgetMin: 3500000,
      budgetMax: 7000000,
      phone: '081298765432',
    });

    testOrganizerUser = await User.create(
      `test_eo_${unique}@reffband.studio`,
      'Password123!',
      'organizer'
    );
    organizerToken = generateToken(testOrganizerUser);
  });

  // 1. HAPPY PATH: Slug Profile Resolution
  test('Scenario 1 [Happy Path]: Profile lookup by slug returns 200 and matches slugified name', async () => {
    const slug = testBandProfile.slug;
    expect(slug).toBeDefined();

    const res = await request(app).get(`/api/bands/profile/${encodeURIComponent(slug)}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testBandProfile.id);
    expect(res.body.data.bandName).toBe(testBandProfile.bandName);
  });

  // 2. HAPPY PATH: Backward-Compatible Numeric ID Resolution
  test('Scenario 2 [Happy Path]: Profile lookup by numeric ID returns 200 with identical data', async () => {
    const res = await request(app).get(`/api/bands/profile/${testBandProfile.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(testBandProfile.id);
  });

  // 3. AUTH BOUNDARY: Guest vs Authenticated Phone Masking
  test('Scenario 3 [Auth Boundary]: Guest requests receive masked phone numbers while authenticated users receive unmasked phone', async () => {
    // Guest request
    const guestRes = await request(app).get(`/api/bands/profile/${testBandProfile.id}`);
    expect(guestRes.status).toBe(200);
    expect(guestRes.body.data.phone).toContain('xxxx');
    expect(guestRes.body.isSneakPeek).toBe(true);

    // Authenticated EO request
    const authedRes = await request(app)
      .get(`/api/bands/profile/${testBandProfile.id}`)
      .set('Authorization', `Bearer ${organizerToken}`);
    expect(authedRes.status).toBe(200);
    expect(authedRes.body.data.phone).toBe('081298765432');
    expect(authedRes.body.isSneakPeek).toBe(false);
  });

  // 4. HAPPY PATH & MUTATION: Band Audio Sample Upload & Persistence
  let createdAudioMediaId = null;
  test('Scenario 4 [Happy Path]: Authenticated band can add official audio sample (potongan lagu)', async () => {
    const res = await request(app)
      .post('/api/bands/media')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        fileType: 'audio',
        fileUrl: '/uploads/sample-cut-qa.mp3',
        title: 'Reff Single Live Master (45 Sec)',
        displayOrder: 0,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Reff Single Live Master (45 Sec)');
    expect(res.body.data.file_type).toBe('audio');
    createdAudioMediaId = res.body.data.id;

    // Verify it reflects in public profile
    const profileRes = await request(app).get(`/api/bands/profile/${testBandProfile.id}`);
    expect(profileRes.status).toBe(200);
    const audioFiles = profileRes.body.data.mediaFiles.filter((m) => m.file_type === 'audio');
    expect(audioFiles.length).toBeGreaterThanOrEqual(1);
    expect(audioFiles.some((m) => m.title === 'Reff Single Live Master (45 Sec)')).toBe(true);
  });

  // 4b. MUTATION & EDIT: Band can update/rename audio track title
  test('Scenario 4b [Mutation & Edit]: Band can rename audio track title via PUT /api/bands/media/:id', async () => {
    expect(createdAudioMediaId).toBeDefined();

    const res = await request(app)
      .put(`/api/bands/media/${createdAudioMediaId}`)
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        title: 'Reff Single Live Master (45 Sec) - Extended Edit',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Reff Single Live Master (45 Sec) - Extended Edit');
  });

  // 5. MUTATION & CLEANUP: Delete Audio Sample
  test('Scenario 5 [Mutation]: Band can delete their uploaded audio sample cleanly', async () => {
    expect(createdAudioMediaId).toBeDefined();

    const res = await request(app)
      .delete(`/api/bands/media/${createdAudioMediaId}`)
      .set('Authorization', `Bearer ${bandToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // 6. INVALID INPUT: Malformed Audio Media URL Submission
  test('Scenario 6 [Invalid Input]: Submitting unsafe/invalid media URL returns 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/bands/media')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        fileType: 'audio',
        fileUrl: 'javascript:alert("exploit")',
        title: 'Exploit Audio',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Format URL media tidak aman atau tidak valid');
  });

  // 7. ERROR STATE: Non-existent Band Slug / ID Handling
  test('Scenario 7 [API & Error States]: Non-existent band profile returns 404 instead of crashing', async () => {
    const res = await request(app).get('/api/bands/profile/band-tidak-ada-qa-99999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Profil band tidak ditemukan');
  });

  // 8. ACCESS BOUNDARY: Protected Routes Access Without Token
  test('Scenario 8 [Access Boundary]: Accessing band dashboard without auth token returns 401', async () => {
    const res = await request(app).get('/api/dashboard/band');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  // 9. BOUNDARY & EMPTY DATASET: Searching with Out-of-Range Filters
  test('Scenario 9 [Boundary & Empty]: Filter search with unmatched criteria returns empty result cleanly', async () => {
    const res = await request(app).get(
      '/api/bands/search?genre=GenreSangatAnehTidakPernahAda&budgetMin=999999999'
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.pagination.total).toBe(0);
  });

  // 10. HAPPY PATH: Direct WhatsApp Inquiry Connection Logging
  test('Scenario 10 [Happy Path]: Logging connection creates entry and updates dashboard metrics', async () => {
    const res = await request(app)
      .post('/api/connections')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        bandProfileId: testBandProfile.id,
        connectionType: 'whatsapp_direct',
        notes: 'EO booking test 1 set',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.connectionId).toBeDefined();

    // Check dashboard metrics reflect the connection
    const dashRes = await request(app)
      .get('/api/dashboard/band')
      .set('Authorization', `Bearer ${bandToken}`);
    expect(dashRes.status).toBe(200);
    expect(dashRes.body.data.stats.totalWaClicks).toBeGreaterThanOrEqual(1);
  });

  // 11. INVALID INPUT: Job Broadcast Validation Failure
  test('Scenario 11 [Invalid Input]: Submitting Job Broadcast with missing required fields returns 400', async () => {
    const res = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        organizerName: '',
        eventDate: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 12. INFRASTRUCTURE & HEALTH: Gateway status endpoint
  test('Scenario 12 [Happy Path]: Health check returns status OK and timestamp', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});
