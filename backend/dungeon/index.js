const express = require('express');
const { connect: connectMongo } = require('../db/mongo');
const { startConsumer } = require('./consumer');
const { registerWithConsul } = require('../lib/consul');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'dungeon' }));

async function start() {
    await connectMongo();
    await startConsumer();
    await registerWithConsul('dungeon', PORT);
    app.listen(PORT, () => {
        console.log(`Dungeon service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start dungeon service:', err);
    process.exit(1);
});