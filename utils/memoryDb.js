const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

const DATA_FILE = path.join(__dirname, '..', 'data', 'panggung_lokal.json');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://awccpftjirfmxbvugqtk.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3Y2NwZnRqaXJmbXhidnVncXRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0NjEzNjMsImV4cCI6MjExMDAzNzM2M30.YXnWVV91NjUUDgbfmSiqBPVuSfFCNF-E6SqDh86MfNs';

let memDbInstance = null;
let poolInstance = null;
let initPromise = null;

async function fetchFromCloud() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const tables = ['users', 'band_profiles', 'band_posts', 'media_files', 'connections', 'reports'];
  const cloudData = {};
  let totalRows = 0;

  await Promise.all(tables.map(async (table) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&order=id.asc`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const rows = await res.json();
        if (Array.isArray(rows)) {
          cloudData[table] = rows;
          totalRows += rows.length;
        }
      }
    } catch (e) {
      // cloud fetch timeout or network offline
    }
  }));

  return totalRows > 0 ? cloudData : null;
}

async function syncAllToCloud() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !memDbInstance || process.env.NODE_ENV === 'test') return;
  const tables = ['users', 'band_profiles', 'band_posts', 'media_files', 'connections', 'reports'];
  for (const table of tables) {
    try {
      const rows = memDbInstance.public.many(`SELECT * FROM ${table}`);
      if (rows && rows.length > 0) {
        fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify(rows)
        }).catch(() => {});
      }
    } catch (e) {
      // ignore background sync errors
    }
  }
}

async function deleteFromCloud(table, id) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !id || process.env.NODE_ENV === 'test') return;
  fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  }).catch(() => {});
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  account_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS band_profiles (
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

CREATE TABLE IF NOT EXISTS media_files (
  id SERIAL PRIMARY KEY,
  band_profile_id INTEGER NOT NULL REFERENCES band_profiles(id) ON DELETE CASCADE,
  file_type VARCHAR(20) NOT NULL,
  file_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500),
  title VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  organizer_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  band_profile_id INTEGER NOT NULL REFERENCES band_profiles(id) ON DELETE CASCADE,
  connection_type VARCHAR(50) DEFAULT 'contact_view',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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
`;

function getMemoryDb() {
  if (memDbInstance) {
    return { db: memDbInstance, pool: poolInstance, ready: initPromise };
  }

  const db = newDb();
  
  db.public.registerFunction({
    name: 'version',
    args: [],
    returns: db.public.getType('text'),
    implementation: () => 'PostgreSQL 15.0 (pg-mem embedded)',
  });

  db.public.none(SCHEMA_SQL);

  const { Pool } = db.adapters.createPg();
  const pool = new Pool();

  memDbInstance = db;
  poolInstance = pool;

  initPromise = (async () => {
    let loadedFromCloud = false;
    if (process.env.NODE_ENV !== 'test') {
      try {
        const cloudData = await fetchFromCloud();
        if (cloudData && Object.keys(cloudData).length > 0) {
          await restoreData(pool, cloudData);
          syncMemoryDbSequences(db);
          console.log('☁️ Loaded database state directly from Supabase Cloud');
          loadedFromCloud = true;
        }
      } catch (cloudErr) {
        console.warn('⚠️ Supabase Cloud fetch notice:', cloudErr.message);
      }
    }

    if (!loadedFromCloud) {
      if (fs.existsSync(DATA_FILE)) {
        try {
          const savedData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
          await restoreData(pool, savedData);
          syncMemoryDbSequences(db);
          console.log('📦 Restored database from', DATA_FILE);
        } catch (err) {
          console.error('⚠️ Could not restore saved data, seeding fresh:', err.message);
          await seedInitialData(pool);
          syncMemoryDbSequences(db);
        }
      } else {
        await seedInitialData(pool);
        syncMemoryDbSequences(db);
      }
    }
  })();

  return { db: memDbInstance, pool: poolInstance, ready: initPromise };
}

async function restoreData(pool, data) {
  const tables = ['users', 'band_profiles', 'band_posts', 'media_files', 'connections', 'password_reset_tokens', 'reports'];
  for (const table of tables) {
    if (Array.isArray(data[table])) {
      for (const row of data[table]) {
        const keys = Object.keys(row);
        if (keys.length === 0) continue;
        const cols = keys.join(', ');
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const values = keys.map(k => row[k]);
        await pool.query(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`, values);
      }
    }
  }
}

function dumpData(db) {
  const tables = ['users', 'band_profiles', 'band_posts', 'media_files', 'connections', 'password_reset_tokens', 'reports'];
  const dump = {};
  for (const table of tables) {
    try {
      dump[table] = db.public.many(`SELECT * FROM ${table}`);
    } catch (e) {
      dump[table] = [];
    }
  }
  return dump;
}

function syncMemoryDbSequences(memDb = memDbInstance) {
  if (!memDb || !memDb.public || !memDb.data) return;
  const tables = ['users', 'band_profiles', 'band_posts', 'media_files', 'connections', 'password_reset_tokens', 'reports'];
  for (const tableName of tables) {
    try {
      const table = memDb.public.getTable(tableName);
      if (!table || !table.serialsId) continue;
      let serials = memDb.data.getMap(table.serialsId);
      if (!serials) continue;
      for (const colName of serials.keys()) {
        const rows = memDb.public.many('SELECT COALESCE(MAX(' + colName + '), 0) AS max_val FROM ' + tableName);
        const maxVal = rows && rows[0] && rows[0].max_val ? parseInt(rows[0].max_val, 10) : 0;
        serials = serials.set(colName, maxVal);
      }
      memDb.data.set(table.serialsId, serials);
    } catch (e) {
      // ignore
    }
  }
}

function saveMemoryDb() {
  if (!memDbInstance) return;
  try {
    syncMemoryDbSequences(memDbInstance);
    const data = dumpData(memDbInstance);
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (fsErr) {
      // Ignore read-only filesystem notice on Vercel Serverless
    }
    // Asynchronously synchronize state with Supabase Cloud
    syncAllToCloud();
  } catch (err) {
    console.error('Failed to save memory database:', err.message);
  }
}

async function seedInitialData(pool) {
  console.log('🌱 Seeding initial Indonesian band and organizer data...');
  const defaultHash = bcrypt.hashSync('Password123!', 10);

  // 1. Seed Users
  const users = [
    { id: 1, email: 'kelana@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 2, email: 'senjabersuara@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 3, email: 'goyangpantura@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 4, email: 'distorsi@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 5, email: 'lembayung@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 6, email: 'suarahutan@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 7, email: 'rhythmofsumatra@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 8, email: 'midnightgroovers@panggunglokal.id', password_hash: defaultHash, account_type: 'band' },
    { id: 9, email: 'kafe.selatan@gmail.com', password_hash: defaultHash, account_type: 'organizer' },
    { id: 10, email: 'jogja.creatives@gmail.com', password_hash: defaultHash, account_type: 'organizer' },
    { id: 11, email: 'surabaya.nightmarket@gmail.com', password_hash: defaultHash, account_type: 'organizer' },
    { id: 12, email: 'admin@panggunglokal.id', password_hash: defaultHash, account_type: 'organizer' }
  ];

  for (const u of users) {
    await pool.query(
      'INSERT INTO users (id, email, password_hash, account_type, is_active) VALUES ($1, $2, $3, $4, true)',
      [u.id, u.email, u.password_hash, u.account_type]
    );
  }

  // 2. Seed Band Profiles
  const bandProfiles = [
    {
      id: 1,
      user_id: 1,
      band_name: 'Kelana Ombak',
      genre: 'Indie Surf Rock',
      location_city: 'Bandung',
      location_region: 'Jawa Barat',
      bio: 'Band surf rock independen asal Bandung yang memadukan distorsi gitar vintage dengan ritme pantai tropis khas pesisir selatan Jawa. Telah merilis 1 EP dan aktif manggung di berbagai showcase kampus & gigs lokal.',
      budget_min: 3500000,
      budget_max: 7000000,
      profile_photo_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
      cover_photo_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80',
      phone: '+6281234567890',
      instagram_handle: '@kelanaombak.music',
      youtube_url: 'https://youtube.com/watch?v=demo-kelana',
      spotify_url: 'https://open.spotify.com/artist/kelanaombak',
      tiktok_url: 'https://tiktok.com/@kelanaombak',
      rider_channel_inputs: '12 Channel Input (2 Voc, 2 Guitar, 1 Bass, 7 Drum)',
      rider_sound_system: 'FOH PA min 5.000 Watt, 3 Unit Stage Monitor Aux, 2 Shure SM58, 2 Shure SM57',
      rider_instruments: 'Bawa sendiri: Gitar elektrik, Bass, Pedalboard, Cymbals. Venue sediakan: Drum kit (Pearl/Tama), Amfi Roland Jazz Chorus & Amfi Bass Ampeg',
      rider_hospitality: 'Backstage ber-AC, air mineral 2 dus, makan malam 6 pax (kru & band), 2 slot parkir mobil',
      profile_views: 142
    },
    {
      id: 2,
      user_id: 2,
      band_name: 'Senja Bersuara',
      genre: 'Indie Folk / Akustik',
      location_city: 'Yogyakarta',
      location_region: 'DI Yogyakarta',
      bio: 'Kolektif folk akustik Yogyakarta yang menghidupkan puisi-puisi urban lewat petikan gitar akustik, cello, dan harmonisasi vokal sendu. Sangat cocok untuk kafe intim, peluncuran buku, dan garden wedding.',
      budget_min: 2000000,
      budget_max: 4500000,
      profile_photo_url: 'https://images.unsplash.com/photo-1525994886773-080587e161c2?w=600&auto=format&fit=crop&q=80',
      cover_photo_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1200&auto=format&fit=crop&q=80',
      phone: '+6281398765432',
      instagram_handle: '@senjabersuara.id',
      youtube_url: 'https://youtube.com/watch?v=demo-senja',
      spotify_url: 'https://open.spotify.com/artist/senjabersuara',
      tiktok_url: null,
      rider_channel_inputs: '6 Channel Input (2 Voc, 2 DI Box Akustik, 1 Cello, 1 Cajon)',
      rider_sound_system: 'PA System min 2.000 Watt, 2 Active Monitor, 2 Mic Vokal Berkualitas',
      rider_instruments: 'Bawa sendiri: Semua instrumen akustik & DI Box. Venue sediakan: 3 Mic Stand, 2 Kursi Bar tanpa sandaran',
      rider_hospitality: 'Ruang rias/tunggu tenang, teh hangat, air mineral, konsumsi 4 pax',
      profile_views: 98
    },
    {
      id: 3,
      user_id: 3,
      band_name: 'Goyang Pantura All-Stars',
      genre: 'Dangdut Koplo Fusion',
      location_city: 'Surabaya',
      location_region: 'Jawa Timur',
      bio: 'Menggabungkan dentuman ketipung koplo autentik dengan brass section ska modern. Dijamin membuat penonton dari segala usia bergoyang tanpa henti di festival komunitas maupun pesta rakyat!',
      budget_min: 5000000,
      budget_max: 12000000,
      profile_photo_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&auto=format&fit=crop&q=80',
      cover_photo_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=1200&auto=format&fit=crop&q=80',
      phone: '+6281122334455',
      instagram_handle: '@goyangpantura.official',
      youtube_url: 'https://youtube.com/watch?v=demo-pantura',
      profile_views: 310
    },
    {
      id: 4,
      user_id: 4,
      band_name: 'Distorsi Ibu Kota',
      genre: 'Hardcore Punk',
      location_city: 'Jakarta Selatan',
      location_region: 'DKI Jakarta',
      bio: 'Laju cepat, lirik kritis, dan energi panggung tanpa kompromi. Terbentuk di tongkrongan Blok M, Distorsi Ibu Kota membawa atmosfer underground punk murni untuk festival alternatif.',
      budget_min: 3000000,
      budget_max: 6000000,
      profile_photo_url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=600&auto=format&fit=crop&q=80',
      cover_photo_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=1200&auto=format&fit=crop&q=80',
      phone: '+6281789012345',
      instagram_handle: '@distorsiibukota',
      youtube_url: 'https://youtube.com/watch?v=demo-distorsi',
      profile_views: 185
    },
    {
      id: 5,
      user_id: 5,
      band_name: 'Lembayung Jazz Project',
      genre: 'Neo-Soul & Jazz',
      location_city: 'Denpasar',
      location_region: 'Bali',
      bio: 'Harmoni jazz kontemporer dengan sentuhan nada gamelan Bali dan groove neo-soul. Langganan tampil di beach club, lounge hotel bintang lima, dan festival jazz tahunan.',
      budget_min: 6000000,
      budget_max: 15000000,
      profile_photo_url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
      cover_photo_url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?w=1200&auto=format&fit=crop&q=80',
      phone: '+6281987654321',
      instagram_handle: '@lembayungjazz',
      youtube_url: 'https://youtube.com/watch?v=demo-lembayung',
      profile_views: 220
    },
    {
      id: 6,
      user_id: 6,
      band_name: 'Suara Hutan',
      genre: 'Post-Rock / Ambient',
      location_city: 'Malang',
      location_region: 'Jawa Timur',
      bio: 'Eksplorasi soundscape emosional yang melukiskan keindahan pegunungan Bromo dan alam Jawa Timur. Cocok untuk art exhibition, gathering komunitas kreatif, dan festival seni independen.',
      budget_min: 2500000,
      budget_max: 5500000,
      profile_photo_url: 'https://images.unsplash.com/photo-1464375117522-1311d6a5b81f?w=600&auto=format&fit=crop&q=80',
      cover_photo_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&auto=format&fit=crop&q=80',
      phone: '+6282134567812',
      instagram_handle: '@suarahutan.music',
      youtube_url: 'https://youtube.com/watch?v=demo-suarahutan',
      profile_views: 75
    },
    {
      id: 7,
      user_id: 7,
      band_name: 'Rhythm of Sumatra',
      genre: 'World Fusion Pop',
      location_city: 'Medan',
      location_region: 'Sumatera Utara',
      bio: 'Peleburan magis antara ritme gondang batak, melodi melayu, dan aransemen pop modern yang segar. Berpengalaman mengisi festival budaya dan panggung korporat.',
      budget_min: 4000000,
      budget_max: 9000000,
      profile_photo_url: 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?w=600&auto=format&fit=crop&q=80',
      cover_photo_url: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=1200&auto=format&fit=crop&q=80',
      phone: '+6282276543210',
      instagram_handle: '@rhythmofsumatra',
      youtube_url: 'https://youtube.com/watch?v=demo-sumatra',
      profile_views: 110
    },
    {
      id: 8,
      user_id: 8,
      band_name: 'Midnight Groovers',
      genre: 'Funk & Soul',
      location_city: 'Jakarta Pusat',
      location_region: 'DKI Jakarta',
      bio: 'Unit funk 6-piece yang selalu berhasil memanaskan panggung pesta malam akhir pekan. Dilengkapi brass section energetik dan bassline berdenyut kencang.',
      budget_min: 4500000,
      budget_max: 10000000,
      profile_photo_url: null,
      cover_photo_url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&auto=format&fit=crop&q=80',
      phone: '+6281299887766',
      instagram_handle: '@midnightgroovers.jkt',
      youtube_url: 'https://youtube.com/watch?v=demo-midnight',
      profile_views: 165
    }
  ];

  for (const b of bandProfiles) {
    await pool.query(
      `INSERT INTO band_profiles (
        id, user_id, band_name, genre, location_city, location_region, bio, 
        budget_min, budget_max, profile_photo_url, cover_photo_url, phone, 
        instagram_handle, youtube_url, spotify_url, tiktok_url,
        rider_channel_inputs, rider_sound_system, rider_instruments, rider_hospitality,
        rider_items, profile_views
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        b.id, b.user_id, b.band_name, b.genre, b.location_city, b.location_region, b.bio,
        b.budget_min, b.budget_max, b.profile_photo_url, b.cover_photo_url, b.phone,
        b.instagram_handle, b.youtube_url, b.spotify_url || null, b.tiktok_url || null,
        b.rider_channel_inputs || '8-12 Channel Input',
        b.rider_sound_system || 'PA System min 3.000 Watt, 2 Stage Monitor, 2 Mic Shure SM58',
        b.rider_instruments || 'Bawa instrumen utama. Venue sediakan drum kit standar dan amplifier.',
        b.rider_hospitality || 'Air mineral botol, ruang tunggu musisi, konsumsi standar 5 pax',
        JSON.stringify([
          { title: 'Input Audio Channel', description: b.rider_channel_inputs || '8-12 Channel Input' },
          { title: 'Kebutuhan Sound System', description: b.rider_sound_system || 'PA System min 3.000 Watt, 2 Stage Monitor, 2 Mic Shure SM58' },
          { title: 'Peralatan & Backline', description: b.rider_instruments || 'Bawa instrumen utama. Venue sediakan drum kit standar dan amplifier.' },
          { title: 'Hospitality & Konsumsi', description: b.rider_hospitality || 'Air mineral botol, ruang tunggu musisi, konsumsi standar 5 pax' }
        ]),
        b.profile_views
      ]
    );
  }

  // 3. Seed Instagram-Style Band Posts
  const bandPosts = [
    {
      id: 1,
      band_profile_id: 1,
      media_type: 'photo',
      media_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=400&auto=format&fit=crop&q=80',
      caption: 'Energi gigs di Pantai Madasari! Terima kasih Bandung dan Pangandaran 🌊🎸',
      views_count: 342,
      wa_clicks_count: 18,
      slides: JSON.stringify([
        { type: 'photo', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80' },
        { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
        { type: 'photo', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80' }
      ])
    },
    {
      id: 2,
      band_profile_id: 1,
      media_type: 'photo',
      media_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=400&auto=format&fit=crop&q=80',
      caption: 'Soundcheck showcase acoustic session. Reverb analog siap mengalun di venue akhir pekan ini.',
      views_count: 289,
      wa_clicks_count: 12,
      slides: JSON.stringify([
        { type: 'photo', url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80' },
        { type: 'photo', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80' }
      ])
    },
    {
      id: 3,
      band_profile_id: 1,
      media_type: 'video',
      media_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
      thumbnail_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&auto=format&fit=crop&q=80',
      caption: 'Cuplikan riff pembuka single Ombak Selatan live di Festival Kampus.',
      views_count: 512,
      wa_clicks_count: 27,
      slides: JSON.stringify([
        { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' },
        { type: 'photo', url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80' }
      ])
    },
    {
      id: 4,
      band_profile_id: 1,
      media_type: 'photo',
      media_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80',
      caption: 'Backstage vibes sebelum naik panggung. Rider aman, energi maksimal.',
      views_count: 198,
      wa_clicks_count: 9,
      slides: JSON.stringify([
        { type: 'photo', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80' }
      ])
    },
    {
      id: 5,
      band_profile_id: 2,
      media_type: 'photo',
      media_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&auto=format&fit=crop&q=80',
      caption: 'Harmoni petikan akustik & cello di bawah temaram lampu kafe Yogyakarta.',
      views_count: 420,
      wa_clicks_count: 23,
      slides: JSON.stringify([
        { type: 'photo', url: 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=800&auto=format&fit=crop&q=80' },
        { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
      ])
    },
    {
      id: 6,
      band_profile_id: 2,
      media_type: 'audio',
      media_url: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=400&auto=format&fit=crop&q=80',
      caption: 'Demo akustik live studio track Langkah Kecil. Suasana hangat nan puitis.',
      views_count: 310,
      wa_clicks_count: 15,
      slides: JSON.stringify([
        { type: 'audio', url: 'https://images.unsplash.com/photo-1485579149621-3123dd979885?w=800&auto=format&fit=crop&q=80' }
      ])
    },
    {
      id: 7,
      band_profile_id: 3,
      media_type: 'photo',
      media_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80',
      thumbnail_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80',
      caption: 'Gendang koplo dipadu brass section modern! Malam pesta rakyat Surabaya.',
      views_count: 630,
      wa_clicks_count: 34,
      slides: JSON.stringify([
        { type: 'photo', url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80' },
        { type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
      ])
    }
  ];

  for (const p of bandPosts) {
    await pool.query(
      `INSERT INTO band_posts (id, band_profile_id, media_type, media_url, thumbnail_url, caption, slides, views_count, wa_clicks_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [p.id, p.band_profile_id, p.media_type, p.media_url, p.thumbnail_url, p.caption, p.slides, p.views_count, p.wa_clicks_count]
    );
  }

  // 4. Seed Connections
  const connections = [
    { id: 1, organizer_user_id: 9, band_profile_id: 1, connection_type: 'contact_view', notes: 'Tanya jadwal untuk live music Jumat malam di Kafe Selatan' },
    { id: 2, organizer_user_id: 10, band_profile_id: 2, connection_type: 'contact_view', notes: 'Undangan pentas seni Jogja Creative Festival 2026' },
    { id: 3, organizer_user_id: 11, band_profile_id: 3, connection_type: 'contact_view', notes: 'Rencana panggung utama Pasar Malam Digital Surabaya' },
    { id: 4, organizer_user_id: 9, band_profile_id: 4, connection_type: 'contact_view', notes: 'Showcase musik alternatif Jakarta' }
  ];

  for (const c of connections) {
    await pool.query(
      `INSERT INTO connections (id, organizer_user_id, band_profile_id, connection_type, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [c.id, c.organizer_user_id, c.band_profile_id, c.connection_type, c.notes]
    );
  }

  // 5. Seed Media Files (Audio & Stage Documentation)
  const mediaFiles = [
    { id: 1, band_profile_id: 1, file_type: 'audio', file_url: 'https://actions.google.com/sounds/v1/sports/skateboard_half_pipe.ogg', title: 'Single: Ombak Selatan (Demo Track)', display_order: 1 },
    { id: 2, band_profile_id: 2, file_type: 'audio', file_url: 'https://actions.google.com/sounds/v1/weather/light_rain_on_leaves.ogg', title: 'Single: Menanti Petang (Acoustic)', display_order: 1 },
    { id: 3, band_profile_id: 5, file_type: 'audio', file_url: 'https://actions.google.com/sounds/v1/water/ocean_waves_and_breeze.ogg', title: 'Track: Sunset di Seminyak', display_order: 1 },
    { id: 4, band_profile_id: 1, file_type: 'image', file_url: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?w=800&auto=format&fit=crop&q=80', title: 'Live di Bandung Indie Showcase 2026', display_order: 2 },
    { id: 5, band_profile_id: 1, file_type: 'image', file_url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=800&auto=format&fit=crop&q=80', title: 'Panggung Sunset Pesisir Pangandaran', display_order: 3 },
    { id: 6, band_profile_id: 2, file_type: 'image', file_url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80', title: 'Intimate Showcase Kedai Kopi Jogja', display_order: 2 },
    { id: 7, band_profile_id: 2, file_type: 'image', file_url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80', title: 'Garden Stage Wedding Session', display_order: 3 },
    { id: 8, band_profile_id: 3, file_type: 'image', file_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&auto=format&fit=crop&q=80', title: 'Festival Rakyat Pesisir Surabaya', display_order: 2 }
  ];

  for (const m of mediaFiles) {
    await pool.query(
      `INSERT INTO media_files (id, band_profile_id, file_type, file_url, title, display_order)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [m.id, m.band_profile_id, m.file_type, m.file_url, m.title, m.display_order]
    );
  }

  saveMemoryDb();
  console.log('✅ Initial database seed completed!');
}

module.exports = {
  getMemoryDb,
  saveMemoryDb,
  syncMemoryDbSequences,
  syncAllToCloud,
  deleteFromCloud
};
