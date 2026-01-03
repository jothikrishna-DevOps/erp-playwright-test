import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'data', 'platform.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DB_PATH))) {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
}

let db: sqlite3.Database;

export function getDb(): sqlite3.Database {
  if (!db) {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
      } else {
        console.log('Connected to SQLite database');
      }
    });
  }
  return db;
}

export function dbRun(query: string, params: any[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    getDb().run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function dbGet<T>(query: string, params: any[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    getDb().get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T);
    });
  });
}

export function dbAll<T>(query: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    getDb().all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
}

export async function initDatabase(): Promise<void> {
  const db = getDb();

  // Create tests table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS tests (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      browser TEXT NOT NULL DEFAULT 'chromium',
      description TEXT,
      created_by TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending',
      file_path TEXT,
      version INTEGER NOT NULL DEFAULT 1
    )
  `);
  
  // Add description column if it doesn't exist (for existing databases)
  await dbRun(`
    ALTER TABLE tests ADD COLUMN description TEXT
  `).catch(() => {
    // Column already exists, ignore error
  });

  // Create agents table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      token TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'disconnected',
      last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
      current_test_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_tests_status ON tests(status)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_tests_created_at ON tests(created_at)`);
  await dbRun(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)`);

  console.log('Database schema initialized');
}

