const { hashPassword } = require('../utils/auth');
const { db, init } = require('../db');

// Exécuter initialisation des tables
init();

// Supprimer les données existantes
db.exec(`
  DELETE FROM users;
  DELETE FROM order_items;
  DELETE FROM orders;
  DELETE FROM products;
  DELETE FROM categories;
  DELETE FROM boutiques;
  DELETE FROM production_plans;
  DELETE FROM sales_history;
`);

// Insérer boutiques
const boutiques = ['Saint‑Germain‑en‑Laye', 'Suresnes', 'Rueil‑Malmaison', 'Neuilly'];
boutiques.forEach((name) => {
  db.prepare('INSERT INTO boutiques (name) VALUES (?)').run(name);
});

// Insérer catégories
const categories = [
  'Viennoiserie',
  'Pâtisserie',
  'Gâteau de voyage',
  'Traiteur',
  'Boulangerie/Économat',
  'Macaron',
  'Petit four sec',
  'Cakes',
  'Caisses',
  'Autres'
];
categories.forEach((name) => {
  db.prepare('INSERT INTO categories (name) VALUES (?)').run(name);
});

// Obtenir id catégories
const catRows = db.prepare('SELECT * FROM categories').all();
const catMap = {};
catRows.forEach((c) => {
  catMap[c.name] = c.id;
});

