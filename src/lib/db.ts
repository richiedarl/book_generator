/**
 * SQLite Database for The Shelf
 * File-based database for user management
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { hash, verify } from '@node-rs/argon2';
import { v4 as uuidv4 } from 'uuid';

const DB_DIR = join(process.cwd(), 'data');
const DB_PATH = join(DB_DIR, 'theshelf.db');

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  is_admin: number;
  access_token: string | null;
  created_at: number;
  updated_at: number;
}

export interface AuthConfig {
  token_required: number;
  jwt_secret: string;
}

// Initialize database tables
export function initializeDatabase() {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      is_admin INTEGER DEFAULT 0,
      access_token TEXT UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Auth config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS auth_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_access_token ON users(access_token);
  `);

  // Initialize default auth config
  const config = db.prepare('SELECT value FROM auth_config WHERE key = ?').get('token_required');
  if (!config) {
    db.prepare('INSERT INTO auth_config (key, value) VALUES (?, ?)').run('token_required', '0');
  }

  const jwtSecret = db.prepare('SELECT value FROM auth_config WHERE key = ?').get('jwt_secret');
  if (!jwtSecret) {
    const secret = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    db.prepare('INSERT INTO auth_config (key, value) VALUES (?, ?)').run('jwt_secret', secret);
  }

  console.log('✅ Database initialized');
}

// Create default admin if none exists
export function ensureDefaultAdmin() {
  try {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get() as { count: number };
    if (adminCount.count === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@theshelf.app';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const adminName = process.env.ADMIN_NAME || 'Admin';

      // Use sync hash for initialization
      const { hash: hashSync } = require('@node-rs/argon2');
      const passwordHash = hashSync(adminPassword, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });

      const id = uuidv4();
      const accessToken = generateAccessToken();
      const now = Date.now();

      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, is_admin, access_token, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, adminEmail.toLowerCase(), adminName, passwordHash, 1, accessToken, now, now);

      console.log(`✅ Default admin created: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Failed to create default admin:', err);
  }
}

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });
}

export async function verifyPassword(password: string, hashStr: string): Promise<boolean> {
  return verify(hashStr, password);
}

export function getAllUsers(): Omit<User, 'password_hash'>[] {
  const stmt = db.prepare('SELECT id, email, name, is_admin, access_token, created_at, updated_at FROM users ORDER BY created_at DESC');
  return stmt.all() as Omit<User, 'password_hash'>[];
}

export function getUserById(id: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function getUserByEmail(email: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email.toLowerCase()) as User | undefined;
}

export function getUserByAccessToken(token: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE access_token = ?');
  return stmt.get(token) as User | undefined;
}

export async function createUser(email: string, password: string, name: string, isAdmin = false): Promise<Omit<User, 'password_hash'>> {
  const existing = getUserByEmail(email);
  if (existing) {
    throw new Error('Email already registered');
  }

  const passwordHash = await hashPassword(password);
  const id = uuidv4();
  const accessToken = isAdmin ? generateAccessToken() : null;
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO users (id, email, name, password_hash, is_admin, access_token, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(id, email.toLowerCase(), name, passwordHash, isAdmin ? 1 : 0, accessToken, now, now);

  return {
    id,
    email: email.toLowerCase(),
    name,
    is_admin: isAdmin ? 1 : 0,
    access_token: accessToken,
    created_at: now,
    updated_at: now,
  };
}

export function generateAccessToken(): string {
  return 'sk-' + Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function updateUser(id: string, updates: Partial<User>): User | null {
  const user = getUserById(id);
  if (!user) return null;

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.email !== undefined) {
    fields.push('email = ?');
    values.push(updates.email.toLowerCase());
  }
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.is_admin !== undefined) {
    fields.push('is_admin = ?');
    values.push(updates.is_admin ? 1 : 0);
  }
  if (updates.access_token !== undefined) {
    fields.push('access_token = ?');
    values.push(updates.access_token);
  }
  if (updates.password_hash !== undefined) {
    fields.push('password_hash = ?');
    values.push(updates.password_hash);
  }

  if (fields.length === 0) return user;

  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);

  const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);

  return getUserById(id)!;
}

export function deleteUser(id: string): boolean {
  const stmt = db.prepare('DELETE FROM users WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = getUserByEmail(email);
  if (!user) return null;

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return null;

  return user;
}

export function getAuthConfig(): AuthConfig {
  const tokenRequired = db.prepare('SELECT value FROM auth_config WHERE key = ?').get('token_required') as { value: string } | undefined;
  const jwtSecret = db.prepare('SELECT value FROM auth_config WHERE key = ?').get('jwt_secret') as { value: string } | undefined;

  return {
    token_required: tokenRequired ? parseInt(tokenRequired.value, 10) : 0,
    jwt_secret: jwtSecret?.value || 'your-super-secret-jwt-key-change-in-production',
  };
}

export function setTokenRequired(required: boolean) {
  db.prepare('UPDATE auth_config SET value = ? WHERE key = ?').run(required ? '1' : '0', 'token_required');
}

export function getJwtSecret(): string {
  const config = getAuthConfig();
  return config.jwt_secret;
}

// Initialize on import
initializeDatabase();

// Create default admin if none exists (only at runtime, not during build)
if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PHASE !== 'phase-production-build') {
  try {
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 1').get() as { count: number };
    if (adminCount.count === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@theshelf.app';
      const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
      const adminName = process.env.ADMIN_NAME || 'Admin';

      // Use sync hash for initialization
      const { hash: hashSync } = require('@node-rs/argon2');
      const passwordHash = hashSync(adminPassword, {
        memoryCost: 19456,
        timeCost: 2,
        outputLen: 32,
        parallelism: 1,
      });

      const id = uuidv4();
      const accessToken = generateAccessToken();
      const now = Date.now();

      db.prepare(`
        INSERT INTO users (id, email, name, password_hash, is_admin, access_token, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, adminEmail.toLowerCase(), adminName, passwordHash, 1, accessToken, now, now);

      console.log(`✅ Default admin created: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Failed to create default admin:', err);
  }
}

export { db };