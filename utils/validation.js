/**
 * Validation Utility Functions
 * 
 * Provides validation helper functions for email, phone numbers, date ranges,
 * and required fields. Also includes a FormValidator class for comprehensive
 * form validation with error handling.
 * 
 * Requirements: 1.1, 1.2, 3.4, 9.1, 9.2, 9.3, 9.4
 */

/**
 * Validates email format
 * Requirement 9.2: Email validation
 * 
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid, false otherwise
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  // Email must contain @ symbol and have valid format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates Indonesian phone number format
 * Requirement 9.4: Indonesian phone number validation
 * 
 * Accepts formats:
 * - +62xxx (9-12 digits after country code)
 * - 08xxx (9-12 digits total, starting with 08)
 * - 62xxx (9-12 digits after country code)
 * 
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if phone number is valid, false otherwise
 */
function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Remove spaces and dashes for validation
  const cleanPhone = phone.replace(/[\s-]/g, '');
  
  // Indonesian phone patterns:
  // +62 followed by 8-13 digits (total 11-16 chars), or
  // 62 followed by 8-13 digits (total 10-15 chars), or
  // 0 followed by 8-12 digits (total 9-13 chars)
  const phoneRegex = /^(\+62[0-9]{8,13}|62[0-9]{8,13}|0[0-9]{8,12})$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Validates date range ensuring end date is not before start date
 * Requirements 3.4, 9.3: Date range validation
 * 
 * @param {string|Date} startDate - Start date
 * @param {string|Date} endDate - End date
 * @returns {boolean} True if end date is not before start date, false otherwise
 */
function validateDateRange(startDate, endDate) {
  if (!startDate || !endDate) {
    return false;
  }
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Check if dates are valid
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return false;
    }
    
    // End date must be greater than or equal to start date
    return end >= start;
  } catch (error) {
    return false;
  }
}

/**
 * Validates that a required field has a value
 * Requirements 1.1, 1.2, 9.1: Required field validation
 * 
 * @param {any} value - Value to validate
 * @returns {boolean} True if value exists and is not empty, false otherwise
 */
function validateRequired(value) {
  if (value === null || value === undefined) {
    return false;
  }
  
  // For strings, check if non-empty after trimming
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  
  // For arrays, check if non-empty
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  
  // For numbers, check if not NaN
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  
  // For booleans and objects, just check existence
  return true;
}

/**
 * FormValidator Class
 * Comprehensive form validation with error tracking and display
 * Requirements 9.1, 9.2, 9.3, 9.4: Form validation with specific error messages
 */
class FormValidator {
  /**
   * Create a FormValidator instance
   * @param {HTMLFormElement} formElement - The form element to validate
   */
  constructor(formElement) {
    this.form = formElement;
    this.errors = {};
  }

  /**
   * Validate email field
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  validateEmail(email) {
    return validateEmail(email);
  }

  /**
   * Validate phone number field
   * @param {string} phone - Phone number to validate
   * @returns {boolean} True if valid
   */
  validatePhone(phone) {
    return validatePhone(phone);
  }

  /**
   * Validate date range
   * @param {string|Date} startDate - Start date
   * @param {string|Date} endDate - End date
   * @returns {boolean} True if valid
   */
  validateDateRange(startDate, endDate) {
    return validateDateRange(startDate, endDate);
  }

  /**
   * Validate required field
   * @param {any} value - Value to validate
   * @returns {boolean} True if valid
   */
  validateRequired(value) {
    return validateRequired(value);
  }

  /**
   * Show error message for a specific field
   * Requirement 9.1: Display specific error messages for each field
   * 
   * @param {string} fieldName - Name attribute of the field
   * @param {string} message - Error message in Indonesian
   */
  showError(fieldName, message) {
    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.classList.add('error');
      
      // Find or create error message element
      let errorElement = field.parentElement.querySelector('.form-error');
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
      } else {
        // Create error element if it doesn't exist
        errorElement = document.createElement('span');
        errorElement.className = 'form-error';
        errorElement.textContent = message;
        errorElement.style.color = '#E01E37'; // electric-crimson
        errorElement.style.fontSize = '14px';
        errorElement.style.marginTop = '8px';
        errorElement.style.display = 'block';
        field.parentElement.appendChild(errorElement);
      }
    }
    this.errors[fieldName] = message;
  }

  /**
   * Clear all error messages and styling
   */
  clearErrors() {
    const errorFields = this.form.querySelectorAll('.error');
    errorFields.forEach(field => {
      field.classList.remove('error');
    });
    
    const errorMessages = this.form.querySelectorAll('.form-error');
    errorMessages.forEach(errorElement => {
      errorElement.style.display = 'none';
      errorElement.textContent = '';
    });
    
    this.errors = {};
  }

  /**
   * Clear error for a specific field
   * @param {string} fieldName - Name attribute of the field
   */
  clearError(fieldName) {
    const field = this.form.querySelector(`[name="${fieldName}"]`);
    if (field) {
      field.classList.remove('error');
      const errorElement = field.parentElement.querySelector('.form-error');
      if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.textContent = '';
      }
    }
    delete this.errors[fieldName];
  }

  /**
   * Check if form is valid (no errors)
   * @returns {boolean} True if no validation errors exist
   */
  isValid() {
    return Object.keys(this.errors).length === 0;
  }

  /**
   * Get all current errors
   * @returns {Object} Object containing field names and error messages
   */
  getErrors() {
    return { ...this.errors };
  }

  /**
   * Validate entire form based on field types and attributes
   * Automatically validates based on HTML5 attributes (required, type, pattern)
   * @returns {boolean} True if form is valid
   */
  validateForm() {
    this.clearErrors();
    
    // Get all input, select, and textarea elements
    const fields = this.form.querySelectorAll('input, select, textarea');
    
    fields.forEach(field => {
      const fieldName = field.name;
      const fieldValue = field.value;
      const fieldType = field.type;
      
      // Check required fields
      if (field.hasAttribute('required') && !this.validateRequired(fieldValue)) {
        this.showError(fieldName, `${field.placeholder || 'Field ini'} harus diisi`);
      }
      
      // Check email fields
      if (fieldType === 'email' && fieldValue && !this.validateEmail(fieldValue)) {
        this.showError(fieldName, 'Format email tidak valid');
      }
      
      // Check phone fields (tel type or specific name/id)
      if ((fieldType === 'tel' || fieldName.includes('phone') || fieldName.includes('telepon')) 
          && fieldValue && !this.validatePhone(fieldValue)) {
        this.showError(fieldName, 'Format nomor telepon tidak valid');
      }
    });
    
    // Check date ranges (look for start/end date pairs)
    const startDateField = this.form.querySelector('[name*="start"], [name*="mulai"]');
    const endDateField = this.form.querySelector('[name*="end"], [name*="selesai"]');
    
    if (startDateField && endDateField && startDateField.value && endDateField.value) {
      if (!this.validateDateRange(startDateField.value, endDateField.value)) {
        this.showError(endDateField.name, 'Tanggal akhir tidak boleh sebelum tanggal mulai');
      }
    }
    
    return this.isValid();
  }
}

// Export for use in Node.js (backend) and browser (frontend)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateEmail,
    validatePhone,
    validateDateRange,
    validateRequired,
    FormValidator
  };
}
