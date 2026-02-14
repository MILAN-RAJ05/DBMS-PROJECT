const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  res.json(db.payments);
});
router.post('/', (req, res) => {
  const { booking_id, amount, payment_date } = req.body;
  if (!booking_id || !amount) {
    return res.status(400).json({ message: 'booking_id and amount required' });
  }
  const newId = db.getNextId(db.payments);
  const payment = {
    id: newId,
    booking_id,
    amount,
    payment_date: payment_date || new Date().toISOString().slice(0, 10)
  };
  db.payments.push(payment);
  res.json({ message: 'Payment recorded', payment });
});

module.exports = router;
