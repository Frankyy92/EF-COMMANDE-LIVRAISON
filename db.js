// db.js — point d'accès unique à la base (compatible anciens imports)
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Chemin DB commun (Render: /var/data/orderflow.sqlite ; local: ./orderflow.sqlite)
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');

// Crée le dossier parent si besoin
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Ouvre la base
const db = new Database(dbPath);
try { db.pragma('journal_mode = WAL'); } catch (_) {}

console.log(`📦 DB file => ${dbPath}`);

// Fournit une init() no-op pour compat avec app.js (le vrai schéma est géré par fix-database-script.js)
function init() {
  return true;
}

// Export **double** pour compat:
//  - `const { db, init } = require('./db')`
//  - `const db = require('./db')`
module.exports = db;
module.exports.db = db;
module.exports.init = init;
