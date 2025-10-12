const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('dashboard_labo', { title: 'Labo - Dashboard' });
});

module.exports = router;
