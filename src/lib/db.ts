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

  const currencyConfig = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_currency');
  if (!currencyConfig) {
    db.prepare('INSERT INTO pricing_config (key, value) VALUES (?, ?)').run('purchase_token_currency', 'ngn');
  }

  // Seed the business account users pay into (editable later from the admin panel)
  const paymentBusiness = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('manual_payment_business_name');
  if (!paymentBusiness) {
    db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run('manual_payment_business_name', 'SALESECO AFRICA LIMITED');
    db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run('manual_payment_account_number', '6611477366');
    db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run('manual_payment_bank_name', 'Moniepoint');
    db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run('manual_payment_provider_name', 'Manual bank transfer');
    db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run(
      'manual_payment_instructions',
      'Make the required transfer to the account below, then submit your payment reference for admin confirmation.'
    );
    db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run('manual_payment_currency', 'ngn');
    db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run('manual_payment_amount', String(PURCHASE_TOKEN_PRICE_CENTS / 100));
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

  // Payments table — tracks both automated and manual (bank transfer) payments.
  // A pending manual payment has no token yet: token_id is filled in only after
  // an admin confirms the transfer and the token is issued.
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      token_id TEXT,
      user_id TEXT,
      payer_name TEXT,
      email TEXT,
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'ngn',
      status TEXT NOT NULL DEFAULT 'completed',
      provider TEXT,
      provider_payment_id TEXT,
      reference TEXT,
      notes TEXT,
      confirmed_at INTEGER,
      confirmed_by TEXT,
      token_delivery_status TEXT,
      created_at INTEGER NOT NULL
    )
  `);

  migratePaymentsTable();

  // Payment indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_payments_token ON payments(token_id);
    CREATE INDEX IF NOT EXISTS idx_payments_email ON payments(email);
    CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at);
    CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
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
 * Bring an older `payments` table up to the manual-payment schema.
 * Older installs declared `token_id TEXT NOT NULL` and are missing the
 * confirmation / delivery columns, which makes pending manual payments
 * impossible to insert. SQLite cannot relax NOT NULL with ALTER, so when
 * that is detected the table is rebuilt in place with its data preserved.
 */
function migratePaymentsTable() {
  const columns = db.prepare('PRAGMA table_info(payments)').all() as {
    name: string;
    notnull: number;
  }[];

  if (columns.length === 0) return;

  const tokenIdColumn = columns.find((column) => column.name === 'token_id');
  const needsRebuild = !!tokenIdColumn && tokenIdColumn.notnull === 1;

  if (needsRebuild) {
    db.exec('ALTER TABLE payments RENAME TO payments_legacy');
    db.exec(`
      CREATE TABLE payments (
        id TEXT PRIMARY KEY,
        token_id TEXT,
        user_id TEXT,
        payer_name TEXT,
        email TEXT,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'ngn',
        status TEXT NOT NULL DEFAULT 'completed',
        provider TEXT,
        provider_payment_id TEXT,
        reference TEXT,
        notes TEXT,
        confirmed_at INTEGER,
        confirmed_by TEXT,
        token_delivery_status TEXT,
        created_at INTEGER NOT NULL
      )
    `);
    db.exec(`
      INSERT INTO payments (
        id, token_id, user_id, payer_name, email, amount, currency, status,
        provider, provider_payment_id, created_at
      )
      SELECT
        id, token_id, user_id, NULL, email, amount, currency, status,
        provider, provider_payment_id, created_at
      FROM payments_legacy
    `);
    db.exec('DROP TABLE payments_legacy');
    console.log('✅ Payments table migrated to manual-payment schema');
  }

  // Add any columns introduced after the table was first created.
  const addedColumns: Array<{ name: string; definition: string }> = [
    { name: 'reference', definition: 'TEXT' },
    { name: 'payer_name', definition: 'TEXT' },
    { name: 'notes', definition: 'TEXT' },
    { name: 'confirmed_at', definition: 'INTEGER' },
    { name: 'confirmed_by', definition: 'TEXT' },
    { name: 'token_delivery_status', definition: 'TEXT' },
  ];

  const existingNames = new Set(
    (db.prepare('PRAGMA table_info(payments)').all() as { name: string }[]).map((c) => c.name)
  );

  for (const column of addedColumns) {
    if (!existingNames.has(column.name)) {
      db.exec(`ALTER TABLE payments ADD COLUMN ${column.name} ${column.definition}`);
    }
  }
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
  token_id: string | null;
  user_id: string | null;
  payer_name: string | null;
  email: string | null;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'rejected';
  provider: string | null;
  provider_payment_id: string | null;
  reference: string | null;
  notes: string | null;
  confirmed_at: number | null;
  confirmed_by: string | null;
  token_delivery_status: string | null;
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

export interface ManualPaymentConfig {
  businessName: string;
  accountNumber: string;
  bankName: string;
  providerName: string;
  instructions: string;
  /** Amount the user must transfer, in the major currency unit (e.g. 4900 NGN). */
  amount: number;
  currency: 'ngn' | 'usd';
}

const DEFAULT_PAYMENT_CONFIG: ManualPaymentConfig = {
  businessName: 'SALESECO AFRICA LIMITED',
  accountNumber: '6611477366',
  bankName: 'Moniepoint',
  providerName: 'Manual bank transfer',
  instructions: 'Make the required transfer to the account below, then submit your payment reference for admin confirmation.',
  amount: PURCHASE_TOKEN_PRICE_CENTS / 100,
  currency: 'ngn',
};

function getConfigValue(key: string, fallback = ''): string {
  const row = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value ?? fallback;
}

function setConfigValue(key: string, value: string) {
  db.prepare('INSERT OR REPLACE INTO pricing_config (key, value) VALUES (?, ?)').run(key, value);
}

export function getManualPaymentConfig(): ManualPaymentConfig {
  const currency = getConfigValue('manual_payment_currency', DEFAULT_PAYMENT_CONFIG.currency);

  return {
    businessName: getConfigValue('manual_payment_business_name', DEFAULT_PAYMENT_CONFIG.businessName),
    accountNumber: getConfigValue('manual_payment_account_number', DEFAULT_PAYMENT_CONFIG.accountNumber),
    bankName: getConfigValue('manual_payment_bank_name', DEFAULT_PAYMENT_CONFIG.bankName),
    providerName: getConfigValue('manual_payment_provider_name', DEFAULT_PAYMENT_CONFIG.providerName),
    instructions: getConfigValue('manual_payment_instructions', DEFAULT_PAYMENT_CONFIG.instructions),
    amount: parseFloat(getConfigValue('manual_payment_amount', String(DEFAULT_PAYMENT_CONFIG.amount))),
    currency: currency === 'usd' ? 'usd' : 'ngn',
  };
}

export function setManualPaymentConfig(config: Partial<ManualPaymentConfig>) {
  if (config.businessName !== undefined) setConfigValue('manual_payment_business_name', config.businessName);
  if (config.accountNumber !== undefined) setConfigValue('manual_payment_account_number', config.accountNumber);
  if (config.bankName !== undefined) setConfigValue('manual_payment_bank_name', config.bankName);
  if (config.providerName !== undefined) setConfigValue('manual_payment_provider_name', config.providerName);
  if (config.instructions !== undefined) setConfigValue('manual_payment_instructions', config.instructions);
  if (config.amount !== undefined) setConfigValue('manual_payment_amount', String(config.amount));
  if (config.currency !== undefined) setConfigValue('manual_payment_currency', config.currency);
}

/**
 * The business account details users pay into. These live in the database so
 * an administrator can change them from the admin panel without a code change.
 * The defaults below are only used on a brand new install.
 */
export const PAYMENT_CONFIG_FALLBACK: ManualPaymentConfig = DEFAULT_PAYMENT_CONFIG;

export function createPendingManualPayment(
  userId: string | null,
  payerName: string,
  email: string,
  amount: number,
  currency: string,
  reference: string | null,
  notes: string | null
): Payment {
  const id = uuidv4();
  const now = Date.now();
  db.prepare(`
    INSERT INTO payments (
      id, token_id, user_id, payer_name, email, amount, currency, status, provider,
      provider_payment_id, reference, notes, token_delivery_status, created_at
    )
    VALUES (?, NULL, ?, ?, ?, ?, ?, 'pending', 'manual', NULL, ?, ?, 'pending_confirmation', ?)
  `).run(id, userId, payerName, email.toLowerCase(), amount, currency, reference, notes, now);

  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment;
}

export function getPaymentsForUser(userId: string | null, email: string): Payment[] {
  return db.prepare(`
    SELECT * FROM payments
    WHERE (user_id IS NOT NULL AND user_id = ?) OR lower(email) = lower(?)
    ORDER BY created_at DESC
  `).all(userId, email) as Payment[];
}

export function getPaymentById(id: string): Payment | undefined {
  return db.prepare('SELECT * FROM payments WHERE id = ?').get(id) as Payment | undefined;
}

export function updatePaymentStatus(
  id: string,
  status: 'completed' | 'pending' | 'failed' | 'rejected',
  updates: Partial<Pick<Payment, 'token_id' | 'confirmed_at' | 'confirmed_by' | 'token_delivery_status' | 'notes'>> = {}
): Payment | undefined {
  const fields = ['status = ?'];
  const values: any[] = [status];

  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(value);
  }

  values.push(id);
  db.prepare(`UPDATE payments SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getPaymentById(id);
}

