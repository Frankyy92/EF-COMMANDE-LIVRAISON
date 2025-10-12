const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Path to the database file. Create data directory if missing.
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
const dbPath = path.join(dataDir, 'app.db');

// Open or create the SQLite database
const db = new Database(dbPath);

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
      is_crude INTEGER NOT NULL DEFAULT 0,
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
      -- Indique si le laboratoire a remis la commande au livreur (0 = non, 1 = oui)
      delivered INTEGER NOT NULL DEFAULT 0,
      -- Indique si la boutique a confirmé la réception de la livraison (0 = non, 1 = oui)
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
}

module.exports = { db, init };