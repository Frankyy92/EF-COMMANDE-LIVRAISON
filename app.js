const express = require('express');
const path = require('path');
const { db, init } = require('./db');

// Initialise la base de données
init();

const app = express();

// Configuration de la vue
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware pour parser les corps de requêtes
app.use(express.urlencoded({ extended: false }));

// Fichiers statiques (CSS, images...)
app.use('/public', express.static(path.join(__dirname, 'public')));


// Routes SANS authentification
app.use('/admin', adminRoutes);
app.use('/labo', laboRoutes);
app.use('/boutique', boutiqueRoutes);
app.use('/livreur', livreurRoutes);

// Accueil : tu peux choisir la page par défaut ici
app.get('/', (req, res) => {
  res.render('index'); // ou redirige vers une route de ton choix
});

// Démarrer le serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Orderflow app listening on port ${PORT}`);
});
