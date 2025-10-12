const express = require('express');
const session = require('express-session');
const path = require('path');
const methodOverride = require('method-override');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const db = require('./db');
const { port, sessionSecret } = require('./config');

const app = express();
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false
}));

// Simple auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function requireRole(role) {
  return (req, res, next) => {
    if (!req.session.user || req.session.user.role !== role) return res.status(403).send('Forbidden');
    next();
  };
}

app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  const role = req.session.user.role;
  if (role === 'admin') return res.redirect('/admin');
  if (role === 'labo') return res.redirect('/labo');
  if (role === 'boutique') return res.redirect('/boutique');
  res.redirect('/login');
});

// Auth routes
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) return res.render('login', { error: 'Identifiants invalides' });
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.render('login', { error: 'Identifiants invalides' });
  req.session.user = { id: user.id, email: user.email, role: user.role, boutique_id: user.boutique_id };
  res.redirect('/');
});
app.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

// Mount sub-routers
app.use('/admin', requireAuth, requireRole('admin'), require('./routes/admin'));
app.use('/labo', requireAuth, requireRole('labo'), require('./routes/labo'));
app.use('/boutique', requireAuth, requireRole('boutique'), require('./routes/boutiques'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Erreur serveur');
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
