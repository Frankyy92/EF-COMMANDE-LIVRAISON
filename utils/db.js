// db.js — point d'accès unique à la base
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Chemin de la base : DB_PATH (ex: /var/data/orderflow.sqlite) sinon ./orderflow.sqlite en local
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');

// Crée le dossier parent si besoin (utile pour /var/data sur Render)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Ouvre la base
const db = new Database(dbPath);
try { db.pragma('journal_mode = WAL'); } catch (_) {}

console.log(`📦 DB file => ${dbPath}`);

module.exports = db;
