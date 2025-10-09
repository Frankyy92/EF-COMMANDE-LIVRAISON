// db.js — unique point d'accès à la base
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Même chemin pour TOUT (app + seed) : DB_PATH si défini, sinon ./orderflow.sqlite
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');

// Crée le dossier parent si besoin (utile pour /var/data sur Render)
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Ouvre la base
const db = new Database(dbPath);

// Petit log utile au démarrage pour vérifier le fichier utilisé
console.log(`📦 DB file => ${dbPath}`);

module.exports = db;
