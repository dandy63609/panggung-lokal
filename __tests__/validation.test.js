/**
 * Unit Tests for Validation Helper Functions
 * Tests for email, phone, date range, and required field validation
 * 
 * Note: FormValidator class tests are in validation-form.test.js
 * (requires jsdom environment for DOM manipulation)
 */

const {
  validateEmail,
  validatePhone,
  validateDateRange,
  validateRequired,
  parsePositiveInt,
  isSafeMediaUrl
} = require('../utils/validation');

describe('validateEmail', () => {
  test('accepts valid email addresses', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.id')).toBe(true);
    expect(validateEmail('band123@gmail.com')).toBe(true);
  });

  test('rejects invalid email addresses', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@example.com')).toBe(false);
    expect(validateEmail('user@')).toBe(false);
    expect(validateEmail('user@domain')).toBe(false);
    expect(validateEmail('')).toBe(false);
  });

  test('handles edge cases', () => {
    expect(validateEmail(null)).toBe(false);
    expect(validateEmail(undefined)).toBe(false);
    expect(validateEmail(123)).toBe(false);
    expect(validateEmail('  user@example.com  ')).toBe(true); // should trim
  });
});

describe('validatePhone', () => {
  test('accepts valid Indonesian phone numbers', () => {
    // +62 format
    expect(validatePhone('+628123456789')).toBe(true);
    expect(validatePhone('+6281234567890')).toBe(true);
    expect(validatePhone('+628123456789012')).toBe(true);
    
    // 62 format without +
    expect(validatePhone('628123456789')).toBe(true);
    
    // 08 format
    expect(validatePhone('081234567890')).toBe(true);
    expect(validatePhone('085678901234')).toBe(true);
  });

  test('accepts phone numbers with spaces and dashes', () => {
    expect(validatePhone('+62 812-3456-7890')).toBe(true);
    expect(validatePhone('0812 3456 7890')).toBe(true);
    expect(validatePhone('+62-812-345-6789')).toBe(true);
  });

  test('rejects invalid phone numbers', () => {
    // Too short
    expect(validatePhone('+62812345')).toBe(false);
    expect(validatePhone('0812345')).toBe(false);
    
    // Too long
    expect(validatePhone('+628123456789012345')).toBe(false);
    
    // Wrong prefix
    expect(validatePhone('1234567890')).toBe(false);
    expect(validatePhone('+1234567890')).toBe(false);
    
    // Empty or invalid
    expect(validatePhone('')).toBe(false);
    expect(validatePhone('not-a-phone')).toBe(false);
  });

  test('handles edge cases', () => {
    expect(validatePhone(null)).toBe(false);
    expect(validatePhone(undefined)).toBe(false);
    expect(validatePhone(123456789)).toBe(false);
  });
});

describe('validateDateRange', () => {
  test('accepts valid date ranges', () => {
    // Same day
    expect(validateDateRange('2024-12-15', '2024-12-15')).toBe(true);
    
    // End after start
    expect(validateDateRange('2024-12-15', '2024-12-22')).toBe(true);
    expect(validateDateRange('2024-01-01', '2024-12-31')).toBe(true);
    
    // Date objects
    const start = new Date('2024-12-15');
    const end = new Date('2024-12-22');
    expect(validateDateRange(start, end)).toBe(true);
  });

  test('rejects invalid date ranges', () => {
    // End before start
    expect(validateDateRange('2024-12-22', '2024-12-15')).toBe(false);
    expect(validateDateRange('2024-12-01', '2024-11-30')).toBe(false);
  });

  test('handles invalid dates', () => {
    expect(validateDateRange('not-a-date', '2024-12-15')).toBe(false);
    expect(validateDateRange('2024-12-15', 'not-a-date')).toBe(false);
    expect(validateDateRange('', '')).toBe(false);
    expect(validateDateRange(null, null)).toBe(false);
    expect(validateDateRange(undefined, undefined)).toBe(false);
  });
});

describe('validateRequired', () => {
  test('accepts non-empty values', () => {
    expect(validateRequired('text')).toBe(true);
    expect(validateRequired('  text  ')).toBe(true); // trimmed non-empty
    expect(validateRequired(123)).toBe(true);
    expect(validateRequired(0)).toBe(true); // zero is valid
    expect(validateRequired(false)).toBe(true); // false is valid
    expect(validateRequired(['item'])).toBe(true);
    expect(validateRequired({ key: 'value' })).toBe(true);
  });

  test('rejects empty values', () => {
    expect(validateRequired('')).toBe(false);
    expect(validateRequired('   ')).toBe(false); // only whitespace
    expect(validateRequired(null)).toBe(false);
    expect(validateRequired(undefined)).toBe(false);
    expect(validateRequired([])).toBe(false); // empty array
    expect(validateRequired(NaN)).toBe(false);
  });
});

describe('parsePositiveInt', () => {
  test('accepts positive integers and numeric strings', () => {
    expect(parsePositiveInt(1)).toBe(1);
    expect(parsePositiveInt(42)).toBe(42);
    expect(parsePositiveInt('7')).toBe(7);
    expect(parsePositiveInt(' 15 ')).toBe(15);
  });

  test('rejects zero, negatives, decimals, and mixed strings', () => {
    expect(parsePositiveInt(0)).toBeNull();
    expect(parsePositiveInt('0')).toBeNull();
    expect(parsePositiveInt(-3)).toBeNull();
    expect(parsePositiveInt('-3')).toBeNull();
    expect(parsePositiveInt('12abc')).toBeNull();
    expect(parsePositiveInt('1.5')).toBeNull();
    expect(parsePositiveInt(null)).toBeNull();
    expect(parsePositiveInt(undefined)).toBeNull();
  });
});

describe('isSafeMediaUrl', () => {
  test('accepts safe http/https, relative paths, and media data URLs', () => {
    expect(isSafeMediaUrl('https://cdn.example.com/photo.jpg')).toBe(true);
    expect(isSafeMediaUrl('http://localhost:3000/uploads/a.png')).toBe(true);
    expect(isSafeMediaUrl('/uploads/photo.jpg')).toBe(true);
    expect(isSafeMediaUrl('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isSafeMediaUrl('data:video/mp4;base64,AAAA')).toBe(true);
    expect(isSafeMediaUrl('data:audio/mpeg;base64,AAAA')).toBe(true);
  });

  test('rejects javascript, protocol-relative, html data, and malformed URLs', () => {
    expect(isSafeMediaUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeMediaUrl('//evil.example.com/payload.js')).toBe(false);
    expect(isSafeMediaUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isSafeMediaUrl('ftp://files.example.com/a.mp3')).toBe(false);
    expect(isSafeMediaUrl('')).toBe(false);
    expect(isSafeMediaUrl(null)).toBe(false);
  });
});
