const pool = require('../db/mysql');

async function createUser(email, username, password_hash) {
    const [result] = await pool.execute(
        'INSERT INTO users (email, username, password_hash) VALUES (?, ?, ?)',
        [email, username, password_hash]
    );
    return result;
}

async function findUserByEmail(email) {
    const [rows] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [email]
    );
    return rows[0];
}

module.exports = { createUser, findUserByEmail };