/** Fetch all payment records, newest first. */
export function getAllPayments(): Payment[] {
  return db.prepare(`
    SELECT * FROM payments ORDER BY created_at DESC
  `).all() as Payment[];
}

/** Payment submissions awaiting an admin decision, oldest first. */
export function getPendingPayments(): Payment[] {
  return db.prepare(`
    SELECT * FROM payments WHERE status = 'pending' ORDER BY created_at ASC
  `).all() as Payment[];
}

/** Link an issued token to its payment and mark the payment complete. */
export function confirmPayment(
  paymentId: string,
  tokenId: string,
  adminId: string,
  adminName: string
): Payment | undefined {
  return updatePaymentStatus(paymentId, 'completed', {
    token_id: tokenId,
    confirmed_at: Date.now(),
    confirmed_by: `${adminName} <${adminId}>`,
    token_delivery_status: 'pending_delivery',
  });
}

/** Reject a submission: the transfer could not be verified. */
export function rejectPayment(paymentId: string, adminId: string, adminName: string): Payment | undefined {
  return updatePaymentStatus(paymentId, 'rejected', {
    confirmed_at: Date.now(),
    confirmed_by: `${adminName} <${adminId}>`,
    token_delivery_status: 'not_applicable',
  });
}

/** Where a payment's token delivery currently stands. */
export type TokenDeliveryStatus =
  | 'pending_confirmation'
  | 'pending_delivery'
  | 'delivered'
  | 'failed'
  | 'manual'
  | 'not_applicable';

