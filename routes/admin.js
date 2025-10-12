// routes/admin.js
const express = require('express');
const router = express.Router();

// ✅ On réutilise l'instance DB partagée exportée par ../db
//   (Surtout ne redéclare PAS "const db = new Database(...)" ici)
const { db } = require('../db');

// --- Exemples de routes Admin ---

// Tableau de bord (tu peux changer le nom de la vue si besoin)
router.get('/', (req, res) => {
  try {
    // Quelques compteurs simples (si tes tables existent)
    let counts = { products: 0, categories: 0, boutiques: 0, users: 0 };
    try { counts.products   = db.prepare('SELECT COUNT(*) AS c FROM products').get().c; }   catch {}
    try { counts.categories = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c; } catch {}
    try { counts.boutiques  = db.prepare('SELECT COUNT(*) AS c FROM boutiques').get().c; }  catch {}
    try { counts.users      = db.prepare('SELECT COUNT(*) AS c FROM users').get().c; }      catch {}

    res.render('admin/index', { title: 'Admin – Tableau de bord', counts });
  } catch (err) {
    console.error('Admin index error:', err);
    res.status(500).send('Erreur tableau de bord admin.');
  }
});

// (Exemple) liste des boutiques si tu as la table "boutiques"
router.get('/boutiques', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
    res.render('admin/boutiques', { title: 'Boutiques', boutiques: rows });
  } catch (err) {
    console.error('Admin boutiques error:', err);
    res.status(500).send('Erreur chargement boutiques.');
  }
});

// (Exemple) liste des utilisateurs si tu as la table "users"
router.get('/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, name, email, role FROM users ORDER BY name').all();
    res.render('admin/users', { title: 'Utilisateurs', users: rows });
  } catch (err) {
    console.error('Admin users error:', err);
    res.status(500).send('Erreur chargement utilisateurs.');
  }
});

module.exports = router;
