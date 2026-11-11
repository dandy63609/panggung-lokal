const BandProfile = require('../../models/BandProfile');
const db = require('../../utils/db');

jest.mock('../../utils/db');

describe('BandProfile Model (Evaluation & Improvement Changes)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should map rider technical specs and social media URLs correctly', () => {
      const data = {
        id: 1,
        user_id: 10,
        band_name: 'The Tests',
        genre: 'Indie Rock',
        location_city: 'Bandung',
        spotify_url: 'https://open.spotify.com/artist/test',
        tiktok_url: 'https://tiktok.com/@test',
        rider_channel_inputs: '12 Channel Input',
        rider_sound_system: 'PA 5000W',
        rider_instruments: 'Bawa gitar sendiri',
        rider_hospitality: 'Air mineral 2 dus',
        profile_views: 45
      };

      const band = new BandProfile(data);

      expect(band.id).toBe(1);
      expect(band.bandName).toBe('The Tests');
      expect(band.spotifyUrl).toBe('https://open.spotify.com/artist/test');
      expect(band.tiktokUrl).toBe('https://tiktok.com/@test');
      expect(band.riderChannelInputs).toBe('12 Channel Input');
      expect(band.riderSoundSystem).toBe('PA 5000W');
      expect(band.riderInstruments).toBe('Bawa gitar sendiri');
      expect(band.riderHospitality).toBe('Air mineral 2 dus');
    });
  });

  describe('getPlatformStats', () => {
    it('should return total bands, distinct genres, and 100% curated badge', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '12' }] }) // band count
        .mockResolvedValueOnce({ rows: [{ total: '8' }] });  // genre count

      const stats = await BandProfile.getPlatformStats();

      expect(stats.totalBands).toBe(12);
      expect(stats.totalGenres).toBe(8);
      expect(stats.curatedBadge).toBe('100% Terkurasi');
    });
  });

  describe('search without date filter', () => {
    it('should query without joining availability_posts for dates', async () => {
      db.query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] })
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            user_id: 10,
            band_name: 'Bandung Sounds',
            genre: 'Indie',
            location_city: 'Bandung'
          }]
        });

      const result = await BandProfile.search({ genre: 'Indie', location: 'Bandung' });

      expect(result.total).toBe(1);
      expect(result.bands).toHaveLength(1);
      expect(result.bands[0].bandName).toBe('Bandung Sounds');

      // Verify that SQL query does NOT join availability_posts for dates
      const executedCountQuery = db.query.mock.calls[0][0];
      expect(executedCountQuery).not.toContain('availability_posts');
    });
  });

  describe('update profile with rider and socials', () => {
    it('should update rider and social fields', async () => {
      const mockUpdated = {
        id: 1,
        user_id: 10,
        band_name: 'Updated Band',
        genre: 'Indie',
        location_city: 'Bandung',
        spotify_url: 'https://open.spotify.com/artist/new',
        tiktok_url: 'https://tiktok.com/@new',
        rider_channel_inputs: '16 Channel',
        rider_sound_system: 'PA 10000W',
        rider_instruments: 'Full set',
        rider_hospitality: 'Backstage VIP'
      };

      db.query.mockResolvedValueOnce({ rows: [mockUpdated] });

      const updated = await BandProfile.update(1, {
        bandName: 'Updated Band',
        spotifyUrl: 'https://open.spotify.com/artist/new',
        tiktokUrl: 'https://tiktok.com/@new',
        riderChannelInputs: '16 Channel',
        riderSoundSystem: 'PA 10000W',
        riderInstruments: 'Full set',
        riderHospitality: 'Backstage VIP'
      });

      expect(updated.bandName).toBe('Updated Band');
      expect(updated.spotifyUrl).toBe('https://open.spotify.com/artist/new');
      expect(updated.riderChannelInputs).toBe('16 Channel');
      expect(updated.riderHospitality).toBe('Backstage VIP');
    });
  });

  describe('addMediaFile', () => {
    it('should insert into media_files', async () => {
      const band = new BandProfile({ id: 5, user_id: 10, band_name: 'Test' });

      db.query.mockResolvedValueOnce({
        rows: [{
          id: 99,
          band_profile_id: 5,
          file_type: 'image',
          file_url: 'https://example.com/live.jpg',
          title: 'Live at Festival',
          display_order: 1
        }]
      });

      const media = await band.addMediaFile({
        fileType: 'image',
        fileUrl: 'https://example.com/live.jpg',
        title: 'Live at Festival',
        displayOrder: 1
      });

      expect(media.id).toBe(99);
      expect(media.file_type).toBe('image');
      expect(media.title).toBe('Live at Festival');
    });
  });
});
