const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'data', 'panggung_lokal.json');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));

let sql = `-- ==========================================
-- PANGGUNG LOKAL - SUPABASE POSTGRESQL DDL & SEED DATA
-- Jalankan skrip ini langsung di SQL Editor Supabase
-- ==========================================

DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS media_files CASCADE;
DROP TABLE IF EXISTS band_posts CASCADE;
DROP TABLE IF EXISTS band_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE band_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  band_name VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  location_city VARCHAR(100) NOT NULL,
  location_region VARCHAR(100),
  bio TEXT,
  budget_min INTEGER,
  budget_max INTEGER,
  profile_photo_url VARCHAR(500),
  cover_photo_url VARCHAR(500),
  phone VARCHAR(50),
  instagram_handle VARCHAR(100),
  facebook_url VARCHAR(500),
  youtube_url VARCHAR(500),
  profile_views INTEGER DEFAULT 0,
  rider_channel_inputs VARCHAR(100),
  rider_sound_system TEXT,
  rider_instruments TEXT,
  rider_hospitality TEXT,
  rider_items TEXT,
  spotify_url VARCHAR(500),
  tiktok_url VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE band_posts (
  id SERIAL PRIMARY KEY,
  band_profile_id INTEGER NOT NULL REFERENCES band_profiles(id) ON DELETE CASCADE,
  media_type VARCHAR(20) NOT NULL DEFAULT 'photo',
  media_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  caption TEXT,
  slides TEXT,
  views_count INTEGER DEFAULT 0,
  wa_clicks_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE media_files (
  id SERIAL PRIMARY KEY,
  band_profile_id INTEGER NOT NULL REFERENCES band_profiles(id) ON DELETE CASCADE,
  file_type VARCHAR(20) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  title VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE connections (
  id SERIAL PRIMARY KEY,
  organizer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  band_profile_id INTEGER NOT NULL REFERENCES band_profiles(id) ON DELETE CASCADE,
  connection_type VARCHAR(50) DEFAULT 'contact_view',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  reporter_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reported_entity_type VARCHAR(50) NOT NULL,
  reported_entity_id INTEGER NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  admin_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

`;

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return "'" + String(val).replace(/'/g, "''") + "'";
}

const tables = ['users', 'band_profiles', 'band_posts', 'media_files', 'connections'];
for (const tbl of tables) {
  const rows = data[tbl] || [];
  if (rows.length === 0) continue;
  sql += `-- Data awal untuk tabel ${tbl}\n`;
  for (const r of rows) {
    const keys = Object.keys(r);
    const cols = keys.join(', ');
    const vals = keys.map(k => escapeSql(r[k])).join(', ');
    sql += `INSERT INTO ${tbl} (${cols}) VALUES (${vals});\n`;
  }
  sql += `SELECT setval(pg_get_serial_sequence('${tbl}', 'id'), COALESCE((SELECT MAX(id) FROM ${tbl}), 1));\n\n`;
}

const outputFile = path.join(__dirname, 'supabase_schema.sql');
fs.writeFileSync(outputFile, sql, 'utf8');
console.log('Successfully generated:', outputFile);
