const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const dotenv = require('dotenv');
const path = require('path');
const db = require('./db/oracle');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend/pages')));
app.use('/js', express.static(path.join(__dirname, '../frontend/js')));
app.use('/css', express.static(path.join(__dirname, '../frontend/css')));

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const packagesRouter = require('./routes/packages');
const itineraryRouter = require('./routes/itinerary');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/user', userRoutes);
app.use('/api/packages', packagesRouter);
app.use('/api/itinerary', itineraryRouter);

cron.schedule('0 0 * * *', async () => {
    console.log('Running nightly cron job to update booking status...');
    try {
        await db.execute('BEGIN update_completed_bookings; END;');
        console.log('Booking statuses updated successfully.');
    } catch (err) {
        console.error('Failed to run cron job to update bookings:', err);
    }
});

db.initialize()
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to initialize database pool:', err);
    process.exit(1);
  });
