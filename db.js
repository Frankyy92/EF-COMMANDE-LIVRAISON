const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const { seedDefaults } = require('./scripts/seed-defaults');

// Chemin de la base : DB_PATH (Render: /var/data/orderflow.sqlite) ou ./orderflow.sqlite en local
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');

// Crée le dossier parent si besoin (utile pour /var/data sur Render)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Ouvre la base
const db = new Database(dbPath);
// Optionnel mais sain pour SQLite en prod légère
try { db.pragma('journal_mode = WAL'); } catch (_) {}

console.log(`📦 DB file => ${dbPath}`);

/**
 * Initialise les tables si elles n'existent pas.
 */
function init() {
  // Activer les contraintes étrangères
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS boutiques (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );
    
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      is_crude BOOLEAN,
      FOREIGN KEY (category_id) REFERENCES categories(id)
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

  // S'assurer que la colonne boutique_id existe (anciennes bases Render)
  try {
    const userColumns = db.prepare('PRAGMA table_info(users)').all();
    const hasBoutiqueId = userColumns.some(col => col.name === 'boutique_id');
    if (!hasBoutiqueId) {
      db.exec('ALTER TABLE users ADD COLUMN boutique_id INTEGER REFERENCES boutiques(id)');
      console.log('ℹ️  Ajout de la colonne manquante users.boutique_id');
    }
  } catch (err) {
    console.error('Erreur lors de la vérification de users.boutique_id', err);
  }

  seedDefaults(db);
  console.log('🔑 Comptes par défaut disponibles :');
  console.log('   - admin@example.com / admin123 (admin)');
  console.log('   - labo@example.com / labo123 (labo)');
  console.log('   - livreur@example.com / livreur123 (livreur)');
  console.log('   - stgermain@example.com / boutique123 (boutique)');
  console.log('   - suresnes@example.com / boutique123 (boutique)');
  console.log('   - rueil@example.com / boutique123 (boutique)');
  console.log('   - neuilly@example.com / boutique123 (boutique)');
  console.log('✅ Tables initialisées');
}

module.exports = { db, init };
