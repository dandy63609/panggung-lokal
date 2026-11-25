const db = require('../utils/db');

function slugify(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&/g, 'dan')
    .replace(/[\s\W-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * BandProfile Model
 * Handles database operations for band profiles
 */
class BandProfile {
  constructor(data) {
    this.id = data.id;
    this.userId = data.user_id;
    this.bandName = data.band_name;
    this.slug = slugify(this.bandName);
    this.genre = data.genre;
    this.locationCity = data.location_city;
    this.locationRegion = data.location_region;
    this.campus = data.campus || data.campus_name || null;
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
    let parsedRiderItems = null;
    if (Array.isArray(data.rider_items)) {
      parsedRiderItems = data.rider_items;
    } else if (typeof data.rider_items === 'string' && data.rider_items.trim()) {
      try {
        parsedRiderItems = JSON.parse(data.rider_items);
      } catch {
        parsedRiderItems = null;
      }
    }

    if (data.rider_items !== null && data.rider_items !== undefined && Array.isArray(parsedRiderItems)) {
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
    this.stageVisualPostId = data.stage_visual_post_id ? Number(data.stage_visual_post_id) : null;

    this.createdAt = data.created_at;
    this.updatedAt = data.updated_at;
  }

  /**
   * Find band profile by ID
   */
  static async findById(id) {
    const result = await db.query(
      `SELECT bp.* FROM band_profiles bp
       INNER JOIN users u ON u.id = bp.user_id
       WHERE bp.id = $1 AND u.is_active = TRUE`,
      [id]
    );
    return result.rows[0] ? new BandProfile(result.rows[0]) : null;
  }

  /**
   * Find band profile by ID or by URL slug
   */
  static async findByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;
    const clean = String(idOrSlug).trim().toLowerCase();
    const isNumeric = /^\d+$/.test(clean);

    if (isNumeric) {
      const byId = await this.findById(parseInt(clean, 10));
      if (byId) return byId;
    }

    // Try finding by exact match or normalized name
    const nameMatch = await db.query(
      `SELECT bp.* FROM band_profiles bp
       INNER JOIN users u ON u.id = bp.user_id
       WHERE LOWER(bp.band_name) = LOWER($1) AND u.is_active = TRUE
       LIMIT 1`,
      [clean.replace(/-/g, ' ')]
    );
    if (nameMatch.rows[0]) {
      return new BandProfile(nameMatch.rows[0]);
    }

    // Scan all active bands for generated slug match
    const allResult = await db.query(
      `SELECT bp.* FROM band_profiles bp
       INNER JOIN users u ON u.id = bp.user_id
       WHERE u.is_active = TRUE`
    );
    for (const row of allResult.rows) {
      const band = new BandProfile(row);
      if (band.slug === clean || slugify(band.bandName) === clean) {
        return band;
      }
    }

    return null;
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
   * Ensure an authenticated band user has a band_profiles row, self-healing orphaned accounts
   */
  static async findOrCreateForUser(user, overrides = {}) {
    const existing = await this.findByUserId(user.id);
    if (existing) return existing;

    const fallbackName = (user.email ? String(user.email).split('@')[0] : '') || `Band ${user.id}`;
    try {
      return await this.create({
        userId: user.id,
        bandName: (overrides.bandName && String(overrides.bandName).trim()) || fallbackName,
        genre: (overrides.genre && String(overrides.genre).trim()) || 'Indie / Pop',
        locationCity: (overrides.locationCity && String(overrides.locationCity).trim()) || 'Kota Semarang',
        bio: overrides.bio !== undefined ? overrides.bio : 'Profil band baru di Reffband'
      });
    } catch {
      return this.findByUserId(user.id);
    }
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
        try { items = JSON.parse(items); } catch { items = []; }
      }
      if (Array.isArray(items)) {
        const sanitizedItems = items
          .filter(it => it && typeof it === 'object')
          .map(it => ({
            title: String(it.title || 'Kebutuhan Panggung').trim(),
            description: String(it.description || '').trim()
          }));
        riderItemsJson = JSON.stringify(sanitizedItems);
        if (riderChannel === undefined) riderChannel = sanitizedItems[0] ? sanitizedItems[0].description : '';
        if (riderSound === undefined) riderSound = sanitizedItems[1] ? sanitizedItems[1].description : '';
        if (riderInst === undefined) riderInst = sanitizedItems[2] ? sanitizedItems[2].description : '';
        if (riderHosp === undefined) riderHosp = sanitizedItems[3] ? sanitizedItems[3].description : '';
      }
    }

    const fields = [];
    const values = [];
    let idx = 1;

    const map = [
      ['band_name', data.bandName],
      ['genre', data.genre],
      ['location_city', data.locationCity],
      ['location_region', data.locationRegion],
      ['campus', data.campus],
      ['bio', data.bio],
      ['budget_min', data.budgetMin],
      ['budget_max', data.budgetMax],
      ['profile_photo_url', data.profilePhotoUrl],
      ['cover_photo_url', data.coverPhotoUrl],
      ['phone', data.phone],
      ['instagram_handle', data.instagramHandle],
      ['facebook_url', data.facebookUrl],
      ['youtube_url', data.youtubeUrl],
      ['spotify_url', data.spotifyUrl],
      ['tiktok_url', data.tiktokUrl],
      ['rider_channel_inputs', riderChannel],
      ['rider_sound_system', riderSound],
      ['rider_instruments', riderInst],
      ['rider_hospitality', riderHosp],
      ['rider_items', riderItemsJson],
      ['stage_visual_post_id', data.stageVisualPostId !== undefined ? (data.stageVisualPostId ? Number(data.stageVisualPostId) : null) : undefined],
    ];

    for (const [col, val] of map) {
      if (val !== undefined) {
        fields.push(`${col} = $${idx++}`);
        values.push(val === '' ? null : val);
      }
    }

    if (fields.length === 0) {
      return BandProfile.findById(id);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const query = `UPDATE band_profiles SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
    const result = await db.query(query, values);
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
    try {
      const bandResult = await db.query(
        `SELECT COUNT(*) as total FROM band_profiles bp
         INNER JOIN users u ON u.id = bp.user_id
         WHERE u.is_active = TRUE`
      );
      const genreResult = await db.query(
        `SELECT COUNT(DISTINCT bp.genre) as total FROM band_profiles bp
         INNER JOIN users u ON u.id = bp.user_id
         WHERE u.is_active = TRUE`
      );
      const totalBands = parseInt(bandResult?.rows?.[0]?.total, 10);
      const totalGenres = parseInt(genreResult?.rows?.[0]?.total, 10);
      return {
        totalBands: Number.isFinite(totalBands) ? totalBands : 0,
        totalGenres: Number.isFinite(totalGenres) ? totalGenres : 0,
        curatedBadge: '100% Terkurasi'
      };
    } catch {
      return {
        totalBands: 0,
        totalGenres: 0,
        curatedBadge: '100% Terkurasi'
      };
    }
  }

  /**
   * Get Instagram-style posts for this band
   */
  async getPosts() {
    const BandPost = require('./BandPost');
    return await BandPost.findByBandProfileId(this.id);
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
      INNER JOIN users u ON u.id = bp.user_id
    `;
    const conditions = ['u.is_active = TRUE'];
    const params = [];
    let paramIndex = 1;

    if (genre && genre.trim() !== '') {
      const normalizedGenre = genre.trim().toLowerCase();
      const categoryKeywords = {
        'rock & grunge': ['rock', 'grunge', 'alternative', 'punk', 'britpop'],
        'indie & folk': ['indie', 'folk', 'shoegaze', 'dream pop', 'acoustic', 'akustik'],
        'metal & hardcore': ['metal', 'hardcore', 'thrash', 'metalcore', 'heavy'],
        'pop & retro': ['pop', 'city pop', 'retro', 'synth', 'r&b'],
        'dangdut fusion': ['dangdut', 'koplo', 'fusion', 'orkes', 'campursari', 'melayu'],
        'jazz & soul': ['jazz', 'soul', 'funk', 'blues', 'fusion', 'bossa'],
        rock: ['rock', 'grunge', 'alternative', 'punk', 'britpop'],
        grunge: ['grunge', 'rock', 'alternative'],
        indie: ['indie', 'folk', 'shoegaze', 'dream pop', 'acoustic', 'akustik'],
        folk: ['folk', 'indie', 'akustik', 'acoustic'],
        metal: ['metal', 'hardcore', 'thrash', 'metalcore', 'heavy'],
        hardcore: ['hardcore', 'metal', 'punk', 'thrash'],
        pop: ['pop', 'city pop', 'retro', 'synth', 'r&b'],
        retro: ['retro', 'city pop', 'pop', 'synth'],
        dangdut: ['dangdut', 'koplo', 'fusion', 'orkes', 'campursari', 'melayu'],
        koplo: ['koplo', 'dangdut', 'fusion', 'campursari'],
        jazz: ['jazz', 'soul', 'funk', 'blues', 'fusion', 'bossa'],
        soul: ['soul', 'jazz', 'funk', 'r&b'],
        akustik: ['akustik', 'acoustic', 'folk', 'unplugged'],
        acoustic: ['acoustic', 'akustik', 'folk', 'unplugged'],
      };

      const expanded = new Set();
      if (categoryKeywords[normalizedGenre]) {
        for (const kw of categoryKeywords[normalizedGenre]) expanded.add(kw);
      } else {
        const segments = normalizedGenre.split(/[&/,+]+/).map((s) => s.trim()).filter(Boolean);
        for (const segment of segments) {
          if (categoryKeywords[segment]) {
            for (const kw of categoryKeywords[segment]) expanded.add(kw);
          } else if (segments.length > 1) {
            expanded.add(segment);
          }
        }
      }

      const genreKeywords = expanded.size > 0 ? Array.from(expanded) : [genre.trim()];
      if (genreKeywords.length === 1) {
        conditions.push(`bp.genre ILIKE $${paramIndex}`);
        params.push(`%${genreKeywords[0]}%`);
        paramIndex += 1;
      } else {
        const orClauses = genreKeywords.map((kw) => {
          params.push(`%${kw}%`);
          const clause = `bp.genre ILIKE $${paramIndex}`;
          paramIndex += 1;
          return clause;
        });
        conditions.push(`(${orClauses.join(' OR ')})`);
      }
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
        bp.campus ILIKE $${paramIndex} OR 
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
      `SELECT bp.* FROM band_profiles bp
       INNER JOIN users u ON u.id = bp.user_id
       WHERE u.is_active = TRUE
       ORDER BY bp.profile_views DESC, bp.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(row => new BandProfile(row));
  }
}

module.exports = BandProfile;
