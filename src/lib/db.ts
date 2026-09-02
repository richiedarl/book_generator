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

// Pricing defaults
const PURCHASE_TOKEN_PRICE_CENTS = 4900;
const DEFAULT_PURCHASE_USES = 20;
const DEFAULT_EXPIRY_DAYS = 30;

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

export interface AccessToken {
  id: string;
  token: string;
  type: 'purchase' | 'email';
  user_id: string | null;
  email: string | null;
  max_uses: number;
  used_count: number;
  expires_at: number | null;
  created_at: number;
  used: number; // 0 or 1 for email tokens
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

  // Pricing config table — stores token price settings
  db.exec(`
    CREATE TABLE IF NOT EXISTS pricing_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  // Initialize default pricing config
  const priceConfig = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_price_cents');
  if (!priceConfig) {
    db.prepare('INSERT INTO pricing_config (key, value) VALUES (?, ?)').run('purchase_token_price_cents', String(PURCHASE_TOKEN_PRICE_CENTS));
  }

  const usesConfig = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_uses');
  if (!usesConfig) {
    db.prepare('INSERT INTO pricing_config (key, value) VALUES (?, ?)').run('purchase_token_uses', String(DEFAULT_PURCHASE_USES));
  }

  const expiryConfig = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_expiry_days');
  if (!expiryConfig) {
    db.prepare('INSERT INTO pricing_config (key, value) VALUES (?, ?)').run('purchase_token_expiry_days', String(DEFAULT_EXPIRY_DAYS));
  }

  // Access tokens table — tracks purchased and email-generated tokens
  db.exec(`
    CREATE TABLE IF NOT EXISTS access_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      max_uses INTEGER NOT NULL DEFAULT 20,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at INTEGER,
      created_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_access_token ON users(access_token);
    CREATE INDEX IF NOT EXISTS idx_tokens_token ON access_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_tokens_email ON access_tokens(email);
    CREATE INDEX IF NOT EXISTS idx_tokens_expires ON access_tokens(expires_at);
  `);

  // Payments table — tracks revenue from purchase token creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      token_id TEXT NOT NULL,
      user_id TEXT,
      email TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'usd',
      status TEXT NOT NULL DEFAULT 'completed',
      provider TEXT,
      provider_payment_id TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  // Payment indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_token ON payments(token_id);
    CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
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

/**
 * === Payment Tracking ===
 * The platform receives payments through token purchases.
 * When a purchase token is created, a corresponding payment record
 * is stored so the admin can review revenue. Email tokens are not
 * paid, so no payment record is created for them.
 */

export interface Payment {
  id: string;
  token_id: string;
  user_id: string | null;
  email: string | null;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  provider: string | null;
  provider_payment_id: string | null;
  created_at: number;
}

/** Record a payment for a purchase token creation. */
export function createPayment(
  tokenId: string,
  userId: string | null,
  email: string | null,
  amount: number,
  currency: string = 'usd',
  provider: string | null = 'simulated',
  providerPaymentId: string | null = null
): Payment {
  const id = uuidv4();
  const now = Date.now();
  db.prepare(`
    INSERT INTO payments (id, token_id, user_id, email, amount, currency, status, provider, provider_payment_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, tokenId, userId, email, amount, currency, 'completed', provider, providerPaymentId, now);

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment;
}

/** Fetch all payment records, newest first. */
export function getAllPayments(): Payment[] {
  return db.prepare(`
    SELECT * FROM payments ORDER BY created_at DESC
  `).all() as Payment[];
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

// === Access Token Management ===

export function createAccessToken(
  type: 'purchase' | 'email',
  email: string | null = null,
  userId: string | null = null,
  maxUses: number = DEFAULT_PURCHASE_USES,
  expiryDays: number | null = DEFAULT_EXPIRY_DAYS
): AccessToken {
  const id = uuidv4();
  const token = generateAccessToken();
  const now = Date.now();
  const expiresAt = expiryDays ? now + (expiryDays * 24 * 60 * 60 * 1000) : null;

  db.prepare(`
    INSERT INTO access_tokens (id, token, type, user_id, email, max_uses, used_count, expires_at, created_at, used)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0)
  `).run(id, token, type, userId, email, maxUses, expiresAt, now);

  const created = db.prepare('SELECT * FROM access_tokens WHERE id = ?').get(id) as AccessToken;
  return created;
}

export function getAccessToken(token: string): AccessToken | undefined {
  const stmt = db.prepare('SELECT * FROM access_tokens WHERE token = ?');
  return stmt.get(token) as AccessToken | undefined;
}

export function getTokenById(id: string): AccessToken | undefined {
  const stmt = db.prepare('SELECT * FROM access_tokens WHERE id = ?');
  return stmt.get(id) as AccessToken | undefined;
}

export function validateAccessToken(token: string): { valid: boolean; token?: AccessToken; error?: string } {
  const accessToken = getAccessToken(token);

  if (!accessToken) {
    return { valid: false, error: 'Token not found' };
  }

  // Check if email token has already been used
  if (accessToken.type === 'email' && accessToken.used === 1) {
    return { valid: false, error: 'Email token has already been used' };
  }

  // Check if token has exceeded max uses
  if (accessToken.used_count >= accessToken.max_uses) {
    return { valid: false, error: 'Token has reached maximum uses' };
  }

  // Check expiry
  if (accessToken.expires_at && Date.now() > accessToken.expires_at) {
    return { valid: false, error: 'Token has expired' };
  }

  return { valid: true, token: accessToken };
}

export function incrementTokenUsage(token: string): AccessToken | undefined {
  const stmt = db.prepare(`
    UPDATE access_tokens
    SET used_count = used_count + 1,
        used = CASE WHEN type = 'email' THEN 1 ELSE used END
    WHERE token = ?
  `);
  stmt.run(token);

  return getAccessToken(token);
}

export function checkEmailUsed(email: string): boolean {
  const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM access_tokens
    WHERE email = ? AND type = 'email'
  `);
  const result = stmt.get(email) as { count: number };
  return result.count > 0;
}

export function getAllAccessTokens(): AccessToken[] {
  const stmt = db.prepare(`
    SELECT * FROM access_tokens
    ORDER BY created_at DESC
  `);
  return stmt.all() as AccessToken[];
}

export function deleteAccessToken(id: string): boolean {
  const stmt = db.prepare('DELETE FROM access_tokens WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

/** === Pricing Config === */

export interface PricingConfig {
  purchaseTokenPriceCents: number;
  purchaseTokenUses: number;
  purchaseTokenExpiryDays: number;
}

export function getPricingConfig(): PricingConfig {
  const price = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_price_cents') as { value: string } | undefined;
  const uses = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_uses') as { value: string } | undefined;
  const expiry = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_expiry_days') as { value: string } | undefined;

  return {
    purchaseTokenPriceCents: price ? parseInt(price.value, 10) : PURCHASE_TOKEN_PRICE_CENTS,
    purchaseTokenUses: uses ? parseInt(uses.value, 10) : DEFAULT_PURCHASE_USES,
    purchaseTokenExpiryDays: expiry ? parseInt(expiry.value, 10) : DEFAULT_EXPIRY_DAYS,
  };
}

export function setPricingConfig(config: Partial<PricingConfig>) {
  if (config.purchaseTokenPriceCents !== undefined) {
    db.prepare('UPDATE pricing_config SET value = ? WHERE key = ?').run(String(config.purchaseTokenPriceCents), 'purchase_token_price_cents');
  }
  if (config.purchaseTokenUses !== undefined) {
    db.prepare('UPDATE pricing_config SET value = ? WHERE key = ?').run(String(config.purchaseTokenUses), 'purchase_token_uses');
  }
  if (config.purchaseTokenExpiryDays !== undefined) {
    db.prepare('UPDATE pricing_config SET value = ? WHERE key = ?').run(String(config.purchaseTokenExpiryDays), 'purchase_token_expiry_days');
  }
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