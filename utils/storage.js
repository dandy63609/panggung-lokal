const path = require('path');
const fs = require('fs');
const os = require('os');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://awccpftjirfmxbvugqtk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3Y2NwZnRqaXJmbXhidnVncXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NjEzNjMsImV4cCI6MjExMDAzNzM2M30.YXnWVV91NjUUDgbfmSiqBPVuSfFCNF-E6SqDh86MfNs';
const BUCKET_NAME = 'media';

// Limit resource free tier yang aman
const LIMITS = {
  MAX_IMAGE_SIZE: 5 * 1024 * 1024,   // 5 MB per foto
  MAX_VIDEO_SIZE: 20 * 1024 * 1024,  // 20 MB per video mentah
  MAX_AUDIO_SIZE: 10 * 1024 * 1024   // 10 MB per berkas audio demo
};

/**
 * Upload buffer langsung ke Supabase Cloud Storage (Bucket: media)
 * @param {Buffer} buffer - Buffer file
 * @param {string} originalName - Nama file asli
 * @param {string} mimeType - Tipe konten (image/jpeg, video/mp4, dsb.)
 * @returns {Promise<{ success: boolean, publicUrl: string, filename: string, isCloud: boolean }>}
 */
async function uploadToCloudStorage(buffer, originalName, mimeType) {
  const ext = path.extname(originalName) || (mimeType.startsWith('image/') ? '.jpg' : mimeType.startsWith('video/') ? '.mp4' : '.bin');
  const safeBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
  const uniqueFilename = `${Date.now()}-${Math.round(Math.random() * 1e6)}-${safeBase}${ext}`;

  // 1. Coba upload langsung ke Supabase Storage via REST API
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/${BUCKET_NAME}/${uniqueFilename}`;
      const res = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': mimeType || 'application/octet-stream',
          'x-upsert': 'true'
        },
        body: buffer
      });

      if (res.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${uniqueFilename}`;
        return {
          success: true,
          publicUrl,
          filename: uniqueFilename,
          isCloud: true
        };
      } else {
        const errText = await res.text().catch(() => '');
        console.warn('⚠️ Supabase Storage HTTP error:', res.status, errText);
      }
    } catch (netErr) {
      console.warn('⚠️ Gagal terhubung ke Supabase Storage, beralih ke fallback:', netErr.message);
    }
  }

  // 2. Fallback: Base64 Data URL jika ukuran < 3MB
  if (buffer.length <= 3 * 1024 * 1024) {
    const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
    return {
      success: true,
      publicUrl: dataUrl,
      filename: uniqueFilename,
      isCloud: false
    };
  }

  // 3. Fallback: Local temp file
  try {
    const localDir = process.env.VERCEL ? path.join(os.tmpdir(), 'uploads') : path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, { recursive: true });
    }
    const localPath = path.join(localDir, uniqueFilename);
    fs.writeFileSync(localPath, buffer);
    return {
      success: true,
      publicUrl: `/uploads/${uniqueFilename}`,
      filename: uniqueFilename,
      isCloud: false
    };
  } catch (diskErr) {
    throw new Error('Gagal menyimpan file ke penyimpanan: ' + diskErr.message);
  }
}

module.exports = {
  LIMITS,
  uploadToCloudStorage
};
