const db = require('../utils/db');
const BandProfile = require('../models/BandProfile');

describe('Admin Campus & Band Affiliation Unit Tests', () => {
  beforeAll(async () => {
    // ensure memory db ready
    await db.query('SELECT 1');
  });

  it('should list campuses from database', async () => {
    const res = await db.query('SELECT * FROM campuses ORDER BY id ASC');
    expect(res.rows.length).toBeGreaterThanOrEqual(4);
    const shortNames = res.rows.map(c => c.short_name);
    expect(shortNames).toContain('UNNES');
    expect(shortNames).toContain('UNDIP');
    expect(shortNames).toContain('UGM');
    expect(shortNames).toContain('UNY');
  });

  it('should insert a new campus', async () => {
    const res = await db.query(
      'INSERT INTO campuses (name, short_name, city) VALUES ($1, $2, $3) RETURNING *',
      ['Universitas Dian Nuswantoro', 'UDINUS', 'Kota Semarang']
    );
    expect(res.rows[0].short_name).toBe('UDINUS');
    expect(res.rows[0].city).toBe('Kota Semarang');
  });

  it('should update band campus affiliation in BandProfile.update', async () => {
    const updated = await BandProfile.update(1, { campus: 'UNNES' });
    expect(updated).not.toBeNull();
    expect(updated.campus).toBe('UNNES');

    const found = await BandProfile.findById(1);
    expect(found.campus).toBe('UNNES');
  });

  it('should find band when searching by campus keyword', async () => {
    await BandProfile.update(1, { campus: 'UNNES' });
    const searchRes = await BandProfile.search({ search: 'UNNES' });
    expect(searchRes.bands.some(b => b.campus === 'UNNES')).toBe(true);
  });
});
