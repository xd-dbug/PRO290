const express = require('express');
const { registerWithConsul } = require('../lib/consul');
const userRouter = require('./userservice');

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user' }));
app.use('/users', userRouter);

async function start() {
    await registerWithConsul('user', PORT);
    app.listen(PORT, () => {
        console.log(`User service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start user service:', err);
    process.exit(1);
});