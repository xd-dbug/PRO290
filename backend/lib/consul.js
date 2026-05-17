const os = require('os');

async function registerWithConsul(serviceName, port) {
    const serviceId = `${serviceName}-${os.hostname()}`;
    const consulHost = process.env.CONSUL_HOST || 'consul';
    try {
        const res = await fetch(`http://${consulHost}:8500/v1/agent/service/register`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ID: serviceId,
                Name: serviceName,
                Address: os.hostname(),
                Port: Number(port),
                Check: {
                    HTTP: `http://${os.hostname()}:${port}/health`,
                    Interval: '10s',
                    Timeout: '5s',
                    DeregisterCriticalServiceAfter: '30s'
                }
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log(`[consul] registered ${serviceId}`);
    } catch (err) {
        console.warn(`[consul] registration failed for ${serviceId}:`, err.message);
    }
}

module.exports = { registerWithConsul };