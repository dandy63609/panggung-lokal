/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('availability_posts', {
    id: 'id',
    band_profile_id: {
      type: 'integer',
      notNull: true,
      references: 'band_profiles(id)',
      onDelete: 'CASCADE',
    },
    start_date: {
      type: 'date',
      notNull: true,
    },
    end_date: {
      type: 'date',
      notNull: true,
    },
    notes: {
      type: 'text',
    },
    views: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
  });

  // Add constraint to ensure end_date >= start_date
  pgm.addConstraint('availability_posts', 'valid_date_range', {
    check: 'end_date >= start_date',
  });

  // Create indexes for search performance
  pgm.createIndex('availability_posts', 'band_profile_id');
  pgm.createIndex('availability_posts', ['start_date', 'end_date']);
  pgm.createIndex('availability_posts', 'created_at');
  pgm.createIndex('availability_posts', 'is_active');
};

exports.down = (pgm) => {
  pgm.dropTable('availability_posts');
};
