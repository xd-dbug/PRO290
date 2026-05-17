const pool = require('../db/mysql');

async function grantItem(userId, itemId, itemName, rarity, spriteKey, sessionId) {
    await pool.execute(
        'INSERT INTO inventory (user_id, item_id, item_name, rarity, sprite_key, session_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, itemId, itemName, rarity, spriteKey, sessionId]
    );
}

async function getInventoryByUser(userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM inventory WHERE user_id = ? ORDER BY granted_at DESC',
        [userId]
    );
    return rows;
}

module.exports = { grantItem, getInventoryByUser };