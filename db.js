// db.js
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const { seedDefaults } = require('./scripts/seed-defaults');

// Chemin DB : Render => /var/data/orderflow.sqlite | Local => ./orderflow.sqlite
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');

// Crée le dossier parent si besoin (utile pour /var/data sur Render)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Ouvre la base
const db = new Database(dbPath);
try { db.pragma('journal_mode = WAL'); } catch (_) {}

console.log(`📦 DB file => ${dbPath}`);

function init() {
  db.exec('PRAGMA foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS boutiques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,            -- slug de la catégorie
      unit TEXT DEFAULT 'pièce',
      default_quantity INTEGER DEFAULT 0,
      is_crude INTEGER DEFAULT 0         -- 0/1 : viennoiserie crue
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      boutique_id INTEGER,
      FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boutique_id INTEGER NOT NULL,
      delivery_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      locked INTEGER NOT NULL DEFAULT 0,
      delivered INTEGER NOT NULL DEFAULT 0,
      received INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      final_quantity INTEGER,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS sales_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      boutique_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      sale_date TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      FOREIGN KEY (boutique_id) REFERENCES boutiques(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS production_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_date TEXT NOT NULL,
      product_id INTEGER NOT NULL,
      final_quantity INTEGER NOT NULL,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );
  `);

  // Ajout de colonne boutique_id si base historique
  try {
    const cols = db.prepare('PRAGMA table_info(users)').all();
    if (!cols.some(c => c.name === 'boutique_id')) {
      db.exec('ALTER TABLE users ADD COLUMN boutique_id INTEGER REFERENCES boutiques(id)');
      console.log('ℹ️ Ajout de users.boutique_id');
    }
  } catch (err) {
    console.error('Vérification users.boutique_id', err);
  }

  seedDefaults(db); // -> crée catégories/produits/boutiques/users si absents
  console.log('✅ Tables initialisées (seed exécuté)');
}

module.exports = { db, init };
