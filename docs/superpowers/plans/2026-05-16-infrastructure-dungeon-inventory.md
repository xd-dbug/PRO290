# Infrastructure, Dungeon Service, and Inventory Service Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the backend by adding MongoDB, Consul, Dungeon Service, and Inventory Service, wiring the full loot flow end-to-end, and adding `/health` + Consul self-registration to all five services.

**Architecture:** Session Service publishes `session.completed` events to a RabbitMQ topic exchange; all three Dungeon Service instances compete on a single shared queue (`dungeon.queue`), each processing one event at a time via `prefetch(1)`; the winning instance rolls a weighted random loot item from MongoDB and calls `POST /inventory` (internal, X-Internal-Secret guarded) to persist the grant in MySQL.

**Tech Stack:** Node.js/Express, mongoose (MongoDB/ODM), mysql2, amqplib, native `fetch` (Node 20), Jest, Docker Compose, Consul HTTP API

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `backend/package.json` | Modify | Add `mongoose` dependency |
| `backend/init.sql` | Modify | Add `inventory` table |
| `backend/init.mongo.js` | Create | MongoDB seed script — loot_pool, 11 items, 4 rarities |
| `backend/db/mongo.js` | Create | Mongoose connection singleton |
| `backend/model/lootpool.js` | Create | Mongoose schema + model for loot_pool collection |
| `backend/model/inventory.js` | Create | MySQL queries: grantItem, getInventoryByUser |
| `backend/lib/consul.js` | Create | Consul HTTP agent registration helper |
| `backend/inventory/inventoryservice.js` | Create | Router: POST /inventory (internal), GET /inventory |
| `backend/inventory/index.js` | Create | Inventory service entry point |
| `backend/inventory/Dockerfile` | Create | Mirror of user/Dockerfile, port 3005 |
| `backend/dungeon/dungeon.service.js` | Create | Business logic: weightedRoll, processSession |
| `backend/dungeon/dungeon.service.test.js` | Create | Jest tests for weightedRoll + processSession |
| `backend/dungeon/consumer.js` | Create | RabbitMQ consumer: dungeon.queue binding + ack/nack |
| `backend/dungeon/index.js` | Create | Dungeon service entry point |
| `backend/dungeon/Dockerfile` | Create | Mirror of session/Dockerfile, port 3004 |
| `backend/auth/index.js` | Modify | Add GET /health + Consul registration |
| `backend/user/index.js` | Modify | Add GET /health + Consul registration |
| `backend/session/index.js` | Modify | Add GET /health + Consul registration |
| `backend/nginx.conf` | Modify | Add dungeon + inventory upstreams and location blocks |
| `docker-compose.yml` | Modify | Add MongoDB, Consul, dungeon-service, inventory-service |
| `.env.example` | Modify | Add MONGODB_URI, CONSUL_HOST, X_INTERNAL_SECRET, INVENTORY_URL |

---

## Task 1: Install mongoose + add inventory table

**Files:**
- Modify: `backend/package.json`
- Modify: `backend/init.sql`

- [ ] **Step 1: Install mongoose**

Run from `backend/`:
```bash
cd /home/xd/Neumont/Q7/PRO290/PRO290/backend && npm install mongoose
```

- [ ] **Step 2: Verify it appears in package.json**

```bash
grep mongoose /home/xd/Neumont/Q7/PRO290/PRO290/backend/package.json
```
Expected: `"mongoose": "^8.x.x"` (or similar)

- [ ] **Step 3: Append the inventory table to `backend/init.sql`**

Add to the end of the file:
```sql

create table if not exists inventory (
    id          int          not null auto_increment,
    user_id     char(36)     not null,
    item_id     varchar(50)  not null,
    item_name   varchar(100) not null,
    rarity      varchar(20)  not null,
    sprite_key  varchar(100) not null,
    session_id  char(36)     not null,
    granted_at  timestamp    not null default current_timestamp(),
    primary key (id),
    foreign key (user_id) references users(user_id) on delete cascade
);
```

