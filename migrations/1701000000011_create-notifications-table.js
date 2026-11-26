exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.createTable('notifications', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    notification_key: {
      type: 'varchar(120)',
      notNull: false,
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'system',
    },
    title: {
      type: 'varchar(255)',
      notNull: true,
    },
    message: {
      type: 'text',
      notNull: true,
    },
    link: {
      type: 'varchar(255)',
      notNull: false,
    },
    badge: {
      type: 'varchar(60)',
      notNull: false,
    },
    is_read: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.createIndex('notifications', ['user_id', 'created_at']);

  pgm.createTable('notification_reads', {
    id: 'id',
    user_id: {
      type: 'integer',
      notNull: true,
      references: '"users"',
      onDelete: 'CASCADE',
    },
    notification_key: {
      type: 'varchar(120)',
      notNull: true,
    },
    read_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  pgm.addConstraint('notification_reads', 'notification_reads_user_key_unique', {
    unique: ['user_id', 'notification_key'],
  });
  pgm.createIndex('notification_reads', 'user_id');
};

exports.down = (pgm) => {
  pgm.dropTable('notification_reads', { ifExists: true });
  pgm.dropTable('notifications', { ifExists: true });
};
