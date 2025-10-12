// routes/admin.js
const express = require('express');
const router = express.Router();

// ✅ On utilise l'instance db exportée par ../db
const { db } = require('../db');

// --- Tableau de bord ---
router.get('/', (req, res) => {
  try {
    // Petits compteurs pour l’aperçu
    let counts = { products: 0, categories: 0, boutiques: 0, users: 0 };
    try { counts.products   = db.prepare('SELECT COUNT(*) AS c FROM products').get().c; }   catch {}
    try { counts.categories = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c; } catch {}
    try { counts.boutiques  = db.prepare('SELECT COUNT(*) AS c FROM boutiques').get().c; }  catch {}
    try { counts.users      = db.prepare('SELECT COUNT(*) AS c FROM users').get().c; }      catch {}

    res.render('admin/dashboard', { title: 'Admin – Tableau de bord', counts });
  } catch (err) {
    console.error('Erreur admin index:', err);
    res.status(500).send('Erreur tableau de bord admin.');
  }
});

// --- Liste des boutiques ---
router.get('/boutiques', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
    res.render('admin/boutiques', { title: 'Boutiques', boutiques: rows });
  } catch (err) {
    console.error('Erreur chargement boutiques:', err);
    res.status(500).send('Erreur chargement boutiques.');
  }
});

// --- Liste des catégories ---
router.get('/categories', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.render('admin/categories', { title: 'Catégories', categories: rows });
  } catch (err) {
    console.error('Erreur chargement catégories:', err);
    res.status(500).send('Erreur chargement catégories.');
  }
});

// --- Liste des produits ---
router.get('/products', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT p.id, p.name, c.name AS category 
      FROM products p 
      LEFT JOIN categories c ON c.id = p.category_id
      ORDER BY p.name
    `).all();
    res.render('admin/products', { title: 'Produits', products: rows });
  } catch (err) {
    console.error('Erreur chargement produits:', err);
    res.status(500).send('Erreur chargement produits.');
  }
});

// --- Liste des utilisateurs ---
router.get('/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, email, role FROM users ORDER BY email').all();
    res.render('admin/users', { title: 'Utilisateurs', users: rows });
  } catch (err) {
    console.error('Erreur chargement utilisateurs:', err);
    res.status(500).send('Erreur chargement utilisateurs.');
  }
});

module.exports = router;
