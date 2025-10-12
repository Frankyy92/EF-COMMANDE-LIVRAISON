// fix-database-script.js
// Idempotent: crée/upgrade le schéma minimal et (re)seed l'admin si absent.
const path = require('path');
const Database = require('better-sqlite3');
const { hashPassword } = require('./utils/auth');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'orderflow.sqlite');
const db = new Database(DB_PATH);

const txn = db.transaction(() => {
  // Schéma minimal requis par l'auth
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'admin',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // Ajout "role" si vieux schéma
  try { db.prepare(`SELECT role FROM users LIMIT 1`).get(); }
  catch { db.prepare(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'`).run(); }

  // Seed / Upgrade admin
  const adminEmail = 'admin@example.com';
  const adminPasswordPlain = 'admin123';
  const existing = db.prepare(`SELECT id, password FROM users WHERE email = ?`).get(adminEmail);

  if (!existing) {
    const hashed = hashPassword(adminPasswordPlain);
    db.prepare(`INSERT INTO users (email, password, role) VALUES (?, ?, 'admin')`).run(adminEmail, hashed);
    console.log(`✅ Admin créé: ${adminEmail} / ${adminPasswordPlain}`);
  } else if (!existing.password || !String(existing.password).startsWith('$2')) {
    const newHash = hashPassword(adminPasswordPlain);
    db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(newHash, existing.id);
    console.log(`♻️  Admin migré vers bcrypt: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin déjà présent (OK)`);
  }
});

try {
  txn();
  console.log(`🏁 Migration/seed terminés (DB: ${DB_PATH})`);
} catch (e) {
  console.error('❌ Erreur migration/seed:', e);
  process.exit(1);
} finally {
  db.close();
}