// Insérer produits issus de la matrice de livraison
const products = [
  { name: 'A SUCRE', category: 'Autres', is_crude: 0 },
  { name: 'BABA', category: 'Autres', is_crude: 0 },
  { name: 'BABKA CHOCO A', category: 'Viennoiserie', is_crude: 0 },
  { name: 'BABKA CHOCO INDIV', category: 'Viennoiserie', is_crude: 0 },
  { name: 'BAC BRETON T2', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'BAC PATE SUCRÉE T2', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'BANANA BREAD /', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'BANDE DE FLAN 12P (48)', category: 'Pâtisserie', is_crude: 0 },
  { name: 'BANDE DE FLAN 4P (96)', category: 'Pâtisserie', is_crude: 0 },
  { name: 'BANDE DE FLAN 6P (48)', category: 'Pâtisserie', is_crude: 0 },
  { name: 'BASQUE CHOCO', category: 'Pâtisserie', is_crude: 0 },
  { name: 'BEIGNET', category: 'Autres', is_crude: 0 },
  { name: 'BICOLOR', category: 'Autres', is_crude: 0 },
  { name: 'BISCUIT', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'BRETON 4P (36)', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'BRETON 6P (24)', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'BRETON INDIV (198)', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'BRIOCHE FEUILLETÉE', category: 'Viennoiserie', is_crude: 0 },
  { name: 'BROOKIES', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'BROWNIES', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'BUNS', category: 'Viennoiserie', is_crude: 0 },
  { name: 'CHAUSSON', category: 'Viennoiserie', is_crude: 0 },
  { name: 'CHEESE CAKE', category: 'Pâtisserie', is_crude: 0 },
  { name: 'CHOCOLAT BLANC', category: 'Autres', is_crude: 0 },
  { name: 'CHOCOLAT LAIT', category: 'Autres', is_crude: 0 },
  { name: 'CHOCOLAT NOIR', category: 'Autres', is_crude: 0 },
  { name: 'CINNAMON', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'CITRON', category: 'Pâtisserie', is_crude: 0 },
  { name: 'CITRON 4 SANS', category: 'Pâtisserie', is_crude: 0 },
  { name: 'CITRON 6 SANS', category: 'Pâtisserie', is_crude: 0 },
  { name: 'CITRON SANS', category: 'Pâtisserie', is_crude: 0 },
  { name: 'CLASSIQUE', category: 'Autres', is_crude: 0 },
  { name: 'CONFIT FRAMBOISE', category: 'Autres', is_crude: 0 },
  { name: 'COOKIES', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'COURGETTE', category: 'Traiteur', is_crude: 0 },
  { name: 'CREMEUX CHOCO', category: 'Pâtisserie', is_crude: 0 },
  { name: 'CREMEUX PISTACHE', category: 'Pâtisserie', is_crude: 0 },
  { name: 'CROISSANT', category: 'Viennoiserie', is_crude: 0 },
  { name: 'CROLL', category: 'Autres', is_crude: 0 },
  { name: 'CROOKIES', category: 'Autres', is_crude: 0 },
  { name: 'CROQUE', category: 'Traiteur', is_crude: 0 },
  { name: 'CRUMBLE', category: 'Pâtisserie', is_crude: 0 },
  { name: 'DIAMANT CHOCO', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'DIAMANT PISTACHE', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'DIAMANT VANILLE', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'ECLAIR CAFE', category: 'Pâtisserie', is_crude: 0 },
  { name: 'EMMENTAL COUPÉ', category: 'Traiteur', is_crude: 0 },
  { name: 'ENTREMET POKA', category: 'Pâtisserie', is_crude: 0 },
  { name: 'EXOTIQUE 4 PAS', category: 'Pâtisserie', is_crude: 0 },
  { name: 'EXOTIQUE 6 PAS', category: 'Pâtisserie', is_crude: 0 },
  { name: 'EXOTIQUE INDIV', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FEUILLETAGE', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'FEULLETAGE', category: 'Autres', is_crude: 0 },
  { name: 'FINAN ABRICOT', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'FINANCIER', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'FINANCIER CARRÉ', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'FINANCIER PISTACHE', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'FINANCIER TIGRÉ', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'FLANS A LA PART', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FLANS A PARTAGER', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FOND DE FLAN 12P (24)', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FOND DE FLAN 4P (72)', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FOND DE FLAN 6P (48)', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FORÊT NOIRE 4P', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FORÊT NOIRE 6P', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FORÊT NOIRE INDIV', category: 'Pâtisserie', is_crude: 0 },
  { name: 'FRAMBOISE', category: 'Autres', is_crude: 0 },
  { name: 'HOUMOUS', category: 'Traiteur', is_crude: 0 },
  { name: 'JAMBON COUPÉ', category: 'Traiteur', is_crude: 0 },
  { name: 'JAPONAIS', category: 'Autres', is_crude: 0 },
  { name: 'KADAIF', category: 'Traiteur', is_crude: 0 },
  { name: 'LORRAINE', category: 'Traiteur', is_crude: 0 },
  { name: 'LUNA 4P', category: 'Pâtisserie', is_crude: 0 },
  { name: 'LUNA 6P', category: 'Pâtisserie', is_crude: 0 },
  { name: 'LUNA NAPPER', category: 'Pâtisserie', is_crude: 0 },
  { name: 'MADELEINE CITRON', category: 'Pâtisserie', is_crude: 0 },
  { name: 'MANDARINE INDIV', category: 'Pâtisserie', is_crude: 0 },
  { name: 'MELASSE DE CANNE', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'MILLE FEUILLE', category: 'Pâtisserie', is_crude: 0 },
  { name: 'MINI COOKIES', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'MINI CROISSANT', category: 'Viennoiserie', is_crude: 0 },
  { name: 'MINI FINANCIER', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'MINI PAIN AU CHOCO', category: 'Viennoiserie', is_crude: 0 },
  { name: 'MINI PAIN AU RAISIN', category: 'Viennoiserie', is_crude: 0 },
  { name: 'MINI SUISSE', category: 'Viennoiserie', is_crude: 0 },
  { name: 'MOELLEUX', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'MONT BLANC 4P', category: 'Pâtisserie', is_crude: 0 },
  { name: 'MONT BLANC 6P', category: 'Pâtisserie', is_crude: 0 },
  { name: 'MONT BLANC INDIV', category: 'Pâtisserie', is_crude: 0 },
  { name: 'MORTADELLE', category: 'Traiteur', is_crude: 0 },
  { name: 'MOULE SAN', category: 'Autres', is_crude: 0 },
  { name: 'Mayo 5kg', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'PAIN AU CHOCOLAT', category: 'Viennoiserie', is_crude: 0 },
  { name: 'PAIN AU RAISIN', category: 'Viennoiserie', is_crude: 0 },
  { name: 'PAIN DE MIE', category: 'Viennoiserie', is_crude: 0 },
  { name: 'PAIN DE MIE CARRE', category: 'Viennoiserie', is_crude: 0 },
  { name: 'PALMIER', category: 'Viennoiserie', is_crude: 0 },
  { name: 'PARIS BREST', category: 'Pâtisserie', is_crude: 0 },
  { name: 'PARIS BREST 4', category: 'Pâtisserie', is_crude: 0 },
  { name: 'PARIS BRST 6', category: 'Pâtisserie', is_crude: 0 },
  { name: 'PATATE DOUCE', category: 'Traiteur', is_crude: 0 },
  { name: 'PATE DE PISTACHE', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'PATE DE VANILLE', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'PEKINOU', category: 'Autres', is_crude: 0 },
  { name: 'PESTO VERT', category: 'Traiteur', is_crude: 0 },
  { name: 'PLAQUE DE COOKIES', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'POMME CUBE', category: 'Autres', is_crude: 0 },
  { name: "POUDRE D'AMANDE", category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'PÉTALE DE FLEUR', category: 'Boulangerie/Économat', is_crude: 0 },
  { name: 'ROSETTE', category: 'Traiteur', is_crude: 0 },
  { name: 'ROULÉ PISTACHE', category: 'Autres', is_crude: 0 },
  { name: 'ROYAL 4', category: 'Pâtisserie', is_crude: 0 },
  { name: 'ROYAL 6', category: 'Pâtisserie', is_crude: 0 },
  { name: 'ROYAL TREMPER', category: 'Pâtisserie', is_crude: 0 },
  { name: 'SAUMON/EPINARD', category: 'Traiteur', is_crude: 0 },
  { name: 'SEBASTIAN', category: 'Autres', is_crude: 0 },
  { name: 'SERRANO', category: 'Traiteur', is_crude: 0 },
  { name: 'SPRITZ', category: 'Gâteau de voyage', is_crude: 0 },
  { name: 'SUISSE', category: 'Viennoiserie', is_crude: 0 },
  { name: 'SUISSE POMME', category: 'Viennoiserie', is_crude: 0 },
  { name: 'TARTELETTE', category: 'Pâtisserie', is_crude: 0 },
  { name: 'Thon 2kg', category: 'Traiteur', is_crude: 0 },
  { name: 'VERRINE', category: 'Pâtisserie', is_crude: 0 },
  { name: 'VIENNOIS CHOCO', category: 'Viennoiserie', is_crude: 0 },
  { name: 'VIENNOIS NATURE', category: 'Viennoiserie', is_crude: 0 },
  { name: 'VIENNOISE CHOCO A', category: 'Viennoiserie', is_crude: 0 }
];
products.forEach((p) => {
  db.prepare('INSERT INTO products (name, category_id, is_crude) VALUES (?, ?, ?)').run(
    p.name,
    catMap[p.category],
    p.is_crude ? 1 : 0
  );
});

// Insérer utilisateurs
function createUser(email, password, role, boutiqueName) {
  const hash = hashPassword(password);
  let boutiqueId = null;
  if (role === 'boutique') {
    const row = db.prepare('SELECT id FROM boutiques WHERE name = ?').get(boutiqueName);
    boutiqueId = row ? row.id : null;
  }
  db.prepare('INSERT INTO users (email, password, role, boutique_id) VALUES (?, ?, ?, ?)').run(
    email,
    hash,
    role,
    boutiqueId
  );
}

createUser('admin@example.com', 'admin123', 'admin');
createUser('labo@example.com', 'labo123', 'labo');
createUser('stgermain@example.com', 'boutique123', 'boutique', 'Saint‑Germain‑en‑Laye');
createUser('suresnes@example.com', 'boutique123', 'boutique', 'Suresnes');
createUser('rueil@example.com', 'boutique123', 'boutique', 'Rueil‑Malmaison');
createUser('neuilly@example.com', 'boutique123', 'boutique', 'Neuilly');

// Compte livreur
createUser('livreur@example.com', 'livreur123', 'livreur');

console.log('Base de données initialisée avec succès.');