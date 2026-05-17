const express = require('express');
const { grantItem, getInventoryByUser } = require('../model/inventory');

const router = express.Router();

router.post('/', async (req, res) => {
    if (req.headers['x-internal-secret'] !== process.env.X_INTERNAL_SECRET) {
        return res.status(403).json({ error: 'forbidden' });
    }
    const { userId, itemId, itemName, rarity, spriteKey, sessionId } = req.body;
    if (!userId || !itemId || !itemName || !rarity || !spriteKey || !sessionId) {
        return res.status(400).json({ error: 'missing required fields' });
    }
    try {
        await grantItem(userId, itemId, itemName, rarity, spriteKey, sessionId);
        return res.status(201).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.get('/', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const items = await getInventoryByUser(userId);
        return res.status(200).json(items);
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

module.exports = router;