const express = require('express');
const PDFDocument = require('pdfkit');
const { db } = require('../db');

const router = express.Router();
// Utilitaire simple pour calculer la date de demain au format YYYY-MM-DD sans dépendance externe
function getTomorrowISO(baseDate) {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

// Utilitaire pour formater une date en ISO (YYYY-MM-DD)
function formatDateISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Redirige vers la date de consolidation par défaut (demain)
router.get('/', (req, res) => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const iso = formatDateISO(tomorrow);
  res.redirect(`/labo/consolidation/${iso}`);
});

// Page de consolidation
router.get('/consolidation/:date', (req, res) => {
  const deliveryDate = req.params.date;
  // Récupérer les boutiques
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  // Récupérer les produits
  const products = db
    .prepare(
      `SELECT p.id, p.name, p.category_id, c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ORDER BY c.name, p.name`
    )
    .all();
  // Regrouper par catégorie pour l'affichage
  const categoriesMap = {};
  products.forEach((p) => {
    if (!categoriesMap[p.category_id]) {
      categoriesMap[p.category_id] = {
        name: p.category_name,
        products: []
      };
    }
    categoriesMap[p.category_id].products.push(p);
  });
  // Récupérer commandes pour cette date par boutique
  const orderData = {};
  boutiques.forEach((b) => {
    orderData[b.id] = {};
  });
  const rows = db
    .prepare(
      `SELECT o.boutique_id, oi.product_id, SUM(oi.quantity) as qty
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.delivery_date = ?
       GROUP BY o.boutique_id, oi.product_id`
    )
    .all(deliveryDate);
  rows.forEach((row) => {
    orderData[row.boutique_id][row.product_id] = row.qty;
  });
  // Calculer le total par produit
  const totals = {};
  products.forEach((p) => {
    let sum = 0;
    boutiques.forEach((b) => {
      const qty = orderData[b.id][p.id] || 0;
      sum += qty;
    });
    totals[p.id] = sum;
  });
  // Récupérer les final quantities enregistrées
  const planRows = db
    .prepare(
      'SELECT product_id, final_quantity FROM production_plans WHERE delivery_date = ?'
    )
    .all(deliveryDate);
  const finalQuantities = {};
  planRows.forEach((row) => {
    finalQuantities[row.product_id] = row.final_quantity;
  });
  // Vérifier si les commandes sont verrouillées
  const lockedOrders = db
    .prepare('SELECT COUNT(*) AS count FROM orders WHERE delivery_date = ? AND locked = 1')
    .get(deliveryDate);
  const locked = lockedOrders.count > 0;
  res.render('labo/consolidation', {
    deliveryDate,
    boutiques,
    categoriesMap,
    orderData,
    totals,
    finalQuantities,
    locked
  });
});

// Enregistrer les ajustements et verrouiller
router.post('/consolidation/:date/lock', (req, res) => {
  const deliveryDate = req.params.date;
  // Récupérer final quantities du formulaire
  const finalQuantities = {};
  for (const key in req.body) {
    if (key.startsWith('finalQty_')) {
      const productId = parseInt(key.replace('finalQty_', ''), 10);
      let qty = parseInt(req.body[key], 10);
      if (isNaN(qty) || qty < 0) qty = 0;
      finalQuantities[productId] = qty;
    }
  }
  // Supprimer les plans existants pour cette date
  db.prepare('DELETE FROM production_plans WHERE delivery_date = ?').run(deliveryDate);
  // Insérer les nouveaux plans
  const insertPlan = db.prepare(
    'INSERT INTO production_plans (delivery_date, product_id, final_quantity) VALUES (?, ?, ?)'
  );
  const insertMany = db.transaction((entries) => {
    entries.forEach(({ productId, qty }) => {
      insertPlan.run(deliveryDate, productId, qty);
    });
  });
  insertMany(
    Object.keys(finalQuantities).map((pid) => ({ productId: parseInt(pid), qty: finalQuantities[pid] }))
  );
  // Verrouiller les commandes pour cette date
  db.prepare('UPDATE orders SET locked = 1, status = ? WHERE delivery_date = ?').run('locked', deliveryDate);
  // Rediriger vers l'affichage après verrouillage
  res.redirect(`/labo/consolidation/${deliveryDate}`);
});

