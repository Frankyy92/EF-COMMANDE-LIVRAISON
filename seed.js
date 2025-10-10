// Script de seed manuel : garantit que la structure et les comptes par défaut sont présents
const path = require('path');
const { db, init } = require('./db');
const seedData = require('./scripts/seed-data');

const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');
console.log(`🗄️ Base ciblée : ${dbPath}`);

init();

const stats = {
  boutiques: db.prepare('SELECT COUNT(*) AS c FROM boutiques').get().c,
  categories: db.prepare('SELECT COUNT(*) AS c FROM categories').get().c,
  products: db.prepare('SELECT COUNT(*) AS c FROM products').get().c,
  users: db.prepare('SELECT COUNT(*) AS c FROM users').get().c
};

console.log('\n📊 Statistiques après seed :');
Object.entries(stats).forEach(([key, value]) => {
  console.log(`   - ${key} : ${value}`);
});

console.log('\n🔑 Comptes disponibles :');
seedData.users.forEach(user => {
  const label = user.boutique ? user.boutique : user.role;
  console.log(`   ${label} → ${user.email} / ${user.password}`);
});

if (typeof db.close === 'function') {
  db.close();
}
// Script de peuplement initial de la base de données
const { db, init } = require('./db');
const { hashPassword } = require('./utils/auth');

// Initialise le schéma (tables + contraintes)
init();

console.log('🗄️ Réinitialisation des données de démonstration...');

db.exec(`
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM production_plans;
  DELETE FROM sales_history;
  DELETE FROM users;
  DELETE FROM products;
  DELETE FROM categories;
  DELETE FROM boutiques;
`);

// --- Boutiques ---
const boutiquesData = [
  'Boutique Suresnes',
  'Boutique Rueil',
  'Boutique St-Germain',
  'Boutique Boulogne'
];

const boutiqueIds = new Map();
const insertBoutique = db.prepare('INSERT INTO boutiques (name) VALUES (?)');
for (const name of boutiquesData) {
  const result = insertBoutique.run(name);
  boutiqueIds.set(name, result.lastInsertRowid);
}

// --- Catégories ---
const categoriesData = ['Pâtisserie', 'Viennoiserie', 'Boulangerie'];
const categoryIds = new Map();
const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
for (const name of categoriesData) {
  const result = insertCategory.run(name);
  categoryIds.set(name, result.lastInsertRowid);
}

// --- Produits ---
const productsData = [
  { name: 'Tarte citron', category: 'Pâtisserie', is_crude: 0 },
  { name: 'Entremet chocolat', category: 'Pâtisserie', is_crude: 0 },
  { name: 'Croissant', category: 'Viennoiserie', is_crude: 0 },
  { name: 'Pain au chocolat', category: 'Viennoiserie', is_crude: 0 },
  { name: 'Pâte à croissant', category: 'Boulangerie', is_crude: 1 }
];

const insertProduct = db.prepare(
  'INSERT INTO products (name, category_id, is_crude) VALUES (?, ?, ?)' 
);
for (const product of productsData) {
  const categoryId = categoryIds.get(product.category);
  insertProduct.run(product.name, categoryId, product.is_crude ? 1 : 0);
}

// --- Utilisateurs ---
const usersData = [
  { email: 'admin@example.com', password: 'admin123', role: 'admin' },
  { email: 'lab@example.com', password: 'lab123', role: 'labo' },
  { email: 'livreur@example.com', password: 'livreur123', role: 'livreur' },
  { email: 'suresnes@example.com', password: 'boutique123', role: 'boutique', boutique: 'Boutique Suresnes' },
  { email: 'rueil@example.com', password: 'boutique123', role: 'boutique', boutique: 'Boutique Rueil' },
  { email: 'stgermain@example.com', password: 'boutique123', role: 'boutique', boutique: 'Boutique St-Germain' },
  { email: 'boulogne@example.com', password: 'boutique123', role: 'boutique', boutique: 'Boutique Boulogne' }
];

const insertUser = db.prepare(
  'INSERT INTO users (email, password, role, boutique_id) VALUES (?, ?, ?, ?)' 
);
for (const user of usersData) {
  const boutiqueId = user.boutique ? boutiqueIds.get(user.boutique) : null;
  insertUser.run(user.email, hashPassword(user.password), user.role, boutiqueId);
}

console.log('✅ Données de démonstration insérées avec succès.');
