const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { apiLimiter } = require('./middleware/rateLimiter');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

const isProduction = process.env.NODE_ENV === 'production';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com"],
      scriptSrcAttr: ["'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      mediaSrc: ["'self'", "https:", "data:", "blob:"],
      connectSrc: ["'self'", "https://accounts.google.com", "https://*.supabase.co"],
      frameSrc: ["'self'", "https://accounts.google.com"],
      upgradeInsecureRequests: isProduction ? [] : null
    },
  },
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
app.use(cors({
  origin(origin, callback) {
    if (!origin || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    const allowedOrigins = (process.env.CORS_ORIGIN || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

// Rate limiting middleware for all API routes
app.use('/api/', apiLimiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files & SPA routes
const ROOT_DIR = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
const clientDistDir = path.join(ROOT_DIR, 'client', 'dist');
const clientDistIndex = path.resolve(clientDistDir, 'index.html');
const spaRoutes = [
  '/masuk',
  '/login',
  '/login.html',
  '/daftar',
  '/register',
  '/register.html',
  '/lupa-sandi',
  '/forgot-password',
  '/forgot-password.html',
  '/reset-password',
  '/reset-password.html',
  '/cari-band',
  '/search',
  '/search.html',
  '/band/:id',
  '/profile/:id',
  '/profile.html',
  '/dashboard-band',
  '/dashboard',
  '/dashboard-band.html',
  '/account',
  '/admin',
  '/dashboard-admin',
];

const sendSpaIndex = (res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.sendFile(clientDistIndex, { etag: false, lastModified: false });
};

if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir, { index: false }));
  app.get(spaRoutes, (req, res, next) => {
    if (fs.existsSync(clientDistIndex)) {
      return sendSpaIndex(res);
    }
    return next();
  });
}

app.use(express.static(path.join(ROOT_DIR, 'public'), { index: false }));
if (process.env.VERCEL || process.env.CLOUDFLARE_WORKERS || process.env.CF_PAGES) {
  app.use('/uploads', express.static(path.join(os.tmpdir(), 'uploads')));
}
app.use('/uploads', express.static(path.join(ROOT_DIR, 'uploads')));
app.get('/admin.html', require('./middleware/auth').requireAdminPage, (req, res) => {
  if (fs.existsSync(clientDistIndex)) {
    return sendSpaIndex(res);
  }
  return res.sendFile(path.join(ROOT_DIR, 'public', 'admin.html'));
});

// Redirect legacy organizer dashboard directly to search
app.get('/dashboard-organizer.html', (req, res) => {
  res.redirect('/cari-band');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bands', require('./routes/bands'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/connections', require('./routes/connections'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/broadcasts', require('./routes/broadcasts'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/settings', require('./routes/settings'));

// Root route
app.get('/', (req, res) => {
  if (req.headers.accept && req.headers.accept.includes('text/html') && !req.headers.accept.includes('application/json')) {
    if (fs.existsSync(clientDistIndex)) {
      return sendSpaIndex(res);
    }
    return res.sendFile(path.resolve(ROOT_DIR, 'public', 'index.html'));
  }
  res.json({
    message: 'Panggung Lokal API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// SPA fallback for browser HTML navigations to unknown client routes (preserves JSON 404 for API / programmatic clients)
if (fs.existsSync(clientDistDir)) {
  app.use((req, res, next) => {
    const isHtmlNavigation =
      req.method === 'GET' &&
      !req.path.startsWith('/api/') &&
      !req.path.startsWith('/uploads/') &&
      !path.extname(req.path) &&
      req.headers.accept &&
      req.headers.accept.includes('text/html') &&
      !req.headers.accept.includes('application/json');
    if (isHtmlNavigation && fs.existsSync(clientDistIndex)) {
      return sendSpaIndex(res);
    }
    return next();
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint tidak ditemukan'
    }
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === 'production';
  const message =
    isProd && status >= 500
      ? 'Terjadi kesalahan pada server'
      : err.message || 'Terjadi kesalahan pada server';

  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Start server
if (require.main === module) {
  const os = require('os');
  const server = app.listen(PORT, HOST, () => {
    console.log(`🚀 Reffband server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Local PC: http://localhost:${PORT}`);
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('192.168.56')) {
          console.log(`📱 Phone (Wi-Fi): http://${iface.address}:${PORT}`);
        }
      }
    }
  });

  // Graceful shutdown handling: auto-save database before process terminates
  const handleGracefulShutdown = async (signal) => {
    console.log(`\n🛑 Signal ${signal} diterima. Menyimpan data dan menutup server secara aman...`);
    try {
      const { saveMemoryDb } = require('./utils/memoryDb');
      await saveMemoryDb();
      console.log('💾 Database snapshot tersimpan di disk.');
    } catch (err) {
      console.error('Gagal menyimpan database saat shutdown:', err?.message || err);
    }
    server.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 1500).unref();
  };

  process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
}

module.exports = app;