// Redirection vers la page récapitulatif (par défaut date de demain)
router.get('/recap', (req, res) => {
  const tomorrow = getTomorrowISO();
  return res.redirect(`/labo/recap/${tomorrow}`);
});

/**
 * Page récapitulatif des commandes pour une date donnée
 * Affiche la liste des commandes par boutique avec les articles et quantités finales
 */
// Helper pour déterminer le statut lisible d'une commande selon ses indicateurs
function getOrderStatus(order) {
  // Non traité : pas encore verrouillée
  if (!order.locked) return 'Non traité';
  // En cours : verrouillée mais pas encore remise au livreur
  if (order.locked && !order.delivered) return 'En cours';
  // Terminé : remise au livreur mais pas encore réceptionnée par la boutique
  if (order.delivered && !order.received) return 'Terminé';
  // Livré : réception confirmée
  if (order.received) return 'Livré';
  return 'Indéfini';
}

// Page récapitulatif des commandes pour une date donnée. On utilise également cette route pour la page sans paramètre en lisant query ?date
router.get('/recap/:date?', (req, res) => {
  // Si aucun paramètre date n'est fourni (ou query), prendre la date dans les paramètres ou par défaut demain
  const deliveryDate = req.params.date || req.query.date || getTomorrowISO();
  // Obtenir toutes les dates existantes pour lesquelles des commandes ont été créées, pour le menu déroulant
  const dates = db.prepare('SELECT DISTINCT delivery_date FROM orders ORDER BY delivery_date DESC').all().map(r => r.delivery_date);
  // Récupérer toutes les commandes pour cette date (même non verrouillées)
  const orders = db
    .prepare(
      `SELECT o.id, o.boutique_id, o.delivery_date, o.locked, o.delivered, o.received, b.name AS boutique_name
       FROM orders o
       JOIN boutiques b ON b.id = o.boutique_id
       WHERE o.delivery_date = ?
       ORDER BY b.name`
    )
    .all(deliveryDate);
  // Pour chaque commande, récupérer les items avec quantités finales et calculer le statut
  const recap = orders.map((order) => {
    // Récupérer les items pour cette commande avec leurs catégories afin de regrouper l'affichage
    const rowsItems = db
      .prepare(
        `SELECT p.name, c.name AS category_name, oi.quantity, COALESCE(oi.final_quantity, oi.quantity) AS final_quantity
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         JOIN categories c ON p.category_id = c.id
         WHERE oi.order_id = ?
         ORDER BY c.name, p.name`
      )
      .all(order.id);
    // Organiser les articles par catégorie
    const itemsByCategory = {};
    rowsItems.forEach((row) => {
      if (!itemsByCategory[row.category_name]) {
        itemsByCategory[row.category_name] = [];
      }
      itemsByCategory[row.category_name].push({
        name: row.name,
        quantity: row.quantity,
        final_quantity: row.final_quantity
      });
    });
    return { ...order, itemsByCategory, statusLabel: getOrderStatus(order) };
  });
  res.render('labo/recap', { date: deliveryDate, recap, dates });
});

/**
 * Page historique : affiche toutes les commandes passées pour toutes les dates et toutes les boutiques.
 * Permet au labo d'avoir une trace complète des commandes avec leur statut (verrouillée, livrée, réceptionnée).
 */
