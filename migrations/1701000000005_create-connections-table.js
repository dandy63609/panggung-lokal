/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('connections', {
    id: 'id',
    organizer_user_id: {
      type: 'integer',
      notNull: true,
      references: 'users(id)',
      onDelete: 'CASCADE',
    },
    band_profile_id: {
      type: 'integer',
      notNull: true,
      references: 'band_profiles(id)',
      onDelete: 'CASCADE',
    },
    connection_type: {
      type: 'varchar(50)',
      default: 'contact_view',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    notes: {
      type: 'text',
    },
  });

  // Create indexes for analytics and dashboard queries
  pgm.createIndex('connections', 'organizer_user_id');
  pgm.createIndex('connections', 'band_profile_id');
  pgm.createIndex('connections', 'created_at');
  pgm.createIndex('connections', ['band_profile_id', 'created_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('connections');
};
