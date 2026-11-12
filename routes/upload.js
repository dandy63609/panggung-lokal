const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { LIMITS, uploadToCloudStorage } = require('../utils/storage');

// Gunakan memoryStorage agar buffer file dapat dikirim langsung ke cloud storage
const storage = multer.memoryStorage();

// Filter tipe berkas yang didukung
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/jpg', 'image/pjpeg'];
  const allowedMediaTypes = [
    'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
    'video/mp4', 'video/webm', 'video/quicktime'
  ];

  if (allowedImageTypes.includes(file.mimetype) || allowedMediaTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe berkas tidak didukung. Harap unggah format gambar (JPEG, PNG, WebP) atau audio/video (MP4, WebM, MOV, MP3, WAV).'), false);
  }
};

// Batas multer awal max 25MB (pemeriksaan spesifik foto 5MB / video 20MB dilakukan di controller)
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024
  }
});

// Middleware penangan error multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Ukuran berkas melebihi batas maksimum (Maksimal 5 MB untuk foto, 20 MB untuk video)'
      });
    }
    return res.status(400).json({
      success: false,
      message: `Kesalahan unggah: ${err.message}`
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'Gagal memproses berkas'
    });
  }
  next();
};

/**
 * POST /api/upload/photo
 * Unggah foto profil, cover, atau foto karya ke Cloud Storage
 */
router.post('/photo', requireAuth, uploadLimiter, upload.single('photo'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Berkas gambar tidak ditemukan'
      });
    }

    // Validasi batas ukuran foto (Max 5MB sesuai resource free tier Supabase)
    if (req.file.size > LIMITS.MAX_IMAGE_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Ukuran foto maksimal 5 MB untuk mengoptimalkan penyimpanan'
      });
    }

    const uploadRes = await uploadToCloudStorage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    return res.status(201).json({
      success: true,
      message: 'Foto berhasil diunggah',
      fileUrl: uploadRes.publicUrl,
      filename: uploadRes.filename,
      isCloud: uploadRes.isCloud
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengunggah foto'
    });
  }
});

/**
 * POST /api/upload/media
 * Unggah audio demo atau video cuplikan penampilan ke Cloud Storage
 */
router.post('/media', requireAuth, uploadLimiter, upload.single('media'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Berkas media tidak ditemukan'
      });
    }

    const isAudio = req.file.mimetype.startsWith('audio');
    const isVideo = req.file.mimetype.startsWith('video');

    // Validasi batas ukuran per jenis media
    if (isVideo && req.file.size > LIMITS.MAX_VIDEO_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Ukuran video maksimal 20 MB. Untuk video durasi panjang / kualitas HD, disarankan menempelkan tautan YouTube pada tab "Tautkan Link"'
      });
    }

    if (isAudio && req.file.size > LIMITS.MAX_AUDIO_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Ukuran audio maksimal 10 MB'
      });
    }

    const uploadRes = await uploadToCloudStorage(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    return res.status(201).json({
      success: true,
      message: 'Media berhasil diunggah',
      fileUrl: uploadRes.publicUrl,
      fileType: isAudio ? 'audio' : isVideo ? 'video' : 'media',
      filename: uploadRes.filename,
      isCloud: uploadRes.isCloud
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Gagal mengunggah media'
    });
  }
});

module.exports = router;
