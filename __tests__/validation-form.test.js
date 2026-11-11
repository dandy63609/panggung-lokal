/**
 * @jest-environment jsdom
 * 
 * Unit Tests for FormValidator Class
 * Requires jsdom environment for DOM manipulation
 */

const { FormValidator } = require('../utils/validation');

describe('FormValidator class', () => {
  let mockForm;
  let validator;

  beforeEach(() => {
    // Create a mock form element
    document.body.innerHTML = `
      <form id="test-form">
        <div>
          <input type="text" name="band_name" required />
        </div>
        <div>
          <input type="email" name="email" required />
        </div>
        <div>
          <input type="tel" name="phone" required />
        </div>
        <div>
          <input type="date" name="start_date" required />
        </div>
        <div>
          <input type="date" name="end_date" required />
        </div>
      </form>
    `;
    mockForm = document.getElementById('test-form');
    validator = new FormValidator(mockForm);
  });

  test('initializes with empty errors', () => {
    expect(validator.errors).toEqual({});
    expect(validator.isValid()).toBe(true);
  });

  test('validates email using helper method', () => {
    expect(validator.validateEmail('user@example.com')).toBe(true);
    expect(validator.validateEmail('invalid')).toBe(false);
  });

  test('validates phone using helper method', () => {
    expect(validator.validatePhone('+628123456789')).toBe(true);
    expect(validator.validatePhone('invalid')).toBe(false);
  });

  test('validates date range using helper method', () => {
    expect(validator.validateDateRange('2024-12-15', '2024-12-22')).toBe(true);
    expect(validator.validateDateRange('2024-12-22', '2024-12-15')).toBe(false);
  });

  test('validates required using helper method', () => {
    expect(validator.validateRequired('text')).toBe(true);
    expect(validator.validateRequired('')).toBe(false);
  });

  test('shows error for a field', () => {
    validator.showError('band_name', 'Nama band harus diisi');
    
    expect(validator.errors['band_name']).toBe('Nama band harus diisi');
    expect(validator.isValid()).toBe(false);
    
    const field = mockForm.querySelector('[name="band_name"]');
    expect(field.classList.contains('error')).toBe(true);
  });

  test('clears all errors', () => {
    validator.showError('band_name', 'Error 1');
    validator.showError('email', 'Error 2');
    
    expect(validator.isValid()).toBe(false);
    
    validator.clearErrors();
    
    expect(validator.errors).toEqual({});
    expect(validator.isValid()).toBe(true);
  });

  test('clears specific field error', () => {
    validator.showError('band_name', 'Error 1');
    validator.showError('email', 'Error 2');
    
    validator.clearError('band_name');
    
    expect(validator.errors['band_name']).toBeUndefined();
    expect(validator.errors['email']).toBe('Error 2');
  });

  test('gets all errors', () => {
    validator.showError('field1', 'Error 1');
    validator.showError('field2', 'Error 2');
    
    const errors = validator.getErrors();
    expect(errors).toEqual({
      field1: 'Error 1',
      field2: 'Error 2'
    });
  });

  test('validates form with required fields', () => {
    // Empty form should fail validation
    const isValid = validator.validateForm();
    expect(isValid).toBe(false);
    expect(Object.keys(validator.errors).length).toBeGreaterThan(0);
  });

  test('validates form with valid data', () => {
    mockForm.querySelector('[name="band_name"]').value = 'Test Band';
    mockForm.querySelector('[name="email"]').value = 'test@example.com';
    mockForm.querySelector('[name="phone"]').value = '+628123456789';
    mockForm.querySelector('[name="start_date"]').value = '2024-12-15';
    mockForm.querySelector('[name="end_date"]').value = '2024-12-22';
    
    const isValid = validator.validateForm();
    expect(isValid).toBe(true);
    expect(validator.errors).toEqual({});
  });

  test('validates email format in form', () => {
    mockForm.querySelector('[name="band_name"]').value = 'Test Band';
    mockForm.querySelector('[name="email"]').value = 'invalid-email';
    mockForm.querySelector('[name="phone"]').value = '+628123456789';
    mockForm.querySelector('[name="start_date"]').value = '2024-12-15';
    mockForm.querySelector('[name="end_date"]').value = '2024-12-22';
    
    const isValid = validator.validateForm();
    expect(isValid).toBe(false);
    expect(validator.errors['email']).toBe('Format email tidak valid');
  });

  test('validates phone format in form', () => {
    mockForm.querySelector('[name="band_name"]').value = 'Test Band';
    mockForm.querySelector('[name="email"]').value = 'test@example.com';
    mockForm.querySelector('[name="phone"]').value = 'invalid-phone';
    mockForm.querySelector('[name="start_date"]').value = '2024-12-15';
    mockForm.querySelector('[name="end_date"]').value = '2024-12-22';
    
    const isValid = validator.validateForm();
    expect(isValid).toBe(false);
    expect(validator.errors['phone']).toBe('Format nomor telepon tidak valid');
  });

  test('validates date range in form', () => {
    mockForm.querySelector('[name="band_name"]').value = 'Test Band';
    mockForm.querySelector('[name="email"]').value = 'test@example.com';
    mockForm.querySelector('[name="phone"]').value = '+628123456789';
    mockForm.querySelector('[name="start_date"]').value = '2024-12-22';
    mockForm.querySelector('[name="end_date"]').value = '2024-12-15';
    
    const isValid = validator.validateForm();
    expect(isValid).toBe(false);
    expect(validator.errors['end_date']).toBe('Tanggal akhir tidak boleh sebelum tanggal mulai');
  });
});

describe('formatWhatsAppNumber utility', () => {
  const { formatWhatsAppNumber } = require('../public/js/utils');

  test('normalizes Indonesian 08xx number to 628xx', () => {
    expect(formatWhatsAppNumber('081234567890')).toBe('6281234567890');
    expect(formatWhatsAppNumber('0812-3456-7890')).toBe('6281234567890');
    expect(formatWhatsAppNumber('(0812) 3456 7890')).toBe('6281234567890');
  });

  test('keeps international format +628xx', () => {
    expect(formatWhatsAppNumber('+6281234567890')).toBe('6281234567890');
    expect(formatWhatsAppNumber('6281234567890')).toBe('6281234567890');
  });

  test('handles null, undefined or empty input safely', () => {
    expect(formatWhatsAppNumber('')).toBe('');
    expect(formatWhatsAppNumber(null)).toBe('');
    expect(formatWhatsAppNumber(undefined)).toBe('');
  });
});
