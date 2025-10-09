const express = require('express');
const { hashPassword } = require('../utils/auth');
const { db } = require('../db');

const router = express.Router();

// Tableau de bord admin
router.get('/', (req, res) => {
  res.render('admin/dashboard');
});

/* ----- Catégories ----- */
router.get('/categories', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('admin/categories', { categories });
});

router.get('/categories/new', (req, res) => {
  res.render('admin/category_form', { category: null, error: null });
});

router.post('/categories/new', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.render('admin/category_form', { category: null, error: 'Le nom est requis.' });
  }
  try {
    db.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim());
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    res.render('admin/category_form', { category: null, error: 'Erreur lors de la création.' });
  }
});

router.get('/categories/:id/edit', (req, res) => {
  const id = req.params.id;
  const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
  if (!category) return res.sendStatus(404);
  res.render('admin/category_form', { category, error: null });
});

router.post('/categories/:id/edit', (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  if (!name || !name.trim()) {
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    return res.render('admin/category_form', { category, error: 'Le nom est requis.' });
  }
  try {
    db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(name.trim(), id);
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.render('admin/category_form', { category, error: 'Erreur lors de la mise à jour.' });
  }
});

router.post('/categories/:id/delete', (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.redirect('/admin/categories');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la suppression');
  }
});

/* ----- Produits ----- */
router.get('/products', (req, res) => {
  const products = db
    .prepare(
      `SELECT p.*, c.name AS category_name FROM products p
       JOIN categories c ON p.category_id = c.id
       ORDER BY c.name, p.name`
    )
    .all();
  res.render('admin/products', { products });
});

router.get('/products/new', (req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('admin/product_form', { product: null, categories, error: null });
});

router.post('/products/new', (req, res) => {
  const { name, category_id, is_crude } = req.body;
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  if (!name || !category_id) {
    return res.render('admin/product_form', {
      product: null,
      categories,
      error: 'Nom et catégorie obligatoires.'
    });
  }
  try {
    db.prepare('INSERT INTO products (name, category_id, is_crude) VALUES (?, ?, ?)').run(
      name.trim(),
      category_id,
      is_crude ? 1 : 0
    );
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.render('admin/product_form', { product: null, categories, error: 'Erreur lors de la création.' });
  }
});

router.get('/products/:id/edit', (req, res) => {
  const id = req.params.id;
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!product) return res.sendStatus(404);
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('admin/product_form', { product, categories, error: null });
});

router.post('/products/:id/edit', (req, res) => {
  const id = req.params.id;
  const { name, category_id, is_crude } = req.body;
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  if (!name || !category_id) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    return res.render('admin/product_form', { product, categories, error: 'Nom et catégorie requis.' });
  }
  try {
    db.prepare('UPDATE products SET name = ?, category_id = ?, is_crude = ? WHERE id = ?').run(
      name.trim(),
      category_id,
      is_crude ? 1 : 0,
      id
    );
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    res.render('admin/product_form', { product, categories, error: 'Erreur lors de la mise à jour.' });
  }
});

router.post('/products/:id/delete', (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.redirect('/admin/products');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la suppression');
  }
});

/* ----- Boutiques ----- */
router.get('/boutiques', (req, res) => {
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  res.render('admin/boutiques', { boutiques });
});

router.get('/boutiques/new', (req, res) => {
  res.render('admin/boutique_form', { boutique: null, error: null });
});

router.post('/boutiques/new', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.render('admin/boutique_form', { boutique: null, error: 'Le nom est requis.' });
  }
  try {
    db.prepare('INSERT INTO boutiques (name) VALUES (?)').run(name.trim());
    res.redirect('/admin/boutiques');
  } catch (err) {
    console.error(err);
    res.render('admin/boutique_form', { boutique: null, error: 'Erreur lors de la création.' });
  }
});

router.get('/boutiques/:id/edit', (req, res) => {
  const id = req.params.id;
  const boutique = db.prepare('SELECT * FROM boutiques WHERE id = ?').get(id);
  if (!boutique) return res.sendStatus(404);
  res.render('admin/boutique_form', { boutique, error: null });
});

router.post('/boutiques/:id/edit', (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  if (!name || !name.trim()) {
    const boutique = db.prepare('SELECT * FROM boutiques WHERE id = ?').get(id);
    return res.render('admin/boutique_form', { boutique, error: 'Le nom est requis.' });
  }
  try {
    db.prepare('UPDATE boutiques SET name = ? WHERE id = ?').run(name.trim(), id);
    res.redirect('/admin/boutiques');
  } catch (err) {
    console.error(err);
    const boutique = db.prepare('SELECT * FROM boutiques WHERE id = ?').get(id);
    res.render('admin/boutique_form', { boutique, error: 'Erreur lors de la mise à jour.' });
  }
});

router.post('/boutiques/:id/delete', (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM boutiques WHERE id = ?').run(id);
    res.redirect('/admin/boutiques');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la suppression');
  }
});

/* ----- Utilisateurs ----- */
router.get('/users', (req, res) => {
  const users = db
    .prepare(
      `SELECT u.*, b.name AS boutique_name FROM users u
       LEFT JOIN boutiques b ON u.boutique_id = b.id
       ORDER BY u.role, u.email`
    )
    .all();
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  res.render('admin/users', { users, boutiques });
});

router.get('/users/new', (req, res) => {
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  res.render('admin/user_form', { user: null, boutiques, error: null });
});

router.post('/users/new', (req, res) => {
  const { email, password, role, boutique_id } = req.body;
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  if (!email || !password || !role) {
    return res.render('admin/user_form', { user: null, boutiques, error: 'Tous les champs sont requis.' });
  }
  try {
    const hash = hashPassword(password);
    db.prepare('INSERT INTO users (email, password, role, boutique_id) VALUES (?, ?, ?, ?)').run(
      email.trim(),
      hash,
      role,
      role === 'boutique' ? boutique_id : null
    );
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.render('admin/user_form', { user: null, boutiques, error: 'Erreur lors de la création.' });
  }
});

router.get('/users/:id/edit', (req, res) => {
  const id = req.params.id;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.sendStatus(404);
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  res.render('admin/user_form', { user, boutiques, error: null });
});

router.post('/users/:id/edit', (req, res) => {
  const id = req.params.id;
  const { email, password, role, boutique_id } = req.body;
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  if (!email || !role) {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    return res.render('admin/user_form', { user, boutiques, error: 'Email et rôle requis.' });
  }
  try {
    let updateQuery;
    let params;
    if (password && password.trim()) {
      const hash = hashPassword(password);
      updateQuery = 'UPDATE users SET email = ?, password = ?, role = ?, boutique_id = ? WHERE id = ?';
      params = [email.trim(), hash, role, role === 'boutique' ? boutique_id : null, id];
    } else {
      updateQuery = 'UPDATE users SET email = ?, role = ?, boutique_id = ? WHERE id = ?';
      params = [email.trim(), role, role === 'boutique' ? boutique_id : null, id];
    }
    db.prepare(updateQuery).run(...params);
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.render('admin/user_form', { user, boutiques, error: 'Erreur lors de la mise à jour.' });
  }
});

router.post('/users/:id/delete', (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.redirect('/admin/users');
  } catch (err) {
    console.error(err);
    res.status(500).send('Erreur lors de la suppression');
  }
});

module.exports = router;