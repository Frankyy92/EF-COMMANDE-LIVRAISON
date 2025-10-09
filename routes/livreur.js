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
  const pageWidth = doc.page.width;
  const headerHeight = 50;
  // bandeau chocolat en haut
  doc.rect(0, 0, pageWidth, headerHeight).fill('#5A3E36');
  doc.fill('#FFFFFF').fontSize(16).text(`Récapitulatif des livraisons – ${date}`, 30, 15);
  // Position de départ sous l'en-tête
  let y = headerHeight + 20;
  // Si aucune commande verrouillée, afficher un message clair
  if (recap.length === 0) {
    doc.fill('#000000').fontSize(12).text('Aucune commande verrouillée pour cette date.', 30, y);
    doc.end();
    return;
  }
  // Définition des couleurs et tailles pour la table
  const col1Width = 400;
  const col2Width = pageWidth - 60 - col1Width; // 60 = margin * 2
  const rowHeight = 20;
  // Parcourir chaque boutique pour dessiner son tableau
  recap.forEach((order, orderIndex) => {
    // Titre de la boutique
    doc.fill('#5A3E36').fontSize(14).text(order.boutique_name, 30, y, { underline: true });
    y += 24; // espace après le titre
    // En-tête de colonne (Produit / Quantité)
    // Fond de l'en-tête couleur accent
    doc.fill('#B08968');
    doc.rect(30, y, col1Width, rowHeight).fill('#B08968');
    doc.rect(30 + col1Width, y, col2Width, rowHeight).fill('#B08968');
    // Texte en blanc
    doc.fill('#FFFFFF').fontSize(12).text('Produit', 30 + 4, y + 4, { width: col1Width - 8, align: 'left' });
    doc.text('Quantité', 30 + col1Width + 4, y + 4, { width: col2Width - 8, align: 'right' });
    y += rowHeight;
    // Lignes de produits avec alternance de couleur de fond
    order.items.forEach((it, i) => {
      const rowColor = i % 2 === 0 ? '#FFFFFF' : '#F4EFE6';
      // ligne produit
      doc.fill(rowColor);
      doc.rect(30, y, col1Width, rowHeight).fill(rowColor);
      doc.rect(30 + col1Width, y, col2Width, rowHeight).fill(rowColor);
      // texte
      doc.fill('#2B2B2B').fontSize(12).text(it.name, 30 + 4, y + 4, { width: col1Width - 8, align: 'left', ellipsis: true });
      doc.text(String(it.qty), 30 + col1Width + 4, y + 4, { width: col2Width - 8, align: 'right' });
      y += rowHeight;
      // Si on arrive en bas de page, créer une nouvelle page
      if (y + rowHeight > doc.page.height - 30) {
        doc.addPage();
        // Réinitialiser y après un saut de page et redessiner l'en-tête
        doc.rect(0, 0, pageWidth, headerHeight).fill('#5A3E36');
        doc.fill('#FFFFFF').fontSize(16).text(`Récapitulatif des livraisons – ${date}`, 30, 15);
        y = headerHeight + 20;
        // Réafficher le titre de la boutique après saut de page
        doc.fill('#5A3E36').fontSize(14).text(order.boutique_name, 30, y, { underline: true });
        y += 24;
        // Redessiner l'en-tête de la table
        doc.fill('#B08968');
        doc.rect(30, y, col1Width, rowHeight).fill('#B08968');
        doc.rect(30 + col1Width, y, col2Width, rowHeight).fill('#B08968');
        doc.fill('#FFFFFF').fontSize(12).text('Produit', 30 + 4, y + 4, { width: col1Width - 8, align: 'left' });
        doc.text('Quantité', 30 + col1Width + 4, y + 4, { width: col2Width - 8, align: 'right' });
        y += rowHeight;
      }
    });
    // Ajouter un espace après chaque boutique
    y += 30;
    // Sauter une page si nécessaire avant la prochaine boutique
    if (orderIndex < recap.length - 1 && y + 50 > doc.page.height - 30) {
      doc.addPage();
      doc.rect(0, 0, pageWidth, headerHeight).fill('#5A3E36');
      doc.fill('#FFFFFF').fontSize(16).text(`Récapitulatif des livraisons – ${date}`, 30, 15);
      y = headerHeight + 20;
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