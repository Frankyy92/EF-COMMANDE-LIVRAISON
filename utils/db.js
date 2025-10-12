const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function ensureDB() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      shops: [
        { id: 'neuilly', name: 'EF Neuilly' },
        { id: 'stgermain', name: 'Saint-Germain-en-Laye' },
        { id: 'suresnes', name: 'À Deux Mains - Suresnes' },
        { id: 'rueil', name: 'Rueil' }
      ],
      categories: [
        { id: 'cat-boulangerie', name: 'Boulangerie' },
        { id: 'cat-patisserie', name: 'Pâtisserie' },
        { id: 'cat-boissons', name: 'Boissons' }
      ],
      products: [
        { id: 'prd-baguette', name: 'Baguette', price: 1.2, categoryId: 'cat-boulangerie' },
        { id: 'prd-pain-choco', name: 'Pain au chocolat', price: 1.1, categoryId: 'cat-patisserie' },
        { id: 'prd-cafe', name: 'Café', price: 2.0, categoryId: 'cat-boissons' }
      ],
      orders: []
    };
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
  }
}

function readDB() {
  ensureDB();
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { readDB, writeDB };
