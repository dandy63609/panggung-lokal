/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('job_broadcasts', {
    id: {
      type: 'serial',
      primaryKey: true,
    },
    organizer_user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    source_band_profile_id: {
      type: 'integer',
      references: '"band_profiles"',
      onDelete: 'SET NULL',
    },
    organizer_name: {
      type: 'varchar(255)',
      notNull: true,
    },
    organizer_email: {
      type: 'varchar(255)',
      notNull: true,
    },
    organizer_phone: {
      type: 'varchar(50)',
      notNull: true,
    },
    event_date: {
      type: 'varchar(50)',
      notNull: true,
    },
    perform_start_time: {
      type: 'varchar(20)',
      notNull: true,
    },
    perform_end_time: {
      type: 'varchar(20)',
      notNull: true,
    },
    venue_location: {
      type: 'varchar(255)',
      notNull: true,
    },
    event_scale: {
      type: 'integer',
      default: 5,
    },
    event_details: {
      type: 'text',
      notNull: true,
    },
    attachments: {
      type: 'text',
      default: '[]',
    },
    recipient_band_count: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('job_broadcasts', 'created_at');
  pgm.createIndex('job_broadcasts', 'organizer_user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('job_broadcasts');
};
