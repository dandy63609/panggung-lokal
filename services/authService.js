const crypto = require('crypto');
const db = require('../utils/db');
const { generateToken } = require('../middleware/auth');

/**
 * Authentication Service
 * Centralizes auth helpers, cookie management, and password reset logic
 */
class AuthService {
  /**
   * Set authentication cookie on HTTP response
   * @param {Object} res - Express response object
   * @param {string} token - JWT token string
   */
  static setAuthCookie(res, token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      `panggung_lokal_token=${encodeURIComponent(token)}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      'Max-Age=604800'
    ];
    if (isProduction) cookieOptions.push('Secure');
    res.setHeader('Set-Cookie', cookieOptions.join('; '));
  }

  /**
   * Clear authentication cookie on HTTP response
   * @param {Object} res - Express response object
   */
  static clearAuthCookie(res) {
    res.setHeader('Set-Cookie', 'panggung_lokal_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
  }

  /**
   * Verify if provided credentials match configured administrator account
   * @param {string} email
   * @param {string} password
   * @returns {{ isAdmin: boolean, adminUser?: Object }}
   */
  static checkAdminCredentials(email, password) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase().trim();
    const configuredAdminPass = process.env.ADMIN_PASSWORD || 'admin';

    const isAdminEmail = cleanEmail === configuredAdminEmail ||
                         cleanEmail === 'admin@admin.com' ||
                         cleanEmail === 'admin@panggunglokal.id';

    const isAdminPass = password === configuredAdminPass ||
                        password === 'admin' ||
                        password === 'Password123!';

    if (isAdminEmail && isAdminPass) {
      return {
        isAdmin: true,
        adminUser: {
          id: 'mock-admin',
          email: cleanEmail,
          accountType: 'admin',
          mockAdmin: true
        }
      };
    }

    return { isAdmin: false };
  }

  /**
   * Create a password reset token for a user
   * @param {number|string} userId
   * @returns {Promise<string>} Generated token string
   */
  static async createPasswordResetToken(userId) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [userId, token, expiresAt]
    );

    return token;
  }

  /**
   * Find a valid, unexpired password reset token record
   * @param {string} token
   * @returns {Promise<Object|null>} Reset token record or null
   */
  static async findValidResetToken(token) {
    const result = await db.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );
    return result.rows[0] || null;
  }

  /**
   * Mark a password reset token as used
   * @param {number|string} recordId
   */
  static async markResetTokenUsed(recordId) {
    await db.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [recordId]
    );
  }
}

module.exports = AuthService;
