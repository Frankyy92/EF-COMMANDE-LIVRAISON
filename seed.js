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
