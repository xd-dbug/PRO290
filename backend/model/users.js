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

async function updateUser(user_id, username, email) {
    const fields = [];
    const values = [];
    if (username) { fields.push('username = ?'); values.push(username); }
    if (email)    { fields.push('email = ?');    values.push(email); }

    if (fields.length === 0) return null;

    values.push(user_id);
    const [update] = await pool.execute(
        `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
        values
    );
    return update;
}

async function findUserByID(user_id){
    const [rows] = await pool.execute(
        'SELECT user_id, email, username, created_at FROM users WHERE user_id = ?',
        [user_id]
    );
    return rows[0];
}

async function deleteUser(user_id) {
    return await pool.execute(
        'DELETE FROM users WHERE user_id = ?',
        [user_id]
    )
}

module.exports = { createUser, findUserByEmail, updateUser, deleteUser, findUserByID };