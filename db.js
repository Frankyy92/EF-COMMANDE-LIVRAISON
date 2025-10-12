const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'data', 'app.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

// Init schema
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','labo','boutique')),
  boutique_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS boutiques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  address TEXT
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  category TEXT DEFAULT NULL,
  is_raw INTEGER NOT NULL DEFAULT 0 -- 1 = viennoiserie crue, 0 = pâtisserie finie
);

-- Commandes passées par les boutiques pour J+1
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id INTEGER NOT NULL,
  for_date TEXT NOT NULL, -- date J+1 visée
  created_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft|submitted|locked
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(boutique_id, for_date),
  FOREIGN KEY(boutique_id) REFERENCES boutiques(id),
  FOREIGN KEY(created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Ajustements labo par boutique/produit pour la date
CREATE TABLE IF NOT EXISTS lab_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  for_date TEXT NOT NULL,
  boutique_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  adjusted_qty INTEGER NOT NULL,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(for_date, boutique_id, product_id),
  FOREIGN KEY(boutique_id) REFERENCES boutiques(id),
  FOREIGN KEY(product_id) REFERENCES products(id)
);

-- Ventes réelles (pour suggestions)
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  boutique_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  sold_qty INTEGER NOT NULL,
  sold_date TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Tournées (simple regroupement)
CREATE TABLE IF NOT EXISTS tours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tour_stops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tour_id INTEGER NOT NULL,
  boutique_id INTEGER NOT NULL,
  stop_order INTEGER NOT NULL,
  FOREIGN KEY(tour_id) REFERENCES tours(id),
  FOREIGN KEY(boutique_id) REFERENCES boutiques(id)
);
`);

module.exports = db;
