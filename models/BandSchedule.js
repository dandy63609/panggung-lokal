const db = require('../utils/db');
const Connection = require('./Connection');

/**
 * BandSchedule Model
 * Manages confirmed live stage gig calendar and performance dates for bands.
 */
class BandSchedule {
  constructor(data) {
    this.id = data.id;
    this.bandProfileId = data.band_profile_id;
    this.organizerUserId = data.organizer_user_id || null;
    this.eventDate = data.event_date;
    this.startTime = data.start_time;
    this.endTime = data.end_time;
    this.eventName = data.event_name;
    this.venue = data.venue || null;
    this.locationCity = data.location_city || null;
    this.organizerName = data.organizer_name || null;
    this.notes = data.notes || null;
    this.status = data.status || 'confirmed';
    this.createdAt = data.created_at;
    // Joined fields
    this.organizerEmail = data.organizer_email;
    this.bandName = data.band_name;
  }

  /**
   * Create a new confirmed gig schedule
   */
  static async create(data) {
    const result = await db.query(
      `INSERT INTO band_schedules (
        band_profile_id, organizer_user_id, event_date, start_time, end_time,
        event_name, venue, location_city, organizer_name, notes, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        data.bandProfileId,
        data.organizerUserId || null,
        data.eventDate,
        data.startTime,
        data.endTime,
        data.eventName,
        data.venue || null,
        data.locationCity || null,
        data.organizerName || null,
        data.notes || null,
        data.status || 'confirmed'
      ]
    );

    const schedule = new BandSchedule(result.rows[0]);

    // If an organizerUserId is linked, ensure a confirmed connection exists
    // so rating gating triggers automatically after the performance date passes
    if (data.organizerUserId) {
      try {
        await db.query(
          `INSERT INTO connections (
            organizer_user_id, band_profile_id, connection_type, notes,
            event_date, event_name, status, is_reviewed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT DO NOTHING`,
          [
            data.organizerUserId,
            data.bandProfileId,
            'confirmed_schedule',
            `Jadwal panggung terkonfirmasi: ${data.startTime} - ${data.endTime} WIB (${data.venue || 'Venue Terjadwal'})`,
            data.eventDate,
            data.eventName,
            'confirmed',
            false
          ]
        );
      } catch (err) {
        console.warn('Notice: Failed to sync schedule with connection:', err.message);
      }
    }

    return schedule;
  }

  /**
   * Find all schedules for a band profile, sorted by event_date ascending
   */
  static async findByBandProfileId(bandProfileId) {
    const result = await db.query(
      `SELECT bs.*, u.email as organizer_email, bp.band_name
       FROM band_schedules bs
       JOIN band_profiles bp ON bp.id = bs.band_profile_id
       LEFT JOIN users u ON u.id = bs.organizer_user_id
       WHERE bs.band_profile_id = $1
       ORDER BY bs.event_date ASC, bs.start_time ASC`,
      [bandProfileId]
    );
    return result.rows.map(row => new BandSchedule(row));
  }

  /**
   * Find a specific schedule by ID
   */
  static async findById(id) {
    const result = await db.query(
      `SELECT bs.*, u.email as organizer_email, bp.band_name
       FROM band_schedules bs
       JOIN band_profiles bp ON bp.id = bs.band_profile_id
       LEFT JOIN users u ON u.id = bs.organizer_user_id
       WHERE bs.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return null;
    return new BandSchedule(result.rows[0]);
  }

  /**
   * Delete a schedule by ID and ensure ownership by bandProfileId
   */
  static async delete(id, bandProfileId) {
    const result = await db.query(
      `DELETE FROM band_schedules
       WHERE id = $1 AND band_profile_id = $2
       RETURNING *`,
      [id, bandProfileId]
    );
    return result.rows.length > 0;
  }
}

module.exports = BandSchedule;
