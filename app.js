require('dotenv').config();
const express = require('express');
const path = require('path');
const session = require('express-session');
const { db, init } = require('./db');

// Initialise la base de données
init();

const app = express();

// Configuration de la vue
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour parser les corps de requêtes
app.use(express.urlencoded({ extended: false }));

// Gestion des sessions
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false
  })
);

// Expose l'utilisateur connecté à toutes les vues
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Fichiers statiques (CSS, images...)
app.use('/public', express.static(path.join(__dirname, 'public')));

// Middleware d'authentification
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function ensureRole(role) {
  return function (req, res, next) {
    if (req.session && req.session.user && req.session.user.role === role) {
      return next();
    }
    // Rediriger en cas de rôle invalide
    res.status(403).send('Accès refusé');
  };
}

// Importation des routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const laboRoutes = require('./routes/labo');
const boutiqueRoutes = require('./routes/boutique');
const livreurRoutes = require('./routes/livreur');

// Routes
app.use('/', authRoutes);
app.use('/admin', ensureAuthenticated, ensureRole('admin'), adminRoutes);
app.use('/labo', ensureAuthenticated, ensureRole('labo'), laboRoutes);
app.use('/boutique', ensureAuthenticated, ensureRole('boutique'), boutiqueRoutes);
// Routes pour le livreur (livraisons)
app.use('/livreur', ensureAuthenticated, ensureRole('livreur'), livreurRoutes);

// Accueil : rediriger selon le rôle
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  const role = req.session.user.role;
  if (role === 'admin') return res.redirect('/admin');
  if (role === 'labo') return res.redirect('/labo');
  if (role === 'boutique') return res.redirect('/boutique');
  if (role === 'livreur') return res.redirect('/livreur');
  return res.send('Rôle non reconnu');
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Orderflow app listening on port ${PORT}`);
});