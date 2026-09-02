/**
 * One-off script to update the admin user's password in the SQLite database.
 *
 * Usage:
 *   node scripts/update-admin-password.js
 *
 * The new password is read from ADMIN_PASSWORD in .env.local.
 * If .env.local does not set ADMIN_PASSWORD, a fallback is used.
 */

const Database = require('better-sqlite3');
const { hash: hashSync } = require('@node-rs/argon2');
const { join } = require('path');
const { existsSync } = require('fs');

const DB_PATH = join(__dirname, '..', 'data', 'theshelf.db');

// Minimal .env.local parser (no dependencies)
function loadEnv() {
  const envPath = join(__dirname, '..', '.env.local');
  if (!existsSync(envPath)) return {};
  const raw = require('fs').readFileSync(envPath, 'utf-8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let val = trimmed.slice(eq + 1).trim();
    // strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

const { v4: uuidv4 } = require('uuid');

async function main() {
  if (!existsSync(DB_PATH)) {
    console.error('❌ Database not found at', DB_PATH);
    console.error('   Start the dev server once (npm run dev) to initialise it.');
    process.exit(1);
  }

  const db = new Database(DB_PATH);

  const env = loadEnv();
  const email = env.ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@theshelf.app';
  const newPassword = env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || 'admin123';
  const name = env.ADMIN_NAME || process.env.ADMIN_NAME || 'Admin';

  // Look up the existing admin user
  const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  const passwordHash = await hashSync(newPassword, {
    memoryCost: 19456,
    timeCost: 2,
    outputLen: 32,
    parallelism: 1,
  });

  if (!existing) {
    console.log('⚠️ No user with email', email, 'found — creating a fresh admin.');
    const id = uuidv4();
    const now = Date.now();
    db.prepare(`
      INSERT INTO users (id, email, name, password_hash, is_admin, access_token, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, email.toLowerCase(), name, passwordHash, 1, null, now, now);
    console.log('✅ Admin user created:', email);
    console.log('   Password:', newPassword);
    db.close();
    return;
  }

  db.prepare('UPDATE users SET password_hash = ?, is_admin = 1, updated_at = ? WHERE id = ?')
    .run(passwordHash, Date.now(), existing.id);

  console.log('✅ Admin password updated for:', email);
  console.log('   New password:', newPassword);
  if (existing.is_admin !== 1) {
    console.log('   (Also promoted this user to admin)');
  }
  db.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
