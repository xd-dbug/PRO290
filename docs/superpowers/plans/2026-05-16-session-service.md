# Session Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the session service — start/end/heartbeat endpoints with anti-abuse rules (threshold, daily cap, heartbeat invalidation) and RabbitMQ event publishing for qualifying sessions.

**Architecture:** Thin Express router (`sessionservice.js`) delegates to a pure business-logic layer (`session.service.js`), which calls raw DB queries (`model/sessions.js`) and publishes to a RabbitMQ singleton (`lib/rabbitmq.js`). A `setInterval` sweeper in `index.js` marks zombie sessions as invalidated. Tests target the service layer only — no HTTP layer, no live DB, no live queue.

**Tech Stack:** Node.js, Express, mysql2, amqplib, Jest

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/model/sessions.js` | Create | Raw SQL queries — no business logic |
| `backend/lib/rabbitmq.js` | Create | AMQP connection + channel singleton |
| `backend/session/session.service.js` | Create | All business logic: threshold, cap, stale check, publish |
| `backend/session/sessionservice.js` | Create | Thin Express router — HTTP ↔ service translation only |
| `backend/session/index.js` | Create | App entry: Express setup, sweeper, RabbitMQ init |
| `backend/session/sessionservice.test.js` | Create | Jest unit tests (service layer, all mocked) |
| `backend/session/Dockerfile` | Create | Mirror of `auth/Dockerfile` |
| `backend/package.json` | Modify | Add `amqplib` dependency |
| `docker-compose.yml` | Modify | Add RabbitMQ service + session-service |
| `backend/nginx.conf` | Modify | Uncomment session-service upstream + location |
| `.env.example` | Modify | Add `RABBITMQ_URL` |

---

## Task 1: Add amqplib dependency

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install amqplib**

Run from `backend/`:
```bash
cd /path/to/project/backend && npm install amqplib
```

- [ ] **Step 2: Verify it appears in package.json**

```bash
grep amqplib backend/package.json
```
Expected output: `"amqplib": "^0.10.x"` (or similar version)

- [ ] **Step 3: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: add amqplib dependency for RabbitMQ"
```

---

## Task 2: Model layer — raw DB queries

**Files:**
- Create: `backend/model/sessions.js`

The model layer has **no business logic** — only SQL. It exports exactly the functions the service layer needs to mock in tests.

- [ ] **Step 1: Write `backend/model/sessions.js`**

```js
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
        'SELECT COUNT(*) AS count FROM sessions WHERE user_id = ? AND is_qualifying = 1 AND DATE(ended_at) = CURDATE()',
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

async function sweepStaleSessions() {
    await pool.execute(
        `UPDATE sessions
         SET is_invalidated = 1
         WHERE ended_at IS NULL
           AND last_heartbeat < DATE_SUB(NOW(), INTERVAL 90 SECOND)`
    );
}

module.exports = {
    createSession,
    getSession,
    updateSession,
    getQualifyingCountToday,
    updateHeartbeat,
    markInvalidated,
    sweepStaleSessions
};
```

- [ ] **Step 2: Commit**

```bash
git add backend/model/sessions.js
git commit -m "feat: add sessions model with raw DB queries"
```

---

## Task 3: RabbitMQ singleton

**Files:**
- Create: `backend/lib/rabbitmq.js`

`connect()` is called once at app startup. The `rabbitmq` object holds the channel reference — the service layer imports `rabbitmq` and calls `rabbitmq.channel.publish(...)`. The exchange is asserted on connect (idempotent).

- [ ] **Step 1: Write `backend/lib/rabbitmq.js`**

```js
const amqp = require('amqplib');

const EXCHANGE = 'dungeon.events';
const rabbitmq = { channel: null };

async function connect() {
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    rabbitmq.channel = await conn.createChannel();
    await rabbitmq.channel.assertExchange(EXCHANGE, 'topic', { durable: true });
}

module.exports = { connect, rabbitmq, EXCHANGE };
```

- [ ] **Step 2: Commit**

```bash
git add backend/lib/rabbitmq.js
git commit -m "feat: add RabbitMQ connection singleton"
```

---

## Task 4: Write failing tests (TDD)

**Files:**
- Create: `backend/session/sessionservice.test.js`

Tests run against the **service layer only**. Both `model/sessions` and `lib/rabbitmq` are fully mocked — no live DB, no live queue. The service's `endSession` accepts an optional `now` parameter so tests control timestamps deterministically.

- [ ] **Step 1: Write `backend/session/sessionservice.test.js`**

```js
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
```

- [ ] **Step 2: Run the tests — confirm they fail because the service doesn't exist yet**

Run from `backend/`:
```bash
npm test -- --testPathPattern=session
```
Expected: FAIL — `Cannot find module './session.service'`

---

## Task 5: Implement session.service.js

**Files:**
- Create: `backend/session/session.service.js`

Write the minimal implementation that makes all 5 tests pass. The `now` parameter defaults to `new Date()` in production but is injected by tests.

- [ ] **Step 1: Write `backend/session/session.service.js`**

```js
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
```

- [ ] **Step 2: Run the tests — confirm all pass**