- [ ] **Step 4: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/init.sql
git commit -m "chore: add mongoose dependency and inventory table schema"
```

---

## Task 2: MongoDB connection singleton

**Files:**
- Create: `backend/db/mongo.js`

- [ ] **Step 1: Write `backend/db/mongo.js`**

```js
const mongoose = require('mongoose');

async function connect() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
}

module.exports = { connect };
```

- [ ] **Step 2: Commit**

```bash
git add backend/db/mongo.js
git commit -m "feat: add MongoDB connection singleton"
```

---

## Task 3: LootItem Mongoose model

**Files:**
- Create: `backend/model/lootpool.js`

- [ ] **Step 1: Write `backend/model/lootpool.js`**

```js
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    itemId:     { type: String, required: true, unique: true },
    name:       { type: String, required: true },
    rarity:     { type: String, required: true, enum: ['common', 'rare', 'legendary', 'mythic'] },
    dropWeight: { type: Number, required: true },
    spriteKey:  { type: String, required: true }
}, { collection: 'loot_pool' });

module.exports = mongoose.model('LootItem', schema);
```

- [ ] **Step 2: Commit**

```bash
git add backend/model/lootpool.js
git commit -m "feat: add LootItem Mongoose model"
```

---

## Task 4: MongoDB seed script

**Files:**
- Create: `backend/init.mongo.js`

This script runs via `mongosh` inside the MongoDB container on first boot (mounted into `/docker-entrypoint-initdb.d/`). It is idempotent — duplicate key errors (code 11000) are silently ignored so re-runs are safe.

- [ ] **Step 1: Write `backend/init.mongo.js`**

```js
// Runs via mongosh on first boot. Idempotent — safe to re-run.
db = db.getSiblingDB('dungeon');

db.loot_pool.createIndex({ itemId: 1 }, { unique: true });

const items = [
    { itemId: 'potion-small',  name: 'Small Potion',        rarity: 'common',    dropWeight: 80, spriteKey: 'potion_small' },
    { itemId: 'sword-wood',    name: 'Wooden Sword',         rarity: 'common',    dropWeight: 60, spriteKey: 'sword_wood' },
    { itemId: 'shield-wood',   name: 'Wooden Shield',        rarity: 'common',    dropWeight: 60, spriteKey: 'shield_wood' },
    { itemId: 'potion-large',  name: 'Large Potion',         rarity: 'rare',      dropWeight: 20, spriteKey: 'potion_large' },
    { itemId: 'sword-iron',    name: 'Iron Sword',           rarity: 'rare',      dropWeight: 20, spriteKey: 'sword_iron' },
    { itemId: 'shield-iron',   name: 'Iron Shield',          rarity: 'rare',      dropWeight: 20, spriteKey: 'shield_iron' },
    { itemId: 'excalibur',     name: 'Excalibur',            rarity: 'legendary', dropWeight: 5,  spriteKey: 'sword_legendary' },
    { itemId: 'armor-dragon',  name: 'Dragon Scale Armor',   rarity: 'legendary', dropWeight: 3,  spriteKey: 'armor_legendary' },
    { itemId: 'ring-power',    name: 'Ring of Power',        rarity: 'legendary', dropWeight: 2,  spriteKey: 'ring_legendary' },
    { itemId: 'witch-hat',     name: 'Witch Hat',            rarity: 'mythic',    dropWeight: 1,  spriteKey: 'witch_hat' },
    { itemId: 'the-seal',      name: 'The Seal',             rarity: 'mythic',    dropWeight: 1,  spriteKey: 'the_seal' }
];

for (const item of items) {
    try {
        db.loot_pool.insertOne(item);
    } catch (e) {
        if (e.code !== 11000) throw e;
    }
}

