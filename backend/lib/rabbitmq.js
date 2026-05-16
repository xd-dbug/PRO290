const amqp = require('amqplib');

const EXCHANGE = 'dungeon.events';
const rabbitmq = { channel: null };

async function connect() {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitmq.channel = await conn.createChannel();
    await rabbitmq.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
}

module.exports = { connect, rabbitmq, EXCHANGE };