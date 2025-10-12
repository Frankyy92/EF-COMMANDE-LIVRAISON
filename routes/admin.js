const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');

// Admin dashboard
router.get('/', (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  const tours = db.prepare('SELECT * FROM tours ORDER BY id').all();
  res.render('dashboard_admin', { user: req.session.user, products, boutiques, tours });
});

// Products CRUD
router.post('/products', (req, res) => {
  const { sku, name, unit, category, is_raw } = req.body;
  db.prepare('INSERT INTO products (sku,name,unit,category,is_raw) VALUES (?,?,?,?,?)'
  ).run(sku, name, unit || 'pcs', category || null, is_raw ? 1 : 0);
  res.redirect('/admin');
});
router.post('/products/:id/delete', (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

// Boutiques CRUD
router.post('/boutiques', (req, res) => {
  const { name, address } = req.body;
  db.prepare('INSERT INTO boutiques (name,address) VALUES (?,?)').run(name, address || null);
  res.redirect('/admin');
});
router.post('/boutiques/:id/delete', (req, res) => {
  db.prepare('DELETE FROM boutiques WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

// Users (assign boutique)
router.post('/users', (req, res) => {
  const { email, password, role, boutique_id } = req.body;
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (email,password_hash,role,boutique_id) VALUES (?,?,?,?)'
  ).run(email, hash, role, boutique_id || null);
  res.redirect('/admin');
});
router.post('/users/:id/delete', (req, res) => {
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.redirect('/admin');
});

// Tours
router.post('/tours', (req, res) => {
  const { name } = req.body;
  db.prepare('INSERT INTO tours (name) VALUES (?)').run(name);
  res.redirect('/admin');
});
router.post('/tours/:tourId/stops', (req, res) => {
  const { boutique_id, stop_order } = req.body;
  db.prepare('INSERT INTO tour_stops (tour_id,boutique_id,stop_order) VALUES (?,?,?)'
  ).run(req.params.tourId, boutique_id, stop_order);
  res.redirect('/admin');
});

module.exports = router;
