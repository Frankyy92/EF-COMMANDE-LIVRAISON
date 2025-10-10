// Fichier seed.js — création des comptes et produits par défaut
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { hashPassword } = require('./utils/auth');

// Récupère le chemin de la base : DB_PATH (ex: /var/data/orderflow.sqlite) ou ./orderflow.sqlite par défaut
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');
const dbDir = path.dirname(dbPath);

// Crée le dossier de la base si nécessaire
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Ouvre ou crée la base SQLite
const db = new Database(dbPath);
console.log(`🗄️ Initialisation de la base de données : ${dbPath}`);

// Création des tables si elles n'existent pas
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    category TEXT,
    unit TEXT,
    default_quantity INTEGER
  )
`).run();

// Comptes utilisateurs par défaut
const users = [
  { name: 'Admin', email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { name: 'Labo', email: 'lab@example.com', password: 'lab123', role: 'labo' },
  { name: 'Boutique Suresnes', email: 'suresnes@example.com', password: 'boutique123', role: 'boutique' },
  { name: 'Boutique Rueil', email: 'rueil@example.com', password: 'boutique123', role: 'boutique' },
  { name: 'Boutique St-Germain', email: 'stgermain@example.com', password: 'boutique123', role: 'boutique' },
  { name: 'Boutique Boulogne', email: 'boulogne@example.com', password: 'boutique123', role: 'boutique' }
];

const insertUser = db.prepare('INSERT OR IGNORE INTO users (name, email, password, role) VALUES (?, ?, ?, ?)');
for (const u of users) {
  const hash = hashPassword(u.password);
  insertUser.run(u.name, u.email, hash, u.role);
}

// Produits par défaut
const products = [
  { name: 'Tarte citron', category: 'pâtisserie', unit: 'pièce', default_quantity: 10 },
  { name: 'Croissant', category: 'viennoiserie', unit: 'pièce', default_quantity: 50 },
  { name: 'Pain au chocolat', category: 'viennoiserie', unit: 'pièce', default_quantity: 50 },
  { name: 'Entremet chocolat', category: 'pâtisserie', unit: 'pièce', default_quantity: 5 }
];

const insertProduct = db.prepare('INSERT OR IGNORE INTO products (name, category, unit, default_quantity) VALUES (?, ?, ?, ?)');
for (const p of products) {
  insertProduct.run(p.name, p.category, p.unit, p.default_quantity);
}

console.log('✅ Données de démo insérées avec succès');

