const model = require('../model/sessions');
const { rabbitmq, EXCHANGE } = require('../lib/rabbitmq');

const ROUTING_KEY = 'session.completed';
const HEARTBEAT_TIMEOUT_MS = 90 * 1000;
const DURATION_THRESHOLD_MINUTES = 25;
const DAILY_CAP = 5;

async function startSession(userId) {
    const { session_id } = await model.createSession(userId);
    return { sessionId: session_id };
}

async function endSession(userId, sessionId, now = new Date()) {
    const session = await model.getSession(sessionId);
    if (!session) return { status: 404 };
    if (session.user_id !== userId) return { status: 403 };
    if (session.ended_at !== null) return { status: 409 };
    if (session.is_invalidated) return { status: 422 };

    const msSinceHeartbeat = now - new Date(session.last_heartbeat);
    if (msSinceHeartbeat > HEARTBEAT_TIMEOUT_MS) {
        await model.markInvalidated(sessionId);
        return { status: 422, error: 'session_invalidated', reason: 'heartbeat_timeout' };
    }

    const durationMinutes = Math.floor((now - new Date(session.started_at)) / 60000);

    if (durationMinutes < DURATION_THRESHOLD_MINUTES) {
        await model.updateSession(sessionId, durationMinutes, false);
        return { status: 200, qualifying: false, reason: 'below_threshold' };
    }

    const count = await model.getQualifyingCountToday(userId);
    if (count >= DAILY_CAP) {
        await model.updateSession(sessionId, durationMinutes, false);
        return { status: 200, qualifying: false, reason: 'daily_cap_reached' };
    }

    await model.updateSession(sessionId, durationMinutes, true);
    const payload = {
        userId,
        sessionId,
        durationMinutes,
        completedAt: now.toISOString()
    };
    rabbitmq.channel.publish(
        EXCHANGE,
        ROUTING_KEY,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
    );
    return { status: 200, qualifying: true, durationMinutes };
}

async function heartbeat(userId, sessionId) {
    const session = await model.getSession(sessionId);
    if (!session) return { status: 404 };
    if (session.user_id !== userId) return { status: 403 };
    if (session.ended_at !== null || session.is_invalidated) return { status: 422 };
    await model.updateHeartbeat(sessionId);
    return { status: 200, ok: true };
}

module.exports = { startSession, endSession, heartbeat };