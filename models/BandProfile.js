const db = require('../utils/db');

/**
 * BandProfile Model
 * Handles database operations for band profiles
 */
class BandProfile {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.bandName = data.band_name;
    this.genre = data.genre;
    this.locationCity = data.location_city;
    this.locationRegion = data.location_region;
    this.bio = data.bio;
    this.budgetMin = data.budget_min;
    this.budgetMax = data.budget_max;
    this.profilePhotoUrl = data.profile_photo_url;
    this.coverPhotoUrl = data.cover_photo_url;
    this.phone = data.phone;
    this.instagramHandle = data.instagram_handle;
    this.facebookUrl = data.facebook_url;
    this.youtubeUrl = data.youtube_url;
    this.spotifyUrl = data.spotify_url;
    this.tiktokUrl = data.tiktok_url;
    this.riderChannelInputs = data.rider_channel_inputs;
    this.riderSoundSystem = data.rider_sound_system;
    this.riderInstruments = data.rider_instruments;
    this.riderHospitality = data.rider_hospitality;

    this.riderItems = BandProfile.parseRiderItems(data);
    this.profileViews = data.profile_views || 0;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Helper: Parse & format customizable technical rider items
   * Handles JSON, array, legacy fields, and sensible defaults
   * @param {Object} data
   * @returns {Array<{ title: string, description: string }>}
   */
  static parseRiderItems(data) {
    let parsed = [];
    if (Array.isArray(data.rider_items)) {
      parsed = data.rider_items;
    } else if (typeof data.rider_items === 'string' && data.rider_items.trim()) {
      try {
        parsed = JSON.parse(data.rider_items);
      } catch (e) {
        parsed = [];
      }
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .filter(item => item && typeof item === 'object')
        .map(item => ({
          title: item.title || 'Kebutuhan Panggung',
          description: item.description || ''
        }));
    }

    const legacyList = [
      { title: 'Input Audio Channel', description: data.rider_channel_inputs || '' },
      { title: 'Kebutuhan Sound System', description: data.rider_sound_system || '' },
      { title: 'Peralatan & Backline', description: data.rider_instruments || '' },
      { title: 'Hospitality & Konsumsi', description: data.rider_hospitality || '' }
    ].filter(item => item.description.trim() !== '');

    if (legacyList.length > 0) return legacyList;

    return [
      { title: 'Input Audio Channel', description: 'Dapat dinegosiasikan (Standar 8-16 Channel)' },
      { title: 'Kebutuhan Sound System', description: 'FOH PA System & Active Stage Monitor standar venue' },
      { title: 'Peralatan & Backline', description: 'Musisi membawa instrumen utama. Venue menyediakan drum kit dan amplifier.' },
      { title: 'Hospitality & Konsumsi', description: 'Ruang tunggu bersih, air mineral botol, konsumsi tim/kru.' }
    ];
  }

  /**
   * Helper: Sanitize rider items payload for updates
   * @param {any} items
   * @param {Object} existingRider
   * @returns {{ json: string|null, channel?: string, sound?: string, inst?: string, hosp?: string }}
   */
  static sanitizeRiderItems(items, existingRider = {}) {
    let raw = items;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { raw = []; }
    }

    if (!Array.isArray(raw)) {
      return { json: null, ...existingRider };
    }

    const sanitized = raw
      .filter(it => it && typeof it === 'object')
      .map(it => ({
        title: String(it.title || 'Kebutuhan Panggung').trim(),
        description: String(it.description || '').trim()
      }));

