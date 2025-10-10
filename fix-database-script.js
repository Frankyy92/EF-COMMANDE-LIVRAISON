// Script pour réparer la structure de la base de données
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const { seedDefaults } = require('./scripts/seed-defaults');
const seedData = require('./scripts/seed-data');

// Chemin vers la base de données sur Render
const dbPath = process.env.DB_PATH || path.resolve('./orderflow.sqlite');

console.log(`🔧 Réparation de la base de données : ${dbPath}`);

// Supprimer l'ancienne base si elle existe
if (fs.existsSync(dbPath)) {
  console.log("⚠️ Suppression de l'ancienne base de données...");
  fs.unlinkSync(dbPath);
}

// Créer le dossier parent si nécessaire
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Créer une nouvelle base
const db = new Database(dbPath);

console.log('📦 Création de la nouvelle structure de base de données...');

// Activer les clés étrangères
db.exec('PRAGMA foreign_keys = ON');

// Créer toutes les tables avec la structure correcte
db.exec(`
  -- Table des boutiques
  CREATE TABLE IF NOT EXISTS boutiques (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
  
  -- Table des catégories
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );
  
  -- Table des produits
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    is_crude INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (category_id) REFERENCES categories(id)
  );
  
  -- Table des utilisateurs avec boutique_id
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    boutique_id INTEGER,
    FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
  );
  
  -- Table des commandes
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boutique_id INTEGER NOT NULL,
    delivery_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    locked INTEGER NOT NULL DEFAULT 0,
    delivered INTEGER NOT NULL DEFAULT 0,
    received INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (boutique_id) REFERENCES boutiques(id)
  );
  
  -- Table des lignes de commande
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    final_quantity INTEGER,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
  
  -- Table de l'historique des ventes
  CREATE TABLE IF NOT EXISTS sales_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    boutique_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    sale_date TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (boutique_id) REFERENCES boutiques(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
  );

  -- Table des plans de production
  CREATE TABLE IF NOT EXISTS production_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    delivery_date TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    final_quantity INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id)
  );
`);

console.log('✅ Structure de base de données créée avec succès');

// Insérer les données initiales
console.log('📝 Insertion des données initiales...');
seedDefaults(db);
console.log('✅ Données initiales en place');

// Afficher les statistiques
const stats = {
  boutiques: db.prepare('SELECT COUNT(*) as count FROM boutiques').get().count,
  categories: db.prepare('SELECT COUNT(*) as count FROM categories').get().count,
  products: db.prepare('SELECT COUNT(*) as count FROM products').get().count,
  users: db.prepare('SELECT COUNT(*) as count FROM users').get().count
};

console.log('\n📊 Statistiques de la base de données :');
console.log(`   - ${stats.boutiques} boutiques`);
console.log(`   - ${stats.categories} catégories`);
console.log(`   - ${stats.products} produits`);
console.log(`   - ${stats.users} utilisateurs`);

console.log('\n✨ Base de données réparée avec succès !');
console.log('\n🔑 Comptes de test :');
seedData.users.forEach(user => {
  const label = user.boutique ? `${user.boutique}` : user.role;
  console.log(`   ${label} : ${user.email} / ${user.password}`);
});

db.close();
