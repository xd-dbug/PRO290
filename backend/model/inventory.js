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

async function getInventoryStats(userId) {
    const [rows] = await pool.execute(
        'SELECT rarity, COUNT(*) AS count FROM inventory WHERE user_id = ? GROUP BY rarity',
        [userId]
    );
    const byRarity = { common: 0, rare: 0, legendary: 0, mythic: 0 };
    let total = 0;
    for (const row of rows) {
        byRarity[row.rarity] = Number(row.count);
        total += Number(row.count);
    }
    return { total, byRarity };
}

module.exports = { grantItem, getInventoryByUser, getInventoryStats };