// seed.js
const bcrypt = require('bcrypt');
const db = require('./db');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin','labo','boutique')),
  password_hash TEXT
);

CREATE TABLE IF NOT EXISTS shops (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT
);
`);

const users = [
  { email: 'admin@example.com', name: 'Admin', role: 'admin' },
  { email: 'labo@example.com', name: 'Labo', role: 'labo' },
  { email: 'stgermain@example.com', name: 'Saint-Germain', role: 'boutique' },
  { email: 'suresnes@example.com', name: 'Suresnes', role: 'boutique' },
  { email: 'rueil@example.com', name: 'Rueil', role: 'boutique' },
  { email: 'neuilly@example.com', name: 'Neuilly', role: 'boutique' },
];

const insertUser = db.prepare('INSERT OR IGNORE INTO users (email, name, role, password_hash) VALUES (?,?,?,?)');
for (const u of users) {
  const hash = bcrypt.hashSync('changeme', 10);
  insertUser.run(u.email, u.name, u.role, hash);
}

const shops = [
  { name: 'Boutique Saint-Germain', city: 'Saint-Germain-en-Laye' },
  { name: 'Boutique Suresnes', city: 'Suresnes' },
  { name: 'Boutique Rueil', city: 'Rueil-Malmaison' },
  { name: 'Boutique Neuilly', city: 'Neuilly-sur-Seine' }
];
const insertShop = db.prepare('INSERT OR IGNORE INTO shops (id, name, city) VALUES (NULL, ?, ?)');
for (const s of shops) {
  insertShop.run(s.name, s.city);
}

console.log('Seed done.');
