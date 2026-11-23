/**
 * Unit tests for utils/db.js (Cloudflare Hyperdrive + PgPool + pg-mem fallback)
 */

describe('Database Adapter (utils/db.js)', () => {
  const originalEnv = process.env;

  function loadDbModule(envOverrides = {}) {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      ...envOverrides,
    };
    delete process.env.VERCEL;
    delete process.env.CLOUDFLARE_WORKERS;
    delete process.env.CF_PAGES;
    delete process.env.DATABASE_URL;
    delete process.env.DB_CLIENT;

    for (const [key, value] of Object.entries(envOverrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    const clientInstances = [];
    const poolInstances = [];

    const MockClient = jest.fn().mockImplementation((config) => {
      const instance = {
        config,
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        end: jest.fn().mockResolvedValue(undefined),
      };
      clientInstances.push(instance);
      return instance;
    });

    const MockPool = jest.fn().mockImplementation((config) => {
      const instance = {
        config,
        on: jest.fn(),
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
        connect: jest.fn(),
      };
      poolInstances.push(instance);
      return instance;
    });

    const mockMemoryDb = {
      getMemoryDb: jest.fn(() => ({
        pool: { query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }), connect: jest.fn() },
        ready: Promise.resolve(),
      })),
      saveMemoryDb: jest.fn().mockResolvedValue(undefined),
      ensureFreshCloudData: jest.fn().mockResolvedValue(false),
      withMemoryDbLock: jest.fn((task) => task()),
    };

    jest.doMock('pg', () => ({
      Pool: MockPool,
      Client: MockClient,
    }));
    jest.doMock('../utils/memoryDb', () => mockMemoryDb);

    const db = require('../utils/db');

    return { db, MockClient, MockPool, clientInstances, poolInstances, mockMemoryDb };
  }

  afterEach(() => {
    process.env = originalEnv;
    jest.dontMock('pg');
    jest.dontMock('../utils/memoryDb');
  });

  describe('isServerlessRuntime', () => {
    test('returns true for VERCEL, CLOUDFLARE_WORKERS, and CF_PAGES', () => {
      const { db } = loadDbModule();

      expect(db.isServerlessRuntime({ VERCEL: '1' })).toBe(true);
      expect(db.isServerlessRuntime({ CLOUDFLARE_WORKERS: '1' })).toBe(true);
      expect(db.isServerlessRuntime({ CF_PAGES: '1' })).toBe(true);
    });

    test('returns false when no serverless flags are set', () => {
      const { db } = loadDbModule();
      expect(db.isServerlessRuntime({})).toBe(false);
    });
  });

  describe('buildPgPoolConfig', () => {
    test('enables SSL for remote DATABASE_URL and uses Cloudflare serverless limits', () => {
      const { db } = loadDbModule();
      const config = db.buildPgPoolConfig({
        CLOUDFLARE_WORKERS: '1',
        DATABASE_URL: 'postgresql://user:pass@db.example.supabase.co:5432/postgres',
      });

      expect(config).toEqual({
        connectionString: 'postgresql://user:pass@db.example.supabase.co:5432/postgres',
        ssl: { rejectUnauthorized: false },
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });
    });

    test('disables SSL for localhost DATABASE_URL', () => {
      const { db } = loadDbModule();
      const config = db.buildPgPoolConfig({
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/panggung_lokal',
      });

      expect(config.ssl).toBe(false);
      expect(config.max).toBe(10);
      expect(config.connectionTimeoutMillis).toBe(2000);
    });

    test('falls back to discrete DB_* host, port, and database settings', () => {
      const { db } = loadDbModule();
      const config = db.buildPgPoolConfig({
        DB_HOST: 'postgres.internal',
        DB_PORT: '6543',
        DB_NAME: 'reffband',
        DB_USER: 'app_user',
        DB_PASSWORD: 'secret',
      });

      expect(config).toEqual({
        host: 'postgres.internal',
        port: 6543,
        database: 'reffband',
        user: 'app_user',
        password: 'secret',
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 1000,
      });
    });
  });

  describe('shouldAllowMemoryFallback', () => {
    test('returns false when CLOUDFLARE_WORKERS or VERCEL has DATABASE_URL', () => {
      const { db } = loadDbModule();

      expect(
        db.shouldAllowMemoryFallback({
          CLOUDFLARE_WORKERS: '1',
          DATABASE_URL: 'postgresql://user:pass@db.example.supabase.co:5432/postgres',
        })
      ).toBe(false);

      expect(
        db.shouldAllowMemoryFallback({
          VERCEL: '1',
          DATABASE_URL: 'postgresql://user:pass@db.example.supabase.co:5432/postgres',
        })
      ).toBe(false);
    });

    test('returns false when Hyperdrive resolver is active', () => {
      const { db } = loadDbModule();
      db.setHyperdriveResolver(() => 'postgresql://hyperdrive.local/postgres');

      expect(db.shouldAllowMemoryFallback({})).toBe(false);
    });

    test('returns true in local development without Hyperdrive', () => {
      const { db } = loadDbModule();
      expect(db.shouldAllowMemoryFallback({})).toBe(true);
    });
  });

  describe('Hyperdrive per-request PgClient execution', () => {
    const hyperdriveUrl = 'postgresql://user:token@hyperdrive-proxy.internal:5432/postgres';

    test('does not initialize PgPool or pg-mem on module require', () => {
      const { MockPool, mockMemoryDb } = loadDbModule();

      expect(MockPool).not.toHaveBeenCalled();
      expect(mockMemoryDb.getMemoryDb).not.toHaveBeenCalled();
    });

    test('executes query with fresh Client per call, no ssl override, and reports real DB', async () => {
      const { db, MockClient, MockPool, clientInstances, mockMemoryDb } = loadDbModule({
        CLOUDFLARE_WORKERS: '1',
      });

      db.setHyperdriveResolver(() => hyperdriveUrl);

      expect(db.isUsingMemory()).toBe(false);
      expect(db.pool).toBeNull();

      const expectedResult = { rows: [{ id: 1, band_name: 'Kelana Ombak' }], rowCount: 1 };
      MockClient.mockImplementationOnce((config) => {
        const instance = {
          config,
          connect: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue(expectedResult),
          end: jest.fn().mockResolvedValue(undefined),
        };
        clientInstances.push(instance);
        return instance;
      });

      const res = await db.query('SELECT id, band_name FROM band_profiles WHERE id = $1', [1]);

      expect(res).toEqual(expectedResult);
      expect(MockPool).not.toHaveBeenCalled();
      expect(mockMemoryDb.getMemoryDb).not.toHaveBeenCalled();
      expect(clientInstances).toHaveLength(1);
      expect(clientInstances[0].config).toEqual({ connectionString: hyperdriveUrl });
      expect(clientInstances[0].config.ssl).toBeUndefined();
      expect(clientInstances[0].connect).toHaveBeenCalledTimes(1);
      expect(clientInstances[0].query).toHaveBeenCalledWith(
        'SELECT id, band_name FROM band_profiles WHERE id = $1',
        [1]
      );
      expect(clientInstances[0].end).toHaveBeenCalledTimes(1);

      await db.query('SELECT 2', []);
      expect(clientInstances).toHaveLength(2);
    });

    test('calls client.end() and rethrows without falling back to pg-mem on Hyperdrive query error', async () => {
      const { db, MockClient, clientInstances, mockMemoryDb } = loadDbModule({
        CLOUDFLARE_WORKERS: '1',
      });

      db.setHyperdriveResolver(() => hyperdriveUrl);

      MockClient.mockImplementationOnce((config) => {
        const instance = {
          config,
          connect: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockRejectedValue(new Error('connect timeout')),
          end: jest.fn().mockResolvedValue(undefined),
        };
        clientInstances.push(instance);
        return instance;
      });

      await expect(db.query('SELECT 1', [])).rejects.toThrow('connect timeout');
      expect(clientInstances[0].end).toHaveBeenCalledTimes(1);
      expect(mockMemoryDb.getMemoryDb).not.toHaveBeenCalled();
    });

    test('runs BEGIN, callback, COMMIT, and end() for Hyperdrive transactions', async () => {
      const { db, MockClient, clientInstances } = loadDbModule({
        CLOUDFLARE_WORKERS: '1',
      });

      db.setHyperdriveResolver(() => hyperdriveUrl);

      MockClient.mockImplementationOnce((config) => {
        const instance = {
          config,
          connect: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue({ rows: [{ ok: true }], rowCount: 1 }),
          end: jest.fn().mockResolvedValue(undefined),
        };
        clientInstances.push(instance);
        return instance;
      });

      const txResult = await db.transaction(async (client) => {
        const res = await client.query('DELETE FROM users WHERE id = $1', [99]);
        return res.rows[0];
      });

      expect(txResult).toEqual({ ok: true });
      expect(clientInstances[0].query.mock.calls).toEqual([
        ['BEGIN'],
        ['DELETE FROM users WHERE id = $1', [99]],
        ['COMMIT'],
      ]);
      expect(clientInstances[0].end).toHaveBeenCalledTimes(1);
    });

    test('runs ROLLBACK and end() and rethrows when Hyperdrive transaction callback throws', async () => {
      const { db, MockClient, clientInstances } = loadDbModule({
        CLOUDFLARE_WORKERS: '1',
      });

      db.setHyperdriveResolver(() => hyperdriveUrl);

      MockClient.mockImplementationOnce((config) => {
        const instance = {
          config,
          connect: jest.fn().mockResolvedValue(undefined),
          query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          end: jest.fn().mockResolvedValue(undefined),
        };
        clientInstances.push(instance);
        return instance;
      });

      await expect(
        db.transaction(async () => {
          throw new Error('tx failure');
        })
      ).rejects.toThrow('tx failure');

      expect(clientInstances[0].query.mock.calls).toEqual([['BEGIN'], ['ROLLBACK']]);
      expect(clientInstances[0].end).toHaveBeenCalledTimes(1);
    });

    test('DB_CLIENT=memory overrides Hyperdrive resolver and failing resolver fails safe', () => {
      const { db } = loadDbModule({
        CLOUDFLARE_WORKERS: '1',
        DB_CLIENT: 'memory',
      });

      db.setHyperdriveResolver(() => hyperdriveUrl);
      expect(db.getHyperdriveConnectionString()).toBeNull();
      expect(db.isUsingMemory()).toBe(true);

      const cleanEnv = {};
      expect(db.getHyperdriveConnectionString(cleanEnv)).toBe(hyperdriveUrl);

      db.setHyperdriveResolver(() => {
        throw new Error('Not inside request context');
      });
      expect(db.getHyperdriveConnectionString(cleanEnv)).toBeNull();
    });
  });
});
