# Infrastructure, Dungeon Service, and Inventory Service Design

## Overview

Complete the backend infrastructure by adding MongoDB, Consul, Dungeon Service, and Inventory Service. Wire the full loot flow end-to-end: `session.completed` RabbitMQ event → Dungeon Service weighted loot roll → `POST /inventory`. Add `/health` endpoints and Consul self-registration to all five services. Seed the `loot_pool` MongoDB collection with items across four rarity tiers.

---

## Infrastructure Changes

### docker-compose.yml additions

**MongoDB** (`mongo:7`):
- Mounts `backend/init.mongo.js` into `/docker-entrypoint-initdb.d/` — seeds loot_pool on first boot
- Volume: `mongo_data:/data/db`
- Healthcheck: `mongosh --eval "db.adminCommand('ping')"`

**Consul** (`hashicorp/consul:1.18`):
- Dev mode: `consul agent -dev -client=0.0.0.0 -log-level=warn`
- Port 8500 (HTTP API + UI)
- Healthcheck: `["CMD", "consul", "info"]`

**dungeon-service**:
- Build context: `./backend`, dockerfile: `dungeon/Dockerfile`
- Port: 3004
- `deploy: replicas: 3`
- Env: `MONGODB_URI`, `RABBITMQ_URL`, `INVENTORY_URL`, `X_INTERNAL_SECRET`, `CONSUL_HOST`, `PORT`
- depends_on: `mongodb` (healthy), `rabbitmq` (healthy), `consul` (healthy), `inventory-service` (started)

**inventory-service**:
- Build context: `./backend`, dockerfile: `inventory/Dockerfile`
- Port: 3005
- 1 instance
- Env: `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `X_INTERNAL_SECRET`, `CONSUL_HOST`, `PORT`
- depends_on: `mysql` (healthy), `consul` (healthy)

**nginx** — add `dungeon-service` and `inventory-service` to `depends_on`.

### nginx.conf additions

New upstream blocks:
```nginx
upstream dungeon-service {
    server dungeon-service:3004;
}
upstream inventory-service {
    server inventory-service:3005;
}
```

New location blocks inside `location /api/` (auth_request protected):
```nginx
location /api/dungeon/ {
    proxy_pass http://dungeon-service/dungeon/;
}
location /api/inventory/ {
    proxy_pass http://inventory-service/inventory/;
}
```

`POST /inventory` is **not** in Nginx — internal only.

### MySQL schema addition (`backend/init.sql`)

```sql
CREATE TABLE IF NOT EXISTS inventory (
    id          INT          NOT NULL AUTO_INCREMENT,
    user_id     CHAR(36)     NOT NULL,
    item_id     VARCHAR(50)  NOT NULL,
    item_name   VARCHAR(100) NOT NULL,
    rarity      VARCHAR(20)  NOT NULL,
    sprite_key  VARCHAR(100) NOT NULL,
    session_id  CHAR(36)     NOT NULL,
    granted_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
```

### package.json addition

Install `mongoose` for MongoDB/ODM:
```bash
cd backend && npm install mongoose
```

### .env.example additions

```
MONGODB_URI=mongodb://mongodb:27017/dungeon
CONSUL_HOST=consul
X_INTERNAL_SECRET=change-me-in-production
INVENTORY_URL=http://inventory-service:3005
```

---

## File Structure

```
backend/
  db/
    mongo.js                  — Mongoose connection singleton
  lib/
    consul.js                 — Shared Consul registration helper
  model/
    lootpool.js               — Mongoose schema for loot_pool collection
    inventory.js              — MySQL queries: grantItem, getInventoryByUser
  dungeon/
    index.js                  — App entry: connect Mongo + RabbitMQ, start consumer, register Consul
    dungeonservice.js         — Router: GET /health
    dungeon.service.js        — Business logic: weightedRoll(), callInventory()
    consumer.js               — RabbitMQ consumer: bind dungeon.queue, ack/nack
    Dockerfile
  inventory/
    index.js                  — App entry: register Consul
    inventoryservice.js       — Router: POST /inventory, GET /inventory
    Dockerfile
  init.mongo.js               — MongoDB seed script (runs via initdb.d on first boot)
```

**Modified files:**
- `backend/init.sql` — add inventory table
- `backend/auth/index.js` — add GET /health + Consul registration
- `backend/user/index.js` — add GET /health + Consul registration
- `backend/session/index.js` — add GET /health + Consul registration
- `backend/nginx.conf` — add dungeon + inventory upstreams and locations
- `docker-compose.yml` — add MongoDB, Consul, dungeon-service, inventory-service
- `.env.example` — add new env vars

---

## Shared: Consul Registration (`backend/lib/consul.js`)

```js
const os = require('os');

async function registerWithConsul(serviceName, port) {
    const serviceId = `${serviceName}-${os.hostname()}`;
    try {
        await fetch(`http://${process.env.CONSUL_HOST || 'consul'}:8500/v1/agent/service/register`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ID: serviceId,
                Name: serviceName,
                Address: os.hostname(),
                Port: port,
                Check: {
                    HTTP: `http://${os.hostname()}:${port}/health`,
                    Interval: '10s',
                    Timeout: '5s',
                    DeregisterCriticalServiceAfter: '30s'
                }
            })
        });
        console.log(`[consul] registered ${serviceId}`);
    } catch (err) {
        console.warn(`[consul] registration failed for ${serviceId}:`, err.message);
    }
}

