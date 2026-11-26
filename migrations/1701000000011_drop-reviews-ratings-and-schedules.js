exports.shorthands = undefined;

exports.up = (pgm) => {
  // Ensure custom_tag exists on band_profiles (preserved manual Admin tag)
  pgm.sql(`
    ALTER TABLE band_profiles
      ADD COLUMN IF NOT EXISTS custom_tag VARCHAR(100) DEFAULT 'Band Baru Ditambahkan';
  `);

  // Drop EO/Admin reviews, band schedules calendar, and deprecated availability_posts tables
  pgm.sql(`
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS band_schedules CASCADE;
    DROP TABLE IF EXISTS availability_posts CASCADE;
  `);

  // Drop rating columns from band_profiles
  pgm.sql(`
    ALTER TABLE band_profiles
      DROP COLUMN IF EXISTS rating_average,
      DROP COLUMN IF EXISTS rating_count,
      DROP COLUMN IF EXISTS rating_override;
  `);

  // Drop event_date and is_reviewed columns from connections (non-broadcast inquiries)
  pgm.sql(`
    ALTER TABLE connections
      DROP COLUMN IF EXISTS event_date,
      DROP COLUMN IF EXISTS is_reviewed;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE band_profiles
      ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3, 1) DEFAULT 2.5,
      ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS rating_override NUMERIC(3, 1);

    ALTER TABLE connections
      ADD COLUMN IF NOT EXISTS event_date VARCHAR(50),
      ADD COLUMN IF NOT EXISTS is_reviewed BOOLEAN DEFAULT FALSE;
  `);
};
