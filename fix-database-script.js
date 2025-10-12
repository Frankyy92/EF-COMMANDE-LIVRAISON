// fix-database-script.js
// Idempotent: crée/upgrade le schéma et (re)seed l'admin si absent.

const path = require('path');
const Database = require('better-sqlite3');
const { hashPassword } = require('./utils/auth');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'orderflow.sqlite');

// Ouvre / crée la base
const db = new Database(DB_PATH);

// Wrap dans une transaction pour éviter les états partiels
const txn = db.transaction(() => {
  // 1) Créer les tables minimales (ajuste si tu as d'autres tables)
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'admin',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `).run();

  // 2) (Optionnel) migrations simples : s'assurer que certaines colonnes existent
  // Exemple: si la colonne role n'existait pas
  try {
    db.prepare(`SELECT role FROM users LIMIT 1`).get();
  } catch {
    db.prepare(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'`).run();
  }

  // 3) S'assurer de l'admin par défaut
  const adminEmail = 'admin@example.com';
  const adminPasswordPlain = 'admin123';

  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(adminEmail);

  if (!existing) {
    const hashed = hashPassword(adminPasswordPlain); // bcrypt
    db.prepare(
      `INSERT INTO users (email, password, role) VALUES (?, ?, ?)`
    ).run(adminEmail, hashed, 'admin');
    console.log(`✅ Admin seedé: ${adminEmail} / ${adminPasswordPlain}`);
  } else {
    // Vérifier que le hash est bien au format bcrypt; si legacy, on le remplace par du bcrypt.
    const row = db.prepare(`SELECT id, password FROM users WHERE email = ?`).get(adminEmail);
    if (row && typeof row.password === 'string' && !row.password.startsWith('$2')) {
      const newHash = hashPassword(adminPasswordPlain);
      db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(newHash, row.id);
      console.log(`♻️  Admin mis à niveau vers bcrypt: ${adminEmail}`);
    } else {
      console.log(`ℹ️  Admin déjà présent (OK)`);
    }
  }

  // 4) (Facultatif) Ajoute ici d'autres seeds indispensables à ton app :
  // ex: tables produits, magasins, etc. Laisse tel quel si non nécessaire.
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
