const express = require('express');
const { db } = require('../db');
const router = express.Router();

// Fonction utilitaire pour obtenir YYYY-MM-DD au format ISO local
function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Calcule les suggestions de quantité pour une boutique et une date donnée
function calculateSuggestions(boutiqueId, deliveryDate) {
  // Determine the weekday (0 dimanche ... 6 samedi) de la date demandée
  const date = new Date(deliveryDate);
  const weekday = date.getDay().toString();
  // Récupérer la moyenne des quantités finales ou commandes verrouillées pour les 4 dernières occurrences de ce jour
  const stmt = db.prepare(
    `SELECT oi.product_id, AVG(COALESCE(oi.final_quantity, oi.quantity)) AS avg_qty
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     WHERE o.boutique_id = ?
       AND o.locked = 1
       AND strftime('%w', o.delivery_date) = ?
     GROUP BY oi.product_id`
  );
  const rows = stmt.all(boutiqueId, weekday);
  const suggestions = {};
  rows.forEach((row) => {
    suggestions[row.product_id] = Math.round(row.avg_qty);
  });
  return suggestions;
}

// Middleware pour vérifier si l'édition est autorisée (avant cut-off)
function canEditOrder() {
  const now = new Date();
  const hour = now.getHours();
  // Cut‑off à 21 h. Si horaire passé, interdit l'édition
  return hour < 21;
}

router.get('/', (req, res) => {
  // Rediriger sur la commande pour le lendemain
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = formatDateISO(tomorrow);
  res.redirect(`/boutique/order/${iso}`);
});

// Afficher / éditer la commande pour une date donnée
router.get('/order/:date', (req, res) => {
  const deliveryDate = req.params.date;
  const boutiqueId = req.session.user.boutique_id;
  // Vérifier l'existence d'une commande
  const existingOrder = db
    .prepare('SELECT * FROM orders WHERE boutique_id = ? AND delivery_date = ?')
    .get(boutiqueId, deliveryDate);
  let orderItems = {};
  let locked = false;
  if (existingOrder) {
    locked = existingOrder.locked === 1;
    const rows = db
      .prepare('SELECT product_id, quantity FROM order_items WHERE order_id = ?')
      .all(existingOrder.id);
    rows.forEach((row) => {
      orderItems[row.product_id] = row.quantity;
    });
  }
  // Récupérer les produits
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  const productsByCat = {};
  categories.forEach((cat) => {
    productsByCat[cat.id] = [];
  });
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  products.forEach((p) => {
    if (productsByCat[p.category_id]) productsByCat[p.category_id].push(p);
  });
  // Calculer suggestions
  const suggestions = calculateSuggestions(boutiqueId, deliveryDate);
  const editable = !locked && canEditOrder();
  res.render('boutique/order_form', {
    deliveryDate,
    categories,
    productsByCat,
    orderItems,
    suggestions,
    editable,
    error: null
  });
});

// Enregistrer la commande
router.post('/order/:date', (req, res) => {
  const deliveryDate = req.params.date;
  const boutiqueId = req.session.user.boutique_id;
  if (!canEditOrder()) {
    return res.status(403).send('Le délai de commande est dépassé (cut‑off 21:00)');
  }
  let order = db
    .prepare('SELECT * FROM orders WHERE boutique_id = ? AND delivery_date = ?')
    .get(boutiqueId, deliveryDate);
  // Créer la commande si inexistante
  if (!order) {
    const createdAt = new Date().toISOString();
    const info = db
      .prepare('INSERT INTO orders (boutique_id, delivery_date, status, locked, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(boutiqueId, deliveryDate, 'pending', 0, createdAt);
    order = { id: info.lastInsertRowid, locked: 0 };
  }
  if (order.locked) {
    return res.status(403).send('Commande verrouillée. Impossible de modifier.');
  }
  // Supprimer les éléments existants pour cette commande
  db.prepare('DELETE FROM order_items WHERE order_id = ?').run(order.id);
  // Parcourir les champs du formulaire
  const items = [];
  for (const key in req.body) {
    if (key.startsWith('qty_')) {
      const productId = parseInt(key.replace('qty_', ''), 10);
      let qty = parseInt(req.body[key], 10);
      if (isNaN(qty) || qty < 0) qty = 0;
      if (qty > 0) {
        items.push({ productId, qty });
      }
    }
  }
  const insertItem = db.prepare(
    'INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)'
  );
  const insertMany = db.transaction((items) => {
    items.forEach((item) => {
      insertItem.run(order.id, item.productId, item.qty);
    });
  });
  insertMany(items);
  res.redirect(`/boutique/order/${deliveryDate}`);
});

/**
 * Afficher la page de réception pour une date donnée.
 * Permet à la boutique de visualiser la commande livrée et de confirmer la réception.
 */
router.get('/reception/:date', (req, res) => {
  const deliveryDate = req.params.date;
  const boutiqueId = req.session.user.boutique_id;
  // Récupérer la commande verrouillée et livrée
  const order = db
    .prepare(
      'SELECT * FROM orders WHERE boutique_id = ? AND delivery_date = ? AND locked = 1'
    )
    .get(boutiqueId, deliveryDate);
  if (!order) {
    return res.render('boutique/reception', { deliveryDate, order: null });
  }
  // Récupérer les items avec les quantités finales
  const items = db
    .prepare(
      `SELECT p.name, oi.quantity, COALESCE(oi.final_quantity, oi.quantity) AS final_quantity
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = ?`
    )
    .all(order.id);
  res.render('boutique/reception', { deliveryDate, order, items });
});

/**
 * Confirmer la réception d'une commande par la boutique.
 */
router.post('/reception/:id', (req, res) => {
  const id = req.params.id;
  // Marquer la commande comme reçue
  db.prepare('UPDATE orders SET received = 1 WHERE id = ?').run(id);
  // Rediriger vers la liste de réception du jour
  const backDate = req.body.date;
  res.redirect(`/boutique/reception/${backDate}`);
});

/**
 * Afficher l'historique des commandes pour la boutique connectée.
 */
router.get('/historique', (req, res) => {
  const boutiqueId = req.session.user.boutique_id;
  // Récupérer toutes les commandes de cette boutique triées par date décroissante
  const orders = db
    .prepare(
      `SELECT o.id, o.delivery_date, o.locked, o.delivered, o.received,
              (SELECT SUM(quantity) FROM order_items WHERE order_id = o.id) AS totalItems
       FROM orders o
       WHERE o.boutique_id = ?
       ORDER BY o.delivery_date DESC`
    )
    .all(boutiqueId);
  res.render('boutique/historique', { orders });
});

module.exports = router;