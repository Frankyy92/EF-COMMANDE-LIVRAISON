// db.js
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { dbPath } = require('./config');

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

module.exports = db;
