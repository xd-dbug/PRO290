const { randomUUID } = require('crypto');
const pool = require('../db/mysql');

async function createSession(userId) {
    const sessionId = randomUUID();
    await pool.execute(
        'INSERT INTO sessions (session_id, user_id) VALUES (?, ?)',
        [sessionId, userId]
    );
    return { session_id: sessionId };
}

async function getSession(sessionId) {
    const [rows] = await pool.execute(
        'SELECT * FROM sessions WHERE session_id = ?',
        [sessionId]
    );
    return rows[0] || null;
}

async function updateSession(sessionId, durationMinutes, isQualifying) {
    await pool.execute(
        'UPDATE sessions SET ended_at = NOW(), duration_minutes = ?, is_qualifying = ? WHERE session_id = ?',
        [durationMinutes, isQualifying ? 1 : 0, sessionId]
    );
}

async function getQualifyingCountToday(userId) {
    const [rows] = await pool.execute(
        'SELECT COUNT(*) AS count FROM sessions WHERE user_id = ? AND is_qualifying = 1 AND DATE(ended_at) = UTC_DATE()',
        [userId]
    );
    return rows[0].count;
}

async function updateHeartbeat(sessionId) {
    await pool.execute(
        'UPDATE sessions SET last_heartbeat = NOW() WHERE session_id = ?',
        [sessionId]
    );
}

async function markInvalidated(sessionId) {
    await pool.execute(
        'UPDATE sessions SET is_invalidated = 1 WHERE session_id = ?',
        [sessionId]
    );
}

async function sweepStaleSessions(intervalSeconds = 90) {
    await pool.execute(
        `UPDATE sessions
         SET is_invalidated = 1
         WHERE ended_at IS NULL
           AND last_heartbeat < DATE_SUB(NOW(), INTERVAL ? SECOND)`,
        [intervalSeconds]
    );
}

async function getSessionStats(userId) {
    const [rows] = await pool.execute(
        `SELECT
            COUNT(*)                                                            AS total_sessions,
            SUM(is_qualifying)                                                  AS qualifying_sessions,
            COALESCE(SUM(CASE WHEN is_qualifying = 1 THEN duration_minutes END), 0) AS total_qualifying_minutes,
            MAX(duration_minutes)                                               AS longest_session_minutes
         FROM sessions
         WHERE user_id = ? AND ended_at IS NOT NULL AND is_invalidated = 0`,
        [userId]
    );
    return rows[0];
}

module.exports = {
    createSession,
    getSession,
    updateSession,
    getQualifyingCountToday,
    updateHeartbeat,
    markInvalidated,
    sweepStaleSessions,
    getSessionStats
};