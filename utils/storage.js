const path = require('path');

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/ogg',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/aac',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-m4v',
];

const ALLOWED_MEDIA_TYPES = [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES];

const EXT_TO_MIME = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v',
};

const LIMITS = {
  MAX_IMAGE_SIZE: 10 * 1024 * 1024, // 10 MB
  MAX_AUDIO_SIZE: 20 * 1024 * 1024, // 20 MB
  MAX_VIDEO_SIZE: 50 * 1024 * 1024, // 50 MB
  MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10 MB
};

function getStorageConfig() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_KEY ||
    '';
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'media';
  return { url, key, bucket };
}

function isCloudStorageConfigured() {
  const { url, key } = getStorageConfig();
  return Boolean(url && key);
}

/**
 * Resolve and normalize MIME type, falling back to safe media extension mapping
 * only when mobile browsers report an empty or generic octet-stream MIME type.
 */
function resolveMediaMimeType(originalName = '', mimeType = '') {
  const cleanMime = String(mimeType || '').split(';')[0].trim().toLowerCase();
  if (cleanMime && cleanMime !== 'application/octet-stream') {
    return cleanMime === 'image/jpg' ? 'image/jpeg' : cleanMime;
  }
  const ext = path.extname(originalName || '').toLowerCase();
  return EXT_TO_MIME[ext] || cleanMime;
}

function isSupportedMediaType(mimeType) {
  return ALLOWED_IMAGE_TYPES.includes(mimeType) || ALLOWED_MEDIA_TYPES.includes(mimeType);
}

function validateUploadDescriptor({ filename, mimeType, fileSize, category }) {
  const resolvedMime = resolveMediaMimeType(filename, mimeType);
  if (!isSupportedMediaType(resolvedMime)) {
    return {
      valid: false,
      message: 'Tipe file tidak didukung. Harap unggah format gambar (JPEG, PNG, WebP) atau audio/video (MP4, WebM, MOV, MP3).',
    };
  }

  const isImage = resolvedMime.startsWith('image/');
  const isAudio = resolvedMime.startsWith('audio/');
  const isVideo = resolvedMime.startsWith('video/');

  if (category === 'photo' && !isImage) {
    return {
      valid: false,
      message: 'Tipe file harus berupa gambar (JPEG, PNG, WebP, GIF).',
    };
  }

  const numericSize = Number(fileSize);
  if (fileSize !== undefined && (!Number.isFinite(numericSize) || numericSize <= 0)) {
    return {
      valid: false,
      message: 'Ukuran berkas tidak valid.',
    };
  }

  if (numericSize > 0) {
    if (isImage && numericSize > LIMITS.MAX_IMAGE_SIZE) {
      return { valid: false, message: 'Ukuran file foto maksimal 10 MB' };
    }
    if (isAudio && numericSize > LIMITS.MAX_AUDIO_SIZE) {
      return { valid: false, message: 'Ukuran file audio maksimal 20 MB' };
    }
    if (isVideo && numericSize > LIMITS.MAX_VIDEO_SIZE) {
      return { valid: false, message: 'Ukuran file video maksimal 50 MB' };
    }
  }

  const fileType = isImage ? 'photo' : isAudio ? 'audio' : isVideo ? 'video' : 'media';
  return { valid: true, mimeType: resolvedMime, fileType };
}

function buildUniqueObjectName(originalName = '', mimeType = '') {
  const rawExt = path.extname(originalName || '').toLowerCase();
  const safeExt = /^[a-z0-9.]+$/.test(rawExt) && rawExt.length <= 10
    ? rawExt
    : mimeType.startsWith('image/')
      ? '.jpg'
      : mimeType.startsWith('video/')
        ? '.mp4'
        : mimeType.startsWith('audio/')
          ? '.mp3'
          : '.bin';
  const baseName = path.basename(originalName || 'media', rawExt)
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 40) || 'media';
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${baseName}${safeExt}`;
}

async function createSignedUploadUrl({ filename, mimeType, fileSize, category }) {
  const validation = validateUploadDescriptor({ filename, mimeType, fileSize, category });
  if (!validation.valid) {
    const err = new Error(validation.message);
    err.status = 400;
    throw err;
  }

  const { url, key, bucket } = getStorageConfig();
  if (!url || !key) {
    const err = new Error('Cloud storage belum dikonfigurasi');
    err.status = 503;
    throw err;
  }

  const uniqueFilename = buildUniqueObjectName(filename, validation.mimeType);
  const signEndpoint = `${url}/storage/v1/object/upload/sign/${bucket}/${uniqueFilename}`;

  const response = await fetch(signEndpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Gagal membuat URL unggah Supabase (${response.status}): ${errText}`);
  }

  const data = await response.json();
  const rawSignedPath = data.url || '';
  const signedUrl = rawSignedPath.startsWith('http')
    ? rawSignedPath
    : `${url}/storage/v1${rawSignedPath.startsWith('/') ? '' : '/'}${rawSignedPath}`;
  const publicUrl = `${url}/storage/v1/object/public/${bucket}/${uniqueFilename}`;

  return {
    signedUrl,
    publicUrl,
    filename: uniqueFilename,
    fileType: validation.fileType,
    mimeType: validation.mimeType,
  };
}

async function uploadBufferToCloudStorage(buffer, originalName, mimeType) {
  const { url, key, bucket } = getStorageConfig();
  if (!url || !key) {
    throw new Error('Cloud storage belum dikonfigurasi');
  }

  const resolvedMime = resolveMediaMimeType(originalName, mimeType) || 'application/octet-stream';
  const uniqueFilename = buildUniqueObjectName(originalName, resolvedMime);
  const uploadEndpoint = `${url}/storage/v1/object/${bucket}/${uniqueFilename}`;

  const response = await fetch(uploadEndpoint, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': resolvedMime,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Supabase Storage HTTP ${response.status}: ${errText}`);
  }

  return {
    publicUrl: `${url}/storage/v1/object/public/${bucket}/${uniqueFilename}`,
    filename: uniqueFilename,
    isCloud: true,
  };
}

module.exports = {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_AUDIO_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_MEDIA_TYPES,
  LIMITS,
  isCloudStorageConfigured,
  resolveMediaMimeType,
  isSupportedMediaType,
  validateUploadDescriptor,
  createSignedUploadUrl,
  uploadBufferToCloudStorage,
};
