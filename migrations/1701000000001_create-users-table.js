/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('users', {
    id: 'id',
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    account_type: {
      type: 'varchar(20)',
      notNull: true,
      check: "account_type IN ('band', 'organizer')",
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    last_login: {
      type: 'timestamp',
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
  });

  // Create indexes for performance
  pgm.createIndex('users', 'email');
  pgm.createIndex('users', 'account_type');
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};
