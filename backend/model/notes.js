const pool = require('../db/mysql');

async function getNotes(user_id) {
    const [rows] = await pool.execute(
        'SELECT * FROM notes WHERE user_id = ?',
        [user_id]
    );
    return rows;
}

async function createNote(user_id, title, body) {
    const [result] = await pool.execute(
        'INSERT INTO notes (user_id, title, body)  VALUES (?, ?, ?)',
        [user_id, title, body]
    );
    return result;
}

async function updateNote(user_id, note_id, title, body) {
    const fields = [];
    const values = [];
    if (title) { fields.push('title = ?'); values.push(title); }
    if (body)    { fields.push('body = ?');    values.push(body); }

    if (fields.length === 0) return null;

    values.push(user_id, note_id);
    const [update] = await pool.execute(
        `UPDATE notes SET ${fields.join(', ')} WHERE user_id = ? AND note_id = ?`,
        values
    );
    return update;
}

async function deleteNote(user_id, note_id) {
    return await pool.execute(
        'DELETE FROM notes WHERE user_id = ? AND note_id = ?',
        [user_id, note_id]
    )
}

module.exports = {getNotes, createNote, updateNote, deleteNote};