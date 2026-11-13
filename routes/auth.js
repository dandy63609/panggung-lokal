const express = require('express');
const router = express.Router();
const User = require('../models/User');
const BandProfile = require('../models/BandProfile');
const AuthService = require('../services/authService');
const { hashPassword, verifyPassword } = require('../utils/password');
const { validateEmail } = require('../utils/validation');
const { generateToken, verifyToken } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

/**
 * POST /api/auth/register
 * Register a new user (band or organizer)
 */
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, accountType, bandName, genre, locationCity } = req.body;

    if (!email || !password || !accountType) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, dan tipe akun wajib diisi'
      });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal terdiri dari 6 karakter'
      });
    }

    let normalizedType = accountType.toLowerCase();
    if (normalizedType === 'organizer') normalizedType = 'general';

    if (!['band', 'general'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe akun harus berupa "band" atau "general"'
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existingUser = await User.findByEmail(cleanEmail);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar, silakan gunakan email lain atau login'
      });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await User.create(cleanEmail, hashedPassword, normalizedType);

    let bandProfile = null;
    if (normalizedType === 'band') {
      bandProfile = await BandProfile.create({
        userId: newUser.id,
        bandName: bandName || cleanEmail.split('@')[0],
        genre: genre || 'Indie / Pop',
        locationCity: locationCity || 'Bandung',
        bio: 'Profil band baru di Panggung Lokal'
      });
    }

    const token = generateToken(newUser);
    AuthService.setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        accountType: newUser.accountType,
        createdAt: newUser.createdAt
      },
      bandProfile
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses registrasi'
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi'
      });
    }

    // 1. Check for configured administrative credentials
    const adminCheck = AuthService.checkAdminCredentials(email, password);
    if (adminCheck.isAdmin) {
      const token = generateToken(adminCheck.adminUser);
      AuthService.setAuthCookie(res, token);
      return res.json({
        success: true,
        message: 'Login admin berhasil',
        token,
        user: adminCheck.adminUser
      });
    }

    // 2. Authenticate regular user
    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findByEmail(cleanEmail);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Hubungi admin untuk bantuan.'
      });
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    await user.updateLastLogin();

    let bandProfile = null;
    if (user.isBand()) {
      bandProfile = await BandProfile.findByUserId(user.id);
    }

    const token = generateToken(user);
    AuthService.setAuthCookie(res, token);

    return res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: {
        id: user.id,
        email: user.email,
        accountType: user.accountType,
        createdAt: user.createdAt
      },
      bandProfile
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat proses login'
    });
  }
});

/**
 * POST /api/auth/logout
 * Clear session cookie
 */
router.post('/logout', (req, res) => {
  AuthService.clearAuthCookie(res);
  return res.json({ success: true });
});

/**
 * POST /api/auth/forgot-password
 * Generate password reset token
 */
router.post('/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email tidak valid'
      });
    }

    const user = await User.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.json({
        success: true,
        message: 'Jika email terdaftar, instruksi reset password telah dikirim.'
      });
    }

    const token = await AuthService.createPasswordResetToken(user.id);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`🔑 Password reset requested for account id=${user.id}`);
    }

    return res.json({
      success: true,
      message: 'Jika email terdaftar, instruksi reset password telah dikirim.'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal memproses permintaan reset password'
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', authLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token dan password baru wajib diisi'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password baru minimal 6 karakter'
      });
    }

    const resetRecord = await AuthService.findValidResetToken(token);
    if (!resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Token reset password tidak valid atau telah kadaluarsa'
      });
    }

    const hashedPassword = await hashPassword(newPassword);
    await Promise.all([
      User.updatePassword(resetRecord.user_id, hashedPassword),
      AuthService.markResetTokenUsed(resetRecord.id)
    ]);

    return res.json({
      success: true,
      message: 'Password berhasil diperbarui! Silakan login dengan password baru Anda.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mereset password'
    });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 */
router.get('/me', verifyToken, async (req, res) => {
  try {
    if (req.user.mockAdmin === true && req.user.id === 'mock-admin' && req.user.accountType === 'admin') {
      return res.json({
        success: true,
        data: {
          id: req.user.id,
          email: req.user.email,
          accountType: 'admin',
          isActive: true,
          profile: null
        }
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Pengguna tidak ditemukan'
      });
    }

    let bandProfile = null;
    if (user.isBand()) {
      bandProfile = await BandProfile.findByUserId(user.id);
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        accountType: user.accountType,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      bandProfile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengambil data profil'
    });
  }
});

module.exports = router;
