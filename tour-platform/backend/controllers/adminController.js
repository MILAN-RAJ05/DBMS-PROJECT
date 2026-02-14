const db = require('../db/oracle');
const { oracleddb } = db;

const getDashboardStats = async (req, res) => {
    try {
        const sql = `
            SELECT
                (SELECT COUNT(*) FROM tour_packages) AS packages,
                (SELECT COUNT(*) FROM users) AS users,
                (SELECT COUNT(*) FROM bookings) AS bookings,
                (SELECT COUNT(*) FROM payments) AS payments
            FROM dual
        `;
        const result = await db.execute(sql, [], { outFormat: oracleddb.OUT_FORMAT_OBJECT });
        
        res.json(result.rows); 
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ message: 'Error fetching dashboard stats', error: err.message });
    }
};

const getAllPackages = async (req, res) => {
    try {
        const sql = `SELECT package_id, title, description, price, start_time, number_of_people, bus_details FROM tour_packages ORDER BY package_id`;
        const result = await db.execute(sql, [], { outFormat: oracleddb.OUT_FORMAT_OBJECT });
        
        const packages = await Promise.all(result.rows.map(async (row) => {
            if (row.DESCRIPTION instanceof oracleddb.Lob) {
                row.DESCRIPTION = await row.DESCRIPTION.getData();
            }
            return row;
        }));

        res.json(packages);
    } catch (err) {
        console.error('Error fetching packages:', err);
        res.status(500).json({ message: 'Error fetching packages', error: err.message });
    }
};

const createPackage = async (req, res) => {
    const { title, description, price, start_time, number_of_people, bus_details } = req.body;
    try {
        const sql = `
            INSERT INTO tour_packages (title, description, price, start_time, number_of_people, bus_details, created_by)
            VALUES (:title, :description, :price, TO_DATE(:start_time, 'YYYY-MM-DD"T"HH24:MI'), :number_of_people, :bus_details, :created_by)
        `;
        const binds = { ...req.body, created_by: req.user.id };
        await db.execute(sql, binds, { autoCommit: true });
        res.status(201).json({ message: 'Package created successfully.' });
    } catch (err) {
        console.error('Error creating package:', err);
        res.status(500).json({ message: 'Error creating package', error: err.message });
    }
};

const updatePackage = async (req, res) => {
    const { packageId } = req.params;
    const { title, description, price, start_time, number_of_people, bus_details } = req.body;
    try {
        const sql = `
            UPDATE tour_packages SET
            title = :title, description = :description, price = :price,
            start_time = TO_DATE(:start_time, 'YYYY-MM-DD"T"HH24:MI'), number_of_people = :number_of_people,
            bus_details = :bus_details
            WHERE package_id = :packageId
        `;
        const binds = { ...req.body, packageId };
        const result = await db.execute(sql, binds, { autoCommit: true });
        if (result.rowsAffected && result.rowsAffected > 0) {
            res.json({ message: 'Package updated successfully.' });
        } else {
            res.status(404).json({ message: 'Package not found.' });
        }
    } catch (err) {
        console.error('Error updating package:', err);
        res.status(500).json({ message: 'Error updating package', error: err.message });
    }
};

const deletePackage = async (req, res) => {
    const { packageId } = req.params;
    try {
        const sql = `DELETE FROM tour_packages WHERE package_id = :packageId`;
        const result = await db.execute(sql, { packageId }, { autoCommit: true });
        if (result.rowsAffected && result.rowsAffected > 0) {
            res.json({ message: 'Package deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Package not found.' });
        }
    } catch (err) {
        console.error('Error deleting package:', err);
        res.status(500).json({ message: 'Error deleting package', error: err.message });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const sql = `SELECT user_id, name, email, phone FROM users ORDER BY user_id`;
        const result = await db.execute(sql, [], { outFormat: oracleddb.OUT_FORMAT_OBJECT });
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ message: 'Error fetching users', error: err.message });
    }
};

const deleteUser = async (req, res) => {
    const { userId } = req.params;
    try {
        const sql = `DELETE FROM users WHERE user_id = :userId`;
        const result = await db.execute(sql, { userId }, { autoCommit: true });
        if (result.rowsAffected && result.rowsAffected > 0) {
            res.json({ message: 'User deleted successfully.' });
        } else {
            res.status(404).json({ message: 'User not found.' });
        }
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Error deleting user', error: err.message });
    }
};

