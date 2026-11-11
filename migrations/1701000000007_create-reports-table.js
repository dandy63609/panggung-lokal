/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('reports', {
    id: 'id',
    reporter_user_id: {
      type: 'integer',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    reported_entity_type: {
      type: 'varchar(50)',
      notNull: true,
      check: "reported_entity_type IN ('band_profile', 'user')",
    },
    reported_entity_id: {
      type: 'integer',
      notNull: true,
    },
    reason: {
      type: 'text',
      notNull: true,
    },
    status: {
      type: 'varchar(50)',
      default: 'pending',
      check: "status IN ('pending', 'reviewed', 'resolved', 'dismissed')",
    },
    admin_notes: {
      type: 'text',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    resolved_at: {
      type: 'timestamp',
    },
  });

  // Create indexes for admin dashboard
  pgm.createIndex('reports', 'reporter_user_id');
  pgm.createIndex('reports', 'status');
  pgm.createIndex('reports', 'created_at');
  pgm.createIndex('reports', ['reported_entity_type', 'reported_entity_id']);
};

exports.down = (pgm) => {
  pgm.dropTable('reports');
};
