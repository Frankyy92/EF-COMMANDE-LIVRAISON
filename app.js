const path = require('path');
const express = require('express');
const session = require('express-session');
const expressLayouts = require('express-ejs-layouts');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('./utils/db');
const { requireAdmin } = require('./utils/auth');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 } // 8h
}));

app.use(express.static(path.join(__dirname, 'public')));

// Helpers locals for views
app.use((req, res, next) => {
  res.locals.role = null;
  res.locals.roleLabel = '';
  res.locals.showSidebar = false;
  next();
});

// ---------- HOME ----------
app.get('/', (req, res) => {
  res.render('index', { title: 'Accueil', showSidebar: false });
});

// ---------- BOUTIQUE ----------
app.get('/boutique', (req, res) => {
  const db = readDB();
  const orders = db.orders.slice().reverse().slice(0, 10);
  const products = db.products;
  const productsMap = Object.fromEntries(products.map(p => [p.id, p]));
  res.locals.role = 'boutique';
  res.locals.roleLabel = 'Boutique';
  res.locals.showSidebar = true;
  res.render('boutique/index', { title: 'Boutique - Nouvelle commande', products, productsMap, orders });
});

app.post('/boutique/order', (req, res) => {
  const db = readDB();
  const products = db.products;
  const items = [];
  for (const p of products) {
    const key = 'qty_' + p.id;
    const qty = parseInt(req.body[key] || '0', 10);
    if (qty > 0) items.push({ productId: p.id, qty });
  }
  if (items.length === 0) {
    return res.status(400).render('errors/500', { message: 'Veuillez sélectionner au moins un article.' });
  }
  const client = (req.body.client || 'Client').trim();
  db.orders.push({
    id: 'ord-' + uuidv4().slice(0, 8),
    client,
    items,
    status: 'non-traite',
    createdAt: new Date().toISOString()
  });
  writeDB(db);
  res.redirect('/boutique');
});

// ---------- LIVREUR ----------
app.get('/livreur', (req, res) => {
  const db = readDB();
  const orders = db.orders.slice().reverse();
  const productsMap = Object.fromEntries(db.products.map(p => [p.id, p]));
  res.locals.role = 'livreur';
  res.locals.roleLabel = 'Livreur';
  res.locals.showSidebar = true;
  res.render('livreur/index', { title: 'Livreur', orders, productsMap });
});

app.post('/livreur/valider', (req, res) => {
  const db = readDB();
  const id = req.body.id;
  const order = db.orders.find(o => o.id === id);
  if (order) {
    order.status = 'valide';
    writeDB(db);
  }
  res.redirect('/livreur');
});

// ---------- LABO ----------
app.get('/labo', (req, res) => {
  const db = readDB();
  const orders = db.orders.filter(o => o.status === 'non-traite').slice().reverse();
  const productsMap = Object.fromEntries(db.products.map(p => [p.id, p]));
  res.locals.role = 'labo';
  res.locals.roleLabel = 'Labo';
  res.locals.showSidebar = true;
  res.render('labo/index', { title: 'Labo', orders, productsMap });
});

app.post('/labo/valider', (req, res) => {
  const db = readDB();
  const id = req.body.id;
  const order = db.orders.find(o => o.id === id);
  if (order) {
    order.status = 'valide';
    writeDB(db);
  }
  res.redirect('/labo');
});

// ---------- ADMIN AUTH ----------
app.get('/adminLogin', (req, res) => {
  const err = req.query.err === 'unauth' ? 'Veuillez vous connecter' : null;
  res.render('admin/login', { title: 'Connexion Admin', showSidebar: false, err });
});

app.post('/adminLogin', (req, res) => {
  const { password } = req.body;
  if (password && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }
  return res.status(401).render('admin/login', { title: 'Connexion Admin', showSidebar: false, err: 'Mot de passe incorrect' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ---------- ADMIN PAGES ----------
app.get('/admin', requireAdmin, (req, res) => {
  res.locals.role = 'admin';
  res.locals.roleLabel = 'Admin';
  res.locals.showSidebar = true;
  res.render('admin/dashboard', { title: 'Admin - Tableau de bord' });
});

app.get('/admin/categories', requireAdmin, (req, res) => {
  const db = readDB();
  res.locals.role = 'admin';
  res.locals.roleLabel = 'Admin';
  res.locals.showSidebar = true;
  res.render('admin/categories', { title: 'Admin - Catégories', categories: db.categories });
});

app.post('/admin/categories/add', requireAdmin, (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.redirect('/admin/categories');
  const db = readDB();
  const id = 'cat-' + uuidv4().slice(0, 8);
  db.categories.push({ id, name });
  writeDB(db);
  res.redirect('/admin/categories');
});

app.post('/admin/categories/delete', requireAdmin, (req, res) => {
  const id = req.body.id;
  const db = readDB();
  db.categories = db.categories.filter(c => c.id !== id);
  // Supprimer les produits orphelins
  db.products = db.products.filter(p => p.categoryId !== id);
  writeDB(db);
  res.redirect('/admin/categories');
});

app.get('/admin/products', requireAdmin, (req, res) => {
  const db = readDB();
  const categoriesMap = Object.fromEntries(db.categories.map(c => [c.id, c]));
  res.locals.role = 'admin';
  res.locals.roleLabel = 'Admin';
  res.locals.showSidebar = true;
  res.render('admin/products', { title: 'Admin - Produits', products: db.products, categories: db.categories, categoriesMap });
});

app.post('/admin/products/add', requireAdmin, (req, res) => {
  const { name, price, categoryId } = req.body;
  const db = readDB();
  const id = 'prd-' + uuidv4().slice(0, 8);
  db.products.push({ id, name: (name||'').trim(), price: parseFloat(price||'0'), categoryId });
  writeDB(db);
  res.redirect('/admin/products');
});

app.post('/admin/products/delete', requireAdmin, (req, res) => {
  const { id } = req.body;
  const db = readDB();
  db.products = db.products.filter(p => p.id !== id);
  writeDB(db);
  res.redirect('/admin/products');
});

app.get('/admin/orders', requireAdmin, (req, res) => {
  const db = readDB();
  const productsMap = Object.fromEntries(db.products.map(p => [p.id, p]));
  res.locals.role = 'admin';
  res.locals.roleLabel = 'Admin';
  res.locals.showSidebar = true;
  res.render('admin/orders', { title: 'Admin - Commandes', orders: db.orders.slice().reverse(), productsMap });
});

app.post('/admin/orders/valider', requireAdmin, (req, res) => {
  const { id } = req.body;
  const db = readDB();
  const order = db.orders.find(o => o.id === id);
  if (order) { order.status = 'valide'; writeDB(db); }
  res.redirect('/admin/orders');
});

app.post('/admin/orders/delete', requireAdmin, (req, res) => {
  const { id } = req.body;
  const db = readDB();
  db.orders = db.orders.filter(o => o.id !== id);
  writeDB(db);
  res.redirect('/admin/orders');
});

// ---------- 404 & 500 ----------
app.use((req, res) => {
  res.status(404).render('errors/404', { title: '404', showSidebar: false });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('errors/500', { title: 'Erreur serveur', message: err.message, showSidebar: false });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server listening on ' + PORT);
});
