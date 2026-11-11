const db = require('../utils/db');

/**
 * Report Model
 * Handles moderation reports submitted by users
 */
class Report {
  constructor(data) {
    this.id = data.id;
    this.reporterUserId = data.reporter_user_id;
    this.reportedEntityType = data.reported_entity_type;
    this.reportedEntityId = data.reported_entity_id;
    this.reason = data.reason;
    this.status = data.status || 'pending';
    this.adminNotes = data.admin_notes;
    this.createdAt = data.created_at;
    this.resolvedAt = data.resolved_at;
  }

  /**
   * Create a new report
   */
  static async create(data) {
    const result = await db.query(
      `INSERT INTO reports (
        reporter_user_id, reported_entity_type, reported_entity_id, reason, status
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *`,
      [
        data.reporterUserId || null,
        data.reportedEntityType,
        data.reportedEntityId,
        data.reason
      ]
    );
    return new Report(result.rows[0]);
  }

  /**
   * Find all pending reports for admin review
   */
  static async findPending() {
    const result = await db.query(
      `SELECT r.*, u.email as reporter_email 
       FROM reports r
       LEFT JOIN users u ON u.id = r.reporter_user_id
       WHERE r.status = 'pending'
       ORDER BY r.created_at DESC`
    );
    return result.rows.map(row => new Report(row));
  }

  /**
   * Update report status
   */
  static async updateStatus(id, status, adminNotes = null) {
    const result = await db.query(
      `UPDATE reports SET 
        status = $1, 
        admin_notes = COALESCE($2, admin_notes),
        resolved_at = CASE WHEN $1 IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE resolved_at END
       WHERE id = $3
       RETURNING *`,
      [status, adminNotes, id]
    );
    return result.rows[0] ? new Report(result.rows[0]) : null;
  }
}

module.exports = Report;
