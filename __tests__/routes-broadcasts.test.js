process.env.DB_CLIENT = 'memory';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../app');
const db = require('../utils/db');
const { generateToken } = require('../middleware/auth');

describe('Job Broadcast & Venue Attachment API', () => {
  const createdBroadcastIds = [];
  const uploadedDiskFiles = [];

  const organizerToken = generateToken({
    id: 9,
    email: 'kafe.selatan@gmail.com',
    accountType: 'organizer',
  });

  const bandOneToken = generateToken({
    id: 1,
    email: 'kelana@panggunglokal.id',
    accountType: 'band',
  });

  const bandTwoToken = generateToken({
    id: 2,
    email: 'senjabersuara@panggunglokal.id',
    accountType: 'band',
  });

  afterAll(async () => {
    for (const id of createdBroadcastIds) {
      await db.query('DELETE FROM job_broadcasts WHERE id = $1', [id]).catch(() => {});
    }
    for (const fileUrl of uploadedDiskFiles) {
      const filename = path.basename(fileUrl);
      const fullPath = path.join(__dirname, '..', 'uploads', filename);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
  });

  it('rejects unauthenticated and band-role requests to create broadcast', async () => {
    await request(app)
      .post('/api/broadcasts')
      .send({ organizerName: 'Test EO' })
      .expect(401);

    const bandRes = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', `Bearer ${bandOneToken}`)
      .send({ organizerName: 'Band Trying To Broadcast' })
      .expect(403);

    expect(bandRes.body.success).toBe(false);
  });

  it('validates missing required schedule/venue fields and invalid perform time format', async () => {
    const missingRes = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({ organizerName: 'BEM Kampus' })
      .expect(400);

    expect(missingRes.body.success).toBe(false);

    const badTimeRes = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send({
        organizerName: 'BEM Kampus',
        organizerEmail: 'kafe.selatan@gmail.com',
        organizerPhone: '081234567890',
        eventDate: '2026-12-20',
        performStartTime: '25:99',
        performEndTime: '21:00',
        venueLocation: 'Sabuga Bandung',
        eventDetails: 'Festival musik tahunan kampus.',
      })
      .expect(400);

    expect(badTimeRes.body.message).toMatch(/HH:MM/i);
  });

  it('allows organizer attachment upload (PDF) and rejects unsupported extensions', async () => {
    const badUpload = await request(app)
      .post('/api/upload/attachment')
      .set('Authorization', `Bearer ${organizerToken}`)
      .attach('attachments', Buffer.from('console.log(1)'), 'script.js')
      .expect(400);

    expect(badUpload.body.success).toBe(false);

    const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n');
    const goodUpload = await request(app)
      .post('/api/upload/attachment')
      .set('Authorization', `Bearer ${organizerToken}`)
      .attach('attachments', pdfBuffer, 'venue-layout.pdf')
      .expect(201);

    expect(goodUpload.body.success).toBe(true);
    expect(Array.isArray(goodUpload.body.files)).toBe(true);
    expect(goodUpload.body.files[0]).toHaveProperty('originalName', 'venue-layout.pdf');
    expect(goodUpload.body.files[0].fileUrl).toMatch(/^\/uploads\/.+\.pdf$/);
    uploadedDiskFiles.push(goodUpload.body.files[0].fileUrl);

    const payload = {
      sourceBandProfileId: 1,
      organizerName: 'Festival Musik Senja',
      organizerEmail: 'kafe.selatan@gmail.com',
      organizerPhone: '081234567890',
      eventDate: '2026-12-20',
      performStartTime: '19:30',
      performEndTime: '21:00',
      venueLocation: 'Gedung Sabuga Bandung',
      eventScale: 5,
      eventDetails: 'Open call untuk festival indie akhir tahun. Soundcheck jam 15:00 WIB.',
      attachments: goodUpload.body.files,
    };

    const broadcastRes = await request(app)
      .post('/api/broadcasts')
      .set('Authorization', `Bearer ${organizerToken}`)
      .send(payload)
      .expect(201);

    expect(broadcastRes.body.success).toBe(true);
    expect(broadcastRes.body.data.performStartTime).toBe('19:30');
    expect(broadcastRes.body.data.performEndTime).toBe('21:00');
    expect(broadcastRes.body.data.venueLocation).toBe('Gedung Sabuga Bandung');
    expect(broadcastRes.body.data.recipientBandCount).toBeGreaterThanOrEqual(8);
    expect(broadcastRes.body.data.attachments).toHaveLength(1);
    createdBroadcastIds.push(broadcastRes.body.data.id);

    // Every registered band account can see the broadcast in their dashboard and /api/broadcasts/band
    const band1Dash = await request(app)
      .get('/api/dashboard/band')
      .set('Authorization', `Bearer ${bandOneToken}`)
      .expect(200);

    const band2Broadcasts = await request(app)
      .get('/api/broadcasts/band')
      .set('Authorization', `Bearer ${bandTwoToken}`)
      .expect(200);

    expect(band1Dash.body.data.jobBroadcasts.some((b) => b.id === broadcastRes.body.data.id)).toBe(true);
    const matchOnBand2 = band2Broadcasts.body.data.find((b) => b.id === broadcastRes.body.data.id);
    expect(matchOnBand2).toBeDefined();
    expect(matchOnBand2.venueLocation).toBe('Gedung Sabuga Bandung');
    expect(matchOnBand2.attachments[0].originalName).toBe('venue-layout.pdf');
  });
});
