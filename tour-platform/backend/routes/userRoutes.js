const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth'); 
const userController = require('../controllers/userController');

router.use(authenticate);
router.get('/packages', userController.getAvailablePackages);
router.get('/itinerary/:packageId', userController.getItineraryForBooking);

router.post('/bookings', userController.bookPackage);
router.get('/bookings', userController.getUserBookings); 
router.put('/bookings/:bookingId/cancel', userController.cancelBooking); 
router.post('/payments', userController.createPayment);

module.exports = router;
