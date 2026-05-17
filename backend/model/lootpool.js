const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    itemId:     { type: String, required: true, unique: true },
    name:       { type: String, required: true },
    rarity:     { type: String, required: true, enum: ['common', 'rare', 'legendary', 'mythic'] },
    dropWeight: { type: Number, required: true },
    spriteKey:  { type: String, required: true }
}, { collection: 'loot_pool' });

module.exports = mongoose.model('LootItem', schema);