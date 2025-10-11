const express = require('express');
const path = require('path');
const session = require('express-session');
const { db, init } = require('./db');

// Initialiser la base de données
init();

const app = express();

// Configuration du moteur de vues EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour parser les corps de requête (formulaires)
app.use(express.urlencoded({ extended: false }));

// Configuration de la session (nécessaire même sans login pour éviter erreurs si req.session est appelé)
app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false
}));

// Fichiers statiques (CSS, images, etc.)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Import des routeurs (sans middleware d’authentification)
const adminRoutes    = require('./routes/admin');
const laboRoutes     = require('./routes/labo');
const boutiqueRoutes = require('./routes/boutique');
const livreurRoutes  = require('./routes/livreur');

// Montage des routes (accès libre à toutes les sections)
app.use('/admin',    adminRoutes);
app.use('/labo',     laboRoutes);
app.use('/boutique', boutiqueRoutes);
app.use('/livreur',  livreurRoutes);

// Route d’accueil : redirige vers une section par défaut (ex. section boutique)
app.get('/', (req, res) => {
  res.redirect('/boutique');
});

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Orderflow app listening on port ${PORT}`);
});
