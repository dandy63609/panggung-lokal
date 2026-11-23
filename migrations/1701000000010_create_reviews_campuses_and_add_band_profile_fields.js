/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  // Update users table constraint and columns
  pgm.sql(`
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_account_type_check;
    ALTER TABLE users ADD CONSTRAINT users_account_type_check CHECK (account_type IN ('band', 'organizer', 'general'));
  `);

  pgm.addColumns('users', {
    google_id: {
      type: 'varchar(255)',
      unique: true,
    },
    auth_provider: {
      type: 'varchar(50)',
      default: 'local',
    },
  });

  // Add remaining fields to band_profiles
  pgm.addColumns('band_profiles', {
    campus: {
      type: 'varchar(100)',
    },
    rider_items: {
      type: 'text',
    },
    stage_visual_post_id: {
      type: 'integer',
    },
    rating_average: {
      type: 'numeric(3, 1)',
      default: 4.8,
    },
    rating_count: {
      type: 'integer',
      default: 1,
    },
    rating_override: {
      type: 'numeric(3, 1)',
    },
  });

  // Create band_posts table
  pgm.createTable('band_posts', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    band_profile_id: {
      type: 'integer',
      notNull: true,
      references: '"band_profiles"',
      onDelete: 'CASCADE',
    },
    media_type: {
      type: 'varchar(20)',
      notNull: true,
      default: 'photo',
    },
    media_url: {
      type: 'varchar(500)',
      notNull: true,
    },
    thumbnail_url: {
      type: 'varchar(500)',
    },
    caption: {
      type: 'text',
    },
    slides: {
      type: 'text',
    },
    views_count: {
      type: 'integer',
      default: 0,
    },
    wa_clicks_count: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  pgm.createIndex('band_posts', 'band_profile_id');

  // Add missing columns to connections
  pgm.addColumns('connections', {
    event_date: {
      type: 'varchar(50)',
    },
    event_name: {
      type: 'varchar(255)',
    },
    status: {
      type: 'varchar(50)',
      default: 'confirmed',
    },
    is_reviewed: {
      type: 'boolean',
      default: false,
    },
  });

  // Create campuses table
  pgm.createTable('campuses', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    name: {
      type: 'varchar(255)',
      notNull: true,
    },
    short_name: {
      type: 'varchar(50)',
      notNull: true,
    },
    city: {
      type: 'varchar(100)',
      notNull: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create reviews table
  pgm.createTable('reviews', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    band_profile_id: {
      type: 'integer',
      notNull: true,
      references: '"band_profiles"',
      onDelete: 'CASCADE',
    },
    organizer_user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    connection_id: {
      type: 'integer',
    },
    rating: {
      type: 'numeric(3, 1)',
      notNull: true,
    },
    review_text: {
      type: 'text',
    },
    event_date: {
      type: 'varchar(50)',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  pgm.createIndex('reviews', 'band_profile_id');

  // Create platform_settings table
  pgm.createTable('platform_settings', {
    key: {
      type: 'varchar(100)',
      primaryKey: true,
    },
    value: {
      type: 'varchar(255)',
      notNull: true,
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
};

exports.down = (pgm) => {
  pgm.dropTable('platform_settings');
  pgm.dropTable('reviews');
  pgm.dropTable('campuses');
  pgm.dropColumns('connections', ['event_date', 'event_name', 'status', 'is_reviewed']);
  pgm.dropTable('band_posts');
  pgm.dropColumns('band_profiles', [
    'campus',
    'rider_items',
    'stage_visual_post_id',
    'rating_average',
    'rating_count',
    'rating_override',
  ]);
  pgm.dropColumns('users', ['google_id', 'auth_provider']);
};
