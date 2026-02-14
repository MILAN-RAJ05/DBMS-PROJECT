const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';

const authenticate = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded || !decoded.id || !decoded.role) {
            return res.status(401).json({ error: 'Token payload invalid' });
        }
        req.user = decoded;
        next();
    } catch (e) {
        console.error('JWT verification failed:', e.message);
        res.status(401).json({ error: 'Token is not valid' });
    }
};

const authorizeAdmin = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied: Not an administrator' });
    }
    next();
};

const authorizeUser = (req, res, next) => {
    if (req.user?.role !== 'user') {
        return res.status(403).json({ error: 'Access denied: Not a standard user' });
    }
    next();
};

module.exports = { authenticate, authorizeAdmin, authorizeUser };
