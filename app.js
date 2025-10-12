// app.js
// Charge .env si présent (facultatif en prod)
try { require('dotenv').config(); } catch (_) {}

const express = require('express');
const path = require('path');
const session = require('express-session');
const { db, init } = require('./db');

// Compat si certains appels font encore init()
if (typeof init === 'function') init();

const app = express();

// Vues EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Body parser
app.use(express.urlencoded({ extended: false }));

// Sessions
app.use(session({
  secret: process.env.SESSION_SECRET || 'devsecret',
  resave: false,
  saveUninitialized: false
}));

// Exposer l'utilisateur aux vues
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// Static
app.use('/public', express.static(path.join(__dirname, 'public')));

// Middlewares d’accès
function ensureAuthenticated(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}
function ensureRole(role) {
  return (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === role) return next();
    return res.status(403).send('Accès refusé');
  };
}

// Routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const laboRoutes = require('./routes/labo');
const boutiqueRoutes = require('./routes/boutique');
const livreurRoutes = require('./routes/livreur');

app.use('/', authRoutes);
app.use('/admin', ensureAuthenticated, ensureRole('admin'), adminRoutes);
app.use('/labo', ensureAuthenticated, ensureRole('labo'), laboRoutes);
app.use('/boutique', ensureAuthenticated, ensureRole('boutique'), boutiqueRoutes);
app.use('/livreur', ensureAuthenticated, ensureRole('livreur'), livreurRoutes);

// Accueil: redirige selon le rôle
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const role = req.session.user.role;
  if (role === 'admin') return res.redirect('/admin');
  if (role === 'labo') return res.redirect('/labo');
  if (role === 'boutique') return res.redirect('/boutique');
  if (role === 'livreur') return res.redirect('/livreur');
  return res.send('Rôle non reconnu');
});

// ---- LANCEMENT ----
// ⚠️ Déclare PORT UNE SEULE FOIS
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Orderflow app listening on port ${PORT}`);
});
