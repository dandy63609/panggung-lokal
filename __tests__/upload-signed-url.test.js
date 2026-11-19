const request = require('supertest');
const app = require('../app');
const { generateToken } = require('../middleware/auth');

describe('Upload Signed URL & CSP Preview Regression Guards', () => {
  const originalSupabaseUrl = process.env.SUPABASE_URL;
  const originalSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const originalFetch = global.fetch;

  const bandToken = generateToken({
    id: 1,
    email: 'kelana@panggunglokal.id',
    accountType: 'band',
  });

  afterEach(() => {
    if (originalSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = originalSupabaseUrl;
    }
    if (originalSupabaseServiceKey === undefined) {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    } else {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalSupabaseServiceKey;
    }
    global.fetch = originalFetch;
  });

  it('includes blob: in img-src and *.supabase.co in connect-src CSP headers', async () => {
    const res = await request(app).get('/health');
    const csp = res.headers['content-security-policy'] || '';

    expect(res.status).toBe(200);
    expect(csp).toContain("img-src 'self' data: blob: https:");
    expect(csp).toContain('https://*.supabase.co');
  });

  it('requires authentication for POST /api/upload/signed-url', async () => {
    const res = await request(app)
      .post('/api/upload/signed-url')
      .send({ filename: 'clip.mp4', mimeType: 'video/mp4', fileSize: 1024 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('rejects unsupported MIME types and oversized media descriptors', async () => {
    const badMime = await request(app)
      .post('/api/upload/signed-url')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({ filename: 'malware.exe', mimeType: 'application/x-msdownload', fileSize: 2048 });
    expect(badMime.status).toBe(400);
    expect(badMime.body.success).toBe(false);

    const oversizedPhoto = await request(app)
      .post('/api/upload/signed-url')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({ filename: 'huge.jpg', mimeType: 'image/jpeg', fileSize: 15 * 1024 * 1024, category: 'photo' });
    expect(oversizedPhoto.status).toBe(400);
    expect(oversizedPhoto.body.message).toMatch(/maksimal 10 MB/i);

    const oversizedVideo = await request(app)
      .post('/api/upload/signed-url')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({ filename: 'huge.mp4', mimeType: 'video/mp4', fileSize: 60 * 1024 * 1024, category: 'media' });
    expect(oversizedVideo.status).toBe(400);
    expect(oversizedVideo.body.message).toMatch(/maksimal 50 MB/i);
  });

  it('returns multipart fallback descriptors when cloud storage env vars are unset', async () => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    const res = await request(app)
      .post('/api/upload/signed-url')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        files: [
          { filename: 'photo1.jpg', mimeType: 'image/jpeg', fileSize: 500000, category: 'photo' },
          { filename: 'clip.mp4', mimeType: 'video/mp4', fileSize: 6 * 1024 * 1024, category: 'media' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('multipart');
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].fallbackEndpoint).toBe('/api/upload/photo');
    expect(res.body.items[1].fallbackEndpoint).toBe('/api/upload/media');
  });

  it('issues Supabase direct signed upload URLs for mixed batch including >4.5MB video', async () => {
    process.env.SUPABASE_URL = 'https://demo-proj.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-test-key';

    let callIndex = 0;
    global.fetch = jest.fn(async (url) => {
      callIndex += 1;
      expect(url).toContain('https://demo-proj.supabase.co/storage/v1/object/upload/sign/media/');
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            url: `/object/upload/sign/media/mock-file-${callIndex}?token=tok-${callIndex}`,
            token: `tok-${callIndex}`,
          };
        },
      };
    });

    const res = await request(app)
      .post('/api/upload/signed-url')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        files: [
          { filename: 'IMG_1.jpg', mimeType: 'image/jpeg', fileSize: 800000, category: 'photo' },
          { filename: 'VID_1.mp4', mimeType: 'video/mp4', fileSize: 12 * 1024 * 1024, category: 'media' },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.mode).toBe('direct');
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].mode).toBe('direct');
    expect(res.body.items[0].signedUrl).toContain('https://demo-proj.supabase.co/storage/v1/object/upload/sign/media/');
    expect(res.body.items[0].publicUrl).toContain('https://demo-proj.supabase.co/storage/v1/object/public/media/');
    expect(res.body.items[1].mode).toBe('direct');
    expect(res.body.items[1].fileType).toBe('video');
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('preserves mixed mediaType on multi-slide posts and appends slides one at a time via PUT /api/posts/:id/slides', async () => {
    const photoPostRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        mediaType: 'photo',
        mediaUrl: 'https://demo-proj.supabase.co/storage/v1/object/public/media/photo-1.png',
        caption: 'Soundcheck tahap 1',
      });

    expect(photoPostRes.status).toBe(201);
    const createdPostId = photoPostRes.body.data.id;
    expect(photoPostRes.body.data.mediaType).toBe('photo');

    const appendRes = await request(app)
      .put(`/api/posts/${createdPostId}/slides`)
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        slides: [
          {
            type: 'video',
            url: 'https://demo-proj.supabase.co/storage/v1/object/public/media/clip-2.mp4',
          },
        ],
      });

    expect(appendRes.status).toBe(200);
    expect(appendRes.body.success).toBe(true);
    expect(appendRes.body.data.mediaType).toBe('mixed');
    expect(appendRes.body.data.slides).toHaveLength(2);
    expect(appendRes.body.data.slides[0].type).toBe('photo');
    expect(appendRes.body.data.slides[1].type).toBe('video');

    const mixedCreateRes = await request(app)
      .post('/api/posts')
      .set('Authorization', `Bearer ${bandToken}`)
      .send({
        mediaType: 'mixed',
        mediaUrl: 'https://demo-proj.supabase.co/storage/v1/object/public/media/photo-a.png',
        slides: [
          { type: 'photo', url: 'https://demo-proj.supabase.co/storage/v1/object/public/media/photo-a.png' },
          { type: 'video', url: 'https://demo-proj.supabase.co/storage/v1/object/public/media/video-b.mp4' },
        ],
      });

    expect(mixedCreateRes.status).toBe(201);
    expect(mixedCreateRes.body.data.mediaType).toBe('mixed');
    expect(mixedCreateRes.body.data.slides).toHaveLength(2);
  });
});
