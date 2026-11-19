const db = require('../utils/db');

class BandPost {
  static resolveCollectionMediaType(slides, fallbackType = 'photo') {
    if (!Array.isArray(slides) || slides.length === 0) {
      return fallbackType || 'photo';
    }
    const types = new Set(slides.map((s) => (s && s.type) || 'photo'));
    if (types.has('photo') && types.has('video')) {
      return 'mixed';
    }
    if (types.has('video')) {
      return 'video';
    }
    if (types.has('audio')) {
      return 'audio';
    }
    return slides[0]?.type || fallbackType || 'photo';
  }

  static parseSlidesInput(rawSlides) {
    if (Array.isArray(rawSlides)) {
      return rawSlides;
    }
    if (typeof rawSlides === 'string' && rawSlides.trim()) {
      try {
        const parsed = JSON.parse(rawSlides);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }

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

    const parsedSlides = BandPost.parseSlidesInput(data.slides);

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
    let slides = BandPost.parseSlidesInput(data.slides);
    if (slides.length === 0) {
      slides = [
        {
          type: data.mediaType || 'photo',
          url: data.mediaUrl || data.thumbnailUrl
        }
      ];
    }

    const firstSlide = slides[0] || {};
    const firstPhotoSlide = slides.find((s) => (s?.type || 'photo') === 'photo');
    const primaryType = BandPost.resolveCollectionMediaType(slides, data.mediaType);
    const primaryUrl = firstSlide.url || data.mediaUrl || '';
    const thumbUrl = data.thumbnailUrl || firstPhotoSlide?.url || primaryUrl;
    const slidesJson = JSON.stringify(slides);

    let query;
    let values;

    if (data.id) {
      query = `INSERT INTO band_posts (
        id, band_profile_id, media_type, media_url, thumbnail_url, caption, slides, views_count, wa_clicks_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, 0)
      RETURNING *`;
      values = [
        data.id,
        data.bandProfileId,
        primaryType,
        primaryUrl,
        thumbUrl,
        data.caption || '',
        slidesJson
      ];
    } else {
      query = `INSERT INTO band_posts (
        band_profile_id, media_type, media_url, thumbnail_url, caption, slides, views_count, wa_clicks_count
      ) VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
      RETURNING *`;
      values = [
        data.bandProfileId,
        primaryType,
        primaryUrl,
        thumbUrl,
        data.caption || '',
        slidesJson
      ];
    }

    const result = await db.query(query, values);
    return new BandPost(result.rows[0]);
  }

  /**
   * Append additional slides to an existing post carousel (ensuring band ownership)
   */
  static async appendSlides(id, bandProfileId, newSlides = [], captionOverride) {
    const existingRes = await db.query(
      'SELECT * FROM band_posts WHERE id = $1 AND band_profile_id = $2',
      [id, bandProfileId]
    );
    if (existingRes.rows.length === 0) {
      return null;
    }

    const current = new BandPost(existingRes.rows[0]);
    const mergedSlides = [...current.slides, ...newSlides].filter((s) => s && s.url);
    const primaryType = BandPost.resolveCollectionMediaType(mergedSlides, current.mediaType);
    const firstSlide = mergedSlides[0] || {};
    const firstPhoto = mergedSlides.find((s) => s.type === 'photo');
    const primaryUrl = firstSlide.url || current.mediaUrl;
    const thumbUrl = firstPhoto?.url || current.thumbnailUrl || primaryUrl;
    const nextCaption = typeof captionOverride === 'string' && captionOverride.trim() !== ''
      ? captionOverride.trim()
      : current.caption;

    const updatedRes = await db.query(
      `UPDATE band_posts
       SET media_type = $1, media_url = $2, thumbnail_url = $3, caption = $4, slides = $5
       WHERE id = $6 AND band_profile_id = $7
       RETURNING *`,
      [
        primaryType,
        primaryUrl,
        thumbUrl,
        nextCaption,
        JSON.stringify(mergedSlides),
        id,
        bandProfileId
      ]
    );

    return updatedRes.rows[0] ? new BandPost(updatedRes.rows[0]) : null;
  }

  /**
   * Delete a post (ensuring it belongs to the band)
   */
  static async delete(id, bandProfileId) {
    await db.query(
      'UPDATE band_profiles SET stage_visual_post_id = NULL WHERE id = $1 AND stage_visual_post_id = $2',
      [bandProfileId, id]
    );
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
