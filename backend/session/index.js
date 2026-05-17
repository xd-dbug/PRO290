const express = require('express');
const { connect } = require('../lib/rabbitmq');
const { registerWithConsul } = require('../lib/consul');
const model = require('../model/sessions');
const sessionRouter = require('./sessionservice');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'session' }));
app.use('/sessions', sessionRouter);

async function start() {
    await connect();
    setInterval(() => model.sweepStaleSessions().catch(console.error), 60 * 1000);
    await registerWithConsul('session', PORT);
    app.listen(PORT, () => {
        console.log(`Session service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start session service:', err);
    process.exit(1);
});