const express = require('express');
const session = require('express-session');
const path = require('path');
const methodOverride = require('method-override');
const helmet = require('helmet');
const bcrypt = require('bcrypt');
const db = require('./db');
const { port, sessionSecret, simpleLogin, allowedUsers } = require('./config');

const engine = require('ejs-mate');
const app = express();

app.engine('ejs', engine);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
}));

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
  return res.redirect('/boutique');
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/');
  res.render('login', { error: null, simpleLogin });
});

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (simpleLogin) {
    if (allowedUsers.length > 0 && !allowedUsers.includes(email)) {
      return res.status(401).render('login', { error: "Accès refusé pour cet email.", simpleLogin });
    }
    if (!user) {
      return res.status(401).render('login', { error: "Utilisateur inconnu.", simpleLogin });
    }
    req.session.user = { id: user.id, email: user.email, role: user.role, name: user.name };
    return res.redirect('/');
  }

  if (!user) return res.status(401).render('login', { error: "Identifiants invalides.", simpleLogin });
  const ok = bcrypt.compareSync(password || "", user.password_hash || "");
  if (!ok) return res.status(401).render('login', { error: "Identifiants invalides.", simpleLogin });
  req.session.user = { id: user.id, email: user.email, role: user.role, name: user.name };
  res.redirect('/');
});

app.post('/logout', (req, res) => { req.session.destroy(() => res.redirect('/login')); });

app.use('/admin', requireAuth, requireRole('admin'), require('./routes/admin'));
app.use('/labo', requireAuth, requireRole('labo'), require('./routes/labo'));
app.use('/boutique', requireAuth, requireRole('boutique'), require('./routes/boutiques'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Erreur serveur');
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
