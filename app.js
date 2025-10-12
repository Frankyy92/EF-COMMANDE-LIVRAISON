// app.js
const express = require('express');
const path = require('path');

// --- DB init (tables + seed)
const dbModule = require('./db');
if (dbModule && typeof dbModule.init === 'function') {
  dbModule.init();
} else {
  console.warn('⚠️ db.init() introuvable, les tables ne seront pas initialisées.');
}

const app = express();

// Moteur de vues & statiques
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ---- Routes principales (montage “tolérant” si certaines n’existent pas)
function tryUse(base, modPath) {
  try {
    const r = require(modPath);
    app.use(base, r);
    console.log(`✅ Route montée: ${base} -> ${modPath}`);
  } catch (e) {
    console.log(`ℹ️ Route ignorée (absente): ${base} -> ${modPath}`);
  }
}

// Admin de base
tryUse('/admin', './routes/admin');
// Si tu as aussi ces routes dans ton repo, elles seront montées automatiquement :
tryUse('/admin/categories', './routes/admin/categories');
tryUse('/admin/products', './routes/admin/products');
tryUse('/labo', './routes/labo');
tryUse('/boutique', './routes/boutique');
tryUse('/livreur', './routes/livreur');

// Accueil
app.get('/', (req, res) => res.redirect('/admin'));

// 404
app.use((req, res) => res.status(404).send('<h1>404</h1><p>Page introuvable.</p>'));

// 500
app.use((err, req, res, _next) => {
  console.error('Erreur serveur:', err);
  res.status(500).send('<h1>500</h1><p>Erreur serveur.</p>');
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Orderflow lancé sur le port ${PORT}`);
});

module.exports = app;
