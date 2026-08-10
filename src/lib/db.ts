import { createClient, Client } from '@libsql/client';
import path from 'path';

/**
 * Database client resolution.
 * Automatically uses Turso if TURSO_DATABASE_URL is set,
 * otherwise falls back to local findhome.db file for local dev.
 */
const url = process.env.TURSO_DATABASE_URL || `file:${path.resolve(process.cwd(), 'findhome.db')}`;
const authToken = process.env.TURSO_AUTH_TOKEN;

// Singleton for dev hot-reload
const globalForDb = globalThis as unknown as { __db?: Client };

function getDbClient(): Client {
  if (globalForDb.__db) return globalForDb.__db;
  
  const client = createClient({ url, authToken });
  globalForDb.__db = client;
  return client;
}

export const db = getDbClient();
export default db;

/**
 * Initialize unified database schema.
 * Since libsql is async, this must be called before operating on a fresh database.
 */
let schemaSetupPromise: Promise<void> | null = null;

export async function setupDb(): Promise<void> {
  if (schemaSetupPromise) return schemaSetupPromise;

  schemaSetupPromise = db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS houses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      source TEXT NOT NULL DEFAULT 'domria',
      deal_type TEXT NOT NULL CHECK(deal_type IN ('sale', 'rent')),
      title TEXT,
      description TEXT,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      price_uah REAL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      region TEXT,
      city TEXT,
      district TEXT,
      address TEXT,
      area_total REAL,
      area_land REAL,
      rooms INTEGER,
      floors INTEGER,
      year_built INTEGER,
      photo_url TEXT,
      photos TEXT,
      source_url TEXT,
      nearest_city TEXT,
      distance_to_city REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS house_crm (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_id INTEGER NOT NULL UNIQUE,
      status TEXT DEFAULT 'new' CHECK(status IN ('new', 'favorite', 'call', 'viewing', 'archived')),
      notes TEXT DEFAULT '',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (house_id) REFERENCES houses(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_houses_deal_type ON houses(deal_type);
    CREATE INDEX IF NOT EXISTS idx_houses_region ON houses(region);
    CREATE INDEX IF NOT EXISTS idx_houses_price ON houses(price);
    CREATE INDEX IF NOT EXISTS idx_houses_coords ON houses(latitude, longitude);
    CREATE INDEX IF NOT EXISTS idx_houses_active ON houses(is_active);
    CREATE INDEX IF NOT EXISTS idx_crm_status ON house_crm(status);
    CREATE INDEX IF NOT EXISTS idx_houses_external ON houses(external_id);
  `);
  
  return schemaSetupPromise;
}
