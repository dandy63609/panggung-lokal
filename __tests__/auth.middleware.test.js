const jwt = require('jsonwebtoken');
const {
  generateToken,
  verifyToken,
  requireAuth,
  requireBand,
  requireOrganizer
} = require('../middleware/auth');
const db = require('../utils/db');

// Mock the database
jest.mock('../utils/db');

describe('JWT Authentication Middleware', () => {
  // Set up environment variables for testing
  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.JWT_EXPIRES_IN = '7d';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const user = {
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      };

      const token = generateToken(user);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Verify the token can be decoded
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(user.id);
      expect(decoded.email).toBe(user.email);
      expect(decoded.accountType).toBe(user.accountType);
    });

    it('should generate token with 7-day expiration', () => {
      const user = {
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      };

      const token = generateToken(user);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check expiration is approximately 7 days from now
      const expirationDate = new Date(decoded.exp * 1000);
      const expectedDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const timeDifference = Math.abs(expirationDate - expectedDate);

      // Allow 1 minute difference for test execution time
      expect(timeDifference).toBeLessThan(60000);
    });

    it('should generate different tokens for different users', () => {
      const user1 = {
        id: 1,
        email: 'band1@example.com',
        accountType: 'band'
      };

      const user2 = {
        id: 2,
        email: 'band2@example.com',
        accountType: 'organizer'
      };

      const token1 = generateToken(user1);
      const token2 = generateToken(user2);

      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should verify valid token and add user to request', async () => {
      const user = {
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      };

      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      db.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'band@example.com',
          account_type: 'band',
          is_active: true
        }]
      });

      await verifyToken(req, res, next);

      expect(db.query).toHaveBeenCalledWith(
        'SELECT id, email, account_type, is_active FROM users WHERE id = $1',
        [1]
      );
      expect(req.user).toEqual({
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      });
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without authorization header', async () => {
      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token autentikasi tidak ditemukan'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request without Bearer prefix', async () => {
      req.headers.authorization = 'InvalidToken';

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token autentikasi tidak ditemukan'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid token', async () => {
      req.headers.authorization = 'Bearer invalid.token.here';

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token tidak valid'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      const user = {
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      };

      // Generate token with immediate expiration
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '0s' });
      req.headers.authorization = `Bearer ${token}`;

      // Wait a moment to ensure token expires
      await new Promise(resolve => setTimeout(resolve, 100));

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Token telah kadaluarsa'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token for non-existent user', async () => {
      const user = {
        id: 999,
        email: 'nonexistent@example.com',
        accountType: 'band'
      };

      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      db.query.mockResolvedValue({
        rows: []
      });

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Pengguna tidak ditemukan'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject token for inactive user', async () => {
      const user = {
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      };

      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      db.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'band@example.com',
          account_type: 'band',
          is_active: false
        }]
      });

      await verifyToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Akun telah dinonaktifkan'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireAuth', () => {
    it('should be an alias for verifyToken', () => {
      expect(requireAuth).toBe(verifyToken);
    });
  });

  describe('requireBand', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should allow band account to proceed', async () => {
      const user = {
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      };

      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      db.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'band@example.com',
          account_type: 'band',
          is_active: true
        }]
      });

      await requireBand(req, res, next);

      expect(req.user.accountType).toBe('band');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject organizer account', async () => {
      const user = {
        id: 2,
        email: 'organizer@example.com',
        accountType: 'organizer'
      };

      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      db.query.mockResolvedValue({
        rows: [{
          id: 2,
          email: 'organizer@example.com',
          account_type: 'organizer',
          is_active: true
        }]
      });

      await requireBand(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Akses ditolak. Hanya untuk akun band'
      });
      expect(next).not.toHaveBeenCalledWith();
    });

    it('should reject unauthenticated request', async () => {
      await requireBand(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireOrganizer', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should allow organizer account to proceed', async () => {
      const user = {
        id: 2,
        email: 'organizer@example.com',
        accountType: 'organizer'
      };

      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      db.query.mockResolvedValue({
        rows: [{
          id: 2,
          email: 'organizer@example.com',
          account_type: 'organizer',
          is_active: true
        }]
      });

      await requireOrganizer(req, res, next);

      expect(req.user.accountType).toBe('organizer');
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject band account', async () => {
      const user = {
        id: 1,
        email: 'band@example.com',
        accountType: 'band'
      };

      const token = generateToken(user);
      req.headers.authorization = `Bearer ${token}`;

      db.query.mockResolvedValue({
        rows: [{
          id: 1,
          email: 'band@example.com',
          account_type: 'band',
          is_active: true
        }]
      });

      await requireOrganizer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Akses ditolak. Hanya untuk akun penyelenggara'
      });
      expect(next).not.toHaveBeenCalledWith();
    });

    it('should reject unauthenticated request', async () => {
      await requireOrganizer(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