print('[init.mongo.js] loot_pool seeded: ' + db.loot_pool.countDocuments() + ' items');
```

- [ ] **Step 2: Commit**

```bash
git add backend/init.mongo.js
git commit -m "feat: add MongoDB loot_pool seed script (4 rarities, 11 items)"
```

---

## Task 5: Inventory MySQL model

**Files:**
- Create: `backend/model/inventory.js`

- [ ] **Step 1: Write `backend/model/inventory.js`**

```js
const pool = require('../db/mysql');

async function grantItem(userId, itemId, itemName, rarity, spriteKey, sessionId) {
    await pool.execute(
        'INSERT INTO inventory (user_id, item_id, item_name, rarity, sprite_key, session_id) VALUES (?, ?, ?, ?, ?, ?)',
        [userId, itemId, itemName, rarity, spriteKey, sessionId]
    );
}

async function getInventoryByUser(userId) {
    const [rows] = await pool.execute(
        'SELECT * FROM inventory WHERE user_id = ? ORDER BY granted_at DESC',
        [userId]
    );
    return rows;
}

module.exports = { grantItem, getInventoryByUser };
```

- [ ] **Step 2: Commit**

```bash
git add backend/model/inventory.js
git commit -m "feat: add inventory MySQL model"
```

---

## Task 6: Consul registration helper

**Files:**
- Create: `backend/lib/consul.js`

All five services call this on startup. Uses `os.hostname()` as the unique service ID — in Docker, each container's hostname is its container ID, so all replicas register as distinct entries under the same service name.

- [ ] **Step 1: Write `backend/lib/consul.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/lib/consul.js
git commit -m "feat: add Consul registration helper"
```

---

## Task 7: Inventory Service

**Files:**
- Create: `backend/inventory/inventoryservice.js`
- Create: `backend/inventory/index.js`
- Create: `backend/inventory/Dockerfile`

- [ ] **Step 1: Write `backend/inventory/inventoryservice.js`**

```js
const express = require('express');
const { grantItem, getInventoryByUser } = require('../model/inventory');

const router = express.Router();

router.post('/', async (req, res) => {
    if (req.headers['x-internal-secret'] !== process.env.X_INTERNAL_SECRET) {
        return res.status(403).json({ error: 'forbidden' });
    }
    const { userId, itemId, itemName, rarity, spriteKey, sessionId } = req.body;
    if (!userId || !itemId || !itemName || !rarity || !spriteKey || !sessionId) {
        return res.status(400).json({ error: 'missing required fields' });
    }
    try {
        await grantItem(userId, itemId, itemName, rarity, spriteKey, sessionId);
        return res.status(201).json({ ok: true });
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

router.get('/', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    try {
        const items = await getInventoryByUser(userId);
        return res.status(200).json(items);
    } catch (err) {
        return res.status(500).json({ error: 'internal server error' });
    }
});

module.exports = router;
```

- [ ] **Step 2: Write `backend/inventory/index.js`**

```js
const express = require('express');
const { registerWithConsul } = require('../lib/consul');
const inventoryRouter = require('./inventoryservice');

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'inventory' }));
app.use('/inventory', inventoryRouter);

