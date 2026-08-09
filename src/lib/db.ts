import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(process.cwd(), 'findhome.db');

// Singleton for dev hot-reload
const globalForDb = globalThis as unknown as { __db?: Database.Database };

function getDb(): Database.Database {
  if (globalForDb.__db) return globalForDb.__db;

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Initialize schema
  db.exec(`
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

  globalForDb.__db = db;
  return db;
}

export const db = getDb();
export default db;