module.exports = { registerWithConsul };
```

`os.hostname()` returns the container ID in Docker, which is unique per replica. Non-fatal on failure — logs a warning and continues.

---

## Shared: MongoDB Connection (`backend/db/mongo.js`)

```js
const mongoose = require('mongoose');

async function connect() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
}

module.exports = { connect };
```

---

## Shared: LootItem Model (`backend/model/lootpool.js`)

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

---

## Dungeon Service

### consumer.js

- On startup: assert exchange `dungeon.events` (topic, durable), assert queue `dungeon.queue` (durable), bind queue to exchange with routing key `session.*`
- `channel.consume('dungeon.queue', handler, { noAck: false })`
- Handler: parse message → call `dungeon.service.processSession()` → ack on success, nack (no requeue) on parse error, nack (requeue) on transient error
- Prefetch: `channel.prefetch(1)` — each instance processes one message at a time

### dungeon.service.js

**`weightedRoll(items)`** — server-side only:
```
totalWeight = sum of all dropWeight
roll = random float in [0, totalWeight)
walk items, subtract each weight until roll ≤ 0, return that item
```

**`processSession({ userId, sessionId })`**:
1. Fetch all items from `loot_pool`
2. `weightedRoll(items)` → selected item
3. `POST ${INVENTORY_URL}/inventory` with header `x-internal-secret: ${X_INTERNAL_SECRET}` and body `{ userId, itemId, itemName, rarity, spriteKey, sessionId }`
4. Log the grant
5. Throw on HTTP error (triggers nack + requeue in consumer)

### dungeonservice.js (router)

```
GET /health → { status: 'ok', service: 'dungeon' }
```

### index.js

```
1. connect MongoDB
2. connect RabbitMQ (reuse lib/rabbitmq.js connect())
3. start consumer
4. registerWithConsul('dungeon', PORT)
5. app.listen(PORT)
```

---

## Inventory Service

### inventoryservice.js (router)

**`POST /inventory`** — internal only:
- Guard: `req.headers['x-internal-secret'] !== process.env.X_INTERNAL_SECRET` → 403
- Body: `{ userId, itemId, itemName, rarity, spriteKey, sessionId }`
- Calls `model.grantItem(...)` → 201 `{ ok: true }`

**`GET /inventory`** — protected via Nginx auth_request:
- Reads `X-User-ID` header
- Calls `model.getInventoryByUser(userId)` → 200 `[...items]`

### model/inventory.js

```js
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
```

### index.js

```
1. registerWithConsul('inventory', PORT)
2. app.listen(PORT)
```

---

## Health Endpoints (all existing services)

Add to each `index.js` before `app.listen`:
```js
app.get('/health', (req, res) => res.json({ status: 'ok', service: '<name>' }));
```

Add `registerWithConsul('<name>', PORT)` call in each startup function. Auth and user services start synchronously today — wrap their `app.listen` in an async start function matching the session service pattern.

---

## Loot Pool Seed Data (`backend/init.mongo.js`)

11 items across 4 rarity tiers. Script uses `insertMany` with `ordered: false` so re-runs on an already-seeded DB are silent (duplicate key errors ignored).

| itemId | name | rarity | dropWeight | spriteKey |
|---|---|---|---|---|
| potion-small | Small Potion | common | 80 | potion_small |
| sword-wood | Wooden Sword | common | 60 | sword_wood |
| shield-wood | Wooden Shield | common | 60 | shield_wood |
| potion-large | Large Potion | rare | 20 | potion_large |
| sword-iron | Iron Sword | rare | 20 | sword_iron |
| shield-iron | Iron Shield | rare | 20 | shield_iron |
| excalibur | Excalibur | legendary | 5 | sword_legendary |
| armor-dragon | Dragon Scale Armor | legendary | 3 | armor_legendary |
| ring-power | Ring of Power | legendary | 2 | ring_legendary |
| witch-hat | Witch Hat | mythic | 1 | witch_hat |
| the-seal | The Seal | mythic | 1 | the_seal |

Total weight: 272. Approximate drop rates:
- Common: ~73.5%
- Rare: ~22%
- Legendary: ~3.7%
- Mythic: ~0.73% (0.37% each)

---

## RabbitMQ Event Consumption — Competing Consumer Setup

All 3 Dungeon Service instances connect on startup and bind to the **same** queue (`dungeon.queue`). RabbitMQ delivers each message to exactly one consumer. `prefetch(1)` ensures no instance takes a second message before acknowledging the first.

Queue binding:
- Exchange: `dungeon.events` (topic, durable)
- Queue: `dungeon.queue` (durable)
- Routing key: `session.*`

Message ack strategy:
- Parse error (malformed JSON) → `nack(msg, false, false)` — discard, do not requeue
- Inventory call fails with 5xx → `nack(msg, false, true)` — requeue for retry
- Success → `ack(msg)`