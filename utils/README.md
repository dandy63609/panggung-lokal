# Validation Utilities

This module provides validation helper functions and a FormValidator class for the Panggung Lokal platform.

## Features

- Email validation (Requirement 9.2)
- Indonesian phone number validation (Requirement 9.4)
- Date range validation (Requirements 3.4, 9.3)
- Required field validation (Requirements 1.1, 1.2, 9.1)
- Comprehensive FormValidator class for form validation

## Usage

### Backend (Node.js)

```javascript
const { validateEmail, validatePhone, validateDateRange, validateRequired } = require('./utils/validation');

// Validate email
if (!validateEmail(email)) {
  return res.status(400).json({ error: 'Format email tidak valid' });
}

// Validate phone number
if (!validatePhone(phone)) {
  return res.status(400).json({ error: 'Format nomor telepon tidak valid' });
}

// Validate date range
if (!validateDateRange(startDate, endDate)) {
  return res.status(400).json({ error: 'Tanggal akhir tidak boleh sebelum tanggal mulai' });
}

// Validate required field
if (!validateRequired(bandName)) {
  return res.status(400).json({ error: 'Nama band harus diisi' });
}
```

### Frontend (Browser)

```html
<script src="/utils/validation.js"></script>
<script>
  const form = document.getElementById('registration-form');
  const validator = new FormValidator(form);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    
    // Clear previous errors
    validator.clearErrors();
    
    // Validate form
    if (!validator.validateForm()) {
      console.log('Validation errors:', validator.getErrors());
      return;
    }
    
    // Form is valid, proceed with submission
    submitForm();
  });
</script>
```

## API Reference

### `validateEmail(email)`

Validates email format.

- **Parameters:**
  - `email` (string): Email address to validate
- **Returns:** boolean - `true` if valid, `false` otherwise
- **Example:**
  ```javascript
  validateEmail('user@example.com') // true
  validateEmail('invalid') // false
  ```

### `validatePhone(phone)`

Validates Indonesian phone number format. Accepts:
- `+62` prefix (e.g., `+628123456789`)
- `62` prefix without `+` (e.g., `628123456789`)
- `08` prefix (e.g., `081234567890`)
- Spaces and dashes are allowed (e.g., `+62 812-3456-7890`)

- **Parameters:**
  - `phone` (string): Phone number to validate
- **Returns:** boolean - `true` if valid, `false` otherwise
- **Example:**
  ```javascript
  validatePhone('+628123456789') // true
  validatePhone('081234567890') // true
  validatePhone('1234567890') // false
  ```

### `validateDateRange(startDate, endDate)`

Validates that end date is not before start date.

- **Parameters:**
  - `startDate` (string|Date): Start date
  - `endDate` (string|Date): End date
- **Returns:** boolean - `true` if valid range, `false` otherwise
- **Example:**
  ```javascript
  validateDateRange('2024-12-15', '2024-12-22') // true
  validateDateRange('2024-12-22', '2024-12-15') // false
  ```

### `validateRequired(value)`

Validates that a required field has a value.

- **Parameters:**
  - `value` (any): Value to validate
- **Returns:** boolean - `true` if value exists and is not empty, `false` otherwise
- **Example:**
  ```javascript
  validateRequired('text') // true
  validateRequired('') // false
  validateRequired(null) // false
  ```

### `FormValidator` Class

Comprehensive form validation class with error tracking and display.

#### Constructor

```javascript
const validator = new FormValidator(formElement);
```

- **Parameters:**
  - `formElement` (HTMLFormElement): The form element to validate

#### Methods

##### `showError(fieldName, message)`

Shows an error message for a specific field.

- **Parameters:**
  - `fieldName` (string): Name attribute of the field
  - `message` (string): Error message in Indonesian
- **Example:**
  ```javascript
  validator.showError('email', 'Format email tidak valid');
  ```

##### `clearErrors()`

Clears all error messages and styling.

```javascript
validator.clearErrors();
```

##### `clearError(fieldName)`

Clears error for a specific field.

- **Parameters:**
  - `fieldName` (string): Name attribute of the field
- **Example:**
  ```javascript
  validator.clearError('email');
  ```

##### `isValid()`

Checks if form is valid (no errors).

- **Returns:** boolean - `true` if no errors, `false` otherwise
- **Example:**
  ```javascript
  if (validator.isValid()) {
    // Proceed with form submission
  }
  ```

##### `getErrors()`

Gets all current errors.

- **Returns:** Object - Object containing field names and error messages
- **Example:**
  ```javascript
  const errors = validator.getErrors();
  // { email: 'Format email tidak valid', phone: 'Format nomor telepon tidak valid' }
  ```

##### `validateForm()`

Validates entire form based on field types and HTML5 attributes.

- **Returns:** boolean - `true` if form is valid, `false` otherwise
- **Example:**
  ```javascript
  if (validator.validateForm()) {
    // Form is valid
  }
  ```

## Testing

Run the validation tests:

```bash
npm test -- __tests__/validation.test.js __tests__/validation-form.test.js
```

## Requirements Coverage

- **Requirement 1.1, 1.2:** User registration with required fields validation
- **Requirement 3.4:** Availability post date range validation
- **Requirement 9.1:** Specific error messages for each field
- **Requirement 9.2:** Email format validation
- **Requirement 9.3:** Date validation
- **Requirement 9.4:** Indonesian phone number validation
