/**
 * WhatsApp Integration Service
 * Handles phone normalization and WhatsApp direct-contact link generation
 */
class WhatsAppService {
  /**
   * Normalize Indonesian phone number to international country code format (628...)
   * @param {string} phone - Raw input phone number
   * @returns {string} Clean digits starting with 62
   */
  static normalizeNumber(phone) {
    if (!phone) return '';
    let clean = String(phone).replace(/[^0-9]/g, '');
    if (clean.startsWith('0')) {
      clean = '62' + clean.substring(1);
    }
    return clean;
  }

  /**
   * Build WhatsApp direct chat URL with custom greeting
   * @param {string} phone - Band contact phone number
   * @param {string} bandName - Name of the band
   * @returns {string|null} Full wa.me URL or null if phone is missing
   */
  static buildContactUrl(phone, bandName) {
    const waNumber = this.normalizeNumber(phone);
    if (!waNumber) return null;

    const targetName = bandName ? ` ${bandName}` : '';
    const message = encodeURIComponent(
      `Halo${targetName}, kami menemukan profil band Anda di Panggung Lokal dan tertarik untuk mengundang Anda manggung.`
    );

    return `https://wa.me/${waNumber}?text=${message}`;
  }
}

module.exports = WhatsAppService;
