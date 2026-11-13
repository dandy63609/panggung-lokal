const db = require('../utils/db');

/**
 * BandPost Model
 * Handles database operations for Instagram-style band portfolio posts & performance metrics
 */
class BandPost {
  constructor(data) {
    this.id = data.id;
    this.bandProfileId = data.band_profile_id;
    this.mediaType = data.media_type || 'photo';
    this.mediaUrl = data.media_url;
    this.thumbnailUrl = data.thumbnail_url || data.media_url;
    this.caption = data.caption || '';
    this.viewsCount = Number(data.views_count) || 0;
    this.waClicksCount = Number(data.wa_clicks_count) || 0;
    this.createdAt = data.created_at;

    // Parse multi-slide media (mixed photos & videos)
    let parsedSlides = [];
    if (Array.isArray(data.slides)) {
      parsedSlides = data.slides;
    } else if (typeof data.slides === 'string' && data.slides.trim()) {
      try {
        parsedSlides = JSON.parse(data.slides);
      } catch (e) {
        parsedSlides = [];
      }
    }

    if (Array.isArray(parsedSlides) && parsedSlides.length > 0) {
      this.slides = parsedSlides.map(s => {
        if (typeof s === 'string') {
          return { type: 'photo', url: s };
        }
        return {
          type: s.type || 'photo',
          url: s.url || s.mediaUrl || ''
        };
      });
      if (!this.mediaUrl && this.slides[0]?.url) {
        this.mediaUrl = this.slides[0].url;
      }
      if (!this.thumbnailUrl && this.slides[0]?.url) {
        this.thumbnailUrl = this.slides[0].url;
      }
    } else {
      this.slides = [
        {
          type: this.mediaType || 'photo',
          url: this.mediaUrl || this.thumbnailUrl
        }
      ];
    }
  }

  /**
   * Find a post by ID
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM band_posts WHERE id = $1',
      [id]
    );
    return result.rows[0] ? new BandPost(result.rows[0]) : null;
  }

  /**
   * Find all posts for a specific band ordered by newest first
   */
  static async findByBandProfileId(bandProfileId) {
    const result = await db.query(
      'SELECT * FROM band_posts WHERE band_profile_id = $1 ORDER BY created_at DESC',
      [bandProfileId]
    );
    return result.rows.map(row => new BandPost(row));
  }

  /**
   * Create a new post for a band
   */
  static async create(data) {
    let slides = data.slides || [];
    if (typeof slides === 'string') {
      try {
        slides = JSON.parse(slides);
      } catch (e) {
        slides = [];
      }
    }
    if (!Array.isArray(slides) || slides.length === 0) {
      slides = [
        {
          type: data.mediaType || 'photo',
          url: data.mediaUrl || data.thumbnailUrl
        }
      ];
    }

    const firstSlide = slides[0] || {};
    const primaryType = firstSlide.type || data.mediaType || 'photo';
    const primaryUrl = firstSlide.url || data.mediaUrl || '';
    const thumbUrl = data.thumbnailUrl || (primaryType === 'video' ? (data.thumbnailUrl || primaryUrl) : primaryUrl);
    const slidesJson = JSON.stringify(slides);

    const result = await db.query(
      `INSERT INTO band_posts (
        band_profile_id, media_type, media_url, thumbnail_url, caption, slides, views_count, wa_clicks_count
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
      RETURNING *`,
      [
        data.bandProfileId,
        primaryType,
        primaryUrl,
        thumbUrl,
        data.caption || '',
        slidesJson
      ]
    );
    return new BandPost(result.rows[0]);
  }

  /**
   * Delete a post (ensuring it belongs to the band)
   */
  static async delete(id, bandProfileId) {
    const result = await db.query(
      'DELETE FROM band_posts WHERE id = $1 AND band_profile_id = $2 RETURNING *',
      [id, bandProfileId]
    );
    return result.rows.length > 0;
  }

  /**
   * Increment view impressions count for a post
   */
  static async incrementViews(id) {
    const result = await db.query(
      'UPDATE band_posts SET views_count = views_count + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] ? new BandPost(result.rows[0]) : null;
  }

  /**
   * Increment WhatsApp inquiries / clicks generated from a post
   */
  static async incrementWaClicks(id) {
    const result = await db.query(
      'UPDATE band_posts SET wa_clicks_count = wa_clicks_count + 1 WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0] ? new BandPost(result.rows[0]) : null;
  }

  /**
   * Get aggregated performance analytics for all posts of a band
   */
  static async getPerformanceSummaryByBandId(bandProfileId) {
    const posts = await this.findByBandProfileId(bandProfileId);
    const totalPosts = posts.length;
    const totalViews = posts.reduce((sum, p) => sum + p.viewsCount, 0);
    const totalWaClicks = posts.reduce((sum, p) => sum + p.waClicksCount, 0);

    return {
      totalPosts,
      totalViews,
      totalWaClicks,
      posts
    };
  }
}

module.exports = BandPost;
