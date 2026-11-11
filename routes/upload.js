const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedMediaTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3', 'video/mp4', 'video/webm'];
  
  if (allowedImageTypes.includes(file.mimetype) || allowedMediaTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak didukung. Harap unggah format gambar (JPEG, PNG, WebP) atau audio/video.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

/**
 * POST /api/upload/photo
 * Upload profile or cover photo
 */
router.post('/photo', requireAuth, uploadLimiter, upload.single('photo'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File gambar tidak ditemukan'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    return res.status(201).json({
      success: true,
      message: 'Foto berhasil diunggah',
      fileUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Photo upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengunggah foto'
    });
  }
});

/**
 * POST /api/upload/media
 * Upload audio or video demo track
 */
router.post('/media', requireAuth, uploadLimiter, upload.single('media'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'File media tidak ditemukan'
      });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const isAudio = req.file.mimetype.startsWith('audio');
    const isVideo = req.file.mimetype.startsWith('video');

    return res.status(201).json({
      success: true,
      message: 'Media berhasil diunggah',
      fileUrl,
      fileType: isAudio ? 'audio' : isVideo ? 'video' : 'media',
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Gagal mengunggah media'
    });
  }
});

module.exports = router;
