const db = require('../utils/db');

/**
 * Connection Model
 * Tracks when organizers contact or view contact details for a band
 */
class Connection {
  constructor(data) {
    this.id = data.id;
    this.organizerUserId = data.organizer_user_id;
    this.bandProfileId = data.band_profile_id;
    this.connectionType = data.connection_type;
    this.createdAt = data.created_at;
    this.notes = data.notes;
    // Joined fields if available
    this.organizerEmail = data.organizer_email;
    this.bandName = data.band_name;
    this.genre = data.genre;
    this.locationCity = data.location_city;
    this.profilePhotoUrl = data.profile_photo_url;
  }

  /**
   * Create a new connection
   */
  static async create(data) {
    let nextId = data.id;
    if (!nextId) {
      const maxRes = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM connections');
      nextId = parseInt(maxRes.rows[0].next_id, 10);
    }

    const result = await db.query(
      `INSERT INTO connections (
        id, organizer_user_id, band_profile_id, connection_type, notes
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        nextId,
        data.organizerUserId,
        data.bandProfileId,
        data.connectionType || 'contact_view',
        data.notes || null
      ]
    );
    return new Connection(result.rows[0]);
  }

  /**
   * Get all connections for a band profile with organizer info
   */
  static async getByBandProfile(bandProfileId, limit = 20) {
    const result = await db.query(
      `SELECT c.*, u.email as organizer_email 
       FROM connections c
       JOIN users u ON u.id = c.organizer_user_id
       WHERE c.band_profile_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2`,
      [bandProfileId, limit]
    );
    return result.rows.map(row => new Connection(row));
  }

  /**
   * Get all connections made by an organizer with band info
   */
  static async getByOrganizer(organizerUserId, limit = 20) {
    const result = await db.query(
      `SELECT c.*, bp.band_name, bp.genre, bp.location_city, bp.profile_photo_url, bp.phone
       FROM connections c
       JOIN band_profiles bp ON bp.id = c.band_profile_id
       WHERE c.organizer_user_id = $1
       ORDER BY c.created_at DESC
       LIMIT $2`,
      [organizerUserId, limit]
    );
    return result.rows.map(row => new Connection(row));
  }

  /**
   * Get connection statistics for a band
   */
  static async getStatsForBand(bandProfileId) {
    const totalResult = await db.query(
      'SELECT COUNT(*) as total FROM connections WHERE band_profile_id = $1',
      [bandProfileId]
    );

    return {
      total: parseInt(totalResult.rows[0].total, 10) || 0
    };
  }
}

module.exports = Connection;
