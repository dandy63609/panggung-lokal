/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('media_files', {
    id: 'id',
    band_profile_id: {
      type: 'integer',
      notNull: true,
      references: 'band_profiles(id)',
      onDelete: 'CASCADE',
    },
    file_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "file_type IN ('audio', 'video', 'image')",
    },
    file_url: {
      type: 'varchar(500)',
      notNull: true,
    },
    thumbnail_url: {
      type: 'varchar(500)',
    },
    title: {
      type: 'varchar(255)',
    },
    display_order: {
      type: 'integer',
      default: 0,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Create indexes
  pgm.createIndex('media_files', 'band_profile_id');
  pgm.createIndex('media_files', 'file_type');
  pgm.createIndex('media_files', ['band_profile_id', 'display_order']);
};

exports.down = (pgm) => {
  pgm.dropTable('media_files');
};
