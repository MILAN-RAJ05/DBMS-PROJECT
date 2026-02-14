const db = require('../db/oracle');
const { oracleddb } = db; 
const stringify = require('json-stringify-safe'); 

const STATUSES = {
    PENDING: 'Pending',
    BOOKED: 'Booked',
    COMPLETED: 'Complete',
    CANCELED: 'Canceled', 
};

const handleControllerError = (res, message, err) => {
    console.error(message, err.message);
    const statusCode = 500;
    res.status(statusCode).json({ message, error: err.message });
};

const getAvailablePackages = async (req, res) => {
    try {
        const sql = `
            SELECT package_id, title, description, price, start_time, number_of_people, bus_details 
            FROM tour_packages 
            WHERE start_time <= SYSDATE 
            ORDER BY start_time
        `;
        const result = await db.execute(sql, [], { outFormat: oracleddb.OUT_FORMAT_OBJECT });
        
        const packages = await Promise.all(result.rows.map(async (row) => {
            if (row.DESCRIPTION && row.DESCRIPTION.getData && typeof row.DESCRIPTION.getData === 'function') {
                row.DESCRIPTION = await row.DESCRIPTION.getData();
            }
            return row;
        }));

        res.json(packages);
    } catch (err) {
        handleControllerError(res, 'Error fetching available packages', err);
    }
};

const bookPackage = async (req, res) => {
    const { package_id, starting_point, tour_date } = req.body; 
    const user_id = req.user.id; 
    const booking_date = new Date();
    const status = STATUSES.PENDING;
    
    let booking_id_out = { type: oracleddb.NUMBER, dir: oracleddb.BIND_OUT }; 

    try {
        const sql = `BEGIN create_booking(:user_id, :package_id, :booking_date, :status, :starting_point, :tour_date, :booking_id); END;`;
        
        const binds = { 
            user_id, 
            package_id, 
            booking_date, 
            status, 
            starting_point, 
            tour_date: new Date(tour_date),
            booking_id: booking_id_out 
        };

        const result = await db.execute(sql, binds, { autoCommit: true });

        const bookingId = result.outBinds && result.outBinds.booking_id ? result.outBinds.booking_id[0] : null;

        res.status(201).json({
            message: 'Booking created successfully. Please proceed to payment.',
            bookingId: bookingId 
        });
    } catch (err) {
        handleControllerError(res, 'Error creating booking', err);
    }
};

const createPayment = async (req, res) => {
    const { booking_id, amount } = req.body;
    const user_id = req.user.id;
    const payment_date = new Date();
    
    let payment_id_out = { type: oracleddb.NUMBER, dir: oracleddb.BIND_OUT }; 

    try {
        const bookingCheckSql = `SELECT user_id FROM bookings WHERE booking_id = :booking_id AND status = :pending_status AND user_id = :user_id`;
        const bookingCheckResult = await db.execute(bookingCheckSql, { booking_id, pending_status: STATUSES.PENDING, user_id }, { outFormat: oracleddb.OUT_FORMAT_OBJECT });

        if (bookingCheckResult.rows.length === 0) {
            return res.status(403).json({ message: 'Forbidden: Cannot pay for this booking (either unauthorized, already paid, or canceled).' });
        }

        const paymentResult = await db.execute(`BEGIN create_payment(:booking_id, :amount, :payment_date, :payment_id); END;`,
            { booking_id, amount, payment_date, payment_id: payment_id_out },
            { autoCommit: true }
        );

        await db.execute(`UPDATE bookings SET status = :status WHERE booking_id = :booking_id`,
            { status: STATUSES.BOOKED, booking_id },
            { autoCommit: true }
        );

        const paymentId = paymentResult.outBinds && paymentResult.outBinds.payment_id ? paymentResult.outBinds.payment_id[0] : null;

        res.status(201).json({
            message: 'Payment recorded and booking confirmed.',
            paymentId: paymentId
        });
    } catch (err) {
        handleControllerError(res, 'Error creating payment', err);
    }
};

const cancelBooking = async (req, res) => {
    const { bookingId } = req.params;
    const user_id = req.user.id;

    try {
        const bookingCheckSql = `
            SELECT status FROM bookings 
            WHERE booking_id = :bookingId AND user_id = :userId 
            AND status IN (:pending_status, :booked_status)
        `;
        const checkResult = await db.execute(bookingCheckSql, 
            { bookingId, userId: user_id, pending_status: STATUSES.PENDING, booked_status: STATUSES.BOOKED }, 
            { outFormat: oracleddb.OUT_FORMAT_OBJECT }
        );

        if (checkResult.rows.length === 0) {
            return res.status(403).json({ message: 'Forbidden: Booking cannot be canceled (either not found or already completed/canceled).' });
        }

        const updateSql = `UPDATE bookings SET status = :status WHERE booking_id = :bookingId AND user_id = :userId`;
        const result = await db.execute(updateSql, { status: STATUSES.CANCELED, bookingId, userId: user_id }, { autoCommit: true });

        if (result.rowsAffected > 0) {
            res.json({ message: 'Booking successfully canceled.' });
        } else {
            res.status(404).json({ message: 'Booking not found or already canceled.' });
        }
    } catch (err) {
        handleControllerError(res, 'Error canceling booking', err);
    }
};

const getUserBookings = async (req, res) => {
    const user_id = req.user.id;

    try {
    
        const updateSql = `
            UPDATE bookings
            SET status = :completed_status
            WHERE user_id = :user_id
              AND status = :booked_status
              AND tour_date < SYSDATE
        `;
        
        const updateBinds = { 
            completed_status: STATUSES.COMPLETED, 
            user_id: user_id, 
            booked_status: STATUSES.BOOKED
        };
        
        const updateResult = await db.execute(updateSql, updateBinds, { autoCommit: true });
        console.log(`Updated ${updateResult.rowsAffected} bookings to 'Completed' for user ${user_id}.`);

      
        const fetchSql = `
            SELECT b.booking_id, b.status, b.starting_point, b.booking_date, b.tour_date,
                   tp.title AS package_title, tp.price, tp.start_time
            FROM bookings b
            JOIN tour_packages tp ON b.package_id = tp.package_id
            WHERE b.user_id = :user_id 
            ORDER BY b.booking_date DESC
        `;
        const result = await db.execute(fetchSql, { user_id }, { outFormat: oracleddb.OUT_FORMAT_OBJECT }); 

        res.json(result.rows);

    } catch (err) {
        handleControllerError(res, 'Error fetching user bookings and updating status', err); 
    }

};

const getItineraryForBooking = async (req, res) => {
    const { packageId } = req.params;
    
    try {
        const itineraryResult = await db.execute(
            `SELECT day, activity FROM itinerary WHERE package_id = :packageId ORDER BY day`,
            { packageId },
            { outFormat: oracleddb.OUT_FORMAT_OBJECT }
        );
        
        const itinerary = await Promise.all(itineraryResult.rows.map(async (row) => {
            if (row.ACTIVITY && row.ACTIVITY.getData && typeof row.ACTIVITY.getData === 'function') {
                row.ACTIVITY = await row.ACTIVITY.getData();
            }
            return row;
        }));
        
        res.json(itinerary);
    } catch (err) {
        handleControllerError(res, 'Error fetching itinerary', err);
    }
};

module.exports = {
    getAvailablePackages,
    bookPackage,
    createPayment,
    cancelBooking,
    getUserBookings,
    getItineraryForBooking, 
};