-- ========================================================
-- Panggung Lokal: Clean Database Schema for Supabase
-- (Skema Bersih - Siap Digunakan Tanpa Dummy Akun / Postingan)
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor
-- ========================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL CHECK (account_type IN ('band', 'organizer', 'general')),
  google_id VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(50) DEFAULT 'local',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);

-- 2. BAND PROFILES TABLE
CREATE TABLE IF NOT EXISTS band_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  band_name VARCHAR(255) NOT NULL,
  genre VARCHAR(100) NOT NULL,
  location_city VARCHAR(100) NOT NULL,
  location_region VARCHAR(100),
  campus VARCHAR(100),
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
  stage_visual_post_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_band_profiles_user_id ON band_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_band_profiles_genre ON band_profiles(genre);
CREATE INDEX IF NOT EXISTS idx_band_profiles_city ON band_profiles(location_city);
CREATE INDEX IF NOT EXISTS idx_band_profiles_budget ON band_profiles(budget_min, budget_max);

-- 3. BAND POSTS TABLE
CREATE TABLE IF NOT EXISTS band_posts (
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
CREATE INDEX IF NOT EXISTS idx_band_posts_band_id ON band_posts(band_profile_id);

-- 4. MEDIA FILES TABLE
CREATE TABLE IF NOT EXISTS media_files (
  id SERIAL PRIMARY KEY,
  band_profile_id INTEGER NOT NULL REFERENCES band_profiles(id) ON DELETE CASCADE,
  file_type VARCHAR(20) NOT NULL CHECK (file_type IN ('audio', 'video', 'image')),
  file_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  title VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_media_files_band_id ON media_files(band_profile_id);
CREATE INDEX IF NOT EXISTS idx_media_files_order ON media_files(band_profile_id, display_order);

-- 5. CONNECTIONS TABLE
CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  organizer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  band_profile_id INTEGER NOT NULL REFERENCES band_profiles(id) ON DELETE CASCADE,
  connection_type VARCHAR(50) DEFAULT 'contact_view',
  event_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'inquiry',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_connections_organizer ON connections(organizer_user_id);
CREATE INDEX IF NOT EXISTS idx_connections_band ON connections(band_profile_id);

-- 6. PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 7. REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
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

-- 8. JOB BROADCASTS TABLE
CREATE TABLE IF NOT EXISTS job_broadcasts (
  id SERIAL PRIMARY KEY,
  organizer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_band_profile_id INTEGER REFERENCES band_profiles(id) ON DELETE SET NULL,
  organizer_name VARCHAR(255) NOT NULL,
  organizer_email VARCHAR(255) NOT NULL,
  organizer_phone VARCHAR(50) NOT NULL,
  event_date VARCHAR(50) NOT NULL,
  perform_start_time VARCHAR(20) NOT NULL,
  perform_end_time VARCHAR(20) NOT NULL,
  venue_location VARCHAR(255) NOT NULL,
  event_scale INTEGER DEFAULT 5,
  event_details TEXT NOT NULL,
  attachments TEXT DEFAULT '[]',
  recipient_band_count INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_broadcasts_organizer ON job_broadcasts(organizer_user_id);

-- 9. CAMPUSES TABLE (Referensi Pilihan Kampus)
CREATE TABLE IF NOT EXISTS campuses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  city VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 10. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS platform_settings (
  key VARCHAR(100) PRIMARY KEY,
  value VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 11. PGMIGRATIONS TABLE (Tracking node-pg-migrate status)
CREATE TABLE IF NOT EXISTS pgmigrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  run_on TIMESTAMP NOT NULL
);

-- ========================================================
-- DATA DEFAULT SISTEM (Hanya Pengaturan & Pilihan Kampus)
-- Akun, Band, Postingan, Review Dikosongkan Bersih
-- ========================================================

-- Master Kampus untuk dropdown pilihan
INSERT INTO "campuses" ("id", "name", "short_name", "city") VALUES
  (1, 'Universitas Negeri Semarang', 'UNNES', 'Kota Semarang'),
  (2, 'Universitas Diponegoro', 'UNDIP', 'Kota Semarang'),
  (3, 'Universitas Gadjah Mada', 'UGM', 'Kota Jogja'),
  (4, 'Universitas Negeri Yogyakarta', 'UNY', 'Kota Jogja'),
  (5, 'Universitas Dian Nuswantoro', 'UDINUS', 'Kota Semarang')
ON CONFLICT ("id") DO NOTHING;
SELECT setval('campuses_id_seq', (SELECT COALESCE(MAX(id), 1) FROM campuses));

-- Pengaturan default platform (Afiliasi kampus default tersembunyi)
INSERT INTO "platform_settings" ("key", "value") VALUES
  ('show_campus_affiliation', 'false')
ON CONFLICT ("key") DO NOTHING;

-- Catat status migrasi
INSERT INTO pgmigrations (name, run_on) VALUES
  ('1701000000001_create-users-table', NOW()),
  ('1701000000002_create-band-profiles-table', NOW()),
  ('1701000000003_create-availability-posts-table', NOW()),
  ('1701000000004_create-media-files-table', NOW()),
  ('1701000000005_create-connections-table', NOW()),
  ('1701000000006_create-password-reset-tokens-table', NOW()),
  ('1701000000007_create-reports-table', NOW()),
  ('1701000000008_add-rider-and-socials-to-band-profiles', NOW()),
  ('1701000000009_create-job-broadcasts-table', NOW()),
  ('1701000000010_create_reviews_campuses_and_add_band_profile_fields', NOW()),
  ('1701000000011_drop-reviews-ratings-and-schedules', NOW()),
  ('1701000000012_drop-custom-tag-from-band-profiles', NOW())
ON CONFLICT DO NOTHING;

-- ========================================================
-- GRANT ACCESS FOR SUPABASE API ROLES
-- ========================================================
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
