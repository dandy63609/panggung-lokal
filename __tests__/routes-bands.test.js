const BandProfile = require('../models/BandProfile');

describe('Bands Model & Business Rules Verification', () => {
  it('should have BandProfile.getPlatformStats return platform metrics', async () => {
    const stats = await BandProfile.getPlatformStats();
    expect(stats).toHaveProperty('totalBands');
    expect(stats).toHaveProperty('totalGenres');
    expect(stats).toHaveProperty('curatedBadge');
    expect(typeof stats.totalBands).toBe('number');
    expect(typeof stats.totalGenres).toBe('number');
    expect(stats.curatedBadge).toBe('100% Terkurasi');
  });

  it('BandProfile.search should execute without date filtering constraint', async () => {
    const result = await BandProfile.search({ genre: 'Rock' });
    expect(result).toHaveProperty('bands');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
  });

  it('BandProfile.findById should include rider and social fields', async () => {
    const band = await BandProfile.findById(1);
    if (band) {
      expect(band).toHaveProperty('riderChannelInputs');
      expect(band).toHaveProperty('riderSoundSystem');
      expect(band).toHaveProperty('riderInstruments');
      expect(band).toHaveProperty('riderHospitality');
      expect(band).toHaveProperty('spotifyUrl');
      expect(band).toHaveProperty('tiktokUrl');
    }
  });
});
