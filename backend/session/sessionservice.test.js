const { startSession, endSession, heartbeat } = require('./session.service');
const model = require('../model/sessions');
const { rabbitmq } = require('../lib/rabbitmq');

jest.mock('../model/sessions');
jest.mock('../lib/rabbitmq', () => ({
    connect: jest.fn(),
    rabbitmq: { channel: { publish: jest.fn() } },
    EXCHANGE: 'dungeon.events'
}));

beforeEach(() => {
    jest.clearAllMocks();
});

const BASE_SESSION = {
    session_id: 'sess-1',
    user_id: 'user-1',
    ended_at: null,
    is_invalidated: 0,
    is_qualifying: 0,
    started_at: null,
    last_heartbeat: null
};

describe('startSession', () => {
    it('creates a DB record and returns sessionId', async () => {
        model.createSession.mockResolvedValue({ session_id: 'uuid-abc' });

        const result = await startSession('user-1');

        expect(result).toEqual({ sessionId: 'uuid-abc' });
        expect(model.createSession).toHaveBeenCalledWith('user-1');
    });
});

describe('endSession', () => {
    it('calculates duration correctly and calls updateSession', async () => {
        const now = new Date('2026-01-01T12:30:00Z');
        model.getSession.mockResolvedValue({
            ...BASE_SESSION,
            started_at: new Date('2026-01-01T12:00:00Z'),
            last_heartbeat: new Date('2026-01-01T12:29:00Z')
        });
        model.getQualifyingCountToday.mockResolvedValue(0);
        model.updateSession.mockResolvedValue();

        const result = await endSession('user-1', 'sess-1', now);

        expect(result.durationMinutes).toBe(30);
        expect(model.updateSession).toHaveBeenCalledWith('sess-1', 30, true);
    });

    it('returns below_threshold for sessions under 25 minutes', async () => {
        const now = new Date('2026-01-01T12:10:00Z');
        model.getSession.mockResolvedValue({
            ...BASE_SESSION,
            started_at: new Date('2026-01-01T12:00:00Z'),
            last_heartbeat: new Date('2026-01-01T12:09:00Z')
        });
        model.updateSession.mockResolvedValue();

        const result = await endSession('user-1', 'sess-1', now);

        expect(result).toMatchObject({ qualifying: false, reason: 'below_threshold' });
        expect(rabbitmq.channel.publish).not.toHaveBeenCalled();
    });

    it('returns daily_cap_reached when qualifying count is 5', async () => {
        const now = new Date('2026-01-01T12:30:00Z');
        model.getSession.mockResolvedValue({
            ...BASE_SESSION,
            started_at: new Date('2026-01-01T12:00:00Z'),
            last_heartbeat: new Date('2026-01-01T12:29:00Z')
        });
        model.getQualifyingCountToday.mockResolvedValue(5);
        model.updateSession.mockResolvedValue();

        const result = await endSession('user-1', 'sess-1', now);

        expect(result).toMatchObject({ qualifying: false, reason: 'daily_cap_reached' });
        expect(rabbitmq.channel.publish).not.toHaveBeenCalled();
    });

    it('invalidates stale session and returns session_invalidated', async () => {
        const now = new Date('2026-01-01T12:30:00Z');
        // last_heartbeat is 150 seconds before now — exceeds the 90-second threshold
        model.getSession.mockResolvedValue({
            ...BASE_SESSION,
            started_at: new Date('2026-01-01T12:00:00Z'),
            last_heartbeat: new Date('2026-01-01T12:27:30Z')
        });
        model.markInvalidated.mockResolvedValue();

        const result = await endSession('user-1', 'sess-1', now);

        expect(result).toMatchObject({ error: 'session_invalidated', reason: 'heartbeat_timeout' });
        expect(model.markInvalidated).toHaveBeenCalledWith('sess-1');
    });
});

describe('heartbeat', () => {
    it('calls updateHeartbeat for active session', async () => {
        model.getSession.mockResolvedValue({ ...BASE_SESSION });
        model.updateHeartbeat.mockResolvedValue();

        const result = await heartbeat('user-1', 'sess-1');

        expect(result).toEqual({ status: 200, ok: true });
        expect(model.updateHeartbeat).toHaveBeenCalledWith('sess-1');
    });
});