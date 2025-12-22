import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema';

let db: ReturnType<typeof drizzle> | null = null;
let sqlite: Database.Database | null = null;

export function initDatabase(): ReturnType<typeof drizzle> {
  if (db) return db;

  // Get the user data path for persistent storage
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'drift.db');

  console.log('Database path:', dbPath);

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Create SQLite connection
  sqlite = new Database(dbPath);

  // Enable foreign keys
  sqlite.pragma('journal_mode = WAL');

  // Create Drizzle instance
  db = drizzle(sqlite, { schema });

  // Run migrations / create tables
  createTables();

  // Initialize default settings if needed
  initializeSettings();

  return db;
}

function createTables() {
  if (!sqlite) return;

  // Create tasks table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      priority TEXT,
      category TEXT,
      due_date INTEGER,
      due_time TEXT,
      recurrence TEXT DEFAULT 'none',
      recurrence_interval INTEGER DEFAULT 1,
      recurrence_days TEXT,
      recurrence_end_date INTEGER,
      last_notified_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      series_id TEXT,
      estimated_duration INTEGER,
      difficulty TEXT,
      focus_date TEXT,
      focus_order INTEGER
    )
  `);

  // Create nudges table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS nudges (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      task_ids TEXT,
      created_at INTEGER NOT NULL,
      dismissed INTEGER DEFAULT 0
    )
  `);

  // Simple migration for series_id if it doesn't exist
  try {
    sqlite.exec('ALTER TABLE tasks ADD COLUMN series_id TEXT;');
    console.log('Migrated tasks table: added series_id');
  } catch (e: any) {
    // Ignore error if column exists
    if (!e.message.includes('duplicate column name')) {
      // Log other errors
      // console.error('Migration note:', e.message);
    }
  }

  // Migration: Add notes column if it doesn't exist (for existing DBs)
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN notes TEXT`);
    console.log('Added notes column to tasks table');
  } catch {
    // Column already exists, ignore
  }

  // Migration: Focus Mode fields
  try {
    sqlite.exec('ALTER TABLE tasks ADD COLUMN estimated_duration INTEGER');
    sqlite.exec('ALTER TABLE tasks ADD COLUMN difficulty TEXT');
    sqlite.exec('ALTER TABLE tasks ADD COLUMN focus_date TEXT');
    sqlite.exec('ALTER TABLE tasks ADD COLUMN focus_order INTEGER');
    console.log('Added focus mode columns to tasks table');
  } catch {
    // Columns exist
  }

  // Migration: Add due_time column
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN due_time TEXT`);
    console.log('Added due_time column');
  } catch {
    // Column already exists
  }

  // Migration: Add recurrence columns
  try {
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN recurrence TEXT DEFAULT 'none'`);
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN recurrence_interval INTEGER DEFAULT 1`);
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN recurrence_days TEXT`);
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN recurrence_end_date INTEGER`);
    sqlite.exec(`ALTER TABLE tasks ADD COLUMN last_notified_at INTEGER`);
    console.log('Added recurrence columns');
  } catch {
    // Columns already exist
  }

  // Create settings table  
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      ai_provider TEXT NOT NULL DEFAULT 'anthropic',
      api_key TEXT,
      theme TEXT NOT NULL DEFAULT 'dark',
      morning_checkin_time TEXT NOT NULL DEFAULT '09:00',
      midday_checkin_time TEXT NOT NULL DEFAULT '13:00',
      notifications_enabled INTEGER NOT NULL DEFAULT 1
    )
  `);

  console.log('Database tables created/verified');
}

function initializeSettings() {
  if (!sqlite) return;

  // Check if settings row exists
  const existing = sqlite.prepare('SELECT id FROM settings WHERE id = 1').get();

  if (!existing) {
    // Insert default settings
    sqlite.prepare(`
      INSERT INTO settings (id, ai_provider, theme, morning_checkin_time, midday_checkin_time, notifications_enabled)
      VALUES (1, 'anthropic', 'dark', '09:00', '13:00', 1)
    `).run();
    console.log('Default settings initialized');
  }
}

export function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
    db = null;
    console.log('Database closed');
  }
}
