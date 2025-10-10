module.exports = {
  boutiques: [
    'Saint-Germain-en-Laye',
    'Suresnes',
    'Rueil-Malmaison',
    'Neuilly'
  ],
  categories: [
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
  ],
  products: [
    { name: 'CROISSANT', category: 'Viennoiserie', is_crude: 0 },
    { name: 'PAIN AU CHOCOLAT', category: 'Viennoiserie', is_crude: 0 },
    { name: 'CHAUSSON', category: 'Viennoiserie', is_crude: 0 },
    { name: 'PAIN AU RAISIN', category: 'Viennoiserie', is_crude: 0 },
    { name: 'TARTE CITRON', category: 'Pâtisserie', is_crude: 0 },
    { name: 'ÉCLAIR CAFÉ', category: 'Pâtisserie', is_crude: 0 },
    { name: 'PARIS BREST', category: 'Pâtisserie', is_crude: 0 },
    { name: 'MILLE FEUILLE', category: 'Pâtisserie', is_crude: 0 },
    { name: 'FINANCIER', category: 'Gâteau de voyage', is_crude: 0 },
    { name: 'COOKIES', category: 'Gâteau de voyage', is_crude: 0 },
    { name: 'BROWNIES', category: 'Gâteau de voyage', is_crude: 0 },
    { name: 'QUICHE LORRAINE', category: 'Traiteur', is_crude: 0 },
    { name: 'CROQUE MONSIEUR', category: 'Traiteur', is_crude: 0 }
  ],
  users: [
    { email: 'admin@example.com', password: 'admin123', role: 'admin', boutique: null },
    { email: 'labo@example.com', password: 'labo123', role: 'labo', boutique: null },
    { email: 'livreur@example.com', password: 'livreur123', role: 'livreur', boutique: null },
    { email: 'stgermain@example.com', password: 'boutique123', role: 'boutique', boutique: 'Saint-Germain-en-Laye' },
    { email: 'suresnes@example.com', password: 'boutique123', role: 'boutique', boutique: 'Suresnes' },
    { email: 'rueil@example.com', password: 'boutique123', role: 'boutique', boutique: 'Rueil-Malmaison' },
    { email: 'neuilly@example.com', password: 'boutique123', role: 'boutique', boutique: 'Neuilly' }
  ]
};
