const { connect, rabbitmq, EXCHANGE } = require('../lib/rabbitmq');
const { processSession } = require('./dungeon.service');

const QUEUE = 'dungeon.queue';

async function startConsumer() {
    await connect();
    const channel = rabbitmq.channel;

    await channel.assertQueue(QUEUE, { durable: true });
    await channel.bindQueue(QUEUE, EXCHANGE, 'session.*');
    channel.prefetch(1);

    channel.consume(QUEUE, async (msg) => {
        if (!msg) return;

        let payload;
        try {
            payload = JSON.parse(msg.content.toString());
        } catch (err) {
            console.error('[dungeon] malformed message, discarding:', err.message);
            channel.nack(msg, false, false);
            return;
        }

        try {
            await processSession(payload);
            channel.ack(msg);
        } catch (err) {
            console.error('[dungeon] processSession failed, requeueing:', err.message);
            channel.nack(msg, false, true);
        }
    }, { noAck: false });

    console.log(`[dungeon] consumer started on queue: ${QUEUE}`);
}

module.exports = { startConsumer };