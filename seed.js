const db = require('./db');
const bcrypt = require('bcrypt');

function upsert(table, columns, values) {
  const cols = columns.join(',');
  const placeholders = columns.map(_ => '?').join(',');
  for (const v of values) {
    try {
      db.prepare(`INSERT INTO ${table} (${cols}) VALUES (${placeholders})`).run(...v);
    } catch (e) { }
  }
}

// Boutiques (4)
upsert('boutiques', ['id','name','address'], [
  [1,'Saint-Germain-en-Laye','—'],
  [2,'Suresnes','—'],
  [3,'Rueil-Malmaison','—'],
  [4,'Neuilly','—']
]);

// Produits (référencés depuis la matrice)
upsert('products', ['sku','name','unit','category','is_raw'], [
  ['CROISSANT-CRU', 'Croissant cru 70g', 'pcs', 'VIENNOISERIE', 1],
  ['PALMIER-CRU', 'Palmier cru', 'pcs', 'VIENNOISERIE', 1],
  ['SUISSE-CRU', 'Suisse cru', 'pcs', 'VIENNOISERIE', 1],
  ['PAIN-RAISIN-CRU', 'Pain au raisin cru', 'pcs', 'VIENNOISERIE', 1],
  ['CHAUSSON-CRU', 'Chausson aux pommes cru', 'pcs', 'VIENNOISERIE', 1],
  ['MINI-CROISSANT-CRU', 'Mini croissant cru', 'pcs', 'VIENNOISERIE', 1],
  ['MINI-PAIN-CHOCO-CRU', 'Mini pain au chocolat cru', 'pcs', 'VIENNOISERIE', 1],
  ['MINI-PAIN-RAISIN-CRU', 'Mini pain au raisin cru', 'pcs', 'VIENNOISERIE', 1],
  ['MINI-SUISSE-CRU', 'Mini suisse cru', 'pcs', 'VIENNOISERIE', 1],
  ['BEIGNET-CRU', 'Beignet cru', 'pcs', 'VIENNOISERIE', 1],
  ['CROLL-CRU', 'Croll cru', 'pcs', 'VIENNOISERIE', 1],
  ['BABKA-CHOCO-INDIV', 'Babka chocolat individuel', 'pcs', 'VIENNOISERIE', 0],
  ['BABKA-CHOCO-PART', 'Babka chocolat à partager', 'pcs', 'VIENNOISERIE', 0],
  ['BRIOCHE-FEUILLETEE', 'Brioche feuilletée', 'pcs', 'VIENNOISERIE', 0],
  ['PEKINOU', 'Pekinou', 'pcs', 'VIENNOISERIE', 0],
  ['ROULE-PISTACHE', 'Roulé pistache', 'pcs', 'VIENNOISERIE', 0],
  ['MILLE-FEUILLE-BICOLOR', 'Millefeuille bicolor', 'pcs', 'PATISSERIE', 0],
  ['CREMEUX-CHOCO', 'Crémeux chocolat', 'pcs', 'PATISSERIE', 0],
  ['PARIS-BREST', 'Paris Brest', 'pcs', 'PATISSERIE', 0],
  ['PARIS-BREST-4', 'Paris Brest 4P', 'pcs', 'PATISSERIE', 0],
  ['PARIS-BREST-6', 'Paris Brest 6P', 'pcs', 'PATISSERIE', 0],
  ['LUNA-NAPPER', 'Luna Napper', 'pcs', 'PATISSERIE', 0],
  ['CITRON-SANS-MERINGUE', 'Citron sans meringue', 'pcs', 'PATISSERIE', 0],
  ['CITRON-4-SANS-MERINGUE', 'Citron 4 sans meringue', 'pcs', 'PATISSERIE', 0],
  ['CITRON-6-SANS-MERINGUE', 'Citron 6 sans meringue', 'pcs', 'PATISSERIE', 0],
  ['EXOTIQUE-INDIV', 'Exotique individuel', 'pcs', 'PATISSERIE', 0],
  ['EXOTIQUE-4P', 'Exotique 4P', 'pcs', 'PATISSERIE', 0],
  ['EXOTIQUE-6P', 'Exotique 6P', 'pcs', 'PATISSERIE', 0],
  ['ROYAL', 'Royal', 'pcs', 'PATISSERIE', 0],
  ['ROYAL-4P', 'Royal 4P', 'pcs', 'PATISSERIE', 0],
  ['ROYAL-6P', 'Royal 6P', 'pcs', 'PATISSERIE', 0],
  ['FORET-NOIRE-INDIV', 'Forêt noire indiv', 'pcs', 'PATISSERIE', 0],
  ['FORET-NOIRE-4P', 'Forêt noire 4P', 'pcs', 'PATISSERIE', 0],
  ['FORET-NOIRE-6P', 'Forêt noire 6P', 'pcs', 'PATISSERIE', 0],
  ['MANDARINE-INDIV', 'Mandarine indiv', 'pcs', 'PATISSERIE', 0],
  ['ECLAIR-CAFE', 'Eclair café', 'pcs', 'PATISSERIE', 0],
  ['ENTREMET-POKA', 'Entremet Poka', 'pcs', 'PATISSERIE', 0],
  ['MONT-BLANC-INDIV', 'Mont Blanc indiv', 'pcs', 'PATISSERIE', 0],
  ['MONT-BLANC-4P', 'Mont Blanc 4P', 'pcs', 'PATISSERIE', 0],
  ['MONT-BLANC-6P', 'Mont Blanc 6P', 'pcs', 'PATISSERIE', 0],
  ['FINANCIER-CARRE', 'Financier carré', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['FINANCIER-TIGRE', 'Financier tigré', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['FINANCIER-ABRICOT', 'Financier abricot', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['FINANCIER-FRAMBOISE', 'Financier framboise', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['FINANCIER-PISTACHE', 'Financier pistache', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['MADELEINE-CITRON', 'Madeleine citron', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['COOKIES', 'Cookies', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['FLANS-PARTAGER', 'Flans à partager', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['FLANS-PART', 'Flans à la part', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['CRUMBLE', 'Crumble', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['CHEESECAKE-CITRON', 'Cheese cake citron', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['BROWNIES', 'Brownies', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['BROOKIES', 'Brookies', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['MOELLEUX', 'Moelleux', 'pcs', 'GATEAU DE VOYAGE', 0],
  ['LORRAINE', 'Lorraine', 'pcs', 'TRAITEUR', 0],
  ['COURGETTE', 'Courgette', 'pcs', 'TRAITEUR', 0],
  ['SAUMON-EPINARD', 'Saumon/épinard', 'pcs', 'TRAITEUR', 0],
  ['PATATE-DOUCE', 'Patate douce', 'pcs', 'TRAITEUR', 0],
  ['CROQUE', 'Croque', 'pcs', 'TRAITEUR', 0],
  ['JAMBON-COUPE', 'Jambon coupé', 'kg', 'TRAITEUR', 0],
  ['EMMENTAL-COUPE', 'Emmental coupé', 'kg', 'TRAITEUR', 0],
  ['PESTO-VERT', 'Pesto vert', 'kg', 'TRAITEUR', 0],
  ['SERRANO', 'Serrano', 'kg', 'TRAITEUR', 0],
  ['ROSETTE', 'Rosette', 'kg', 'TRAITEUR', 0],
  ['MORTADELLE', 'Mortadelle', 'kg', 'TRAITEUR', 0],
  ['HOUMOUS', 'Houmous', 'kg', 'TRAITEUR', 0],
  ['MAYO-5KG', 'Mayo 5kg', 'bkt', 'TRAITEUR', 0],
  ['THON-2KG', 'Thon 2kg', 'kg', 'TRAITEUR', 0],
  ['PAIN-MIE-CARRE', 'Pain de mie carré', 'pcs', 'BOULANGERIE', 0],
  ['PAIN-MIE-JAPONAIS', 'Pain de mie japonais', 'pcs', 'BOULANGERIE', 0],
  ['MELASSE-CANNE', 'Mélasse de canne à sucre', 'kg', 'ECONOMAT', 0],
  ['VIENNOIS-NATURE', 'Viennois nature', 'pcs', 'BOULANGERIE', 0],
  ['VIENNOIS-CHOCO-INDIV', 'Viennois chocolat indiv', 'pcs', 'BOULANGERIE', 0],
  ['VIENNOIS-CHOCO-PART', 'Viennois chocolat à partager', 'pcs', 'BOULANGERIE', 0],
  ['MACARON-8-CLASSIQUE', 'Macaron 8 classique', 'boite', 'MACARON', 0],
  ['MACARON-8-ORIGINAL', 'Macaron 8 original', 'boite', 'MACARON', 0],
  ['SPRITZ', 'Spritz', 'pcs', 'PETIT FOUR SEC', 0],
  ['DIAMANT-PISTACHE', 'Diamant pistache', 'pcs', 'PETIT FOUR SEC', 0],
  ['DIAMANT-CHOCO', 'Diamant chocolat', 'pcs', 'PETIT FOUR SEC', 0],
  ['DIAMANT-VANILLE', 'Diamant vanille', 'pcs', 'PETIT FOUR SEC', 0],
  ['MERINGUETTE', 'Meringuette', 'pcs', 'PETIT FOUR SEC', 0],
  ['MINI-FINANCIER', 'Mini financier', 'pcs', 'PETIT FOUR SEC', 0],
  ['MINI-COOKIES', 'Mini cookies', 'pcs', 'PETIT FOUR SEC', 0],
  ['CAKE-CITRON', 'Cake citron', 'pcs', 'CAKE', 0],
  ['CAKE-MARBRE', 'Cake marbré', 'pcs', 'CAKE', 0],
  ['BANANA-BREAD', 'Banana bread / cake choco', 'pcs', 'CAKE', 0],
  ['CONFIT-FRAMBOISE', 'Confit framboise', 'kg', 'CAKE', 0],
  ['CAISSE-T1', 'Caisse T1', 'u', 'CAISSES', 0],
  ['CAISSE-T2', 'Caisse T2', 'u', 'CAISSES', 0],
  ['CAISSE-T3', 'Caisse T3', 'u', 'CAISSES', 0],
  ['CAISSE-T4', 'Caisse T4', 'u', 'CAISSES', 0]
]);

// Comptes de démo
const adminHash = bcrypt.hashSync('admin123', 10);
const laboHash = bcrypt.hashSync('labo123', 10);
const boutiHash = bcrypt.hashSync('boutique123', 10);
upsert('users', ['email','password_hash','role','boutique_id'], [
  ['admin@example.com', adminHash, 'admin', null],
  ['labo@example.com', laboHash, 'labo', null],
  ['stgermain@example.com', boutiHash, 'boutique', 1],
  ['suresnes@example.com', boutiHash, 'boutique', 2],
  ['rueil@example.com', boutiHash, 'boutique', 3],
  ['neuilly@example.com', boutiHash, 'boutique', 4],
]);

console.log('Seed done');
