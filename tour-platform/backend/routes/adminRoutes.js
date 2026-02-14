const express = require('express');
const router = express.Router();
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const adminController = require('../controllers/adminController');

router.use(authenticate, authorizeAdmin);

router.get('/stats', adminController.getDashboardStats);
router.get('/packages', adminController.getAllPackages);
router.post('/packages', adminController.createPackage);
router.put('/packages/:packageId', adminController.updatePackage);
router.delete('/packages/:packageId', adminController.deletePackage);
router.get('/users', adminController.getAllUsers);
router.delete('/users/:userId', adminController.deleteUser);
router.get('/bookings', adminController.getAllBookings);
router.delete('/bookings/:bookingId', adminController.deleteBooking);
router.get('/payments', adminController.getAllPayments);
router.get('/itinerary/:packageId', adminController.getItineraryByPackage);
router.post('/itinerary/:packageId', adminController.addItineraryItem);
router.delete('/itinerary/:itemId', adminController.deleteItineraryItem);

module.exports = router;