async function start() {
    await registerWithConsul('inventory', PORT);
    app.listen(PORT, () => {
        console.log(`Inventory service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start inventory service:', err);
    process.exit(1);
});
```

- [ ] **Step 3: Write `backend/inventory/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3005
CMD ["node", "inventory/index.js"]
```

- [ ] **Step 4: Commit**

```bash
git add backend/inventory/
git commit -m "feat: add inventory service with POST /inventory and GET /inventory"
```

---

## Task 8: Dungeon Service — business logic (TDD)

**Files:**
- Create: `backend/dungeon/dungeon.service.test.js`
- Create: `backend/dungeon/dungeon.service.js`

- [ ] **Step 1: Write failing tests at `backend/dungeon/dungeon.service.test.js`**

```js
const { weightedRoll, processSession } = require('./dungeon.service');
const LootItem = require('../model/lootpool');

jest.mock('../model/lootpool', () => ({ find: jest.fn() }));

const MOCK_ITEM = {
    itemId: 'sword-wood',
    name: 'Wooden Sword',
    rarity: 'common',
    spriteKey: 'sword_wood',
    dropWeight: 60
};

beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
});

describe('weightedRoll', () => {
    it('always returns an item from the list', () => {
        const items = [{ itemId: 'a', dropWeight: 10 }, { itemId: 'b', dropWeight: 5 }];
        expect(items).toContain(weightedRoll(items));
    });

    it('returns the only item when there is one', () => {
        const items = [{ itemId: 'solo', dropWeight: 100 }];
        expect(weightedRoll(items)).toBe(items[0]);
    });

    it('favours items with higher weight', () => {
        const items = [{ itemId: 'heavy', dropWeight: 1000 }, { itemId: 'light', dropWeight: 1 }];
        const results = Array.from({ length: 20 }, () => weightedRoll(items));
        expect(results.filter(r => r.itemId === 'heavy').length).toBeGreaterThan(15);
    });
});

describe('processSession', () => {
    it('calls POST /inventory with rolled item details', async () => {
        LootItem.find.mockResolvedValue([MOCK_ITEM]);
        global.fetch.mockResolvedValue({ ok: true });

        await processSession({ userId: 'user-1', sessionId: 'sess-1' });

        const [url, opts] = global.fetch.mock.calls[0];
        expect(url).toMatch(/\/inventory$/);
        expect(opts.method).toBe('POST');
        const body = JSON.parse(opts.body);
        expect(body).toMatchObject({ userId: 'user-1', itemId: 'sword-wood', rarity: 'common', sessionId: 'sess-1' });
    });

    it('throws when inventory service returns non-ok', async () => {
        LootItem.find.mockResolvedValue([MOCK_ITEM]);
        global.fetch.mockResolvedValue({ ok: false, status: 503 });

        await expect(processSession({ userId: 'user-1', sessionId: 'sess-1' }))
            .rejects.toThrow('Inventory service responded 503');
    });

    it('throws when loot_pool is empty', async () => {
        LootItem.find.mockResolvedValue([]);

        await expect(processSession({ userId: 'user-1', sessionId: 'sess-1' }))
            .rejects.toThrow('loot_pool is empty');
    });
});
```

- [ ] **Step 2: Run tests — confirm all 6 fail**

```bash
cd /home/xd/Neumont/Q7/PRO290/PRO290/backend && npm test -- --testPathPattern=dungeon
```
Expected: FAIL — `Cannot find module './dungeon.service'`

- [ ] **Step 3: Write `backend/dungeon/dungeon.service.js`**

```js
const LootItem = require('../model/lootpool');

const INVENTORY_URL = process.env.INVENTORY_URL || 'http://inventory-service:3005';
const X_INTERNAL_SECRET = process.env.X_INTERNAL_SECRET;

function weightedRoll(items) {
    const totalWeight = items.reduce((sum, item) => sum + item.dropWeight, 0);
    let roll = Math.random() * totalWeight;
    for (const item of items) {
        roll -= item.dropWeight;
        if (roll <= 0) return item;
    }
    return items[items.length - 1];
}

async function processSession({ userId, sessionId }) {
    const items = await LootItem.find({});
    if (items.length === 0) throw new Error('loot_pool is empty');

    const item = weightedRoll(items);

    const res = await fetch(`${INVENTORY_URL}/inventory`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-internal-secret': X_INTERNAL_SECRET
        },
        body: JSON.stringify({
            userId,
            itemId: item.itemId,
            itemName: item.name,
            rarity: item.rarity,
            spriteKey: item.spriteKey,
            sessionId
        })
    });

    if (!res.ok) throw new Error(`Inventory service responded ${res.status}`);
    console.log(`[dungeon] granted ${item.rarity} "${item.name}" to user ${userId}`);
}

module.exports = { weightedRoll, processSession };
```

- [ ] **Step 4: Run tests — confirm all 6 pass**

```bash
npm test -- --testPathPattern=dungeon
```
Expected:
```
PASS  dungeon/dungeon.service.test.js
  weightedRoll
    ✓ always returns an item from the list
    ✓ returns the only item when there is one
    ✓ favours items with higher weight
  processSession
    ✓ calls POST /inventory with rolled item details
    ✓ throws when inventory service returns non-ok
    ✓ throws when loot_pool is empty
Tests: 6 passed, 6 total
```

- [ ] **Step 5: Commit**

```bash
git add backend/dungeon/dungeon.service.test.js backend/dungeon/dungeon.service.js
git commit -m "feat: implement dungeon loot roll service with TDD (weightedRoll + processSession)"
```

---

## Task 9: Dungeon Service — RabbitMQ consumer

**Files:**
- Create: `backend/dungeon/consumer.js`

All three Dungeon Service instances bind to the **same** durable queue (`dungeon.queue`). RabbitMQ delivers each message to exactly one instance. `prefetch(1)` ensures each instance finishes one loot roll before taking another.

- [ ] **Step 1: Write `backend/dungeon/consumer.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/dungeon/consumer.js
git commit -m "feat: add dungeon RabbitMQ consumer (competing consumers on dungeon.queue)"
```

---

## Task 10: Dungeon Service — entry point + Dockerfile

**Files:**
- Create: `backend/dungeon/index.js`
- Create: `backend/dungeon/Dockerfile`

- [ ] **Step 1: Write `backend/dungeon/index.js`**

```js
const express = require('express');
const { connect: connectMongo } = require('../db/mongo');
const { startConsumer } = require('./consumer');
const { registerWithConsul } = require('../lib/consul');

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'dungeon' }));

async function start() {
    await connectMongo();
    await startConsumer();
    await registerWithConsul('dungeon', PORT);
    app.listen(PORT, () => {
        console.log(`Dungeon service running on port ${PORT}`);
    });
}

start().catch(err => {
    console.error('Failed to start dungeon service:', err);
    process.exit(1);
});
```

- [ ] **Step 2: Write `backend/dungeon/Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3004
CMD ["node", "dungeon/index.js"]
```

- [ ] **Step 3: Commit**

```bash
git add backend/dungeon/index.js backend/dungeon/Dockerfile
git commit -m "feat: add dungeon service entry point"
```

---

## Task 11: Health + Consul — Auth Service

**Files:**
- Modify: `backend/auth/index.js`

Current file uses a synchronous `app.listen`. Wrap it in an async `start()` to match the pattern used by session service, and add `/health` + Consul registration.

- [ ] **Step 1: Replace `backend/auth/index.js` with**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth/index.js
git commit -m "feat: add /health endpoint and Consul registration to auth service"
```

---

## Task 12: Health + Consul — User Service

**Files:**
- Modify: `backend/user/index.js`

- [ ] **Step 1: Replace `backend/user/index.js` with**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/user/index.js
git commit -m "feat: add /health endpoint and Consul registration to user service"
```

---

## Task 13: Health + Consul — Session Service

**Files:**
- Modify: `backend/session/index.js`

The session service already has an async `start()` — just add the health endpoint and Consul call.

- [ ] **Step 1: Replace `backend/session/index.js` with**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/session/index.js
git commit -m "feat: add /health endpoint and Consul registration to session service"
```

---

## Task 14: docker-compose.yml — MongoDB, Consul, dungeon-service, inventory-service

**Files:**
- Modify: `docker-compose.yml`

Read the file first, then make all four additions carefully. YAML is whitespace-sensitive — 2-space indentation throughout.

- [ ] **Step 1: Add `mongodb` service** (inside `services:`, before `rabbitmq`):

```yaml
  mongodb:
    image: mongo:7
    environment:
      MONGO_INITDB_DATABASE: dungeon
    ports:
      - "27017:27017"
    volumes:
      - ./backend/init.mongo.js:/docker-entrypoint-initdb.d/init.js
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
```

- [ ] **Step 2: Add `consul` service** (after `mongodb`):

```yaml
  consul:
    image: hashicorp/consul:1.18
    command: consul agent -dev -client=0.0.0.0 -log-level=warn
    ports:
      - "8500:8500"
    healthcheck:
      test: ["CMD", "consul", "info"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
```

- [ ] **Step 3: Add `inventory-service`** (after `session-service`):

```yaml
  inventory-service:
    build:
      context: ./backend
      dockerfile: inventory/Dockerfile
    environment:
      DB_HOST: mysql
      DB_USER: ${MYSQL_USER}
      DB_PASSWORD: ${MYSQL_PASSWORD}
      DB_NAME: ${MYSQL_DATABASE}
      X_INTERNAL_SECRET: ${X_INTERNAL_SECRET}
      CONSUL_HOST: consul
      PORT: 3005
    depends_on:
      mysql:
        condition: service_healthy
      consul:
        condition: service_healthy
```

- [ ] **Step 4: Add `dungeon-service`** (after `inventory-service`):

```yaml
  dungeon-service:
    build:
      context: ./backend
      dockerfile: dungeon/Dockerfile
    environment:
      MONGODB_URI: ${MONGODB_URI}
      RABBITMQ_URL: ${RABBITMQ_URL}
      INVENTORY_URL: http://inventory-service:3005
      X_INTERNAL_SECRET: ${X_INTERNAL_SECRET}
      CONSUL_HOST: consul
      PORT: 3004
    depends_on:
      mongodb:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      consul:
        condition: service_healthy
      inventory-service:
        condition: service_started
    deploy:
      replicas: 3
```

- [ ] **Step 5: Update `auth-service` in docker-compose** — add `CONSUL_HOST` env var and `consul` dependency:

In the `auth-service` block, add `CONSUL_HOST: consul` to `environment`, and add `consul: condition: service_healthy` to `depends_on`. The block should look like:
```yaml
  auth-service:
    build:
      context: ./backend
      dockerfile: auth/Dockerfile
    environment:
      DB_HOST: mysql
      DB_USER: ${MYSQL_USER}
      DB_PASSWORD: ${MYSQL_PASSWORD}
      DB_NAME: ${MYSQL_DATABASE}
      JWT_SECRET: ${JWT_SECRET}
      CONSUL_HOST: consul
      PORT: 3001
    ports:
      - "3001:3001"
    depends_on:
      mysql:
        condition: service_healthy
      consul:
        condition: service_healthy
```

Do the same for `user-service` — add `CONSUL_HOST: consul` to environment and `consul: condition: service_healthy` to depends_on:
```yaml
  user-service:
    build:
      context: ./backend
      dockerfile: user/Dockerfile
    environment:
      DB_HOST: mysql
      DB_USER: ${MYSQL_USER}
      DB_PASSWORD: ${MYSQL_PASSWORD}
      DB_NAME: ${MYSQL_DATABASE}
      CONSUL_HOST: consul
      PORT: 3002
    ports:
      - "3002:3002"
    depends_on:
      mysql:
        condition: service_healthy
      consul:
        condition: service_healthy
```

Also add `CONSUL_HOST: consul` to the `session-service` environment block.

- [ ] **Step 6: Update `nginx` depends_on** to include the new services:

```yaml
    depends_on:
      - auth-service
      - user-service
      - session-service
      - inventory-service
      - dungeon-service
```

- [ ] **Step 7: Add `mongo_data` to the `volumes:` block** at the bottom:

```yaml
volumes:
  mysql_data:
  mongo_data:
```

- [ ] **Step 8: Commit**

```bash
git add docker-compose.yml
git commit -m "feat: add MongoDB, Consul, inventory-service, dungeon-service to docker-compose"
```

---

## Task 15: nginx.conf + .env.example

**Files:**
- Modify: `backend/nginx.conf`
- Modify: `.env.example`

- [ ] **Step 1: Replace the commented dungeon + inventory upstream blocks** in `backend/nginx.conf`:

Replace:
```nginx
    # upstream dungeon-service {
    #     server dungeon-service-1:3004;
    #     server dungeon-service-2:3004;
    #     server dungeon-service-3:3004;
    # }
    # upstream inventory-service {
    #     server inventory-service:3005;
    # }
```

With:
```nginx
    upstream dungeon-service {
        server dungeon-service:3004;
    }
    upstream inventory-service {
        server inventory-service:3005;
    }
```

- [ ] **Step 2: Uncomment the dungeon + inventory location blocks** inside `location /api/`:

Replace:
```nginx
            # location /api/dungeon/ { proxy_pass http://dungeon-service/dungeon/; }
            # location /api/inventory/ { proxy_pass http://inventory-service/inventory/; }
```

With:
```nginx
            location /api/dungeon/ {
                proxy_pass http://dungeon-service/dungeon/;
            }
            location /api/inventory/ {
                proxy_pass http://inventory-service/inventory/;
            }
```

- [ ] **Step 3: Append to `.env.example`**:

```
MONGODB_URI=mongodb://mongodb:27017/dungeon
CONSUL_HOST=consul
X_INTERNAL_SECRET=change-me-in-production
INVENTORY_URL=http://inventory-service:3005
```

- [ ] **Step 4: Commit**

```bash
git add backend/nginx.conf .env.example
git commit -m "feat: wire dungeon and inventory into nginx, add env vars"
```

---

## Task 16: Run all tests + spin-up verification

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

```bash
cd /home/xd/Neumont/Q7/PRO290/PRO290/backend && npm test
```

Expected:
```
PASS  auth/authservice.test.js
PASS  session/sessionservice.test.js
PASS  dungeon/dungeon.service.test.js
Test Suites: 3 passed, 3 total
Tests:       XX passed, XX total
```

If any tests fail, fix them before proceeding to docker-compose.

- [ ] **Step 2: Add missing env vars to local `.env`**

Add to `/home/xd/Neumont/Q7/PRO290/PRO290/.env` (not committed):
```
MONGODB_URI=mongodb://mongodb:27017/dungeon
CONSUL_HOST=consul
X_INTERNAL_SECRET=dev-secret-change-me
INVENTORY_URL=http://inventory-service:3005
```

- [ ] **Step 3: Build and start all services**

```bash
cd /home/xd/Neumont/Q7/PRO290/PRO290 && docker-compose up --build
```

Wait for all services to print their startup messages. Expected startup sequence:
1. mysql → healthy
2. mongodb → healthy (runs init.mongo.js seed script)
3. rabbitmq → healthy
4. consul → healthy
5. auth-service, user-service, inventory-service → start
6. session-service (3 replicas) → start, register with Consul
7. dungeon-service (3 replicas) → start, connect MongoDB + RabbitMQ, register with Consul

- [ ] **Step 4: Verify all 9 service instances in Consul UI**

Open `http://localhost:8500/ui` in a browser.

Expected: Services panel shows:
- `auth` — 1 passing
- `consul` — 1 passing
- `dungeon` — 3 passing
- `inventory` — 1 passing
- `session` — 3 passing
- `user` — 1 passing

All health checks green.

- [ ] **Step 5: Verify health endpoints directly**

```bash
curl http://localhost:3001/health
# Expected: {"status":"ok","service":"auth"}

curl http://localhost:3002/health
# Expected: {"status":"ok","service":"user"}

curl http://localhost:3005/health
# Expected: {"status":"ok","service":"inventory"}
```

Session (3003) and dungeon (3004) are replicated and don't publish ports — their health is verified through Consul.

- [ ] **Step 6: Verify loot_pool seed data in MongoDB**

```bash
docker exec -it $(docker ps -qf "name=mongodb") mongosh dungeon --eval "db.loot_pool.find().pretty()"
```

Expected: 11 documents with itemIds: `potion-small`, `sword-wood`, `shield-wood`, `potion-large`, `sword-iron`, `shield-iron`, `excalibur`, `armor-dragon`, `ring-power`, `witch-hat`, `the-seal`.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "chore: spin-up verified — all services healthy, loot_pool seeded"
```