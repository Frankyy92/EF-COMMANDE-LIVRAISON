const { hashPassword } = require('../utils/auth');
const seedData = require('./seed-data');

function ensureBoutiques(db) {
  const getBoutique = db.prepare('SELECT id FROM boutiques WHERE name = ?');
  const insertBoutique = db.prepare('INSERT INTO boutiques (name) VALUES (?)');
  const ids = new Map();
  seedData.boutiques.forEach(name => {
    let row = getBoutique.get(name);
    if (!row) {
      insertBoutique.run(name);
      row = getBoutique.get(name);
    }
    if (row) {
      ids.set(name, row.id);
    }
  });
  return ids;
}

function ensureCategories(db) {
  const getCategory = db.prepare('SELECT id FROM categories WHERE name = ?');
  const insertCategory = db.prepare('INSERT INTO categories (name) VALUES (?)');
  const ids = new Map();
  seedData.categories.forEach(name => {
    let row = getCategory.get(name);
    if (!row) {
      insertCategory.run(name);
      row = getCategory.get(name);
    }
    if (row) {
      ids.set(name, row.id);
    }
  });
  return ids;
}

function ensureProducts(db, categoryIds) {
  const getProduct = db.prepare('SELECT id FROM products WHERE name = ?');
  const insertProduct = db.prepare('INSERT INTO products (name, category_id, is_crude) VALUES (?, ?, ?)');
  seedData.products.forEach(product => {
    const existing = getProduct.get(product.name);
    if (!existing) {
      const categoryId = categoryIds.get(product.category);
      if (categoryId) {
        insertProduct.run(product.name, categoryId, product.is_crude ? 1 : 0);
      }
    }
  });
}

function ensureUsers(db, boutiqueIds) {
  const getUser = db.prepare('SELECT id FROM users WHERE email = ?');
  const insertUser = db.prepare('INSERT INTO users (email, password, role, boutique_id) VALUES (?, ?, ?, ?)');
  seedData.users.forEach(user => {
    const existing = getUser.get(user.email);
    if (!existing) {
      const hash = hashPassword(user.password);
      const boutiqueId = user.boutique ? boutiqueIds.get(user.boutique) || null : null;
      insertUser.run(user.email, hash, user.role, boutiqueId);
    }
  });
}

function seedDefaults(db) {
  const boutiqueIds = ensureBoutiques(db);
  const categoryIds = ensureCategories(db);
  ensureProducts(db, categoryIds);
  ensureUsers(db, boutiqueIds);
}

module.exports = { seedDefaults };
