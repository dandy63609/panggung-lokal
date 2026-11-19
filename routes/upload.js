const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { requireAuth, requireOrganizer } = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  LIMITS,
  isCloudStorageConfigured,
  resolveMediaMimeType,
  isSupportedMediaType,
  validateUploadDescriptor,
  createSignedUploadUrl,
  uploadBufferToCloudStorage,
} = require('../utils/storage');

// Use /tmp/uploads on Vercel serverless where the project directory is read-only
const uploadDir = process.env.VERCEL
  ? path.join(os.tmpdir(), 'uploads')
  : path.join(__dirname, '..', 'uploads');

function ensureUploadDir() {
  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  } catch {
    // Ignore on read-only filesystems
  }
}

ensureUploadDir();

const memoryStorage = multer.memoryStorage();

// File filter for photo/media
const fileFilter = (req, file, cb) => {
  const resolvedMime = resolveMediaMimeType(file.originalname, file.mimetype);
  if (isSupportedMediaType(resolvedMime)) {
    cb(null, true);
  } else {
    cb(new Error('Tipe file tidak didukung. Harap unggah format gambar (JPEG, PNG, WebP) atau audio/video.'), false);
  }
};

const upload = multer({
  storage: memoryStorage,
  fileFilter,
  limits: {
    fileSize: LIMITS.MAX_VIDEO_SIZE,
  },
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
  storage: memoryStorage,
  fileFilter: attachmentFilter,
  limits: {
    fileSize: LIMITS.MAX_ATTACHMENT_SIZE,
    files: 3,
  },
});

async function persistUploadedFile(file) {
  if (isCloudStorageConfigured()) {
    const cloudResult = await uploadBufferToCloudStorage(
      file.buffer,
      file.originalname,
      file.mimetype
    );
    return {
      fileUrl: cloudResult.publicUrl,
      filename: cloudResult.filename,
      isCloud: true,
    };
  }

  ensureUploadDir();
  const ext = path.extname(file.originalname || '').toLowerCase();
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  fs.writeFileSync(path.join(uploadDir, uniqueName), file.buffer);
  return {
    fileUrl: `/uploads/${uniqueName}`,
    filename: uniqueName,
    isCloud: false,
  };
}

const runUploadMiddleware = (uploader, sizeLimitMessage, countLimitMessage) => (req, res, next) => {
  uploader(req, res, (err) => {
    if (!err) {
      return next();
    }
    let message = err.message || 'Gagal memproses file unggahan';
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = sizeLimitMessage;
    } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = countLimitMessage || 'Jumlah atau kolom file tidak sesuai ketentuan';
    }
    return res.status(400).json({
      success: false,
      message,
    });
  });
};

/**
 * POST /api/upload/signed-url
 * Issue direct-to-Supabase signed upload URL(s) so large media (e.g. >4.5MB video)
 * bypasses Vercel serverless body size limits. Falls back to multipart mode locally.
 */
router.post('/signed-url', requireAuth, uploadLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const isBatch = Array.isArray(body.files);
    const descriptors = isBatch ? body.files : [body];

    if (descriptors.length === 0 || descriptors.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Jumlah berkas harus antara 1 hingga 10 file per permintaan',
      });
    }

    const validations = descriptors.map((item) => validateUploadDescriptor(item || {}));
    const invalid = validations.find((v) => !v.valid);
    if (invalid) {
      return res.status(400).json({
        success: false,
        message: invalid.message,
      });
    }

    if (!isCloudStorageConfigured()) {
      if (isBatch) {
        return res.json({
          success: true,
          mode: 'multipart',
          items: validations.map((v) => ({
            mode: 'multipart',
            fileType: v.fileType,
            fallbackEndpoint: v.fileType === 'photo' ? '/api/upload/photo' : '/api/upload/media',
          })),
        });
      }
      const single = validations[0];
      return res.json({
        success: true,
        mode: 'multipart',
        fileType: single.fileType,
        fallbackEndpoint: single.fileType === 'photo' ? '/api/upload/photo' : '/api/upload/media',
      });
    }

    const signedItems = await Promise.all(
      descriptors.map((item) => createSignedUploadUrl(item))
    );

    if (isBatch) {
      return res.json({
        success: true,
        mode: 'direct',
        items: signedItems.map((item) => ({ mode: 'direct', ...item })),
      });
    }

    return res.json({
      success: true,
      mode: 'direct',
      ...signedItems[0],
    });
  } catch (error) {
    console.error('Signed upload URL error:', error);
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: status < 500 ? error.message : 'Gagal menyiapkan URL unggah ke penyimpanan cloud',
    });
  }
});

router.post(
  '/photo',
  requireAuth,
  uploadLimiter,
  runUploadMiddleware(upload.single('photo'), 'Ukuran file foto maksimal 50 MB'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File gambar tidak ditemukan',
        });
      }

      if (req.file.size > LIMITS.MAX_IMAGE_SIZE) {
        return res.status(400).json({
          success: false,
          message: 'Ukuran file foto maksimal 10 MB',
        });
      }

      const saved = await persistUploadedFile(req.file);

      return res.status(201).json({
        success: true,
        message: 'Foto berhasil diunggah',
        fileUrl: saved.fileUrl,
        filename: saved.filename,
        isCloud: saved.isCloud,
      });
    } catch (error) {
      console.error('Photo upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengunggah foto',
      });
    }
  }
);

router.post(
  '/media',
  requireAuth,
  uploadLimiter,
  runUploadMiddleware(upload.single('media'), 'Ukuran file media maksimal 50 MB'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'File media tidak ditemukan',
        });
      }

      const resolvedMime = resolveMediaMimeType(req.file.originalname, req.file.mimetype);
      const isAudio = resolvedMime.startsWith('audio');
      const isVideo = resolvedMime.startsWith('video');
      const saved = await persistUploadedFile(req.file);

      return res.status(201).json({
        success: true,
        message: 'Media berhasil diunggah',
        fileUrl: saved.fileUrl,
        fileType: isAudio ? 'audio' : isVideo ? 'video' : 'media',
        filename: saved.filename,
        isCloud: saved.isCloud,
      });
    } catch (error) {
      console.error('Media upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengunggah media',
      });
    }
  }
);

/**
 * POST /api/upload/attachment
 * Upload venue / rundown attachments (max 3 files, max 10MB each) for organizer broadcasts
 */
router.post(
  '/attachment',
  requireOrganizer,
  uploadLimiter,
  runUploadMiddleware(
    uploadAttachments.array('attachments', 3),
    'Ukuran setiap file lampiran maksimal 10 MB',
    'Maksimal 3 file lampiran diperbolehkan'
  ),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Tidak ada file lampiran yang diunggah',
        });
      }

      const uploadedFiles = await Promise.all(
        req.files.map(async (file) => {
          const saved = await persistUploadedFile(file);
          return {
            fileUrl: saved.fileUrl,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          };
        })
      );

      return res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} lampiran berhasil diunggah`,
        files: uploadedFiles,
      });
    } catch (error) {
      console.error('Attachment upload error:', error);
      return res.status(500).json({
        success: false,
        message: 'Gagal mengunggah lampiran',
      });
    }
  }
);

module.exports = router;
