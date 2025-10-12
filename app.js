// app.js
try { require('dotenv').config(); } catch {}

const path = require('path');
const express = require('express');
const { init } = require('./db'); // initialise la base si besoin

// Initialisation DB (création tables si nécessaire)
init();

const app = express();

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Fichiers statiques
app.use('/public', express.static(path.join(__dirname, 'public')));

// (Optionnel) Exposer une variable aux vues
app.use((req, res, next) => {
  res.locals.title = res.locals.title || 'Orderflow';
  next();
});

// --- Routes principales ---
const adminRoutes    = require('./routes/admin');
const laboRoutes     = require('./routes/labo');
const boutiqueRoutes = require('./routes/boutique');
const livreurRoutes  = require('./routes/livreur');

// Si tu as créé les routes CRUD admin pour catégories/produits :
let categoriesRouter, productsRouter;
try { categoriesRouter = require('./routes/admin/categories'); } catch {}
try { productsRouter   = require('./routes/admin/products');   } catch {}

// Montage
app.use('/admin', adminRoutes);
if (categoriesRouter) app.use('/admin/categories', categoriesRouter);
if (productsRouter)   app.use('/admin/products',   productsRouter);

app.use('/labo',     laboRoutes);
app.use('/boutique', boutiqueRoutes);
app.use('/livreur',  livreurRoutes);

// Accueil → redirige vers l’Admin (libre d’accès)
app.get('/', (req, res) => res.redirect('/admin'));

// 404
app.use((req, res) => res.status(404).render('errors/404', { title: 'Page introuvable' }));

// 500
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).render('errors/500', { title: 'Erreur serveur', error: err });
});

// Lancement serveur
const PORT = process.env.PORT || 10000; // Render utilise généralement PORT
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Orderflow app listening on port ${PORT}`);
});

module.exports = app;
