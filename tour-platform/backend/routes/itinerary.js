const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userController = require('../controllers/userController');

router.get('/:packageId', authenticate, userController.getItineraryForBooking);

module.exports = router;
