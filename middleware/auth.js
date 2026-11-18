const jwt = require('jsonwebtoken');
const db = require('../utils/db');

const AUTH_COOKIE_NAME = 'panggung_lokal_token';
const getJwtSecret = () => {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable must be configured in production');
  }
  return 'panggung-lokal-dev-secret-key-2026';
};
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || '7d';

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

const getCookie = (req, name) => {
  const cookie = req.headers.cookie || '';
  const item = cookie.split(';').map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
};

const setAuthCookie = (res, token) => {
  const cookieOptions = [
    `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=604800'
  ];
  if (process.env.NODE_ENV === 'production') {
    cookieOptions.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieOptions.join('; '));
};

const extractOptionalUser = (req, { allowCookie = true } = {}) => {
  try {
    const cookieToken = allowCookie ? getCookie(req, AUTH_COOKIE_NAME) : null;
    const authHeader = req.headers.authorization || (cookieToken ? `Bearer ${cookieToken}` : null);
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.trim() === 'Bearer') {
      return null;
    }
    return jwt.verify(authHeader.substring(7), getJwtSecret());
  } catch {
    return null;
  }
};

const verifyToken = async (req, res, next) => {
  try {
    const cookieToken = getCookie(req, AUTH_COOKIE_NAME);
    const authHeader = req.headers.authorization || (cookieToken ? `Bearer ${cookieToken}` : null);

    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.trim() === 'Bearer') {
      return res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak ditemukan'
      });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, getJwtSecret());

    // Temporary demo admin is signed by the server in non-production environments and does not have a DB row.
    if (
      process.env.NODE_ENV !== 'production' &&
      decoded.mockAdmin === true &&
      decoded.id === 'mock-admin' &&
      decoded.email === 'admin@admin.com' &&
      decoded.accountType === 'admin'
    ) {
      req.user = { id: decoded.id, email: decoded.email, accountType: decoded.accountType };
      return next();
    }

    const userId = Number(decoded.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    const result = await db.query(
      'SELECT id, email, account_type, is_active FROM users WHERE id = $1',
      [userId]
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

const requireAuth = verifyToken;

const requireAdmin = async (req, res, next) => {
  await verifyToken(req, res, () => {
    if (req.user.accountType !== 'admin') {
      return res.status(403).json({ success: false, message: 'Akses khusus admin' });
    }
    next();
  });
};

const requireAdminPage = (req, res, next) => {
  // Redirect HTML admin page navigations to login instead of returning raw JSON 401/403.
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

const requireBand = async (req, res, next) => {
  await verifyToken(req, res, (error) => {
    if (error) {
      return;
    }

    if (req.user.accountType !== 'band') {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya untuk akun band'
      });
    }

    next();
  });
};

const requireOrganizer = async (req, res, next) => {
  await verifyToken(req, res, (error) => {
    if (error) {
      return;
    }

    // Supports both seeded 'organizer' and registered 'general' EO roles.
    if (!['organizer', 'general'].includes(req.user.accountType)) {
      return res.status(403).json({
        success: false,
        message: 'Akses ditolak. Hanya untuk akun penyelenggara'
      });
    }

    next();
  });
};

module.exports = {
  AUTH_COOKIE_NAME,
  getJwtSecret,
  setAuthCookie,
  extractOptionalUser,
  generateToken,
  verifyToken,
  requireAuth,
  requireBand,
  requireOrganizer,
  requireAdmin,
  requireAdminPage
};
