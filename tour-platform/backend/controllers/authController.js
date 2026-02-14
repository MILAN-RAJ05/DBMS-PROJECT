const oracledb = require('oracledb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/oracle');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const register = async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const sql = `
            INSERT INTO USERS (name, email, phone, password)
            VALUES (:name, :email, :phone, :password)
        `;
        const binds = { name, email, phone, password: hashedPassword };

        await db.execute(sql, binds, { autoCommit: true });
        res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
        console.error('Error during registration:', err);
        if (err.message && err.message.includes('unique constraint')) {
            res.status(400).json({ message: 'Email already registered.' });
        } else {
            res.status(500).json({ message: 'Server error during registration.', error: err.message });
        }
    }
};

const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;
        
        let table, idCol;
        if (role === 'admin') {
            table = 'ADMINS';
            idCol = 'ADMIN_ID';
        } else {
            table = 'USERS';
            idCol = 'USER_ID';
        }

        const sql = `SELECT ${idCol}, EMAIL, PASSWORD FROM ${table} WHERE EMAIL = :email`;
        const binds = { email };

        const result = await db.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const user = result.rows[0];

        const passwordMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials.' });
        }
        
        const token = jwt.sign(
            { id: user[idCol], email: user.EMAIL, role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );
        
        res.status(200).json({ message: 'Logged in successfully!', token, role: role });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ message: 'Server error during login.', error: err.message });
    }
};

const logout = (req, res) => {
    res.status(200).json({ message: 'Logged out successfully.' });
};

module.exports = {
    register,
    login,
    logout,
};