const getAllBookings = async (req, res) => {
    try {
        const sql = `
            SELECT 
                b.booking_id, 
                u.name AS user_name, 
                tp.title AS package_title, 
                b.booking_date, 
                b.tour_date, 
                b.starting_point, 
                b.status
            FROM bookings b
            JOIN users u ON b.user_id = u.user_id
            JOIN tour_packages tp ON b.package_id = tp.package_id
            ORDER BY b.booking_id
        `;
        const result = await db.execute(sql, [], { outFormat: oracleddb.OUT_FORMAT_OBJECT });
        
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).json({ message: 'Error fetching bookings', error: err.message });
    }
};

const deleteBooking = async (req, res) => {
    const { bookingId } = req.params;
    try {
        const sql = `DELETE FROM bookings WHERE booking_id = :bookingId`;
        const result = await db.execute(sql, { bookingId }, { autoCommit: true });
        if (result.rowsAffected && result.rowsAffected > 0) {
            res.json({ message: 'Booking deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Booking not found.' });
        }
    } catch (err) {
        console.error('Error deleting booking:', err);
        res.status(500).json({ message: 'Error deleting booking', error: err.message });
    }
};

const getAllPayments = async (req, res) => {
    try {
        const sql = `
            SELECT 
                p.payment_id, 
                p.booking_id, 
                u.name AS user_name, 
                p.amount, 
                p.payment_date
            FROM payments p
            JOIN bookings b ON p.booking_id = b.booking_id
            JOIN users u ON b.user_id = u.user_id
            ORDER BY p.payment_id
        `;
        const result = await db.execute(sql, [], { outFormat: oracleddb.OUT_FORMAT_OBJECT });

        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching payments:', err);
        res.status(500).json({ message: 'Error fetching payments', error: err.message });
    }
};

const getItineraryByPackage = async (req, res) => {
    const { packageId } = req.params;
    try {
        if (!packageId) {
            return res.status(400).json({ message: 'packageId is required in the URL parameters.' });
        }
        const sql = `SELECT item_id, package_id, day, activity FROM itinerary WHERE package_id = :packageId ORDER BY day`;
        const result = await db.execute(sql, { packageId }, { outFormat: oracleddb.OUT_FORMAT_OBJECT });
        
        const itinerary = await Promise.all(result.rows.map(async (row) => {
            if (row.ACTIVITY instanceof oracleddb.Lob) {
                row.ACTIVITY = await row.ACTIVITY.getData();
            }
            return row;
        }));

        res.json(itinerary);
    } catch (err) {
        console.error('Error fetching itinerary:', err);
        res.status(500).json({ message: 'Error fetching itinerary', error: err.message });
    }
};

const addItineraryItem = async (req, res) => {
    const { packageId } = req.params;
    const { day, activity } = req.body;
    try {
        const sql = `INSERT INTO itinerary (package_id, day, activity) VALUES (:packageId, :day, :activity)`;
        const binds = { packageId, day, activity };
        await db.execute(sql, binds, { autoCommit: true });
        res.status(201).json({ message: 'Itinerary item added successfully.' });
    } catch (err) {
        console.error('Error adding itinerary item:', err);
        res.status(500).json({ message: 'Error adding itinerary item', error: err.message });
    }
};

const deleteItineraryItem = async (req, res) => {
    const { itemId } = req.params;
    try {
        const sql = `DELETE FROM itinerary WHERE item_id = :itemId`;
        const result = await db.execute(sql, { itemId }, { autoCommit: true });
        if (result.rowsAffected && result.rowsAffected > 0) {
            res.json({ message: 'Itinerary item deleted successfully.' });
        } else {
            res.status(404).json({ message: 'Itinerary item not found.' });
        }
    } catch (err) {
        console.error('Error deleting itinerary item:', err);
        res.status(500).json({ message: 'Error deleting itinerary item', error: err.message });
    }
};

module.exports = {
    getDashboardStats,
    getAllPackages,
    createPackage,
    updatePackage,
    deletePackage,
    getAllUsers,
    deleteUser,
    getAllBookings,
    deleteBooking,
    getAllPayments,
    getItineraryByPackage,
    addItineraryItem,
    deleteItineraryItem
};