const express = require('express');
const router = express.Router();
const BandPost = require('../models/BandPost');
const BandProfile = require('../models/BandProfile');
const { requireAuth, requireBand } = require('../middleware/auth');

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
    const post = await BandPost.incrementViews(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Postingan tidak ditemukan' });
    }
    return res.json({ success: true, data: { viewsCount: post.viewsCount } });
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
    const bandProfile = await BandProfile.findByUserId(req.user.id);
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

    const newPost = await BandPost.create({
      bandProfileId: bandProfile.id,
      mediaType: (hasSlides && parsedSlides[0]?.type) ? parsedSlides[0].type : (mediaType || 'photo'),
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
    const bandProfile = await BandProfile.findByUserId(req.user.id);
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
