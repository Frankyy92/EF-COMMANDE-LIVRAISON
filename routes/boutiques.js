const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('dashboard_boutique', { title: 'Boutique - Dashboard' });
});

module.exports = router;
