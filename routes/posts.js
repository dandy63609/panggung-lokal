const express = require('express');
const router = express.Router();
const BandPost = require('../models/BandPost');
const BandProfile = require('../models/BandProfile');
const { requireAuth, requireBand, extractOptionalUser } = require('../middleware/auth');

const isValidPositiveId = (val) => Number.isInteger(val) && val > 0;
const isSafeMediaUrl = (url) =>
  typeof url === 'string' && (url.startsWith('/') || /^https?:\/\//i.test(url));

router.get('/band/:bandId', async (req, res) => {
  try {
    const bandId = parseInt(req.params.bandId, 10);
    if (!isValidPositiveId(bandId)) {
      return res.status(400).json({ success: false, message: 'ID band tidak valid' });
    }

    const posts = await BandPost.findByBandProfileId(bandId);
    return res.json({
      success: true,
      data: posts
    });
  } catch (error) {
    console.error('Error fetching band posts:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data postingan band' });
  }
});

router.post('/:id/view', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (!isValidPositiveId(postId)) {
      return res.status(400).json({ success: false, message: 'ID postingan tidak valid' });
    }
    const post = await BandPost.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Postingan tidak ditemukan' });
    }

    // View tracking rules:
    // Only increment view if the visitor is NOT the owner of the band that created this post!
    // ("fitur view di hitung kalo ada akun eo atau musisi lain intinya orang lain bukan akun kita yang buka")
    const user = extractOptionalUser(req);
    const band = await BandProfile.findById(post.bandProfileId);
    const isOwner = Boolean(
      user &&
      band &&
      band.userId &&
      String(user.id) === String(band.userId)
    );

    if (isOwner) {
      return res.json({
        success: true,
        message: 'Tayangan postingan tidak dihitung untuk pemilik akun sendiri',
        data: { viewsCount: post.viewsCount, isOwner: true }
      });
    }

    const updatedPost = await BandPost.incrementViews(postId);
    return res.json({
      success: true,
      data: { viewsCount: updatedPost.viewsCount, isOwner: false }
    });
  } catch (error) {
    console.error('Error tracking post view:', error);
    return res.status(500).json({ success: false, message: 'Gagal mencatat tayangan' });
  }
});

router.post('/:id/wa-click', async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (!isValidPositiveId(postId)) {
      return res.status(400).json({ success: false, message: 'ID postingan tidak valid' });
    }
    const post = await BandPost.incrementWaClicks(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Postingan tidak ditemukan' });
    }
    return res.json({ success: true, data: { waClicksCount: post.waClicksCount } });
  } catch (error) {
    console.error('Error tracking WA click on post:', error);
    return res.status(500).json({ success: false, message: 'Gagal mencatat klik WhatsApp' });
  }
});

router.post('/', requireAuth, requireBand, async (req, res) => {
  try {
    const bandProfile = await BandProfile.findOrCreateForUser(req.user);
    if (!bandProfile) {
      return res.status(404).json({ success: false, message: 'Profil band tidak ditemukan' });
    }

    const { mediaType, mediaUrl, thumbnailUrl, caption, slides } = req.body;

    const parsedSlides = BandPost.parseSlidesInput(slides);
    const hasSlides = Array.isArray(parsedSlides) && parsedSlides.length > 0;
    const finalMediaUrl = mediaUrl || (hasSlides ? parsedSlides[0].url : null);

    if (!finalMediaUrl || typeof finalMediaUrl !== 'string') {
      return res.status(400).json({ success: false, message: 'URL gambar/media wajib diisi' });
    }

    const allSlideUrlsSafe =
      !hasSlides ||
      parsedSlides.every((item) =>
        isSafeMediaUrl(typeof item === 'string' ? item : item?.url || item?.mediaUrl)
      );

    if (!isSafeMediaUrl(finalMediaUrl) || !allSlideUrlsSafe) {
      return res.status(400).json({ success: false, message: 'Format URL media tidak aman atau tidak valid' });
    }

    const resolvedMediaType = hasSlides
      ? BandPost.resolveCollectionMediaType(parsedSlides, mediaType)
      : (mediaType || 'photo');

    const newPost = await BandPost.create({
      bandProfileId: bandProfile.id,
      mediaType: resolvedMediaType,
      mediaUrl: finalMediaUrl,
      thumbnailUrl: thumbnailUrl || finalMediaUrl,
      caption: caption || '',
      slides: hasSlides ? parsedSlides : undefined
    });

    return res.status(201).json({
      success: true,
      message: 'Postingan berhasil diterbitkan',
      data: newPost
    });
  } catch (error) {
    console.error('Error creating post:', error);
    return res.status(500).json({ success: false, message: 'Gagal membuat postingan' });
  }
});

