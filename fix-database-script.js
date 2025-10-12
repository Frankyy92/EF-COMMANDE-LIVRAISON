// fix-database-script.js
// Migration/seed idempotent : crée/upgrade le schéma et s'assure des données minimales.
const path = require('path');
const Database = require('better-sqlite3');
const { hashPassword } = require('./utils/auth');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'orderflow.sqlite');
const db = new Database(DB_PATH);

// Helpers
function tableExists(name) {
  const row = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(name);
  return !!row;
}
function columnExists(table, col) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === col);
}
function ensureColumn(table, ddl) {
  // ddl ex: "ALTER TABLE users ADD COLUMN boutique_id INTEGER"
  const colName = ddl.split('ADD COLUMN')[1].trim().split(/\s+/)[0].replace(/["`]/g, '');
  if (!columnExists(table, colName)) {
    db.prepare(ddl).run();
    console.log(`🧩 Colonne ajoutée: ${table}.${colName}`);
  }
}

// Wrap transaction
const txn = db.transaction(() => {
  // 1) USERS (auth)
  if (!tableExists('users')) {
    db.prepare(`
      CREATE TABLE users (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        email       TEXT UNIQUE NOT NULL,
        password    TEXT NOT NULL,
        role        TEXT NOT NULL DEFAULT 'admin',
        boutique_id INTEGER,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    console.log('🆕 Table créée: users');
  } else {
    // Colonnes manquantes à garantir
    if (!columnExists('users', 'role')) {
      db.prepare(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'admin'`).run();
      console.log('🧩 Colonne ajoutée: users.role');
    }
    if (!columnExists('users', 'boutique_id')) {
      db.prepare(`ALTER TABLE users ADD COLUMN boutique_id INTEGER`).run();
      console.log('🧩 Colonne ajoutée: users.boutique_id');
    }
  }

  // 2) BOUTIQUES
  if (!tableExists('boutiques')) {
    db.prepare(`
      CREATE TABLE boutiques (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        address     TEXT,
        city        TEXT,
        phone       TEXT,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    console.log('🆕 Table créée: boutiques');

    // Seed boutique par défaut
    db.prepare(`INSERT INTO boutiques (name, city) VALUES (?, ?)`)
      .run('À deux mains', 'Suresnes');
    console.log('🌱 Boutique par défaut: À deux mains (Suresnes)');
  }

  // 3) CATEGORIES
  if (!tableExists('categories')) {
    db.prepare(`
      CREATE TABLE categories (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT UNIQUE NOT NULL,
        created_at  TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `).run();
    console.log('🆕 Table créée: categories');
    db.prepare(`INSERT INTO categories (name) VALUES (?)`).run('Général');
    console.log('🌱 Catégorie par défaut: Général');
  }

  // 4) PRODUCTS
  if (!tableExists('products')) {
    db.prepare(`
      CREATE TABLE products (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT NOT NULL,
        category_id  INTEGER,
        price_cents  INTEGER NOT NULL DEFAULT 0,
        sku          TEXT,
        active       INTEGER NOT NULL DEFAULT 1,
        created_at   TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `).run();
    console.log('🆕 Table créée: products');

    // Seed produit de test
    const cat = db.prepare(`SELECT id FROM categories WHERE name = ?`).get('Général');
    db.prepare(`INSERT INTO products (name, category_id, price_cents, sku, active) VALUES (?,?,?,?,1)`)
      .run('Produit démo', cat ? cat.id : null, 100, 'DEMO-001');
    console.log('🌱 Produit par défaut: Produit démo');
  }

  // 5) Raccrocher l'admin à une boutique par défaut si vide
  const adminEmail = 'admin@example.com';
  const adminPasswordPlain = 'admin123';
  const admin = db.prepare(`SELECT id, password, boutique_id FROM users WHERE email = ?`).get(adminEmail);

  if (!admin) {
    const hashed = hashPassword(adminPasswordPlain);
    const b = db.prepare(`SELECT id FROM boutiques ORDER BY id ASC LIMIT 1`).get();
    db.prepare(`INSERT INTO users (email, password, role, boutique_id) VALUES (?, ?, 'admin', ?)`)
      .run(adminEmail, hashed, b ? b.id : null);
    console.log(`✅ Admin créé: ${adminEmail} / ${adminPasswordPlain}`);
  } else {
    // Migrer hash legacy => bcrypt si nécessaire
    if (!admin.password || !String(admin.password).startsWith('$2')) {
      const newHash = hashPassword(adminPasswordPlain);
      db.prepare(`UPDATE users SET password = ? WHERE id = ?`).run(newHash, admin.id);
      console.log(`♻️  Admin migré vers bcrypt: ${adminEmail}`);
    }
    // Renseigner boutique_id si null
    if (admin.boutique_id == null) {
      const b = db.prepare(`SELECT id FROM boutiques ORDER BY id ASC LIMIT 1`).get();
      if (b) {
        db.prepare(`UPDATE users SET boutique_id = ? WHERE id = ?`).run(b.id, admin.id);
        console.log('🔗 Admin rattaché à la boutique par défaut');
      }
    }
    console.log('ℹ️  Admin déjà présent (OK)');
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
