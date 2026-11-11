const db = require('../utils/db');

/**
 * User Model
 * Handles database operations for user accounts
 * Supports both band and organizer account types
 */
class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.accountType = data.account_type;
    this.createdAt = data.created_at;
    this.lastLogin = data.last_login;
    this.isActive = data.is_active;
  }

  /**
   * Find a user by email address
   * @param {string} email - User's email address
   * @returns {Promise<User|null>} User instance or null if not found
   */
  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  /**
   * Find a user by ID
   * @param {number} id - User ID
   * @returns {Promise<User|null>} User instance or null if not found
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  /**
   * Create a new user account
   * @param {string} email - User's email address
   * @param {string} passwordHash - Hashed password
   * @param {string} accountType - Account type ('band' or 'organizer')
   * @returns {Promise<User>} Created user instance
   */
  static async create(email, passwordHash, accountType) {
    const result = await db.query(
      `INSERT INTO users (email, password_hash, account_type) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [email, passwordHash, accountType]
    );
    return new User(result.rows[0]);
  }

  /**
   * Update the user's password
   * @param {number} id - User ID
   * @param {string} passwordHash - New hashed password
   * @returns {Promise<void>}
   */
  static async updatePassword(id, passwordHash) {
    await db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, id]
    );
  }

  /**
   * Update the user's last login timestamp
   * @returns {Promise<void>}
   */
  async updateLastLogin() {
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [this.id]
    );
  }

  /**
   * Check if user is a band account
   * @returns {boolean} True if account type is 'band'
   */
  isBand() {
    return this.accountType === 'band';
  }

  /**
   * Check if user is an organizer account
   * @returns {boolean} True if account type is 'organizer'
   */
  isOrganizer() {
    return this.accountType === 'organizer';
  }
}

module.exports = User;