const appendPostSlidesHandler = async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (!isValidPositiveId(postId)) {
      return res.status(400).json({ success: false, message: 'ID postingan tidak valid' });
    }

    const bandProfile = await BandProfile.findByUserId(req.user.id);
    if (!bandProfile) {
      return res.status(404).json({ success: false, message: 'Profil band tidak ditemukan' });
    }

    const { slides, caption } = req.body || {};
    const parsedNewSlides = BandPost.parseSlidesInput(slides).map((item) => ({
      type: item?.type || 'photo',
      url: typeof item === 'string' ? item : item?.url || item?.mediaUrl || ''
    })).filter((item) => item.url);

    if (parsedNewSlides.length === 0) {
      return res.status(400).json({ success: false, message: 'Minimal satu media baru wajib disertakan' });
    }

    if (!parsedNewSlides.every((item) => isSafeMediaUrl(item.url))) {
      return res.status(400).json({ success: false, message: 'Format URL media tidak aman atau tidak valid' });
    }

    const updatedPost = await BandPost.appendSlides(postId, bandProfile.id, parsedNewSlides, caption);
    if (!updatedPost) {
      return res.status(404).json({ success: false, message: 'Postingan tidak ditemukan atau bukan milik band Anda' });
    }

    return res.json({
      success: true,
      message: 'Media berhasil ditambahkan ke carousel postingan',
      data: updatedPost
    });
  } catch (error) {
    console.error('Error updating post carousel:', error);
    return res.status(500).json({ success: false, message: 'Gagal memperbarui carousel postingan' });
  }
};

router.put('/:id/slides', requireAuth, requireBand, appendPostSlidesHandler);
router.patch('/:id/slides', requireAuth, requireBand, appendPostSlidesHandler);

router.delete('/:id', requireAuth, requireBand, async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (!isValidPositiveId(postId)) {
      return res.status(400).json({ success: false, message: 'ID postingan tidak valid' });
    }

    const bandProfile = await BandProfile.findByUserId(req.user.id);
    if (!bandProfile) {
      return res.status(404).json({ success: false, message: 'Profil band tidak ditemukan' });
    }

    const deleted = await BandPost.delete(postId, bandProfile.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Postingan tidak ditemukan atau bukan milik band Anda' });
    }

    return res.json({
      success: true,
      message: 'Postingan berhasil dihapus'
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    return res.status(500).json({ success: false, message: 'Gagal menghapus postingan' });
  }
});

/**
 * GET /api/posts/my-performance
 * Get performance and analytics breakdown for the logged-in band's posts
 */
router.get('/my-performance', requireAuth, requireBand, async (req, res) => {
  try {
    const bandProfile = await BandProfile.findOrCreateForUser(req.user);
    if (!bandProfile) {
      return res.status(404).json({ success: false, message: 'Profil band tidak ditemukan' });
    }

    const performance = await BandPost.getPerformanceSummaryByBandId(bandProfile.id);
    return res.json({
      success: true,
      data: performance
    });
  } catch (error) {
    console.error('Error fetching post performance:', error);
    return res.status(500).json({ success: false, message: 'Gagal mengambil data performa postingan' });
  }
});

module.exports = router;
