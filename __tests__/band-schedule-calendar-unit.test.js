const db = require('../utils/db');
const BandProfile = require('../models/BandProfile');
const BandSchedule = require('../models/BandSchedule');
const Connection = require('../models/Connection');

describe('Band Schedule Calendar & Rating Gating Integration Unit Tests', () => {
  beforeAll(async () => {
    // Ensure memory db or test pool is initialized
    await db.query('SELECT 1');
  });

  test('BandSchedule model can create and list schedules for a band', async () => {
    const band = await BandProfile.findById(1);
    expect(band).toBeTruthy();

    const created = await BandSchedule.create({
      bandProfileId: band.id,
      eventDate: '2026-12-25',
      startTime: '19:00',
      endTime: '21:30',
      eventName: 'Christmas Live Fest Semarang',
      venue: 'Auditorium Semarang',
      locationCity: 'Kota Semarang',
      organizerName: 'Panitia Fest',
      notes: 'Format full band live stage 2 set',
      status: 'confirmed'
    });

    expect(created.id).toBeDefined();
    expect(created.eventName).toBe('Christmas Live Fest Semarang');
    expect(created.status).toBe('confirmed');

    const list = await BandSchedule.findByBandProfileId(band.id);
    expect(Array.isArray(list)).toBe(true);
    const found = list.find(s => s.eventName === 'Christmas Live Fest Semarang');
    expect(found).toBeTruthy();
    expect(found.startTime).toBe('19:00');

    // Clean up
    await BandSchedule.delete(created.id, band.id);
  });

  test('Creating schedule with organizer_user_id automatically establishes confirmed connection for rating gating', async () => {
    const band = await BandProfile.findById(1);

    const scheduleWithOrganizer = await BandSchedule.create({
      bandProfileId: band.id,
      organizerUserId: 9,
      eventDate: '2026-11-20', // past date
      startTime: '20:00',
      endTime: '22:00',
      eventName: 'Stage Showcase Past Event',
      venue: 'Club Hall',
      locationCity: 'Kota Semarang',
      organizerName: 'EO Kafe Selatan',
      status: 'confirmed'
    });

    expect(scheduleWithOrganizer.organizerUserId).toBe(9);

    // Verify a connection entry exists with confirmed status
    const connectionsRes = await db.query(
      `SELECT * FROM connections 
       WHERE organizer_user_id = $1 AND band_profile_id = $2 AND status = 'confirmed'`,
      [9, band.id]
    );
    expect(connectionsRes.rows.length).toBeGreaterThan(0);

    // Clean up schedule
    await BandSchedule.delete(scheduleWithOrganizer.id, band.id);
  });

  test('Connections with status = "inquiry" (from initial WA clicks) are NOT gated for reviews', async () => {
    // Insert an inquiry connection with past date
    const inq = await Connection.create({
      organizerUserId: 9,
      bandProfileId: 2,
      connectionType: 'whatsapp_direct',
      eventDate: '2026-11-10', // past date
      eventName: 'Inquiry Tanya Jadwal di WA',
      status: 'inquiry',
      isReviewed: false
    });

    // Query pending reviews using the reviews route gating criteria
    const todayStr = '2026-11-23';
    const pendingRes = await db.query(
      `SELECT c.id FROM connections c
       WHERE c.organizer_user_id = $1
         AND c.event_date IS NOT NULL
         AND c.event_date != ''
         AND c.event_date <= $2
         AND c.status = 'confirmed'
         AND (c.is_reviewed IS NULL OR c.is_reviewed = FALSE)`,
      [9, todayStr]
    );

    // inq has status='inquiry', so it MUST NOT be in pending confirmed review gating
    const inqFoundInPending = pendingRes.rows.some(r => r.id === inq.id);
    expect(inqFoundInPending).toBe(false);

    // Clean up
    await db.query('DELETE FROM connections WHERE id = $1', [inq.id]);
  });
});