    return {
      json: JSON.stringify(sanitized),
      channel: existingRider.riderChannel ?? sanitized[0]?.description,
      sound: existingRider.riderSound ?? sanitized[1]?.description,
      inst: existingRider.riderInst ?? sanitized[2]?.description,
      hosp: existingRider.riderHosp ?? sanitized[3]?.description
    };
  }

  /**
   * Find band profile by ID
   */
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM band_profiles WHERE id = $1',
      [id]
    );
    return result.rows[0] ? new BandProfile(result.rows[0]) : null;
  }

  /**
   * Find band profile by user ID
   */
  static async findByUserId(userId) {
    const result = await db.query(
      'SELECT * FROM band_profiles WHERE user_id = $1',
      [userId]
    );
    return result.rows[0] ? new BandProfile(result.rows[0]) : null;
  }

  /**
   * Create a new band profile
   */
  static async create(data) {
    let riderItemsJson = null;
    if (data.riderItems) {
      riderItemsJson = typeof data.riderItems === 'string' ? data.riderItems : JSON.stringify(data.riderItems);
    }

    const result = await db.query(
      `INSERT INTO band_profiles (
        user_id, band_name, genre, location_city, location_region, 
        bio, budget_min, budget_max, profile_photo_url, cover_photo_url, 
        phone, instagram_handle, facebook_url, youtube_url,
        spotify_url, tiktok_url,
        rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality,
        rider_items
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *`,
      [
        data.userId,
        data.bandName,
        data.genre,
        data.locationCity,
        data.locationRegion || null,
        data.bio || null,
        data.budgetMin || null,
        data.budgetMax || null,
        data.profilePhotoUrl || null,
        data.coverPhotoUrl || null,
        data.phone || null,
        data.instagramHandle || null,
        data.facebookUrl || null,
        data.youtubeUrl || null,
        data.spotifyUrl || null,
        data.tiktokUrl || null,
        data.riderChannelInputs || null,
        data.riderSoundSystem || null,
        data.riderInstruments || null,
        data.riderHospitality || null,
        riderItemsJson
      ]
    );
    return new BandProfile(result.rows[0]);
  }

  /**
   * Update band profile
   */
  static async update(id, data) {
    let riderChannel = data.riderChannelInputs;
    let riderSound = data.riderSoundSystem;
    let riderInst = data.riderInstruments;
    let riderHosp = data.riderHospitality;
    let riderItemsJson = null;

    if (data.riderItems !== undefined) {
      const sanitized = BandProfile.sanitizeRiderItems(data.riderItems, {
        riderChannel,
        riderSound,
        riderInst,
        riderHosp
      });
      riderItemsJson = sanitized.json;
      riderChannel = sanitized.channel;
      riderSound = sanitized.sound;
      riderInst = sanitized.inst;
      riderHosp = sanitized.hosp;
    }

    const result = await db.query(
      `UPDATE band_profiles SET
        band_name = COALESCE($1, band_name),
        genre = COALESCE($2, genre),
        location_city = COALESCE($3, location_city),
        location_region = COALESCE($4, location_region),
        bio = COALESCE($5, bio),
        budget_min = COALESCE($6, budget_min),
        budget_max = COALESCE($7, budget_max),
        profile_photo_url = COALESCE($8, profile_photo_url),
        cover_photo_url = COALESCE($9, cover_photo_url),
        phone = COALESCE($10, phone),
        instagram_handle = COALESCE($11, instagram_handle),
        facebook_url = COALESCE($12, facebook_url),
        youtube_url = COALESCE($13, youtube_url),
        spotify_url = COALESCE($14, spotify_url),
        tiktok_url = COALESCE($15, tiktok_url),
        rider_channel_inputs = COALESCE($16, rider_channel_inputs),
        rider_sound_system = COALESCE($17, rider_sound_system),
        rider_instruments = COALESCE($18, rider_instruments),
        rider_hospitality = COALESCE($19, rider_hospitality),
        rider_items = COALESCE($20, rider_items),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *`,
      [
        data.bandName,
        data.genre,
        data.locationCity,
        data.locationRegion,
        data.bio,
        data.budgetMin,
        data.budgetMax,
        data.profilePhotoUrl,
        data.coverPhotoUrl,
        data.phone,
        data.instagramHandle,
        data.facebookUrl,
        data.youtubeUrl,
        data.spotifyUrl,
        data.tiktokUrl,
        riderChannel,
        riderSound,
        riderInst,
        riderHosp,
        riderItemsJson,
        id
      ]
    );
    return result.rows[0] ? new BandProfile(result.rows[0]) : null;
  }

  /**
   * Increment view counter
   */
  static async incrementViews(id) {
    await db.query(
      'UPDATE band_profiles SET profile_views = profile_views + 1 WHERE id = $1',
      [id]
    );
  }

  /**
   * Get platform-wide metrics (Total bands, unique genres, 100% curated)
   */
  static async getPlatformStats() {
    const bandResult = await db.query('SELECT COUNT(*) as total FROM band_profiles');
    const genreResult = await db.query('SELECT COUNT(DISTINCT genre) as total FROM band_profiles');
    return {
      totalBands: parseInt(bandResult.rows[0].total, 10) || 0,
      totalGenres: parseInt(genreResult.rows[0].total, 10) || 0,
      curatedBadge: '100% Terkurasi'
    };
  }

  /**
   * Get Instagram-style posts for this band
   */
  async getPosts() {
    const BandPost = require('./BandPost');
    return await BandPost.findByBandProfileId(this.id);
  }

  /**
   * Get active availability posts (deprecated, returns empty array)
   */
  async getAvailabilityPosts() {
    return [];
  }

  /**
   * Get media files for this band
   */
  async getMediaFiles() {
    const result = await db.query(
      `SELECT * FROM media_files 
       WHERE band_profile_id = $1 
       ORDER BY display_order ASC, created_at DESC`,
      [this.id]
    );
    return result.rows;
  }

  /**
   * Add a media file for this band
   */
  async addMediaFile(data) {
    const result = await db.query(
      `INSERT INTO media_files (band_profile_id, file_type, file_url, title, display_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [this.id, data.fileType, data.fileUrl, data.title || null, data.displayOrder || 0]
    );
    return result.rows[0];
  }

  /**
   * Delete a media file owned by a band
   * @param {number} mediaId
   * @param {number} bandProfileId
   * @returns {Promise<boolean>}
   */
  static async deleteMediaFile(mediaId, bandProfileId) {
    const result = await db.query(
      'DELETE FROM media_files WHERE id = $1 AND band_profile_id = $2 RETURNING id',
      [mediaId, bandProfileId]
    );

    return result.rows.length > 0;
  }

  /**
   * Query builder helper for band search filters
   * @private
   */
  static buildSearchQuery(filters) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (filters.genre?.trim()) {
      conditions.push(`bp.genre ILIKE $${paramIndex++}`);
      params.push(`%${filters.genre.trim()}%`);
    }

    if (filters.location?.trim()) {
      conditions.push(`(bp.location_city ILIKE $${paramIndex} OR bp.location_region ILIKE $${paramIndex})`);
      paramIndex++;
      params.push(`%${filters.location.trim()}%`);
    }

    if (filters.budgetMin !== undefined && filters.budgetMin !== null && filters.budgetMin !== '') {
      conditions.push(`(bp.budget_max >= $${paramIndex++} OR bp.budget_max IS NULL)`);
      params.push(parseInt(filters.budgetMin, 10));
    }

    if (filters.budgetMax !== undefined && filters.budgetMax !== null && filters.budgetMax !== '') {
      conditions.push(`(bp.budget_min <= $${paramIndex++} OR bp.budget_min IS NULL)`);
      params.push(parseInt(filters.budgetMax, 10));
    }

    if (filters.search?.trim()) {
      conditions.push(`(
        bp.band_name ILIKE $${paramIndex} OR 
        bp.genre ILIKE $${paramIndex} OR 
        bp.location_city ILIKE $${paramIndex} OR 
        bp.bio ILIKE $${paramIndex}
      )`);
      paramIndex++;
      params.push(`%${filters.search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params, nextParamIndex: paramIndex };
  }

  /**
   * Search band profiles with multiple filters and pagination
   */
  static async search(filters = {}) {
    const pageNum = Math.max(1, parseInt(filters.page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(filters.limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const { whereClause, params, nextParamIndex } = this.buildSearchQuery(filters);
    const baseFrom = 'FROM band_profiles bp';

    // Count total query
    const countSql = `SELECT COUNT(DISTINCT bp.id) as total ${baseFrom} ${whereClause}`;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Results query
    const selectSql = `
      SELECT DISTINCT bp.* 
      ${baseFrom} 
      ${whereClause} 
      ORDER BY bp.profile_views DESC, bp.created_at DESC 
      LIMIT $${nextParamIndex} OFFSET $${nextParamIndex + 1}
    `;
    const resultParams = [...params, limitNum, offset];
    const result = await db.query(selectSql, resultParams);

    const bands = result.rows.map(row => new BandProfile(row));

    return {
      bands,
      total,
      page: pageNum,
      totalPages,
      limit: limitNum
    };
  }

  /**
   * Get recent curated bands for homepage
   */
  static async getRecent(limit = 6) {
    const result = await db.query(
      `SELECT * FROM band_profiles ORDER BY profile_views DESC, created_at DESC LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => new BandProfile(row));
  }
}

module.exports = BandProfile;
