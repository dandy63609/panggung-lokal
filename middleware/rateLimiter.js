/**
 * Rate Limiting Middleware
 * Protects API routes and authentication endpoints from abuse
 */

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 * Limits: 100 requests per 15 minutes per IP
 * Applied to all API routes
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Terlalu banyak permintaan, coba lagi nanti'
    }
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip successful requests for rate limit counting (optional)
  skipSuccessfulRequests: false,
  // Skip failed requests for rate limit counting (optional)
  skipFailedRequests: false,
});

/**
 * Authentication rate limiter
 * Limits: 5 requests per 15 minutes per IP
 * Applied specifically to login/register/password-reset endpoints
 * More restrictive to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login/auth attempts per 15 minutes
  message: {
    success: false,
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Terlalu banyak percobaan login, coba lagi nanti'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip successful requests to allow legitimate users to proceed
  skipSuccessfulRequests: true,
});

/**
 * Upload rate limiter
 * Limits: 10 uploads per 15 minutes per IP
 * Applied to file upload endpoints to prevent storage abuse
 */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 uploads per 15 minutes
  message: {
    success: false,
    error: {
      code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
      message: 'Terlalu banyak upload, coba lagi nanti'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter
};
