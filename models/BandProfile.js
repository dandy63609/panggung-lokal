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
    const result = await db.query(
      `INSERT INTO band_profiles (
        user_id, band_name, genre, location_city, location_region, 
        bio, budget_min, budget_max, profile_photo_url, cover_photo_url, 
        phone, instagram_handle, facebook_url, youtube_url,
        spotify_url, tiktok_url,
        rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
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
      ]
    );
    return new BandProfile(result.rows[0]);
  }

  /**
   * Update band profile
   */
  static async update(id, data) {
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
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
        data.riderChannelInputs,
        data.riderSoundSystem,
        data.riderInstruments,
        data.riderHospitality,
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
   * Get active availability posts for this band
   */
  async getAvailabilityPosts() {
    const result = await db.query(
      `SELECT * FROM availability_posts 
       WHERE band_profile_id = $1 AND is_active = true 
       ORDER BY start_date ASC`,
      [this.id]
    );
    return result.rows;
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
   * Get recent bands with upcoming availability for homepage
   */
  static async getRecent(limit = 6) {
    const result = await db.query(
      `SELECT bp.*, 
              ap.id as post_id, ap.start_date, ap.end_date, ap.notes as availability_notes
       FROM band_profiles bp
       LEFT JOIN availability_posts ap ON ap.band_profile_id = bp.id AND ap.is_active = true
       ORDER BY ap.start_date ASC NULLS LAST, bp.profile_views DESC
       LIMIT $1`,
      [limit]
    );

    // Group by band profile
    const seen = new Set();
    const bands = [];
    for (const row of result.rows) {
      if (!seen.has(row.id)) {
        seen.add(row.id);
        bands.push({
          ...new BandProfile(row),
          availability: row.start_date ? {
            id: row.post_id,
            startDate: row.start_date,
            endDate: row.end_date,
            notes: row.availability_notes
          } : null
        });
      }
    }

    return bands;
  }
}

module.exports = BandProfile;
