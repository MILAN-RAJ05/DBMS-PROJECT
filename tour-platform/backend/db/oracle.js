const oracleddb = require('oracledb');
const dotenv = require('dotenv');

dotenv.config();

let pool;

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    poolAlias: 'tour-platform-pool',
    poolMax: 10,
    poolMin: 2,
    poolIncrement: 2
};

async function initialize() {
    try {
        pool = await oracleddb.createPool(dbConfig);
        console.log('Oracle connection pool initialized.');
    } catch (err) {
        console.error('Error creating Oracle connection pool:', err);
        process.exit(1);
    }
}

async function terminate() {
    try {
        if (pool) {
            await pool.close(0);
            console.log('Oracle connection pool terminated.');
        }
    } catch (err) {
        console.error('Error terminating Oracle connection pool:', err);
    }
}

async function execute(sql, binds, options) {
    let connection;
    try {
        if (!pool) {
            throw new Error('Database connection pool is not initialized.');
        }
        connection = await pool.getConnection();
        const result = await connection.execute(sql, binds, options);
        return result;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error('Error closing connection:', err);
            }
        }
    }
}

module.exports = {
    initialize,
    execute,
    terminate,
    oracleddb: oracleddb 
};
