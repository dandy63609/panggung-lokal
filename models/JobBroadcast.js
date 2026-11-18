const db = require('../utils/db');

/**
 * JobBroadcast Model
 * Manages stage booking inquiries broadcast to all registered band accounts.
 */
class JobBroadcast {
  constructor(data) {
    this.id = data.id;
    this.organizerUserId = data.organizer_user_id;
    this.sourceBandProfileId = data.source_band_profile_id;
    this.organizerName = data.organizer_name;
    this.organizerEmail = data.organizer_email;
    this.organizerPhone = data.organizer_phone;
    this.eventDate = data.event_date;
    this.performStartTime = data.perform_start_time;
    this.performEndTime = data.perform_end_time;
    this.venueLocation = data.venue_location;
    this.eventScale = data.event_scale;
    this.eventDetails = data.event_details;
    this.recipientBandCount = data.recipient_band_count || 0;
    this.createdAt = data.created_at;

    let parsedAttachments = [];
    if (Array.isArray(data.attachments)) {
      parsedAttachments = data.attachments;
    } else if (typeof data.attachments === 'string' && data.attachments.trim()) {
      try {
        const decoded = JSON.parse(data.attachments);
        if (Array.isArray(decoded)) {
          parsedAttachments = decoded;
        }
      } catch {
        parsedAttachments = [];
      }
    }
    this.attachments = parsedAttachments;
  }

  /**
   * Ensure table exists when running against an unmigrated database instance.
   */
  static async ensureTable() {
    if (JobBroadcast._tableVerified) return;
    try {
      await db.query('SELECT 1 FROM job_broadcasts LIMIT 1');
      JobBroadcast._tableVerified = true;
      return;
    } catch {
      // Table does not exist yet; create it now
    }
    await db.query(`
      CREATE TABLE IF NOT EXISTS job_broadcasts (
        id SERIAL PRIMARY KEY,
        organizer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_band_profile_id INTEGER REFERENCES band_profiles(id) ON DELETE SET NULL,
        organizer_name VARCHAR(255) NOT NULL,
        organizer_email VARCHAR(255) NOT NULL,
        organizer_phone VARCHAR(50) NOT NULL,
        event_date VARCHAR(50) NOT NULL,
        perform_start_time VARCHAR(20) NOT NULL,
        perform_end_time VARCHAR(20) NOT NULL,
        venue_location VARCHAR(255) NOT NULL,
        event_scale INTEGER DEFAULT 5,
        event_details TEXT NOT NULL,
        attachments TEXT DEFAULT '[]',
        recipient_band_count INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    JobBroadcast._tableVerified = true;
  }

  /**
   * Create a new platform-wide stage booking broadcast for all registered bands.
   */
  static async create(data) {
    await this.ensureTable();

    const bandCountResult = await db.query('SELECT COUNT(*) AS count FROM band_profiles');
    const recipientBandCount = parseInt(bandCountResult.rows[0]?.count, 10) || 0;

    const sanitizedAttachments = Array.isArray(data.attachments)
      ? data.attachments.slice(0, 3).map((att) => ({
          fileUrl: String(att.fileUrl || ''),
          originalName: String(att.originalName || 'lampiran'),
          mimeType: String(att.mimeType || ''),
          size: Number(att.size) || 0,
        }))
      : [];

    const result = await db.query(
      `INSERT INTO job_broadcasts (
        organizer_user_id,
        source_band_profile_id,
        organizer_name,
        organizer_email,
        organizer_phone,
        event_date,
        perform_start_time,
        perform_end_time,
        venue_location,
        event_scale,
        event_details,
        attachments,
        recipient_band_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.organizerUserId,
        data.sourceBandProfileId || null,
        data.organizerName,
        data.organizerEmail,
        data.organizerPhone,
        data.eventDate,
        data.performStartTime,
        data.performEndTime,
        data.venueLocation,
        Number(data.eventScale) || 5,
        data.eventDetails,
        JSON.stringify(sanitizedAttachments),
        recipientBandCount,
      ]
    );

    return new JobBroadcast(result.rows[0]);
  }

  /**
   * List recent broadcast stage invitations visible to band accounts.
   */
  static async listRecent(limit = 50) {
    await this.ensureTable();
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const result = await db.query(
      `SELECT * FROM job_broadcasts ORDER BY created_at DESC LIMIT $1`,
      [safeLimit]
    );
    return result.rows.map((row) => new JobBroadcast(row));
  }
}

module.exports = JobBroadcast;
