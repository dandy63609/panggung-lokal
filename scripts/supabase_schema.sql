-- ==========================================
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

-- Data awal untuk tabel users
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (1, 'kelana@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', '2026-11-11T19:06:48.863Z');
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (2, 'senjabersuara@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', '2026-11-11T19:02:05.017Z');
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (3, 'goyangpantura@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (4, 'distorsi@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (5, 'lembayung@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (6, 'suarahutan@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (7, 'rhythmofsumatra@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (8, 'midnightgroovers@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'band', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (9, 'kafe.selatan@gmail.com', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'general', TRUE, '2026-10-16T13:36:20.032Z', '2026-11-11T19:42:40.057Z');
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (10, 'jogja.creatives@gmail.com', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'general', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (11, 'surabaya.nightmarket@gmail.com', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'general', TRUE, '2026-10-16T13:36:20.032Z', NULL);
INSERT INTO users (id, email, password_hash, account_type, is_active, created_at, last_login) VALUES (12, 'admin@panggunglokal.id', '$2b$10$c7Zp2Z3EUSAHnr87pP7x9OtE10vKeHD98NmpaUNn.9d/xxeTZ419.', 'general', TRUE, '2026-10-16T13:36:20.032Z', '2026-10-16T14:05:43.364Z');
SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1));

-- Data awal untuk tabel band_profiles
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, profile_views, facebook_url, created_at, updated_at, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, spotify_url, tiktok_url) VALUES (5, 5, 'Lembayung Jazz Project', 'Neo-Soul & Jazz', 'Denpasar', 'Bali', 'Harmoni jazz kontemporer dengan sentuhan nada gamelan Bali dan groove neo-soul. Langganan tampil di beach club, lounge hotel bintang lima, dan festival jazz tahunan.', 6000000, 15000000, 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&auto=format&fit=crop&q=80', '+6281987654321', '@lembayungjazz', 'https://youtube.com/watch?v=demo-lembayung', 224, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, profile_views, facebook_url, created_at, updated_at, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, spotify_url, tiktok_url) VALUES (6, 6, 'Suara Hutan', 'Post-Rock / Ambient', 'Malang', 'Jawa Timur', 'Eksplorasi soundscape emosional yang melukiskan keindahan pegunungan Bromo dan alam Jawa Timur. Cocok untuk art exhibition, gathering komunitas kreatif, dan festival seni independen.', 2500000, 5500000, 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80', '+6282134567812', '@suarahutan.music', 'https://youtube.com/watch?v=demo-suarahutan', 76, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, profile_views, facebook_url, created_at, updated_at, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, spotify_url, tiktok_url) VALUES (4, 4, 'Distorsi Ibu Kota', 'Hardcore Punk', 'Jakarta Selatan', 'DKI Jakarta', 'Laju cepat, lirik kritis, dan energi panggung tanpa kompromi. Terbentuk di tongkrongan Blok M, Distorsi Ibu Kota membawa atmosfer underground punk murni untuk festival alternatif.', 3000000, 6000000, 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=80', '+6281789012345', '@distorsiibukota', 'https://youtube.com/watch?v=demo-distorsi', 187, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, profile_views, facebook_url, created_at, updated_at, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, spotify_url, tiktok_url) VALUES (8, 8, 'Midnight Groovers', 'Funk & Soul', 'Jakarta Pusat', 'DKI Jakarta', 'Unit funk 6-piece yang selalu berhasil memanaskan panggung pesta malam akhir pekan. Dilengkapi brass section energetik dan bassline berdenyut kencang.', 4500000, 10000000, NULL, 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80', '+6281299887766', '@midnightgroovers.jkt', 'https://youtube.com/watch?v=demo-midnight', 168, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, spotify_url, tiktok_url, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, profile_views, facebook_url, created_at, updated_at) VALUES (2, 2, 'Senja Bersuara', 'Indie Folk / Akustik', 'Yogyakarta', 'DI Yogyakarta', 'Kolektif folk akustik Yogyakarta yang menghidupkan puisi-puisi urban lewat petikan gitar akustik, cello, dan harmonisasi vokal sendu. Sangat cocok untuk kafe intim, peluncuran buku, dan garden wedding.', 2000000, 4500000, 'https://images.unsplash.com/photo-1525994886773-080587e161c2?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80', '+6281398765432', '@senjabersuara.id', 'https://youtube.com/watch?v=demo-senja', 'https://open.spotify.com/artist/senjabersuara', NULL, '6 Channel Input (2 Voc, 2 DI Box Akustik, 1 Cello, 1 Cajon)', 'PA System min 2.500 Watt, 2 Active Monitor, 2 Mic Vokal Berkualitas', 'Bawa sendiri: Semua instrumen akustik & DI Box. Venue sediakan: 3 Mic Stand, 2 Kursi Bar tanpa sandaran', 'Ruang rias/tunggu tenang, teh hangat, air mineral, konsumsi 4 pax', 102, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z');
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, spotify_url, tiktok_url, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, profile_views, facebook_url, created_at, updated_at) VALUES (1, 1, 'Kelana Ombak', 'Indie Surf Rock', 'Bandung', 'Jawa Barat', 'Band surf rock independen asal Bandung yang memadukan distorsi gitar vintage dengan ritme pantai tropis khas pesisir selatan Jawa. Telah merilis 1 EP dan aktif manggung di berbagai showcase kampus & gigs lokal.', 3500000, 7000000, 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80', '+6281234567890', '@kelanaombak.music', 'https://youtube.com/watch?v=demo-kelana', 'https://open.spotify.com/artist/kelanaombak', 'https://tiktok.com/@kelanaombak', '12 Channel Input (2 Voc, 2 Guitar, 1 Bass, 7 Drum)', 'FOH PA min 5.000 Watt, 3 Unit Stage Monitor Aux, 2 Shure SM58, 2 Shure SM57', 'Bawa sendiri: Gitar elektrik, Bass, Pedalboard, Cymbals. Venue sediakan: Drum kit standar & Backline amp', 'Backstage ber-AC, air mineral 2 dus, makan malam 6 pax (kru & musisi), 2 slot parkir mobil', 148, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z');
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, profile_views, facebook_url, created_at, updated_at, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, spotify_url, tiktok_url) VALUES (7, 7, 'Rhythm of Sumatra', 'World Fusion Pop', 'Medan', 'Sumatera Utara', 'Peleburan magis antara ritme gondang batak, melodi melayu, dan aransemen pop modern yang segar. Berpengalaman mengisi festival budaya dan panggung korporat.', 4000000, 9000000, 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&auto=format&fit=crop&q=80', '+6282276543210', '@rhythmofsumatra', 'https://youtube.com/watch?v=demo-sumatra', 110, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO band_profiles (id, user_id, band_name, genre, location_city, location_region, bio, budget_min, budget_max, profile_photo_url, cover_photo_url, phone, instagram_handle, youtube_url, profile_views, facebook_url, created_at, updated_at, rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality, spotify_url, tiktok_url) VALUES (3, 3, 'Goyang Pantura All-Stars', 'Dangdut Koplo Fusion', 'Surabaya', 'Jawa Timur', 'Menggabungkan dentuman ketipung koplo autentik dengan brass section ska modern. Dijamin membuat penonton dari segala usia bergoyang tanpa henti di festival komunitas maupun pesta rakyat!', 5000000, 12000000, 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80', '+6281122334455', '@goyangpantura.official', 'https://youtube.com/watch?v=demo-pantura', 325, NULL, '2026-10-16T13:36:20.034Z', '2026-10-16T13:36:20.034Z', NULL, NULL, NULL, NULL, NULL, NULL);
SELECT setval(pg_get_serial_sequence('band_profiles', 'id'), COALESCE((SELECT MAX(id) FROM band_profiles), 1));

-- Data awal untuk tabel band_posts
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (6, 2, 'audio', 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&auto=format&fit=crop&q=80', 'Demo akustik live studio track ''Langkah Kecil''. Suasana hangat nan puitis siap menemani para penikmat kopi senja acaramu.', 313, 15, '2026-11-02T13:30:00.000Z');
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (3, 1, 'video', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80', 'Cuplikan riff pembuka single ''Ombak Selatan'' live di Festival Kampus. Format full band siap guncang panggung festival!', 514, 28, '2026-11-04T16:45:00.000Z');
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (1, 1, 'photo', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80', 'Energi luar biasa gigs semalam di Pantai Madasari! Terima kasih Bandung & Pangandaran yang sudah bernyanyi bareng sampai ombak pasang 🌊🎸', 342, 18, '2026-10-20T14:20:00.000Z');
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (2, 1, 'photo', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=80', 'Soundcheck showcase acoustic session. Reverb analog siap mengalun di venue akhir pekan ini. Hubungi kami via WA untuk tanggal kosong berikutnya!', 289, 12, '2026-10-28T09:15:00.000Z');
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (8, 4, 'photo', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=400&auto=format&fit=crop&q=80', 'Moshpit bergemuruh di showcase underground Jakarta! Musik cepat, lirik lugas, energi murni hardcore punk.', 276, 11, '2026-11-05T19:30:00.000Z');
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (4, 1, 'photo', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80', 'Backstage vibes sebelum naik panggung. Rider aman, energi maksimal. Sampai jumpa di panggung berikutnya!', 199, 9, '2026-11-08T18:00:00.000Z');
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (5, 2, 'photo', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&auto=format&fit=crop&q=80', 'Harmoni petikan akustik & cello di bawah temaram lampu kafe Yogyakarta. Format intim untuk kafe, intimate wedding, dan art space.', 421, 23, '2026-10-25T11:00:00.000Z');
INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, views_count, wa_clicks_count, created_at) VALUES (7, 3, 'photo', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80', 'Gendang koplo dipadu brass section modern! Malam pesta rakyat Surabaya bergoyang tanpa henti! Booking kami untuk festival & panggung terbuka.', 633, 34, '2026-10-30T21:00:00.000Z');
SELECT setval(pg_get_serial_sequence('band_posts', 'id'), COALESCE((SELECT MAX(id) FROM band_posts), 1));

-- Data awal untuk tabel media_files
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (1, 1, 'audio', 'https://actions.google.com/sounds/v1/sports/skateboard_half_pipe.ogg', 'Single: Ombak Selatan (Demo Track)', 1, NULL, '2026-10-16T13:36:20.035Z');
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (2, 2, 'audio', 'https://actions.google.com/sounds/v1/weather/light_rain_on_leaves.ogg', 'Single: Menanti Petang (Acoustic)', 1, NULL, '2026-10-16T13:36:20.035Z');
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (3, 5, 'audio', 'https://actions.google.com/sounds/v1/water/ocean_waves_and_breeze.ogg', 'Track: Sunset di Seminyak', 1, NULL, '2026-10-16T13:36:20.035Z');
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (4, 1, 'image', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', 'Live di Bandung Indie Showcase 2026', 2, NULL, '2026-10-16T13:36:20.035Z');
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (5, 1, 'image', 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80', 'Panggung Sunset Pesisir Pangandaran', 3, NULL, '2026-10-16T13:36:20.035Z');
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (6, 2, 'image', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', 'Intimate Showcase Kedai Kopi Jogja', 2, NULL, '2026-10-16T13:36:20.035Z');
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (7, 2, 'image', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', 'Garden Stage Wedding Session', 3, NULL, '2026-10-16T13:36:20.035Z');
INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order, thumbnail_url, created_at) VALUES (8, 3, 'image', 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', 'Festival Rakyat Pesisir Surabaya', 2, NULL, '2026-10-16T13:36:20.035Z');
SELECT setval(pg_get_serial_sequence('media_files', 'id'), COALESCE((SELECT MAX(id) FROM media_files), 1));

-- Data awal untuk tabel connections
INSERT INTO connections (id, organizer_user_id, band_profile_id, connection_type, notes, created_at) VALUES (1, 9, 1, 'contact_view', 'Tanya jadwal untuk live music Jumat malam di Kafe Selatan', '2026-10-16T13:36:20.035Z');
INSERT INTO connections (id, organizer_user_id, band_profile_id, connection_type, notes, created_at) VALUES (2, 10, 2, 'contact_view', 'Undangan pentas seni Jogja Creative Festival 2026', '2026-10-16T13:36:20.035Z');
INSERT INTO connections (id, organizer_user_id, band_profile_id, connection_type, notes, created_at) VALUES (3, 11, 3, 'contact_view', 'Rencana panggung utama Pasar Malam Digital Surabaya', '2026-10-16T13:36:20.035Z');
INSERT INTO connections (id, organizer_user_id, band_profile_id, connection_type, notes, created_at) VALUES (4, 9, 4, 'contact_view', 'Showcase musik alternatif Jakarta', '2026-10-16T13:36:20.035Z');
SELECT setval(pg_get_serial_sequence('connections', 'id'), COALESCE((SELECT MAX(id) FROM connections), 1));

