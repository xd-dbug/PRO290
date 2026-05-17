const LootItem = require('../model/lootpool');

const INVENTORY_URL = process.env.INVENTORY_URL || 'http://inventory-service:3005';
const X_INTERNAL_SECRET = process.env.X_INTERNAL_SECRET;

function weightedRoll(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.dropWeight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of items) {
        roll -= item.dropWeight;
        if (roll <= 0) return item;
    }
    return items[items.length - 1];
}

async function processSession({ userId, sessionId }) {
    const items = await LootItem.find({});
    if (items.length === 0) throw new Error('loot_pool is empty');

    const item = weightedRoll(items);

    const res = await fetch(`${INVENTORY_URL}/inventory`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': X_INTERNAL_SECRET
        },
        body: JSON.stringify({
            userId,
            itemId: item.itemId,
            itemName: item.name,
            rarity: item.rarity,
            spriteKey: item.spriteKey,
            sessionId
        })
    });

    if (!res.ok) throw new Error(`Inventory service responded ${res.status}`);
    console.log(`[dungeon] granted ${item.rarity} "${item.name}" to user ${userId}`);
}

module.exports = { weightedRoll, processSession };