const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.bookings);
});

router.get('/user/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const bookings = db.bookings.filter(b => b.user_id === userId);
  res.json(bookings);
});

module.exports = router;
