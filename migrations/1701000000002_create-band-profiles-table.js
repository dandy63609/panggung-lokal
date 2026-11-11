/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('band_profiles', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      unique: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    band_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    genre: {
      type: 'varchar(100)',
      notNull: true,
    },
    location_city: {
      type: 'varchar(100)',
      notNull: true,
    },
    location_region: {
      type: 'varchar(100)',
    },
    bio: {
      type: 'text',
    },
    budget_min: {
      type: 'integer',
    },
    budget_max: {
      type: 'integer',
    },
    profile_photo_url: {
      type: 'varchar(500)',
    },
    cover_photo_url: {
      type: 'varchar(500)',
    },
    phone: {
      type: 'varchar(50)',
    },
    instagram_handle: {
      type: 'varchar(100)',
    },
    facebook_url: {
      type: 'varchar(500)',
    },
    youtube_url: {
      type: 'varchar(500)',
    },
    profile_views: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes for search performance
  pgm.createIndex('band_profiles', 'user_id');
  pgm.createIndex('band_profiles', 'genre');
  pgm.createIndex('band_profiles', 'location_city');
  pgm.createIndex('band_profiles', ['budget_min', 'budget_max']);
  pgm.createIndex('band_profiles', 'updated_at');
};

exports.down = (pgm) => {
  pgm.dropTable('band_profiles');
};
