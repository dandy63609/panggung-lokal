const BandProfile = require('../models/BandProfile');
const User = require('../models/User');

/**
 * Band Service
 * Business logic for band profiles, sneak-peek gating, and profile management
 */
class BandService {
  /**
   * Mask phone number for guest sneak-peek
   * @param {string|null} phone - Original phone number
   * @returns {string|null} Masked phone number or null
   */
  static maskPhone(phone) {
    if (!phone) return null;
    return phone.length > 8 ? phone.substring(0, 8) + 'xxxx' : phone + 'xxxx';
  }

  /**
   * Format band object according to authentication status (Sneak Peek)
   * @param {Object} band - Band profile data
   * @param {boolean} isAuthenticated - Whether requesting user is logged in
   * @returns {Object} Formatted band object
   */
  static formatBand(band, isAuthenticated) {
    if (!band) return null;
    if (isAuthenticated) return band;

    return {
      ...band,
      phone: this.maskPhone(band.phone)
    };
  }

  /**
   * Format list of bands for search/recent endpoints with guest sneak-peek
   * @param {Array} bands - List of band profile objects
   * @param {boolean} isAuthenticated - Whether requesting user is logged in
   * @param {number} guestLimit - Maximum number of bands visible to guests
   * @returns {Array} Formatted band list
   */
  static formatBandList(bands, isAuthenticated, guestLimit = 2) {
    if (!Array.isArray(bands)) return [];
    if (isAuthenticated) return bands;

    return bands.slice(0, guestLimit).map(band => this.formatBand(band, false));
  }

  /**
   * Get existing profile or auto-create fallback profile for a band user
   * Centralizes the fallback profile creation logic across the application
   * @param {number|string} userId - User ID
   * @returns {Promise<BandProfile|null>} Existing or newly created BandProfile
   */
  static async getOrCreateProfile(userId) {
    let profile = await BandProfile.findByUserId(userId);
    if (profile) return profile;

    const user = await User.findById(userId);
    if (!user || user.accountType !== 'band') return null;

    const defaultName = (user.email && user.email.includes('@'))
      ? user.email.split('@')[0]
      : 'Band Baru';

    return await BandProfile.create({
      userId: user.id,
      bandName: defaultName,
      genre: 'Indie / Pop',
      locationCity: 'Bandung',
      bio: 'Profil band di Panggung Lokal'
    });
  }

  /**
   * Validate budget range
   * @param {number|null} min - Minimum budget
   * @param {number|null} max - Maximum budget
   * @returns {{ valid: boolean, error?: string }}
   */
  static validateBudgetRange(min, max) {
    if (min !== null && max !== null && !isNaN(min) && !isNaN(max) && min > max) {
      return {
        valid: false,
        error: 'Tarif minimum tidak boleh lebih besar dari tarif maksimum'
      };
    }
    return { valid: true };
  }
}

module.exports = BandService;
