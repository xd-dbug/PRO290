const express = require('express');
const { registerWithConsul } = require('../lib/consul');
const inventoryRouter = require('./inventoryservice');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'inventory' }));
app.use('/inventory', inventoryRouter);

async function start() {
    await registerWithConsul('inventory', PORT);
    app.listen(PORT, () => {
        console.log(`Inventory service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start inventory service:', err);
    process.exit(1);
});