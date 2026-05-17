const express = require('express');
const { registerWithConsul } = require('../lib/consul');
const authRouter = require('./authservice');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'auth' }));
app.use('/auth', authRouter);

async function start() {
    await registerWithConsul('auth', PORT);
    app.listen(PORT, () => {
        console.log(`Auth service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start auth service:', err);
    process.exit(1);
});