router.get('/historique', (req, res) => {
  // Récupérer toutes les commandes avec leur boutique, triées par date décroissante
  const rows = db
    .prepare(
      `SELECT o.id, o.boutique_id, o.delivery_date, o.locked, o.delivered, o.received, b.name AS boutique_name
       FROM orders o
       JOIN boutiques b ON b.id = o.boutique_id
       ORDER BY o.delivery_date DESC, b.name ASC`
    )
    .all();
  // Pour chaque commande, compter le nombre total d'articles (quantité finale si définie, sinon quantité demandée)
  const orders = rows.map((order) => {
    const countRow = db
      .prepare(
        `SELECT SUM(COALESCE(oi.final_quantity, oi.quantity)) AS total
         FROM order_items oi
         WHERE oi.order_id = ?`
      )
      .get(order.id);
    const totalItems = countRow ? countRow.total : 0;
    return { ...order, totalItems };
  });
  res.render('labo/historique', { orders });
});

// Générer le PDF du plan de production
router.get('/production/:date.pdf', (req, res) => {
  const deliveryDate = req.params.date;
  // Définir les en-têtes
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="plan-production-${deliveryDate}.pdf"`
  );
  // Créer le document
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(18).text(`Plan de production - ${deliveryDate}`, { align: 'center' });
  doc.moveDown();
  // Récupérer liste de produits et quantités finales
  const products = db
    .prepare(
      `SELECT p.id, p.name, c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ORDER BY c.name, p.name`
    )
    .all();
  // Récupérer final quantities
  const planRows = db
    .prepare(
      'SELECT product_id, final_quantity FROM production_plans WHERE delivery_date = ?'
    )
    .all(deliveryDate);
  const finalQuantities = {};
  planRows.forEach((row) => {
    finalQuantities[row.product_id] = row.final_quantity;
  });
  // Si pas de plan, utiliser les quantités totales des commandes
  let fallback = false;
  if (Object.keys(finalQuantities).length === 0) {
    fallback = true;
    const totalRows = db
      .prepare(
        `SELECT oi.product_id, SUM(oi.quantity) AS qty
         FROM orders o JOIN order_items oi ON o.id = oi.order_id
         WHERE o.delivery_date = ?
         GROUP BY oi.product_id`
      )
      .all(deliveryDate);
    totalRows.forEach((row) => {
      finalQuantities[row.product_id] = row.qty;
    });
  }
  // Dessiner un tableau simple
  let currentCategory = '';
  products.forEach((p) => {
    const qty = finalQuantities[p.id] || 0;
    if (p.category_name !== currentCategory) {
      currentCategory = p.category_name;
      doc.fontSize(14).fillColor('#5D4037').text(currentCategory, { underline: true });
    }
    doc.fontSize(12).fillColor('black').text(`${p.name} : ${qty}`, { indent: 20 });
  });
  if (fallback) {
    doc.moveDown();
    doc.fontSize(10).fillColor('red').text(
      '*Aucune quantité finale définie. Les quantités proviennent des commandes consolidées.',
      { italics: true }
    );
  }
  doc.end();
});

// Générer le PDF du plan de livraison
router.get('/delivery/:date.pdf', (req, res) => {
  const deliveryDate = req.params.date;
  // Définir les en-têtes
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="plan-livraison-${deliveryDate}.pdf"`
  );
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(res);
  doc.fontSize(18).text(`Plan de livraison - ${deliveryDate}`, { align: 'center' });
  doc.moveDown();
  // Récupérer boutiques et commandes
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  boutiques.forEach((b) => {
    doc.fontSize(14).fillColor('#5D4037').text(b.name);
    // Récupérer quantités par produit
    const rows = db
      .prepare(
        `SELECT p.name AS product_name, SUM(oi.quantity) AS qty
         FROM orders o
         JOIN order_items oi ON o.id = oi.order_id
         JOIN products p ON oi.product_id = p.id
         WHERE o.boutique_id = ? AND o.delivery_date = ?
         GROUP BY p.name
         ORDER BY p.name`
      )
      .all(b.id, deliveryDate);
    rows.forEach((row) => {
      doc.fontSize(12).fillColor('black').text(`${row.product_name} : ${row.qty}`, { indent: 20 });
    });
    doc.moveDown();
  });
  doc.end();
});

module.exports = router;