```bash
npm test -- --testPathPattern=session
```
Expected:
```
PASS  session/sessionservice.test.js
  startSession
    ✓ creates a DB record and returns sessionId
  endSession
    ✓ calculates duration correctly and calls updateSession
    ✓ returns below_threshold for sessions under 25 minutes
    ✓ returns daily_cap_reached when qualifying count is 5
    ✓ invalidates stale session and returns session_invalidated
  heartbeat
    ✓ calls updateHeartbeat for active session

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

- [ ] **Step 3: Commit**

```bash
git add backend/session/session.service.js backend/session/sessionservice.test.js
git commit -m "feat: implement session service with anti-abuse rules (TDD)"
```

---

## Task 6: Route handlers

**Files:**
- Create: `backend/session/sessionservice.js`

Thin Express router. Reads `X-User-ID`, calls the service, maps the returned `status` field to HTTP status codes. No business logic here.

- [ ] **Step 1: Write `backend/session/sessionservice.js`**

```js
const express = require('express');
const service = require('./session.service');

const router = express.Router();

router.post('/', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const result = await service.startSession(userId);
        return res.status(201).json(result);
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.post('/:id/end', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const result = await service.endSession(userId, req.params.id);
        if (result.status === 404) return res.status(404).json({ error: 'session not found' });
        if (result.status === 403) return res.status(403).json({ error: 'forbidden' });
        if (result.status === 409) return res.status(409).json({ error: 'session already ended' });
        if (result.status === 422) return res.status(422).json({ error: result.error, reason: result.reason });
        const { status, ...body } = result;
        return res.status(200).json(body);
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.post('/:id/heartbeat', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const result = await service.heartbeat(userId, req.params.id);
        if (result.status === 404) return res.status(404).json({ error: 'session not found' });
        if (result.status === 403) return res.status(403).json({ error: 'forbidden' });
        if (result.status === 422) return res.status(422).json({ error: 'session not active' });
        return res.status(200).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

module.exports = router;
```

- [ ] **Step 2: Commit**

```bash
git add backend/session/sessionservice.js
git commit -m "feat: add session service route handlers"
```

---

## Task 7: Express entry point

**Files:**
- Create: `backend/session/index.js`

Connects to RabbitMQ before accepting requests. The sweeper runs every 60 seconds and catches its own errors so a failed sweep doesn't crash the process.

- [ ] **Step 1: Write `backend/session/index.js`**

```js
const express = require('express');
const { connect } = require('../lib/rabbitmq');
const model = require('../model/sessions');
const sessionRouter = require('./sessionservice');

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use('/sessions', sessionRouter);

async function start() {
    await connect();
    setInterval(() => model.sweepStaleSessions().catch(console.error), 60 * 1000);
    app.listen(PORT, () => {
        console.log(`Session service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start session service:', err);
    process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add backend/session/index.js
git commit -m "feat: add session service entry point with sweeper"
```

---

## Task 8: Dockerfile

**Files:**
- Create: `backend/session/Dockerfile`

Mirrors `backend/auth/Dockerfile` exactly — same base image, same WORKDIR. Only the port and entry point differ.

- [ ] **Step 1: Write `backend/session/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3003
CMD ["node", "session/index.js"]
```

- [ ] **Step 2: Commit**

```bash
git add backend/session/Dockerfile
git commit -m "feat: add session service Dockerfile"
```

---

## Task 9: docker-compose.yml — RabbitMQ + session-service

**Files:**
- Modify: `docker-compose.yml`

Add RabbitMQ with the management UI (useful for debugging during development). Add session-service with `deploy: replicas: 3` so all three instances share a single service name — nginx will round-robin across them.

- [ ] **Step 1: Add the `rabbitmq` service block** inside the `services:` key (before `volumes:`):

```yaml
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

- [ ] **Step 2: Add the `session-service` block** after the `rabbitmq` block:

```yaml
  session-service:
    build:
      context: ./backend
      dockerfile: session/Dockerfile
    environment:
      DB_HOST: mysql
      DB_USER: ${MYSQL_USER}
      DB_PASSWORD: ${MYSQL_PASSWORD}
      DB_NAME: ${MYSQL_DATABASE}
      RABBITMQ_URL: ${RABBITMQ_URL}
      PORT: 3003
    depends_on:
      mysql:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    deploy:
      replicas: 3
```

- [ ] **Step 3: Add session-service as an nginx dependency**

In the `nginx` service block, add `session-service` to the `depends_on` list:
```yaml
  nginx:
    ...
    depends_on:
      - auth-service
      - user-service
      - session-service
```

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add RabbitMQ and session-service to docker-compose"
```

---

## Task 10: nginx.conf and .env.example

**Files:**
- Modify: `backend/nginx.conf`
- Modify: `.env.example`

Nginx gets a single upstream entry for session-service — Docker's DNS will balance across all three replicas automatically. The commented-out three-server block is replaced with this single entry.

- [ ] **Step 1: Uncomment and update the session-service upstream in `backend/nginx.conf`**

Replace:
```nginx
    # upstream session-service {
    #     server session-service-1:3003;
    #     server session-service-2:3003;
    #     server session-service-3:3003;
    # }
```

With:
```nginx
    upstream session-service {
        server session-service:3003;
    }
```

- [ ] **Step 2: Uncomment the session location block** inside the `location /api/` block:

Replace:
```nginx
            # location /api/sessions/ { proxy_pass http://session-service/sessions/; }
```

With:
```nginx
            location /api/sessions/ {
                proxy_pass http://session-service/sessions/;
            }
```

- [ ] **Step 3: Add RABBITMQ_URL to `.env.example`**

Append to `.env.example`:
```
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```

- [ ] **Step 4: Commit**

```bash
git add backend/nginx.conf .env.example
git commit -m "feat: wire session-service into nginx and add RABBITMQ_URL to env"
```

---

## Final verification

- [ ] Run full test suite to confirm nothing is broken:

```bash
cd backend && npm test
```
Expected: all tests pass, including the 6 session service tests.

- [ ] Add `RABBITMQ_URL` to your local `.env` file (not committed):

```
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672
```