const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('dashboard_admin', { title: 'Admin - Dashboard' });
});

module.exports = router;
