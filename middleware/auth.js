const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const getJwtSecret = () => process.env.JWT_SECRET || 'panggung-lokal-dev-secret-key-2026';
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

/**
 * Extract cookie value by name from request
 * @param {Object} req - Express request
 * @param {string} name - Cookie key
 * @returns {string|null}
 */
const getCookie = (req, name) => {
  const cookie = req.headers?.cookie || '';
  const item = cookie
    .split(';')
    .map(value => value.trim())
    .find(value => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
};

/**
 * Extract bearer token from Authorization header or HTTP cookie
 * @param {Object} req - Express request
 * @returns {string|null}
 */
const extractToken = (req) => {
  const cookieToken = getCookie(req, 'panggung_lokal_token');
  const authHeader = req.headers?.authorization || (cookieToken ? `Bearer ${cookieToken}` : null);

  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.trim() === 'Bearer') {
    return null;
  }
  return authHeader.substring(7);
};

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object with id, email, and accountType
 * @returns {string} JWT token
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
 * Verify JWT token from Authorization header or cookie
 * Adds decoded user data to req.user
 */
const verifyToken = async (req, res, next) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak ditemukan'
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());

    // Configured admin token signed by server
    if (decoded.mockAdmin === true && decoded.id === 'mock-admin' && decoded.accountType === 'admin') {
      req.user = { id: decoded.id, email: decoded.email, accountType: decoded.accountType };
      return next();
    }

    // Fetch user from database to ensure active state
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
 * Optional Authentication Middleware
 * Populates req.user if valid token exists, but doesn't block unauthenticated guests
 */
const optionalAuth = (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    req.user = {
      id: decoded.id,
      email: decoded.email,
      accountType: decoded.accountType
    };
  } catch (e) {
    req.user = null;
  }
  next();
};

/**
 * Middleware factory to enforce specific account role
 * @param {string} role - Allowed role
 * @param {string} denyMessage - Error message when role does not match
 */
const requireRole = (role, denyMessage) => {
  return async (req, res, next) => {
    await verifyToken(req, res, (error) => {
      if (error) return;

      if (req.user?.accountType !== role) {
        return res.status(403).json({
          success: false,
          message: denyMessage
        });
      }

      next();
    });
  };
};

const requireAuth = verifyToken;
const requireBand = requireRole('band', 'Akses ditolak. Hanya untuk akun band');
const requireOrganizer = requireRole('organizer', 'Akses ditolak. Hanya untuk akun penyelenggara');

const requireAdmin = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user?.accountType !== 'admin') {
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

module.exports = {
  extractToken,
  generateToken,
  verifyToken,
  optionalAuth,
  requireRole,
  requireAuth,
  requireBand,
  requireOrganizer,
  requireAdmin,
  requireAdminPage
};
