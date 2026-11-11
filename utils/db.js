const { Pool: PgPool } = require('pg');
require('dotenv').config();
const { getMemoryDb, saveMemoryDb } = require('./memoryDb');

let activePool = null;
let isUsingMemory = false;
let memoryReadyPromise = null;

const forceMemory = process.env.DB_CLIENT === 'memory';

function initPool() {
  if (activePool) return activePool;

  if (forceMemory) {
    console.log('📦 Using embedded PostgreSQL (pg-mem) database');
    const { pool, ready } = getMemoryDb();
    activePool = pool;
    isUsingMemory = true;
    memoryReadyPromise = ready;
    return activePool;
  }

  try {
    const pgPool = new PgPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'panggung_lokal',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 1000,
    });

    pgPool.on('error', (err) => {
      console.warn('⚠️ PostgreSQL pool notice:', err.message);
    });

    activePool = pgPool;
    return activePool;
  } catch (err) {
    console.warn('⚠️ Failed to initialize PostgreSQL pool, falling back to embedded db:', err.message);
    const { pool, ready } = getMemoryDb();
    activePool = pool;
    isUsingMemory = true;
    memoryReadyPromise = ready;
    return activePool;
  }
}

initPool();

// Query helper function with fallback and error handling
const query = async (text, params) => {
  if (isUsingMemory && memoryReadyPromise) {
    await memoryReadyPromise;
  }

  const start = Date.now();
  try {
    const res = await activePool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.trim().substring(0, 80), duration, rows: res.rowCount });
    }
    
    // Auto save if memory db and modifying
    if (isUsingMemory && /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER)/i.test(text)) {
      saveMemoryDb();
    }
    
    return res;
  } catch (error) {
    // If real PG fails with connection error, switch to memory DB on the fly!
    const isConnError = error.code === 'ECONNREFUSED' ||
                        error.code === 'EACCES' ||
                        error.name === 'AggregateError' ||
                        (error.message && error.message.includes('connect')) ||
                        (error.errors && error.errors.some(e => (e.code === 'ECONNREFUSED' || e.code === 'EACCES' || (e.message && e.message.includes('connect')))));

    if (!isUsingMemory && isConnError) {
      console.warn('⚠️ PostgreSQL connection failed, switching to embedded memory DB');
      const { pool, ready } = getMemoryDb();
      activePool = pool;
      isUsingMemory = true;
      memoryReadyPromise = ready;
      await memoryReadyPromise;
      return query(text, params);
    }
    console.error('Database query error', { text, error: error.message });
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  if (isUsingMemory && memoryReadyPromise) {
    await memoryReadyPromise;
  }

  const client = await activePool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    if (isUsingMemory) {
      saveMemoryDb();
    }
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  query,
  get pool() {
    return activePool;
  },
  transaction,
  isUsingMemory: () => isUsingMemory
};
