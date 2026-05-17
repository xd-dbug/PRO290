// Runs via mongosh on first boot. Idempotent — safe to re-run.
db = db.getSiblingDB('dungeon');

db.loot_pool.createIndex({ itemId: 1 }, { unique: true });

const items = [
    { itemId: 'potion-small',  name: 'Small Potion',        rarity: 'common',    dropWeight: 80, spriteKey: 'potion_small' },
    { itemId: 'sword-wood',    name: 'Wooden Sword',         rarity: 'common',    dropWeight: 60, spriteKey: 'sword_wood' },
    { itemId: 'shield-wood',   name: 'Wooden Shield',        rarity: 'common',    dropWeight: 60, spriteKey: 'shield_wood' },
    { itemId: 'potion-large',  name: 'Large Potion',         rarity: 'rare',      dropWeight: 20, spriteKey: 'potion_large' },
    { itemId: 'sword-iron',    name: 'Iron Sword',           rarity: 'rare',      dropWeight: 20, spriteKey: 'sword_iron' },
    { itemId: 'shield-iron',   name: 'Iron Shield',          rarity: 'rare',      dropWeight: 20, spriteKey: 'shield_iron' },
    { itemId: 'excalibur',     name: 'Excalibur',            rarity: 'legendary', dropWeight: 5,  spriteKey: 'sword_legendary' },
    { itemId: 'armor-dragon',  name: 'Dragon Scale Armor',   rarity: 'legendary', dropWeight: 3,  spriteKey: 'armor_legendary' },
    { itemId: 'ring-power',    name: 'Ring of Power',        rarity: 'legendary', dropWeight: 2,  spriteKey: 'ring_legendary' },
    { itemId: 'witch-hat',     name: 'Witch Hat',            rarity: 'mythic',    dropWeight: 1,  spriteKey: 'witch_hat' },
    { itemId: 'the-seal',      name: 'The Seal',             rarity: 'mythic',    dropWeight: 1,  spriteKey: 'the_seal' }
];

for (const item of items) {
    try {
        db.loot_pool.insertOne(item);
    } catch (e) {
        if (e.code !== 11000) throw e;
    }
}

print('[init.mongo.js] loot_pool seeded: ' + db.loot_pool.countDocuments() + ' items');