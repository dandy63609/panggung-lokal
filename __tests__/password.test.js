/**
 * Tests for password hashing utilities
 * Requirements: 1.5 - Password security
 */

const { hashPassword, verifyPassword, SALT_ROUNDS } = require('../utils/password');

describe('Password Hashing Utilities', () => {
  describe('hashPassword', () => {
    test('should hash a valid password', async () => {
      const password = 'mySecurePassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password); // Hash should not equal plaintext
      expect(hash.length).toBeGreaterThan(0);
    });

    test('should produce different hashes for the same password (due to salt)', async () => {
      const password = 'samePassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts produce different hashes
    });

    test('should use cost factor of 12', () => {
      expect(SALT_ROUNDS).toBe(12);
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

  describe('Security Properties', () => {
    test('should never store password in plaintext', async () => {
      const password = 'myPassword123';
      const hash = await hashPassword(password);

      expect(hash).not.toContain(password);
      expect(hash).not.toBe(password);
    });

    test('should produce hash of sufficient length', async () => {
      const password = 'short';
      const hash = await hashPassword(password);

      // bcrypt hashes are 60 characters long
      expect(hash.length).toBe(60);
    });

    test('should produce hash starting with bcrypt identifier', async () => {
      const password = 'testPassword';
      const hash = await hashPassword(password);

      // bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });
});
