const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireAuth, requireOrganizer } = require('../middleware/auth');
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
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter for photo/media
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

const ALLOWED_ATTACHMENT_EXTS = ['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.doc', '.docx'];
const ALLOWED_ATTACHMENT_MIMES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream',
];

const attachmentFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const validExt = ALLOWED_ATTACHMENT_EXTS.includes(ext);
  const validMime = ALLOWED_ATTACHMENT_MIMES.includes(file.mimetype);

  if (validExt && validMime) {
    cb(null, true);
  } else {
    cb(new Error('Format lampiran tidak didukung. Gunakan PDF, JPG, PNG, WebP, atau DOC/DOCX.'), false);
  }
};

const uploadAttachments = multer({
  storage,
  fileFilter: attachmentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max per attachment
    files: 3,
  },
});

const runUploadMiddleware = (uploader, sizeLimitMessage, fallbackMessage) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (!err) {
      return next();
    }
    let message = err.message || fallbackMessage;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = sizeLimitMessage;
    } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Jumlah atau kolom file tidak sesuai ketentuan';
    }
    return res.status(400).json({
      success: false,
      message,
    });
  });
};

router.post(
  '/photo',
  requireAuth,
  uploadLimiter,
  runUploadMiddleware(upload.single('photo'), 'Ukuran file foto maksimal 50 MB', 'Gagal mengunggah foto'),
  (req, res) => {
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
  }
);

router.post(
  '/media',
  requireAuth,
  uploadLimiter,
  runUploadMiddleware(upload.single('media'), 'Ukuran file media maksimal 50 MB', 'Gagal mengunggah media'),
  (req, res) => {
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
  }
);

/**
 * POST /api/upload/attachment
 * Upload venue / rundown attachments (max 3 files, max 10MB each) for organizer broadcasts
 */
router.post('/attachment', requireOrganizer, uploadLimiter, (req, res) => {
  uploadAttachments.array('attachments', 3)(req, res, (err) => {
    if (err) {
      let message = err.message || 'Gagal mengunggah lampiran';
      if (err.code === 'LIMIT_FILE_SIZE') {
        message = 'Ukuran setiap file lampiran maksimal 10 MB';
      } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
        message = 'Maksimal 3 file lampiran diperbolehkan';
      }
      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tidak ada file lampiran yang diunggah',
      });
    }

    const uploadedFiles = req.files.map((file) => ({
      fileUrl: `/uploads/${file.filename}`,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    return res.status(201).json({
      success: true,
      message: `${uploadedFiles.length} lampiran berhasil diunggah`,
      files: uploadedFiles,
    });
  });
});

module.exports = router;
