/**
 * Password hashing utilities using bcrypt
 * Requirements: 1.5 - THE Platform SHALL store passwords using secure hashing algorithms
 */

const bcrypt = require('bcrypt');

// Cost factor for bcrypt (number of salt rounds)
// Higher = more secure but slower
const SALT_ROUNDS = 12;

/**
 * Hash a plaintext password using bcrypt
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} - The hashed password
 * @throws {Error} - If password is invalid or hashing fails
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Verify a plaintext password against a hashed password
 * @param {string} password - The plaintext password to verify
 * @param {string} hash - The hashed password to compare against
 * @returns {Promise<boolean>} - True if password matches, false otherwise
 * @throws {Error} - If inputs are invalid or verification fails
 */
async function verifyPassword(password, hash) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  if (!hash || typeof hash !== 'string') {
    throw new Error('Hash must be a non-empty string');
  }

  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  SALT_ROUNDS
};
