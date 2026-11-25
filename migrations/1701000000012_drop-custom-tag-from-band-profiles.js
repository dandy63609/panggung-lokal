exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE band_profiles
      DROP COLUMN IF EXISTS custom_tag;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE band_profiles
      ADD COLUMN IF NOT EXISTS custom_tag VARCHAR(100) DEFAULT 'Band Baru Ditambahkan';
  `);
};
