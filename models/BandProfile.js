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

    // Parse customizable rider items
    let parsedRiderItems = [];
    if (Array.isArray(data.rider_items)) {
      parsedRiderItems = data.rider_items;
    } else if (typeof data.rider_items === 'string' && data.rider_items.trim()) {
      try {
        parsedRiderItems = JSON.parse(data.rider_items);
      } catch (e) {
        parsedRiderItems = [];
      }
    }

    if (Array.isArray(parsedRiderItems) && parsedRiderItems.length > 0) {
      this.riderItems = parsedRiderItems
        .filter(item => item && typeof item === 'object')
        .map(item => ({
          title: item.title || 'Kebutuhan Panggung',
          description: item.description || ''
        }));
    } else {
      const legacyList = [
        { title: 'Input Audio Channel', description: this.riderChannelInputs || '' },
        { title: 'Kebutuhan Sound System', description: this.riderSoundSystem || '' },
        { title: 'Peralatan & Backline', description: this.riderInstruments || '' },
        { title: 'Hospitality & Konsumsi', description: this.riderHospitality || '' }
      ].filter(item => item.description.trim() !== '');

      this.riderItems = legacyList.length > 0 ? legacyList : [
        { title: 'Input Audio Channel', description: 'Dapat dinegosiasikan (Standar 8-16 Channel)' },
        { title: 'Kebutuhan Sound System', description: 'FOH PA System & Active Stage Monitor standar venue' },
        { title: 'Peralatan & Backline', description: 'Musisi membawa instrumen utama. Venue menyediakan drum kit dan amplifier.' },
        { title: 'Hospitality & Konsumsi', description: 'Ruang tunggu bersih, air mineral botol, konsumsi tim/kru.' }
      ];
    }

    this.profileViews = data.profile_views || 0;
    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
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
    let riderItemsJson = null;
    let riderChannel = data.riderChannelInputs;
    let riderSound = data.riderSoundSystem;
    let riderInst = data.riderInstruments;
    let riderHosp = data.riderHospitality;

    if (data.riderItems !== undefined) {
      let items = data.riderItems;
      if (typeof items === 'string') {
        try { items = JSON.parse(items); } catch (e) { items = []; }
      }
      if (Array.isArray(items)) {
        const sanitizedItems = items
          .filter(it => it && typeof it === 'object')
          .map(it => ({
            title: String(it.title || 'Kebutuhan Panggung').trim(),
            description: String(it.description || '').trim()
          }));
        riderItemsJson = JSON.stringify(sanitizedItems);
        if (sanitizedItems[0] && riderChannel === undefined) riderChannel = sanitizedItems[0].description;
        if (sanitizedItems[1] && riderSound === undefined) riderSound = sanitizedItems[1].description;
        if (sanitizedItems[2] && riderInst === undefined) riderInst = sanitizedItems[2].description;
        if (sanitizedItems[3] && riderHosp === undefined) riderHosp = sanitizedItems[3].description;
      }
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
        id,
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
   * Search band profiles with multiple filters and pagination
   * (Event date filter removed as per peer-review evaluation)
   */
  static async search(filters = {}) {
    const {
      genre,
      location,
      budgetMin,
      budgetMax,
      search,
      page = 1,
      limit = 20
    } = filters;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    let baseQuery = `
      FROM band_profiles bp
    `;
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (genre && genre.trim() !== '') {
      conditions.push(`bp.genre ILIKE $${paramIndex}`);
      params.push(`%${genre.trim()}%`);
      paramIndex += 1;
    }

    if (location && location.trim() !== '') {
      conditions.push(`(bp.location_city ILIKE $${paramIndex} OR bp.location_region ILIKE $${paramIndex})`);
      params.push(`%${location.trim()}%`);
      paramIndex += 1;
    }

    if (budgetMin !== undefined && budgetMin !== null && budgetMin !== '') {
      conditions.push(`(bp.budget_max >= $${paramIndex} OR bp.budget_max IS NULL)`);
      params.push(parseInt(budgetMin, 10));
      paramIndex += 1;
    }

    if (budgetMax !== undefined && budgetMax !== null && budgetMax !== '') {
      conditions.push(`(bp.budget_min <= $${paramIndex} OR bp.budget_min IS NULL)`);
      params.push(parseInt(budgetMax, 10));
      paramIndex += 1;
    }

    if (search && search.trim() !== '') {
      conditions.push(`(
        bp.band_name ILIKE $${paramIndex} OR 
        bp.genre ILIKE $${paramIndex} OR 
        bp.location_city ILIKE $${paramIndex} OR 
        bp.bio ILIKE $${paramIndex}
      )`);
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total query
    const countSql = `SELECT COUNT(DISTINCT bp.id) as total ${baseQuery} ${whereClause}`;
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].total, 10);
    const totalPages = Math.ceil(total / limitNum) || 1;

    // Results query
    const selectSql = `
      SELECT DISTINCT bp.* 
      ${baseQuery} 
      ${whereClause} 
      ORDER BY bp.profile_views DESC, bp.created_at DESC 
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
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
