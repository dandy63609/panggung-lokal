const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const getJwtSecret = () => process.env.JWT_SECRET || 'panggung-lokal-dev-secret-key-2026';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

/**
 * JWT Authentication Middleware
 * Provides token generation, verification, and route protection
 * Requirements: 1.3 (User authentication and session management)
 */

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id, email, and accountType
 * @returns {string} JWT token with 7-day expiration
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    accountType: user.accountType,
    ...(user.mockAdmin === true && { mockAdmin: true })
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn()
  });
};

/**
 * Middleware to verify JWT token from Authorization header
 * Adds decoded user data to req.user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const verifyToken = async (req, res, next) => {
  try {
    // Extract token from Authorization header or cookie
    const cookieToken = getCookie(req, 'panggung_lokal_token');
    const authHeader = req.headers.authorization || (cookieToken ? `Bearer ${cookieToken}` : null);
    
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.trim() === 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak ditemukan'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, getJwtSecret());

    // Temporary demo admin is signed by the server and does not have a DB row.
    if (decoded.mockAdmin === true && decoded.id === 'mock-admin' && decoded.email === 'admin@admin.com' && decoded.accountType === 'admin') {
      req.user = { id: decoded.id, email: decoded.email, accountType: decoded.accountType };
      return next();
    }

    // Fetch user from database to ensure they still exist and are active
    const result = await db.query(
      'SELECT id, email, account_type, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Pengguna tidak ditemukan'
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun telah dinonaktifkan'
      });
    }

    // Add user data to request object
    req.user = {
      id: user.id,
      email: user.email,
      accountType: user.account_type
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token telah kadaluarsa'
      });
    }

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Kesalahan verifikasi token'
    });
  }
};

/**
 * Middleware to require authentication
 * Use this middleware on routes that require any authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireAuth = verifyToken;

const getCookie = (req, name) => {
  const cookie = req.headers.cookie || '';
  const item = cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
};

const requireAdmin = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user.accountType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses khusus admin' });
    }
    next();
  });
};

const requireAdminPage = (req, res, next) => {
  const pageResponse = Object.create(res);
  pageResponse.status = (statusCode) => {
    if (statusCode === 401 || statusCode === 403) {
      res.redirect('/login.html');
      return pageResponse;
    }
    res.status(statusCode);
    return pageResponse;
  };
  pageResponse.json = (body) => {
    if (!res.headersSent) res.json(body);
    return pageResponse;
  };

  return requireAdmin(req, pageResponse, next);
};

/**
 * Middleware to require band account type
 * Use this middleware on routes that only bands should access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireBand = async (req, res, next) => {
  // First verify the token
  await verifyToken(req, res, (error) => {
    if (error) {
      return;
    }

    // Check if user is a band
    if (req.user.accountType !== 'band') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya untuk akun band'
      });
    }

    next();
  });
};

/**
 * Middleware to require organizer account type
 * Use this middleware on routes that only organizers should access
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const requireOrganizer = async (req, res, next) => {
  // First verify the token
  await verifyToken(req, res, (error) => {
    if (error) {
      return;
    }

    // Check if user is an organizer
    if (req.user.accountType !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya untuk akun penyelenggara'
      });
    }

    next();
  });
};

module.exports = {
  generateToken,
  verifyToken,
  requireAuth,
  requireBand,
  requireOrganizer,
  requireAdmin,
  requireAdminPage
};
