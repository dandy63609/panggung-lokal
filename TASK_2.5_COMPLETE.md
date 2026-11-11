# Task 2.5: JWT Authentication Middleware - COMPLETE ✓

## Summary

Successfully implemented JWT authentication middleware in `middleware/auth.js` with comprehensive functionality for token generation, verification, and route protection.

## Implementation Details

### Created Files

1. **middleware/auth.js** - JWT authentication middleware with:
   - `generateToken(user)` - Generates JWT tokens with 7-day expiration
   - `verifyToken(req, res, next)` - Verifies JWT from Authorization header
   - `requireAuth` - Middleware for general authentication
   - `requireBand` - Middleware to restrict access to band accounts only
   - `requireOrganizer` - Middleware to restrict access to organizer accounts only

2. **__tests__/auth.middleware.test.js** - Comprehensive test suite with 17 tests

### Key Features

#### Token Generation
- Creates JWT tokens with user id, email, and accountType
- Uses 7-day expiration as specified in requirements
- Reads JWT_SECRET from environment variables

#### Token Verification
- Extracts token from Authorization header (Bearer format)
- Verifies token signature and expiration
- Checks if user exists in database
- Verifies user account is active
- Adds user data to `req.user` for downstream middleware

#### Route Protection
- **requireAuth**: Allows any authenticated user
- **requireBand**: Only allows users with account_type = 'band'
- **requireOrganizer**: Only allows users with account_type = 'organizer'

### Error Handling

The middleware provides clear Indonesian error messages for:
- Missing authorization header: "Token autentikasi tidak ditemukan"
- Invalid token format: "Token tidak valid"
- Expired token: "Token telah kadaluarsa"
- User not found: "Pengguna tidak ditemukan"
- Inactive account: "Akun telah dinonaktifkan"
- Wrong account type: "Akses ditolak. Hanya untuk akun [band/penyelenggara]"

### Test Results

✅ **All 17 tests passed**

Test coverage for auth.js:
- Statements: 92.68%
- Branches: 81.81%
- Functions: 100%
- Lines: 92.68%

### Tests Verified

**Token Generation:**
- ✓ Generates valid JWT tokens
- ✓ Sets 7-day expiration correctly
- ✓ Generates unique tokens for different users

**Token Verification:**
- ✓ Verifies valid tokens and adds user to request
- ✓ Rejects requests without Authorization header
- ✓ Rejects requests without Bearer prefix
- ✓ Rejects invalid tokens
- ✓ Rejects expired tokens
- ✓ Rejects tokens for non-existent users
- ✓ Rejects tokens for inactive users

**Route Protection:**
- ✓ requireAuth is correctly aliased to verifyToken
- ✓ requireBand allows band accounts and rejects others
- ✓ requireOrganizer allows organizer accounts and rejects others
- ✓ Both middleware reject unauthenticated requests

## Usage Examples

### Generate Token on Login
```javascript
const { generateToken } = require('./middleware/auth');

// In login route
const token = generateToken({
  id: user.id,
  email: user.email,
  accountType: user.accountType
});

res.json({
  success: true,
  token,
  user: { id: user.id, email: user.email, accountType: user.accountType }
});
```

### Protect Routes
```javascript
const { requireAuth, requireBand, requireOrganizer } = require('./middleware/auth');

// Any authenticated user
app.get('/api/profile', requireAuth, (req, res) => {
  // req.user contains { id, email, accountType }
  res.json({ user: req.user });
});

// Band only
app.post('/api/availability', requireBand, (req, res) => {
  // Only bands can create availability posts
  // req.user.accountType === 'band'
});

// Organizer only
app.post('/api/connections', requireOrganizer, (req, res) => {
  // Only organizers can create connections
  // req.user.accountType === 'organizer'
});
```

### Client-Side Usage
```javascript
// Store token after login
localStorage.setItem('auth_token', token);

// Include in API requests
fetch('/api/availability', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data)
});
```

## Requirements Fulfilled

✅ **Requirement 1.3** - User authentication and session management
- JWT tokens generated on login
- 7-day token expiration implemented
- Token verification from Authorization header
- User session maintained via JWT

## Next Steps

This middleware is now ready to be integrated with:
- Task 4.1: POST /api/auth/register endpoint
- Task 4.2: POST /api/auth/login endpoint (use generateToken)
- Task 6.2+: Band profile endpoints (use requireBand)
- Task 11.2: Connection endpoint (use requireOrganizer)
- Task 12.1: Band dashboard (use requireBand)
- Task 12.2: Organizer dashboard (use requireOrganizer)

## Configuration

Ensure these environment variables are set in `.env`:
```
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

## Notes

- The middleware performs database lookups on each request to verify user existence and active status
- This provides real-time security (suspended users are immediately blocked)
- For high-traffic applications, consider adding Redis caching for user data
- All error messages are in Indonesian as per Requirement 8.1
- The middleware follows Express.js middleware conventions
