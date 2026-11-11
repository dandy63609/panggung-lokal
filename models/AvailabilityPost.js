const db = require('../utils/db');

/**
 * AvailabilityPost Model
 * Handles database operations for band availability schedules
 */
class AvailabilityPost {
  constructor(data) {
    this.id = data.id;
    this.bandProfileId = data.band_profile_id;
    this.startDate = data.start_date;
    this.endDate = data.end_date;
    this.notes = data.notes;
    this.views = data.views || 0;
    this.createdAt = data.created_at;
    this.isActive = data.is_active;
  }

  /**
   * Find an availability post by ID
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM availability_posts WHERE id = $1',
      [id]
    );
    return result.rows[0] ? new AvailabilityPost(result.rows[0]) : null;
  }

  /**
   * Find all posts for a specific band
   */
  static async findByBandProfileId(bandProfileId, activeOnly = true) {
    let sql = 'SELECT * FROM availability_posts WHERE band_profile_id = $1';
    if (activeOnly) {
      sql += ' AND is_active = true';
    }
    sql += ' ORDER BY start_date ASC';

    const result = await db.query(sql, [bandProfileId]);
    return result.rows.map(row => new AvailabilityPost(row));
  }

  /**
   * Create a new availability post
   */
  static async create(data) {
    const result = await db.query(
      `INSERT INTO availability_posts (
        band_profile_id, start_date, end_date, notes, is_active
      ) VALUES ($1, $2, $3, $4, true)
      RETURNING *`,
      [data.bandProfileId, data.startDate, data.endDate, data.notes || null]
    );
    return new AvailabilityPost(result.rows[0]);
  }

  /**
   * Soft delete an availability post
   */
  static async delete(id) {
    const result = await db.query(
      'UPDATE availability_posts SET is_active = false WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] ? new AvailabilityPost(result.rows[0]) : null;
  }

  /**
   * Increment view counter
   */
  static async incrementViews(id) {
    await db.query(
      'UPDATE availability_posts SET views = views + 1 WHERE id = $1',
      [id]
    );
  }
}

module.exports = AvailabilityPost;
