const express = require('express');
// Utilitaire simple pour obtenir une date ISO (YYYY-MM-DD) pour demain
function getTomorrowISO(baseDate) {
  const d = baseDate ? new Date(baseDate) : new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}
const { db } = require('../db');

const router = express.Router();
const PDFDocument = require('pdfkit');

/**
 * Page principale du livreur : affiche la liste des livraisons pour une date donnée
 * Par défaut, on affiche les livraisons du lendemain (J+1) afin que le livreur
 * récupère la production du jour pour livrer le matin même.
 */
router.get('/', (req, res) => {
  // Récupérer la date passée en query ou prendre demain par défaut
  const queryDate = req.query.date;
  const date = queryDate || getTomorrowISO();
  // Récupérer toutes les commandes verrouillées pour cette date
  const orders = db
    .prepare(
      `SELECT o.id, o.boutique_id, o.delivery_date, o.locked, o.delivered, o.received, b.name AS boutique_name
       FROM orders o
       JOIN boutiques b ON b.id = o.boutique_id
       WHERE o.delivery_date = ? AND o.locked = 1
       ORDER BY b.name`
    )
    .all(date);
  // Pour chaque commande, récupérer les items
  const recap = orders.map((order) => {
    const items = db
      .prepare(
        `SELECT p.name, oi.quantity, COALESCE(oi.final_quantity, oi.quantity) AS final_quantity
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`
      )
      .all(order.id);
    return { ...order, items };
  });
  res.render('livreur/recap', { date, recap });
});

/**
 * Génère un PDF récapitulatif des livraisons pour une date donnée.
 * Le PDF contient une section par boutique avec les produits et quantités finales.
 */
router.get('/pdf/:date', (req, res) => {
  const date = req.params.date;
  // Récupérer les commandes verrouillées pour cette date
  const orders = db
    .prepare(
      `SELECT o.id, o.boutique_id, b.name AS boutique_name
       FROM orders o
       JOIN boutiques b ON b.id = o.boutique_id
       WHERE o.delivery_date = ? AND o.locked = 1
       ORDER BY b.name`
    )
    .all(date);
  const recap = orders.map((order) => {
    const items = db
      .prepare(
        `SELECT p.name, COALESCE(oi.final_quantity, oi.quantity) AS qty
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?
         ORDER BY p.name`
      )
      .all(order.id);
    return { boutique_name: order.boutique_name, items };
  });
  // Créer le PDF
  const doc = new PDFDocument({ margin: 30 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="livraisons_${date}.pdf"`);
  doc.pipe(res);
  // En-tête avec bandeau coloré
  doc.rect(0, 0, 612, 50).fill('#5A3E36');
  doc.fill('#FFFFFF').fontSize(16).text(`Récapitulatif des livraisons – ${date}`, 30, 15);
  doc.moveDown();
  if (recap.length === 0) {
    // Afficher un message si aucune commande verrouillée
    doc.fill('#000000').fontSize(12).text('Aucune commande verrouillée pour cette date.', { align: 'left' });
    doc.end();
    return;
  }
  // Contenu par boutique
  recap.forEach((order, index) => {
    doc.fill('#5A3E36').fontSize(14).text(order.boutique_name, { underline: true });
    doc.moveDown(0.3);
    order.items.forEach((it) => {
      // Produit et quantité alignés sur la même ligne
      doc.fill('#000000').fontSize(12);
      doc.text(`${it.name}`, { continued: true });
      doc.text(`${it.qty}`, { align: 'right' });
    });
    if (index < recap.length - 1) {
      doc.moveDown();
    }
  });
  doc.end();
});

/**
 * Marquer une commande comme livrée.
 * Met à jour le champ delivered à 1 pour la commande.
 */
router.post('/deliver/:id', (req, res) => {
  const id = req.params.id;
  db.prepare('UPDATE orders SET delivered = 1 WHERE id = ?').run(id);
  // Retourner à la page avec même date
  const backDate = req.body.date || getTomorrowISO();
  res.redirect('/livreur?date=' + backDate);
});

module.exports = router;