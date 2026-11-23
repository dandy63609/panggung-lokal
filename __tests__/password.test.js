/**
 * Tests for password hashing utilities (Web Crypto PBKDF2 + legacy bcrypt support)
 * Requirements: 1.5 - Password security
 */

const bcrypt = require('bcryptjs');
const {
  hashPassword,
  verifyPassword,
  needsRehash,
  PBKDF2_ITERATIONS,
  PBKDF2_PREFIX
} = require('../utils/password');

describe('Password Hashing Utilities', () => {
  describe('hashPassword', () => {
    test('should hash a valid password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should produce different hashes for the same password (due to salt)', async () => {
      const password = 'samePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    test('should configure PBKDF2-SHA256 with 100,000 iterations', () => {
      expect(PBKDF2_PREFIX).toBe('pbkdf2_sha256');
      expect(PBKDF2_ITERATIONS).toBe(100000);
    });

    test('should throw error for empty password', async () => {
      await expect(hashPassword('')).rejects.toThrow('Password must be a non-empty string');
    });

    test('should throw error for null password', async () => {
      await expect(hashPassword(null)).rejects.toThrow('Password must be a non-empty string');
    });

    test('should throw error for undefined password', async () => {
      await expect(hashPassword(undefined)).rejects.toThrow('Password must be a non-empty string');
    });

    test('should throw error for non-string password', async () => {
      await expect(hashPassword(12345)).rejects.toThrow('Password must be a non-empty string');
    });
  });

  describe('verifyPassword', () => {
    test('should verify correct password', async () => {
      const password = 'correctPassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should reject incorrect password', async () => {
      const password = 'correctPassword123';
      const wrongPassword = 'wrongPassword456';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    test('should verify legacy bcrypt hashes cleanly', async () => {
      const legacyHash = bcrypt.hashSync('legacyPass123', 6);

      await expect(verifyPassword('legacyPass123', legacyHash)).resolves.toBe(true);
      await expect(verifyPassword('wrongPass', legacyHash)).resolves.toBe(false);
    });

    test('should reject malformed, out-of-bounds, and unrecognized hashes without throwing', async () => {
      const validHexSalt = 'aa'.repeat(16);
      const validHexKey = 'bb'.repeat(32);

      await expect(verifyPassword('password123', 'pbkdf2_sha256$100000$short')).resolves.toBe(false);
      await expect(
        verifyPassword('password123', `pbkdf2_sha256$notanumber$${validHexSalt}$${validHexKey}`)
      ).resolves.toBe(false);
      await expect(
        verifyPassword('password123', `pbkdf2_sha256$9999999$${validHexSalt}$${validHexKey}`)
      ).resolves.toBe(false);
      await expect(
        verifyPassword('password123', `pbkdf2_sha256$500$${validHexSalt}$${validHexKey}`)
      ).resolves.toBe(false);
      await expect(
        verifyPassword('password123', `pbkdf2_sha256$100000$${'zz'.repeat(16)}$${validHexKey}`)
      ).resolves.toBe(false);
      await expect(verifyPassword('password123', 'argon2id$v=19$invalidformat')).resolves.toBe(
        false
      );
    });

    test('should reject empty password', async () => {
      const hash = await hashPassword('testPassword');
      await expect(verifyPassword('', hash)).rejects.toThrow('Password must be a non-empty string');
    });

    test('should reject null password', async () => {
      const hash = await hashPassword('testPassword');
      await expect(verifyPassword(null, hash)).rejects.toThrow('Password must be a non-empty string');
    });

    test('should reject empty hash', async () => {
      await expect(verifyPassword('password123', '')).rejects.toThrow('Hash must be a non-empty string');
    });

    test('should reject null hash', async () => {
      await expect(verifyPassword('password123', null)).rejects.toThrow('Hash must be a non-empty string');
    });

    test('should handle special characters in password', async () => {
      const password = 'p@$$w0rd!#%&*()_+-=[]{}|;:,.<>?';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should handle unicode characters in password', async () => {
      const password = 'パスワード123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    test('should be case-sensitive', async () => {
      const password = 'Password123';
      const hash = await hashPassword(password);
      const isValidLower = await verifyPassword('password123', hash);
      const isValidUpper = await verifyPassword('PASSWORD123', hash);

      expect(isValidLower).toBe(false);
      expect(isValidUpper).toBe(false);
    });
  });

  describe('needsRehash', () => {
    test('should return false for a fresh PBKDF2 hash', async () => {
      const hash = await hashPassword('myPassword123');
      expect(needsRehash(hash)).toBe(false);
    });

    test('should return true for legacy bcrypt, outdated iterations, or invalid hashes', () => {
      const legacyHash = bcrypt.hashSync('legacyPass123', 6);
      const lowerIterHash = `pbkdf2_sha256$50000$${'aa'.repeat(16)}$${'bb'.repeat(32)}`;

      expect(needsRehash(legacyHash)).toBe(true);
      expect(needsRehash(lowerIterHash)).toBe(true);
      expect(needsRehash('pbkdf2_sha256$100000$broken')).toBe(true);
      expect(needsRehash('')).toBe(true);
      expect(needsRehash(null)).toBe(true);
    });
  });

  describe('Security Properties', () => {
    test('should never store password in plaintext', async () => {
      const password = 'myPassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toContain(password);
      expect(hash).not.toBe(password);
    });

    test('should produce formatted PBKDF2-SHA256 hash of 118 characters', async () => {
      const password = 'short';
      const hash = await hashPassword(password);

      expect(hash).toMatch(/^pbkdf2_sha256\$100000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
      expect(hash.length).toBe(118);
    });
  });
});
