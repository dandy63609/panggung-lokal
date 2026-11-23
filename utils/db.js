const { Pool: PgPool, Client: PgClient } = require('pg');
require('dotenv').config();
const { getMemoryDb, saveMemoryDb, ensureFreshCloudData, withMemoryDbLock } = require('./memoryDb');

let activePool = null;
let isUsingMemory = false;
let memoryReadyPromise = null;
let hyperdriveResolver = null;

function isServerlessRuntime(env = process.env) {
  return Boolean(
    env.VERCEL ||
    env.CLOUDFLARE_WORKERS ||
    env.CF_PAGES
  );
}

function shouldForceMemory(env = process.env) {
  return (
    env.DB_CLIENT === 'memory' ||
    (env.NODE_ENV === 'test' && env.DB_CLIENT !== 'postgres')
  );
}

function setHyperdriveResolver(resolver) {
  hyperdriveResolver = typeof resolver === 'function' ? resolver : null;
}

function getHyperdriveConnectionString(env = process.env) {
  if (env && env.DB_CLIENT === 'memory') {
    return null;
  }
  if (typeof hyperdriveResolver !== 'function') {
    return null;
  }
  try {
    const value = hyperdriveResolver();
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

function isLocalConnectionString(connectionString) {
  try {
    const parsed = new URL(connectionString);
    return parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1' || parsed.hostname === '::1';
  } catch {
    return /^postgres(ql)?:\/\/([^@]+@)?(localhost|127\.0\.0\.1)(:|\/|$)/i.test(connectionString);
  }
}

function buildPgPoolConfig(env = process.env) {
  const connectionString = (env.DATABASE_URL || '').trim();
  const isServerless = isServerlessRuntime(env);
  const max = isServerless ? 3 : 10;

  if (connectionString) {
    return {
      connectionString,
      ssl: isLocalConnectionString(connectionString) ? false : { rejectUnauthorized: false },
      max,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: isServerless ? 5000 : 2000,
    };
  }

  return {
    host: env.DB_HOST || 'localhost',
    port: Number(env.DB_PORT) || 5432,
    database: env.DB_NAME || 'panggung_lokal',
    user: env.DB_USER || 'postgres',
    password: env.DB_PASSWORD || 'postgres',
    max,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 1000,
  };
}

function shouldAllowMemoryFallback(env = process.env) {
  if (getHyperdriveConnectionString(env)) {
    return false;
  }
  // Serverless production with DATABASE_URL must fail loudly rather than diverge into pg-mem.
  return !(isServerlessRuntime(env) && Boolean((env.DATABASE_URL || '').trim()));
}

function activateMemoryFallback() {
  const { pool, ready } = getMemoryDb();
  activePool = pool;
  isUsingMemory = true;
  memoryReadyPromise = ready;
  return activePool;
}

function ensurePool() {
  if (activePool) return activePool;

  if (shouldForceMemory(process.env)) {
    console.log('📦 Using embedded PostgreSQL (pg-mem) database');
    return activateMemoryFallback();
  }

  try {
    const pgPool = new PgPool(buildPgPoolConfig(process.env));

    pgPool.on('error', (err) => {
      console.warn('⚠️ PostgreSQL pool notice:', err.message);
    });

    activePool = pgPool;
    return activePool;
  } catch (err) {
    if (!shouldAllowMemoryFallback(process.env)) {
      throw err;
    }
    console.warn('⚠️ Failed to initialize PostgreSQL pool, falling back to embedded db:', err.message);
    return activateMemoryFallback();
  }
}

async function executeWithHyperdriveClient(connectionString, callback) {
  // Do not force `ssl` options: Hyperdrive terminates TLS between the edge and origin Postgres.
  const client = new PgClient({ connectionString });
  try {
    await client.connect();
    return await callback(client);
  } finally {
    await client.end().catch(() => {});
  }
}

// Query helper function with fallback and error handling
const query = async (text, params) => {
  const hyperdriveConnectionString = getHyperdriveConnectionString(process.env);
  if (hyperdriveConnectionString) {
    const start = Date.now();
    try {
      const res = await executeWithHyperdriveClient(hyperdriveConnectionString, (client) =>
        client.query(text, params)
      );
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text: text.trim().substring(0, 80), duration, rows: res.rowCount });
      }
      return res;
    } catch (error) {
      console.error('Database query error', { text, error: error.message });
      throw error;
    }
  }

  ensurePool();
  if (isUsingMemory && memoryReadyPromise) {
    await memoryReadyPromise;
  }

  const isModifying = /^\s*(INSERT|UPDATE|DELETE|DROP|ALTER)/i.test(text);
  const isDelete = /^\s*DELETE\b/i.test(text);

  if (isUsingMemory) {
    return withMemoryDbLock(async () => {
      const refreshedBeforeWrite = await ensureFreshCloudData(isModifying);
      const start = Date.now();
      try {
        const res = await activePool.query(text, params);
        const duration = Date.now() - start;
        if (process.env.NODE_ENV === 'development') {
          console.log('Executed query', { text: text.trim().substring(0, 80), duration, rows: res.rowCount });
        }

        if (isModifying) {
          await saveMemoryDb({ syncDeletions: isDelete && refreshedBeforeWrite });
        }

        return res;
      } catch (error) {
        console.error('Database query error', { text, error: error.message });
        throw error;
      }
    });
  }

  const start = Date.now();
  try {
    const res = await activePool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.trim().substring(0, 80), duration, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    // If real PG fails with connection error, switch to memory DB on the fly!
    const isConnError = error.code === 'ECONNREFUSED' ||
                        error.code === 'EACCES' ||
                        error.name === 'AggregateError' ||
                        (error.message && error.message.includes('connect')) ||
                        (error.errors && error.errors.some(e => (e.code === 'ECONNREFUSED' || e.code === 'EACCES' || (e.message && e.message.includes('connect')))));

    if (!isUsingMemory && isConnError && shouldAllowMemoryFallback(process.env)) {
      console.warn('⚠️ PostgreSQL connection failed, switching to embedded memory DB');
      activateMemoryFallback();
      await memoryReadyPromise;
      return query(text, params);
    }
    console.error('Database query error', { text, error: error.message });
    throw error;
  }
};

// Transaction helper
const transaction = async (callback) => {
  const hyperdriveConnectionString = getHyperdriveConnectionString(process.env);
  if (hyperdriveConnectionString) {
    return executeWithHyperdriveClient(hyperdriveConnectionString, async (client) => {
      await client.query('BEGIN');
      try {
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw error;
      }
    });
  }

  ensurePool();
  if (isUsingMemory && memoryReadyPromise) {
    await memoryReadyPromise;
  }

  const runTx = async () => {
    const refreshedBeforeTx = isUsingMemory ? await ensureFreshCloudData(true) : false;
    const client = await activePool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      if (isUsingMemory) {
        await saveMemoryDb({ syncDeletions: refreshedBeforeTx });
      }
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  };

  if (isUsingMemory) {
    return withMemoryDbLock(runTx);
  }
  return runTx();
};

module.exports = {
  query,
  get pool() {
    if (getHyperdriveConnectionString(process.env)) {
      return null;
    }
    return ensurePool();
  },
  transaction,
  isUsingMemory: () => {
    if (getHyperdriveConnectionString(process.env)) {
      return false;
    }
    return Boolean(isUsingMemory || (!activePool && shouldForceMemory(process.env)));
  },
  setHyperdriveResolver,
  getHyperdriveConnectionString,
  isServerlessRuntime,
  buildPgPoolConfig,
  shouldAllowMemoryFallback
};
