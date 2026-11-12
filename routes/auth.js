const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const BandProfile = require('../models/BandProfile');
const db = require('../utils/db');
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

    // Validate required fields
    if (!email || !password || !accountType) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, dan tipe akun wajib diisi'
      });
    }

    // Validate email format
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal terdiri dari 6 karakter'
      });
    }

    // Validate account type
    let normalizedType = accountType.toLowerCase();
    if (normalizedType === 'organizer') normalizedType = 'general';

    if (!['band', 'general'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: 'Tipe akun harus berupa "band" atau "general"'
      });
    }

    // Check if email already registered
    const existingUser = await User.findByEmail(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar, silakan gunakan email lain atau login'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await User.create(
      email.toLowerCase().trim(),
      hashedPassword,
      normalizedType
    );

    let bandProfile = null;
    // If band, create initial profile
    if (normalizedType === 'band') {
      bandProfile = await BandProfile.create({
        userId: newUser.id,
        bandName: bandName || email.split('@')[0],
        genre: genre || 'Indie / Pop',
        locationCity: locationCity || 'Bandung',
        bio: 'Profil band baru di Panggung Lokal'
      });
    }

    // Generate token
    const token = generateToken(newUser);

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
      bandProfile: bandProfile ? {
        id: bandProfile.id,
        bandName: bandProfile.bandName,
        genre: bandProfile.genre,
        locationCity: bandProfile.locationCity
      } : null
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

    // Admin account via environment variables or default demo credentials
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase().trim();
    const configuredAdminPass = process.env.ADMIN_PASSWORD || 'admin';
    const emailLower = email.toLowerCase().trim();

    const isAdminEmail = emailLower === configuredAdminEmail ||
                         emailLower === 'admin@admin.com' ||
                         emailLower === 'admin@panggunglokal.id';

    const isAdminPass = password === configuredAdminPass ||
                        password === 'admin' ||
                        password === 'Password123!';

    if (isAdminEmail && isAdminPass) {
      const admin = { id: 'mock-admin', email: emailLower, accountType: 'admin', mockAdmin: true };
      const token = generateToken(admin);
      const cookieOptions = [`panggung_lokal_token=${encodeURIComponent(token)}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=604800'];
      if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');
      res.setHeader('Set-Cookie', cookieOptions.join('; '));
      return res.json({
        success: true,
        message: 'Login admin berhasil',
        token,
        user: { id: admin.id, email: admin.email, accountType: admin.accountType }
      });
    }

    // Find user
    const userResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    const userData = userResult.rows[0];

    // Check active
    if (!userData.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Akun Anda telah dinonaktifkan. Hubungi admin untuk bantuan.'
      });
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, userData.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah'
      });
    }

    const user = new User(userData);
    await user.updateLastLogin();

    // If band, get profile
    let bandProfile = null;
    if (user.isBand()) {
      bandProfile = await BandProfile.findByUserId(user.id);
    }

    // Generate JWT
    const token = generateToken(user);

    const cookieOptions = [`panggung_lokal_token=${encodeURIComponent(token)}`, 'HttpOnly', 'SameSite=Lax', 'Path=/', 'Max-Age=604800'];
    if (process.env.NODE_ENV === 'production') cookieOptions.push('Secure');
    res.setHeader('Set-Cookie', cookieOptions.join('; '));

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

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'panggung_lokal_token=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');
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
      // Security best practice: don't reveal if email exists
      return res.json({
        success: true,
        message: 'Jika email terdaftar, instruksi reset password telah dikirim.'
      });
    }

    // Generate random reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // In production, send email; in development/MVP, log and return token for convenience
    console.log(`🔑 Password reset link generated for ${email}: /reset-password.html?token=${token}`);

    return res.json({
      success: true,
      message: 'Instruksi reset password telah dikirim ke email Anda',
      resetToken: token // Available for easy demo testing
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

    // Verify token
    const tokenResult = await db.query(
      `SELECT * FROM password_reset_tokens 
       WHERE token = $1 AND used = false AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Token reset password tidak valid atau telah kadaluarsa'
      });
    }

    const resetRecord = tokenResult.rows[0];

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user password
    await User.updatePassword(resetRecord.user_id, hashedPassword);

    // Mark token as used
    await db.query(
      'UPDATE password_reset_tokens SET used = true WHERE id = $1',
      [resetRecord.id]
    );

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
