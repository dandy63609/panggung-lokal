const express = require('express');
const router = express.Router();
const crypto = require('crypto');
let OAuth2Client;
try {
  ({ OAuth2Client } = require('google-auth-library'));
} catch {
  OAuth2Client = null;
}

const User = require('../models/User');
const BandProfile = require('../models/BandProfile');
const db = require('../utils/db');
const { hashPassword, verifyPassword, needsRehash } = require('../utils/password');
const { validateEmail } = require('../utils/validation');
const {
  isEmailConfigured,
  getAppBaseUrl,
  buildPasswordResetUrl,
  sendPasswordResetEmail,
} = require('../utils/email');
const { generateToken, verifyToken, setAuthCookie } = require('../middleware/auth');
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

    const existingUser = await User.findByEmail(email.toLowerCase().trim());
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar, silakan gunakan email lain atau login'
      });
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await User.create(
      email.toLowerCase().trim(),
      hashedPassword,
      normalizedType
    );

    let bandProfile = null;
    if (normalizedType === 'band') {
      bandProfile = await BandProfile.create({
        userId: newUser.id,
        bandName: bandName || email.split('@')[0],
        genre: genre || 'Indie / Pop',
        locationCity: locationCity || 'Kota Semarang',
        bio: 'Profil band baru di Reffband',
        customTag: 'Band Baru Ditambahkan'
      });
    }

    const token = generateToken(newUser);
    setAuthCookie(res, token);

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
        locationCity: bandProfile.locationCity,
        customTag: bandProfile.customTag
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

    // Admin account (enabled in non-production or when a non-default ADMIN_PASSWORD is configured).
    const cleanLoginEmail = email.toLowerCase().trim();
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'admin@admin.com').toLowerCase().trim();
    const configuredAdminPass = process.env.ADMIN_PASSWORD || 'admin';
    const isProductionEnv = process.env.NODE_ENV === 'production';
    const allowAdminShortcut =
      !isProductionEnv ||
      (Boolean(process.env.ADMIN_PASSWORD) && process.env.ADMIN_PASSWORD !== 'admin');
    const isAdminEmailMatch = process.env.ADMIN_EMAIL
      ? cleanLoginEmail === configuredAdminEmail
      : cleanLoginEmail === 'admin@admin.com' || cleanLoginEmail === 'admin@panggunglokal.id';

    if (allowAdminShortcut && isAdminEmailMatch && password === configuredAdminPass) {
      const admin = { id: 'mock-admin', email: cleanLoginEmail, accountType: 'admin', mockAdmin: true };
      const token = generateToken(admin);
      setAuthCookie(res, token);
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
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Akun belum terdaftar. Silakan daftar terlebih dahulu.'
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

    if (needsRehash(userData.password_hash)) {
      try {
        const upgradedHash = await hashPassword(password);
        await User.updatePassword(userData.id, upgradedHash);
        userData.password_hash = upgradedHash;
      } catch (rehashError) {
        console.warn('Password rehash skipped:', rehashError.message);
      }
    }

    const user = new User(userData);
    await user.updateLastLogin();

    // If band, get profile (self-healing orphaned accounts)
    let bandProfile = null;
    if (user.isBand()) {
      bandProfile = await BandProfile.findOrCreateForUser(user);
    }

    const token = generateToken(user);
    setAuthCookie(res, token);

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
 * POST /api/auth/google
 * Sign in or Sign up via verified Google Identity Services ID Token
 */
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential, accountType, bandName, genre, locationCity } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google Client ID belum dikonfigurasi di server.'
      });
    }

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: 'Token kredensial Google wajib disertakan.'
      });
    }

    if (!OAuth2Client) {
      return res.status(503).json({
        success: false,
        message: 'Layanan login Google belum terpasang di server ini.'
      });
    }

    let payload;
    try {
      const googleClient = new OAuth2Client(clientId);
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      console.error('Google verifyIdToken error:', verifyErr.message);
      return res.status(401).json({
        success: false,
        message: 'Token Google tidak valid atau telah kedaluwarsa. Silakan coba lagi.'
      });
    }

    if (!payload || !payload.email || payload.email_verified !== true) {
      return res.status(401).json({
        success: false,
        message: 'Alamat email Google Anda belum terverifikasi.'
      });
    }

    const normalizedEmail = payload.email.toLowerCase().trim();
    const existingResult = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [normalizedEmail]
    );

    if (existingResult.rows.length > 0) {
      const userData = existingResult.rows[0];
      if (!userData.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Akun Anda telah dinonaktifkan. Hubungi admin untuk bantuan.'
        });
      }

      try {
        if (payload.sub && !userData.google_id) {
          await db.query(
            "UPDATE users SET google_id = $1, auth_provider = COALESCE(auth_provider, 'google') WHERE id = $2",
            [payload.sub, userData.id]
          );
        }
      } catch {
        // Optional column fallback
      }

      const user = new User(userData);
      await user.updateLastLogin();

      let bandProfile = null;
      if (user.isBand()) {
        bandProfile = await BandProfile.findOrCreateForUser(user);
      }

      const token = generateToken(user);
      setAuthCookie(res, token);

      return res.json({
        success: true,
        message: 'Login Google berhasil',
        token,
        user: {
          id: user.id,
          email: user.email,
          accountType: user.accountType,
          createdAt: user.createdAt
        },
        bandProfile
      });
    }

    // New user via Google from Login page (no accountType): prompt to sign up first
    if (!accountType) {
      return res.status(404).json({
        success: false,
        code: 'ACCOUNT_NOT_FOUND',
        message: 'Akun Google ini belum terdaftar. Silakan daftar terlebih dahulu.'
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

    const randomSecret = crypto.randomBytes(32).toString('hex');
    const hashedPassword = await hashPassword(randomSecret);

    const newUser = await User.create(
      normalizedEmail,
      hashedPassword,
      normalizedType
    );

    try {
      if (payload.sub) {
        await db.query(
          "UPDATE users SET google_id = $1, auth_provider = 'google' WHERE id = $2",
          [payload.sub, newUser.id]
        );
      }
    } catch {
      // Optional column fallback
    }

    let bandProfile = null;
    if (normalizedType === 'band') {
      bandProfile = await BandProfile.create({
        userId: newUser.id,
        bandName: (bandName && bandName.trim()) || payload.name || normalizedEmail.split('@')[0],
        genre: genre || 'Indie / Alternative',
        locationCity: (locationCity && locationCity.trim()) || 'Kota Semarang',
        profilePhotoUrl: payload.picture || null,
        bio: 'Profil band baru di Reffband',
        customTag: 'Band Baru Ditambahkan'
      });
    }

    const token = generateToken(newUser);
    setAuthCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Registrasi Google berhasil',
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
        locationCity: bandProfile.locationCity,
        customTag: bandProfile.customTag
      } : null
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Terjadi kesalahan saat memproses autentikasi Google'
    });
  }
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

    const isProd = process.env.NODE_ENV === 'production';
    const shouldSendRealEmail =
      isEmailConfigured(process.env) &&
      (process.env.NODE_ENV !== 'test' || process.env.ALLOW_TEST_EMAIL_SEND === '1');

    if (isProd && !shouldSendRealEmail) {
      console.error('RESEND_API_KEY is not configured; cannot send password reset email');
      return res.status(503).json({
        success: false,
        message: 'Layanan pengiriman email pemulihan belum dikonfigurasi di server. Hubungi admin Reffband.'
      });
    }

    // Invalidate previous unused reset tokens for this account
    await db.query(
      'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
      [user.id]
    );

    // Generate random reset token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    const resetUrl = buildPasswordResetUrl(token, getAppBaseUrl(req, process.env));

    if (shouldSendRealEmail) {
      try {
        await sendPasswordResetEmail({ to: user.email, resetUrl });
      } catch (mailErr) {
        console.error('Failed to send password reset email:', mailErr.message);
        await db.query('DELETE FROM password_reset_tokens WHERE token = $1', [token]).catch(() => {});
        return res.status(503).json({
          success: false,
          message: 'Gagal mengirim email pemulihan kata sandi. Silakan coba beberapa saat lagi.'
        });
      }
    } else if (!isProd) {
      console.log(`Password reset link generated for ${email}: ${resetUrl}`);
    }

    return res.json({
      success: true,
      message: 'Instruksi reset password telah dikirim ke email Anda. Periksa kotak masuk atau folder spam.',
      ...(!isProd && { resetToken: token })
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
    const hashedPassword = await hashPassword(newPassword);
    await User.updatePassword(resetRecord.user_id, hashedPassword);

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
      bandProfile = await BandProfile.findOrCreateForUser(user);
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
