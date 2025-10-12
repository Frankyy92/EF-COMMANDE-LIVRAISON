// routes/admin.js
const express = require('express');
const router = express.Router();
const { db } = require('../db');

// Dashboard simple
router.get('/', (req, res) => {
  try {
    const q = (sql) => { try { return db.prepare(sql).get().c || 0; } catch { return 0; } };
    const counts = {
      products:   q('SELECT COUNT(*) AS c FROM products'),
      categories: q('SELECT COUNT(*) AS c FROM categories'),
      boutiques:  q('SELECT COUNT(*) AS c FROM boutiques'),
      users:      q('SELECT COUNT(*) AS c FROM users'),
    };
    // Essaie de rendre une vue si elle existe :
    try {
      return res.render('admin/dashboard', { title: 'Admin – Tableau de bord', counts });
    } catch {
      return res.send(`<h1>Admin</h1><pre>${JSON.stringify(counts, null, 2)}</pre>`);
    }
  } catch (e) {
    console.error('Admin index error:', e);
    res.status(500).send('Erreur tableau de bord admin.');
  }
});

// Exemples de listes (rendent JSON si la vue n’existe pas)
router.get('/boutiques', (req, res) => {
  try {
    const rows = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
    try { return res.render('admin/boutiques', { title: 'Boutiques', boutiques: rows }); }
    catch { return res.json(rows); }
  } catch (e) {
    console.error('Admin boutiques error:', e);
    res.status(500).send('Erreur chargement boutiques.');
  }
});

router.get('/users', (req, res) => {
  try {
    const rows = db.prepare('SELECT id, email, role FROM users ORDER BY email').all();
    try { return res.render('admin/users', { title: 'Utilisateurs', users: rows }); }
    catch { return res.json(rows); }
  } catch (e) {
    console.error('Admin users error:', e);
    res.status(500).send('Erreur chargement utilisateurs.');
  }
});

module.exports = router;

