const express = require('express');
const { verifyPassword } = require('../utils/auth');
const { db } = require('../db');

const router = express.Router();

// Affichage du formulaire de connexion
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// Traitement de la connexion
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  try {
    const userRow = db
      .prepare('SELECT id, email, password, role, boutique_id FROM users WHERE email = ?')
      .get(email);
    if (!userRow) {
      return res.render('login', { error: 'Utilisateur inconnu ou mot de passe incorrect.' });
    }
    // Vérifier le mot de passe
    if (!verifyPassword(password, userRow.password)) {
      return res.render('login', { error: 'Utilisateur inconnu ou mot de passe incorrect.' });
    }
    // Auth réussi
    req.session.user = {
      id: userRow.id,
      email: userRow.email,
      role: userRow.role,
      boutique_id: userRow.boutique_id
    };
    return res.redirect('/');
  } catch (err) {
    console.error(err);
    return res.render('login', { error: 'Erreur serveur.' });
  }
});

// Déconnexion
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

module.exports = router;