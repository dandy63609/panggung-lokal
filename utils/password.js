/**
 * Password hashing utilities using Web Crypto PBKDF2-SHA256
 * with legacy bcrypt verification for backward compatibility.
 * Requirements: 1.5 - THE Platform SHALL store passwords using secure hashing algorithms
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const webCrypto =
  globalThis.crypto && globalThis.crypto.subtle ? globalThis.crypto : crypto.webcrypto;
const TextEncoderCtor =
  typeof TextEncoder !== 'undefined' ? TextEncoder : require('util').TextEncoder;

const PBKDF2_PREFIX = 'pbkdf2_sha256';
// 100,000 iterations is the maximum supported by Cloudflare Workers (workerd)
const PBKDF2_ITERATIONS = 100000;
const MIN_PBKDF2_ITERATIONS = 1000;
const MAX_PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function bytesToHex(bytes) {
  let hex = '';
  for (let i = 0; i < bytes.length; i += 1) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

function hexToBytes(hex) {
  if (
    typeof hex !== 'string' ||
    hex.length === 0 ||
    hex.length % 2 !== 0 ||
    !/^[0-9a-f]+$/i.test(hex)
  ) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function timingSafeEqualBytes(a, b) {
  if (!(a instanceof Uint8Array) || !(b instanceof Uint8Array) || a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

function isLegacyBcryptHash(hash) {
  return typeof hash === 'string' && /^\$2[aby]\$\d{2}\$/.test(hash);
}

function parsePbkdf2Hash(hash) {
  if (typeof hash !== 'string' || !hash.startsWith(`${PBKDF2_PREFIX}$`)) {
    return null;
  }

  const parts = hash.split('$');
  if (parts.length !== 4) {
    return null;
  }

  const [prefix, iterStr, saltHex, keyHex] = parts;
  if (prefix !== PBKDF2_PREFIX || !iterStr) {
    return null;
  }

  const iterations = Number(iterStr);
  if (
    !Number.isInteger(iterations) ||
    String(iterations) !== iterStr ||
    iterations < MIN_PBKDF2_ITERATIONS ||
    iterations > MAX_PBKDF2_ITERATIONS
  ) {
    return null;
  }

  const saltBytes = hexToBytes(saltHex);
  const expectedKeyBytes = hexToBytes(keyHex);
  if (
    !saltBytes ||
    saltBytes.length < SALT_BYTES ||
    !expectedKeyBytes ||
    expectedKeyBytes.length !== KEY_BYTES
  ) {
    return null;
  }

  return { iterations, saltBytes, expectedKeyBytes };
}

async function derivePbkdf2Key(password, saltBytes, iterations) {
  if (!webCrypto || !webCrypto.subtle) {
    throw new Error('Web Crypto subtle API is unavailable');
  }

  const encodedPassword = new TextEncoderCtor().encode(password);
  const keyMaterial = await webCrypto.subtle.importKey(
    'raw',
    encodedPassword,
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await webCrypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_BYTES * 8
  );
  return new Uint8Array(derivedBits);
}

/**
 * Hash a plaintext password using Web Crypto PBKDF2-SHA256
 * @param {string} password - The plaintext password to hash
 * @returns {Promise<string>} - The hashed password
 * @throws {Error} - If password is invalid or hashing fails
 */
async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }

  try {
    if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
      throw new Error('Web Crypto getRandomValues is unavailable');
    }
    const salt = webCrypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const derivedKey = await derivePbkdf2Key(password, salt, PBKDF2_ITERATIONS);
    return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(derivedKey)}`;
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Verify a plaintext password against a stored password hash
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
    if (hash.startsWith(`${PBKDF2_PREFIX}$`)) {
      const parsed = parsePbkdf2Hash(hash);
      if (!parsed) {
        return false;
      }

      const derivedKeyBytes = await derivePbkdf2Key(
        password,
        parsed.saltBytes,
        parsed.iterations
      );
      return timingSafeEqualBytes(derivedKeyBytes, parsed.expectedKeyBytes);
    }

    if (isLegacyBcryptHash(hash)) {
      return await bcrypt.compare(password, hash);
    }

    return false;
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
}

/**
 * Check whether a stored hash should be upgraded to the current PBKDF2 format
 * @param {string} hash - The stored password hash
 * @returns {boolean} - True if the hash is legacy or uses outdated parameters
 */
function needsRehash(hash) {
  const parsed = parsePbkdf2Hash(hash);
  return !parsed || parsed.iterations !== PBKDF2_ITERATIONS;
}

module.exports = {
  hashPassword,
  verifyPassword,
  needsRehash,
  PBKDF2_ITERATIONS,
  PBKDF2_PREFIX
};
