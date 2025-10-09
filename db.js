// db.js — point d'accès unique à la base (CommonJS)
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Chemin de la base : DB_PATH (Render: /var/data/orderflow.sqlite) ou ./orderflow.sqlite en local
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');

// Crée le dossier parent si besoin (utile pour /var/data sur Render)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Ouvre la base
const db = new Database(dbPath);
// Optionnel mais sain pour SQLite en prod légère
try { db.pragma('journal_mode = WAL'); } catch (_) {}

console.log(`📦 DB file => ${dbPath}`);

// 🔧 Compatibilité : certaines versions appellent encore db.init() au démarrage.
// On fournit une fonction vide pour ne pas casser l'app si l'appel existe.
db.init = () => true;

module.exports = db;
