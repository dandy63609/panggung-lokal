const db = require('../utils/db');

function getTodayStr() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeKeywords(value) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 3 && !['kota', 'kabupaten', 'kab', 'band', 'music', 'musik'].includes(token));
}

function detectBroadcastMatch(broadcast, bandProfile) {
  if (!bandProfile) return { matched: false, badge: 'BROADCAST BARU' };
  const haystack = normalizeText(`${broadcast.venue_location || ''} ${broadcast.event_details || ''}`);
  const cityTokens = tokenizeKeywords(bandProfile.location_city || bandProfile.locationCity);
  const genreTokens = tokenizeKeywords(bandProfile.genre);

  const cityMatched = cityTokens.some((token) => haystack.includes(token));
  const genreMatched = genreTokens.some((token) => haystack.includes(token));

  if (cityMatched && genreMatched) {
    return { matched: true, badge: 'COCOK KOTA & GENRE' };
  }
  if (cityMatched) {
    return { matched: true, badge: 'COCOK KOTA' };
  }
  if (genreMatched) {
    return { matched: true, badge: 'COCOK GENRE' };
  }
  return { matched: false, badge: 'BROADCAST BARU' };
}

class Notification {
  static async ensureTables() {
    if (Notification._tablesVerified) return;
    try {
      await db.query('SELECT 1 FROM notifications LIMIT 1');
      await db.query('SELECT 1 FROM notification_reads LIMIT 1');
      Notification._tablesVerified = true;
      return;
    } catch {
      // Create tables on demand when running against an unmigrated database
    }

    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_key VARCHAR(120),
        type VARCHAR(50) NOT NULL DEFAULT 'system',
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(255),
        badge VARCHAR(60),
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_created
      ON notifications (user_id, created_at DESC)
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS notification_reads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        notification_key VARCHAR(120) NOT NULL,
        read_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, notification_key)
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_reads_user
      ON notification_reads (user_id)
    `);

    Notification._tablesVerified = true;
  }

  static async create({ userId, type = 'system', title, message, link = '/', badge = null, notificationKey = null }) {
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) return null;

    await this.ensureTables();
    const result = await db.query(
      `INSERT INTO notifications (user_id, notification_key, type, title, message, link, badge, is_read)
       VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)
       RETURNING *`,
      [
        parsedUserId,
        notificationKey ? String(notificationKey).slice(0, 120) : null,
        String(type || 'system').slice(0, 50),
        String(title || 'Notifikasi').slice(0, 255),
        String(message || ''),
        link ? String(link).slice(0, 255) : '/',
        badge ? String(badge).slice(0, 60) : null,
      ]
    );
    return result.rows[0] || null;
  }

  static async getReadKeys(userId) {
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) return new Set();

    await this.ensureTables();
    const res = await db.query(
      'SELECT notification_key FROM notification_reads WHERE user_id = $1',
      [parsedUserId]
    );
    return new Set(res.rows.map((row) => row.notification_key));
  }

  static async markRead(userId, keys = []) {
    const parsedUserId = Number(userId);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) return 0;

    await this.ensureTables();
    const cleanKeys = Array.from(
      new Set(
        (Array.isArray(keys) ? keys : [])
          .map((k) => String(k || '').trim())
          .filter((k) => k.length > 0 && k.length <= 120)
      )
    );

    if (cleanKeys.length === 0) return 0;

    for (const key of cleanKeys) {
      await db.query(
        `INSERT INTO notification_reads (user_id, notification_key)
         VALUES ($1, $2)
         ON CONFLICT (user_id, notification_key) DO NOTHING`,
        [parsedUserId, key]
      );
    }

    const explicitIds = cleanKeys
      .filter((k) => k.startsWith('notif:'))
      .map((k) => parseInt(k.slice(6), 10))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (explicitIds.length > 0) {
      await db.query(
        `UPDATE notifications
         SET is_read = TRUE
         WHERE user_id = $1 AND id = ANY($2::int[])`,
        [parsedUserId, explicitIds]
      );
    }

    await db.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1 AND notification_key = ANY($2::text[])`,
      [parsedUserId, cleanKeys]
    );

    return cleanKeys.length;
  }

  static async markAllRead(user, keys = []) {
    const parsedUserId = Number(user?.id);
    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) return 0;

    await this.ensureTables();
    await db.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [parsedUserId]);

    const targetKeys = Array.isArray(keys) && keys.length > 0
      ? keys
      : (await this.listForUser(user)).items.map((item) => item.id);

    return this.markRead(parsedUserId, targetKeys);
  }

  static async listForUser(user) {
    await this.ensureTables();
    const accountType = user.accountType || user.account_type || 'general';
    const parsedUserId = Number(user.id);
    const hasNumericUserId = Number.isInteger(parsedUserId) && parsedUserId > 0;
    const readKeys = hasNumericUserId ? await this.getReadKeys(parsedUserId) : new Set();

    const byKey = new Map();
    const pushItem = (item) => {
      if (!item || !item.id) return;
      if (byKey.has(item.id)) return;
      byKey.set(item.id, {
        ...item,
        isRead: Boolean(item.isRead || readKeys.has(item.id)),
      });
    };

    // 1. Stored explicit notifications for this user
    if (hasNumericUserId) {
      try {
        const storedRes = await db.query(
          `SELECT * FROM notifications
           WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 25`,
          [parsedUserId]
        );
        for (const row of storedRes.rows) {
          const key = row.notification_key || `notif:${row.id}`;
          pushItem({
            id: key,
            type: row.type || 'system',
            title: row.title,
            message: row.message,
            link: row.link || '/',
            badge: row.badge || null,
            isRead: Boolean(row.is_read) || readKeys.has(key) || readKeys.has(`notif:${row.id}`),
            createdAt: row.created_at,
          });
        }
      } catch (err) {
        console.warn('Notice: Failed reading stored notifications:', err.message);
      }
    }

    // 2. Role-specific live activity notifications
    if (accountType === 'band' && hasNumericUserId) {
      let bandProfile = null;
      try {
        const bpRes = await db.query(
          'SELECT id, band_name, genre, location_city FROM band_profiles WHERE user_id = $1 LIMIT 1',
          [parsedUserId]
        );
        bandProfile = bpRes.rows[0] || null;
      } catch (err) {
        console.warn('Notice: Failed reading band profile for notifications:', err.message);
      }

      if (bandProfile) {
        // Incoming inquiries / bookings for this band
        try {
          const connRes = await db.query(
            `SELECT c.id, c.connection_type, c.event_name, c.event_date, c.notes, c.status, c.created_at, u.email as organizer_email
             FROM connections c
             LEFT JOIN users u ON u.id = c.organizer_user_id
             WHERE c.band_profile_id = $1
             ORDER BY c.created_at DESC
             LIMIT 12`,
            [bandProfile.id]
          );
          for (const row of connRes.rows) {
            const key = `conn:${row.id}`;
            const eventPart = row.event_name ? ` untuk "${row.event_name}"` : '';
            const datePart = row.event_date ? ` (${row.event_date})` : '';
            const eoLabel = row.organizer_email ? row.organizer_email.split('@')[0] : 'Event Organizer';
            pushItem({
              id: key,
              type: 'booking_inquiry',
              title: row.status === 'confirmed' ? 'Booking Panggung Masuk' : 'Inquiry Booking Baru',
              message: `${eoLabel} menghubungi band Anda${eventPart}${datePart}.`,
              link: '/dashboard-band?tab=analytics',
              badge: row.status === 'confirmed' ? 'BOOKING MASUK' : 'INQUIRY BARU',
              isRead: readKeys.has(key),
              createdAt: row.created_at,
            });
          }
        } catch (err) {
          console.warn('Notice: Failed reading band connections for notifications:', err.message);
        }

        // Open job broadcasts (prioritize matching city/genre)
        try {
          const bcRes = await db.query(
            `SELECT id, organizer_name, event_date, perform_start_time, venue_location, event_details, created_at
             FROM job_broadcasts
             ORDER BY created_at DESC
             LIMIT 15`
          );
          for (const row of bcRes.rows) {
            const key = `broadcast:${row.id}`;
            const matchInfo = detectBroadcastMatch(row, bandProfile);
            pushItem({
              id: key,
              type: 'job_broadcast',
              title: matchInfo.matched
                ? `Job Broadcast Cocok · ${row.venue_location}`
                : `Job Broadcast Baru · ${row.venue_location}`,
              message: `${row.organizer_name} mencari band untuk ${row.event_date} (${row.perform_start_time} WIB).`,
              link: '/dashboard-band?tab=broadcasts',
              badge: matchInfo.badge,
              isRead: readKeys.has(key),
              createdAt: row.created_at,
            });
          }
        } catch (err) {
          console.warn('Notice: Failed reading broadcasts for notifications:', err.message);
        }
      }
    } else if ((accountType === 'organizer' || accountType === 'general') && hasNumericUserId) {
      const todayStr = getTodayStr();

      // Pending post-event review reminders
      try {
        const pendingRes = await db.query(
          `SELECT c.id, c.band_profile_id, c.event_date, c.event_name, c.created_at, bp.band_name, bp.slug
           FROM connections c
           JOIN band_profiles bp ON bp.id = c.band_profile_id
           WHERE c.organizer_user_id = $1
             AND c.event_date IS NOT NULL
             AND c.event_date != ''
             AND c.event_date <= $2
             AND c.status = 'confirmed'
             AND (c.is_reviewed IS NULL OR c.is_reviewed = FALSE)
           ORDER BY c.event_date DESC
           LIMIT 10`,
          [parsedUserId, todayStr]
        );
        for (const row of pendingRes.rows) {
          const key = `review_pending:${row.id}`;
          pushItem({
            id: key,
            type: 'review_reminder',
            title: `Pengingat Ulasan · ${row.band_name}`,
            message: `Acara "${row.event_name || 'Live Stage'}" (${row.event_date}) telah selesai. Beri penilaian performa band sekarang.`,
            link: `/band/${row.slug || row.band_profile_id}`,
            badge: 'WAJIB ULAS',
            isRead: readKeys.has(key),
            createdAt: row.created_at,
          });
        }
      } catch (err) {
        console.warn('Notice: Failed reading pending reviews for notifications:', err.message);
      }

      // Confirmed band schedules linked to this EO
      try {
        const schedRes = await db.query(
          `SELECT bs.id, bs.band_profile_id, bs.event_date, bs.start_time, bs.end_time, bs.event_name, bs.venue, bs.status, bs.created_at, bp.band_name, bp.slug
           FROM band_schedules bs
           JOIN band_profiles bp ON bp.id = bs.band_profile_id
           WHERE bs.organizer_user_id = $1
           ORDER BY bs.created_at DESC
           LIMIT 12`,
          [parsedUserId]
        );
        for (const row of schedRes.rows) {
          const key = `sched:${row.id}`;
          const isCancelled = row.status === 'cancelled';
          pushItem({
            id: key,
            type: isCancelled ? 'schedule_cancelled' : 'schedule_confirmed',
            title: isCancelled
              ? `Jadwal Dibatalkan · ${row.band_name}`
              : `Jadwal Dikonfirmasi · ${row.band_name}`,
            message: `${row.event_name} pada ${row.event_date} (${row.start_time} - ${row.end_time} WIB)${row.venue ? ` di ${row.venue}` : ''}.`,
            link: `/band/${row.slug || row.band_profile_id}#jadwal-manggung`,
            badge: isCancelled ? 'DIBATALKAN' : 'TERKONFIRMASI',
            isRead: readKeys.has(key),
            createdAt: row.created_at,
          });
        }
      } catch (err) {
        console.warn('Notice: Failed reading schedules for notifications:', err.message);
      }
    } else if (accountType === 'admin') {
      // Pending reports for Admin
      try {
        const repRes = await db.query(
          `SELECT id, category, description, status, created_at
           FROM reports
           WHERE status IS NULL OR status IN ('pending', 'open', 'new')
           ORDER BY created_at DESC
           LIMIT 10`
        );
        for (const row of repRes.rows) {
          const key = `report:${row.id}`;
          pushItem({
            id: key,
            type: 'system',
            title: `Laporan Baru · ${row.category || 'Pengaduan'}`,
            message: String(row.description || 'Ada pengaduan pengguna yang menunggu tindak lanjut admin.').slice(0, 120),
            link: '/admin',
            badge: 'PERLU TINJAU',
            isRead: readKeys.has(key),
            createdAt: row.created_at,
          });
        }
      } catch (err) {
        console.warn('Notice: Failed reading reports for admin notifications:', err.message);
      }
    }

    const items = Array.from(byKey.values())
      .sort((a, b) => {
        // Put unread review reminders at the very top
        if (a.type === 'review_reminder' && !a.isRead && !(b.type === 'review_reminder' && !b.isRead)) {
          return -1;
        }
        if (b.type === 'review_reminder' && !b.isRead && !(a.type === 'review_reminder' && !a.isRead)) {
          return 1;
        }
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 30);

    const unreadCount = items.filter((item) => !item.isRead).length;
    return { items, unreadCount };
  }
}

module.exports = Notification;