/** Record the outcome of attempting to deliver a token by email. */
export function setTokenDeliveryStatus(
  paymentId: string,
  status: TokenDeliveryStatus,
  note?: string
): Payment | undefined {
  const existing = getPaymentById(paymentId);
  if (!existing) return undefined;

  const notes = note ? [existing.notes, note].filter(Boolean).join('\n') : existing.notes;
  return updatePaymentStatus(paymentId, existing.status, {
    token_delivery_status: status,
    notes,
  });
}

/** Find the payment row that owns a given access token. */
export function getPaymentByTokenId(tokenId: string): Payment | undefined {
  return db.prepare('SELECT * FROM payments WHERE token_id = ?').get(tokenId) as Payment | undefined;
}

/** True when this user/email already has a submission awaiting confirmation. */
export function hasPendingPayment(email: string): boolean {
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM payments
    WHERE lower(email) = lower(?) AND status = 'pending'
  `).get(email) as { count: number };

  return row.count > 0;
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
  purchaseTokenCurrency: 'ngn' | 'usd';
  purchaseTokenUses: number; // 0 or negative means infinite
  purchaseTokenExpiryDays: number;
}

export function getPricingConfig(): PricingConfig {
  const price = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_price_cents') as { value: string } | undefined;
  const currency = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_currency') as { value: string } | undefined;
  const uses = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_uses') as { value: string } | undefined;
  const expiry = db.prepare('SELECT value FROM pricing_config WHERE key = ?').get('purchase_token_expiry_days') as { value: string } | undefined;

  return {
    purchaseTokenPriceCents: price ? parseInt(price.value, 10) : PURCHASE_TOKEN_PRICE_CENTS,
    purchaseTokenCurrency: (currency?.value as 'ngn' | 'usd') || 'ngn',
    purchaseTokenUses: uses ? parseInt(uses.value, 10) : DEFAULT_PURCHASE_USES,
    purchaseTokenExpiryDays: expiry ? parseInt(expiry.value, 10) : DEFAULT_EXPIRY_DAYS,
  };
}

export function setPricingConfig(config: Partial<PricingConfig>) {
  if (config.purchaseTokenPriceCents !== undefined) {
    db.prepare('UPDATE pricing_config SET value = ? WHERE key = ?').run(String(config.purchaseTokenPriceCents), 'purchase_token_price_cents');
  }
  if (config.purchaseTokenCurrency !== undefined) {
    db.prepare('UPDATE pricing_config SET value = ? WHERE key = ?').run(config.purchaseTokenCurrency, 'purchase_token_currency');
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
