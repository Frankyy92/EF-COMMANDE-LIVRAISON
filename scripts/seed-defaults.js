// scripts/seed-defaults.js
const { hashPassword } = require('../utils/auth');

function ensureCategory(db, name, slug) {
  db.prepare(`INSERT OR IGNORE INTO categories (name, slug) VALUES (?, ?)`).run(name, slug);
}
function ensureProduct(db, name, categorySlug, unit = 'pièce', defQty = 0, isCrude = 0) {
  db.prepare(`
    INSERT OR IGNORE INTO products (name, category, unit, default_quantity, is_crude)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, categorySlug, unit, defQty, isCrude ? 1 : 0);
}
function ensureBoutique(db, name) {
  db.prepare(`INSERT OR IGNORE INTO boutiques (name) VALUES (?)`).run(name);
}
function ensureUser(db, email, password, role, boutiqueName = null) {
  let boutique_id = null;
  if (boutiqueName) {
    const b = db.prepare(`SELECT id FROM boutiques WHERE name=?`).get(boutiqueName);
    if (b) boutique_id = b.id;
  }
  const hashed = hashPassword(password);
  db.prepare(`
    INSERT OR IGNORE INTO users (email, password, role, boutique_id)
    VALUES (?, ?, ?, ?)
  `).run(email, hashed, role, boutique_id);
}

function seedDefaults(db) {
  // Catégories par défaut (exemples)
  ensureCategory(db, 'Tout', 'tout');
  ensureCategory(db, 'Viennoiseries', 'viennoiseries');
  ensureCategory(db, 'Pâtisseries', 'patisseries');
  ensureCategory(db, 'Sandwichs', 'sandwichs');
  ensureCategory(db, 'Boissons', 'boissons');
  ensureCategory(db, 'Autres', 'autres');

  // Produits exemples
  ensureProduct(db, 'Croissant cru', 'viennoiseries', 'pièce', 20, 1);
  ensureProduct(db, 'Pain au chocolat cru', 'viennoiseries', 'pièce', 20, 1);
  ensureProduct(db, 'Éclair chocolat', 'patisseries', 'pièce', 10, 0);
  ensureProduct(db, 'Tarte citron', 'patisseries', 'pièce', 8, 0);
  ensureProduct(db, 'Coca 33cl', 'boissons', 'bouteille', 24, 0);

  // Boutiques
  ['St-Germain', 'Suresnes', 'Rueil', 'Neuilly'].forEach(ensureBoutique.bind(null, db));

  // Utilisateurs (même si accès public, ça sert pour liaisons/seed et réactivation auth plus tard)
  ensureUser(db, 'admin@example.com',    'admin123',    'admin');
  ensureUser(db, 'labo@example.com',     'labo123',     'labo');
  ensureUser(db, 'livreur@example.com',  'livreur123',  'livreur');
  ensureUser(db, 'stgermain@example.com','boutique123', 'boutique', 'St-Germain');
  ensureUser(db, 'suresnes@example.com', 'boutique123', 'boutique', 'Suresnes');
  ensureUser(db, 'rueil@example.com',    'boutique123', 'boutique', 'Rueil');
  ensureUser(db, 'neuilly@example.com',  'boutique123', 'boutique', 'Neuilly');
}

module.exports = { seedDefaults };
