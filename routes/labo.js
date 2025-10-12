const express = require('express');
const router = express.Router();
const db = require('../db');
const dayjs = require('dayjs');
const stringify = require('csv-stringify').stringify;

router.get('/', (req, res) => {
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const boutiques = db.prepare('SELECT * FROM boutiques ORDER BY name').all();
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  // Fetch orders + items
  const orders = db.prepare('SELECT * FROM orders WHERE for_date = ? ORDER BY boutique_id').all(targetDate);
  const items = db.prepare(`
    SELECT oi.*, o.boutique_id FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
    WHERE o.for_date = ?
  `).all(targetDate);

  // Adjustments
  const adjustments = db.prepare('SELECT * FROM lab_adjustments WHERE for_date = ?').all(targetDate);
  const adjMap = {};
  for (const a of adjustments) adjMap[`${a.boutique_id}-${a.product_id}`] = a.adjusted_qty;

  res.render('dashboard_labo', { user: req.session.user, targetDate, boutiques, products, orders, items, adjMap });
});

router.post('/adjust', (req, res) => {
  const { boutique_id, product_id, adjusted_qty } = req.body;
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  db.prepare(`
    INSERT INTO lab_adjustments (for_date,boutique_id,product_id,adjusted_qty)
    VALUES (?,?,?,?)
    ON CONFLICT(for_date,boutique_id,product_id) DO UPDATE SET adjusted_qty=excluded.adjusted_qty, updated_at=CURRENT_TIMESTAMP
  `).run(targetDate, boutique_id, product_id, Number(adjusted_qty||0));
  res.redirect('/labo');
});

router.post('/lock', (req, res) => {
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  db.prepare('UPDATE orders SET status = ? WHERE for_date = ?').run('locked', targetDate);
  res.redirect('/labo');
});

// Production plan
router.get('/production', (req, res) => {
  const targetDate = dayjs().add(1, 'day').format('YYYY-MM-DD');
  const products = db.prepare('SELECT * FROM products ORDER BY name').all();
  const items = db.prepare(`
    SELECT p.id AS product_id, p.name, SUM(oi.qty) AS total_ordered
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.for_date = ?
    GROUP BY p.id, p.name
    ORDER BY p.name
  `).all(targetDate);

  // apply adjustments
  const adjRows = db.prepare('SELECT * FROM lab_adjustments WHERE for_date = ?').all(targetDate);
  const adjTotals = {};
  for (const row of adjRows) {
    const key = row.product_id;
    adjTotals[key] = (adjTotals[key] || 0) + row.adjusted_qty;
  }

  // Build plan
  const plan = items.map(i => ({
    product_id: i.product_id,
    product_name: i.name,
    qty: (i.total_ordered || 0) + (adjTotals[i.product_id] || 0)
  }));

  res.render('production_plan', { user: req.session.user, targetDate, plan });
});

router.get('/production.csv', (req, res) => {
  const targetDate = new Date().toISOString().slice(0,10);
  const rows = db.prepare(`
    SELECT p.name AS product, SUM(oi.qty) AS ordered_qty
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE o.for_date = ?
    GROUP BY p.name
    ORDER BY p.name
  `).all(targetDate);
  const adjRows = db.prepare('SELECT * FROM lab_adjustments WHERE for_date = ?').all(targetDate);
  const adjTotals = {};
  for (const row of adjRows) {
    adjTotals[row.product_id] = (adjTotals[row.product_id] || 0) + row.adjusted_qty;
  }
  const productsByName = db.prepare('SELECT id, name FROM products').all()
    .reduce((acc, r) => (acc[r.id]=r.name, acc), {});

  const data = [['product','final_qty']];
  for (const r of rows) {
    // find product id by name
    const pid = Object.entries(productsByName).find(([,name]) => name===r.product)?.[0];
    const final = (r.ordered_qty||0) + (pid ? (adjTotals[pid]||0) : 0);
    data.push([r.product, final]);
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="production_${targetDate}.csv"`);
  res.send(data.map(row => row.join(',')).join('\n'));
});

// Delivery plan (by tour)
router.get('/delivery', (req, res) => {
  const targetDate = new Date().toISOString().slice(0,10);
  const tours = db.prepare('SELECT * FROM tours').all();
  const plans = [];
  for (const t of tours) {
    const stops = db.prepare(`
      SELECT s.*, b.name as boutique_name FROM tour_stops s
      JOIN boutiques b ON b.id = s.boutique_id
      WHERE s.tour_id = ?
      ORDER BY s.stop_order
    `).all(t.id);
    const items = db.prepare(`
      SELECT b.id as boutique_id, b.name as boutique_name, p.name as product, SUM(oi.qty) AS ordered_qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      JOIN boutiques b ON b.id = o.boutique_id
      WHERE o.for_date = ?
      GROUP BY b.id, p.id
    `).all(targetDate);
    const adjRows = db.prepare('SELECT * FROM lab_adjustments WHERE for_date = ?').all(targetDate);
    const adjMap = {};
    for (const row of adjRows) adjMap[`${row.boutique_id}-${row.product_id}`] = row.adjusted_qty;
    const productsById = db.prepare('SELECT id, name FROM products').all()
      .reduce((acc, r) => (acc[r.name]=r.id, acc), {});

    const stopDetails = stops.map(s => {
      const bi = items.filter(i => i.boutique_id === s.boutique_id);
      const lines = bi.map(i => {
        const pid = productsById[i.product];
        const adj = adjMap[`${s.boutique_id}-${pid}`] || 0;
        return { product: i.product, qty: (i.ordered_qty||0) + adj };
      });
      return { stop_order: s.stop_order, boutique_name: s.boutique_name, lines };
    });
    plans.push({ tour: t, stops: stopDetails });
  }
  res.render('delivery_plan', { user: req.session.user, targetDate, plans });
});

module.exports = router;
