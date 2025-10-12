const express = require('express');
const router = express.Router();
const db = require('../db');
const dayjs = require('dayjs');

const { timezone, cutoffHour } = require('../config');

function isPastCutoff(now) {
  const d = dayjs(now).tz ? dayjs(now).tz(timezone) : dayjs(now);
  const cutoff = d.hour(cutoffHour).minute(0).second(0);
  return d.isAfter(cutoff);
}

// Dashboard boutique
router.get('/', (req, res) => {
  const boutique = db.prepare('SELECT * FROM boutiques WHERE id = ?').get(req.session.user.boutique_id);
  const today = dayjs().format('YYYY-MM-DD');
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const order = db.prepare('SELECT * FROM orders WHERE boutique_id = ? AND for_date = ?').get(boutique.id, targetDate);
  res.render('dashboard_boutique', { user: req.session.user, boutique, order, targetDate, today, cutoffHour });
});

// Créer/éditer commande
router.get('/order', (req, res) => {
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  let order = db.prepare('SELECT * FROM orders WHERE boutique_id = ? AND for_date = ?').get(req.session.user.boutique_id, targetDate);
  if (!order) {
    const info = db.prepare('INSERT INTO orders (boutique_id, for_date, created_by, status) VALUES (?,?,?,?)'
    ).run(req.session.user.boutique_id, targetDate, req.session.user.id, 'draft');
    order = db.prepare('SELECT * FROM orders WHERE id = ?').get(info.lastInsertRowid);
  }
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);

  // Suggestions: avg sold_qty for same weekday over last 14 occurrences
  const weekday = dayjs(targetDate).day();
  const suggestions = {};
  for (const p of products) {
    const rows = db.prepare(`
      SELECT AVG(sold_qty) AS avgq FROM sales
      WHERE boutique_id = ? AND product_id = ?
        AND CAST (strftime('%w', sold_date) AS INTEGER) = ?
        AND sold_date < ?
      ORDER BY sold_date DESC LIMIT 14
    `).get(req.session.user.boutique_id, p.id, weekday, targetDate);
    suggestions[p.id] = Math.round(rows?.avgq || 0);
  }

  const cutoffPassed = isPastCutoff(new Date());
  const locked = cutoffPassed || order.status === 'locked';
  res.render('order_form', { user: req.session.user, order, products, items, suggestions, locked, cutoffHour });
});

router.post('/order/items', (req, res) => {
  const { product_id, qty } = req.body;
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const order = db.prepare('SELECT * FROM orders WHERE boutique_id = ? AND for_date = ?').get(req.session.user.boutique_id, targetDate);
  if (!order) return res.redirect('/boutique/order');
  if (order.status === 'locked') return res.status(400).send('Commande verrouillée');
  const existing = db.prepare('SELECT * FROM order_items WHERE order_id = ? AND product_id = ?').get(order.id, product_id);
  if (existing) {
    db.prepare('UPDATE order_items SET qty = ? WHERE id = ?').run(Number(qty||0), existing.id);
  } else {
    db.prepare('INSERT INTO order_items (order_id, product_id, qty) VALUES (?,?,?)').run(order.id, product_id, Number(qty||0));
  }
  db.prepare('UPDATE orders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(order.id);
  res.redirect('/boutique/order');
});

router.post('/order/submit', (req, res) => {
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const order = db.prepare('SELECT * FROM orders WHERE boutique_id = ? AND for_date = ?').get(req.session.user.boutique_id, targetDate);
  if (!order) return res.redirect('/boutique/order');
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run('submitted', order.id);
  res.redirect('/boutique');
});

module.exports = router;
