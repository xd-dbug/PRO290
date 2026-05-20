# Frontend Infrastructure Design
**Date:** 2026-05-20
**Scope:** Vite dev proxy, React Router setup, `src/api/` layer

---

## 1. Vite Dev Proxy

Add a `server.proxy` block to `vite.config.js` with **two** entries:

- Pattern `/api` → `http://localhost:80` — protected routes (sessions, inventory, users, dungeon)
- Pattern `/auth` → `http://localhost:80` — public auth routes (login, register)

Both use `changeOrigin: true`. Auth endpoints are NOT under `/api/` in Nginx — they sit at `/auth/login` and `/auth/register` directly. Forgetting the `/auth` proxy entry means login/register calls would 404 in dev.

This only applies during `vite dev`; production traffic goes through Nginx directly, no Docker changes needed.

---

## 2. React Router

**Install:** `react-router-dom` (not currently in `package.json`).

**`main.jsx`:** Wrap the app in `<BrowserRouter>`.

**`App.jsx`:** Replace placeholder content with three routes:

| Path | Component | Auth required |
|---|---|---|
| `/login` | `LoginPage` | No |
| `/register` | `RegisterPage` | No |
| `/` | `Dashboard` | Yes |

Auth guard at `/`: `Dashboard` runs `useEffect` on mount — if `localStorage.getItem('token')` is absent, call `navigate('/login')`. No separate `<PrivateRoute>` wrapper; overkill for three routes.

`LoginPage`, `RegisterPage`, and `Dashboard` are stub components (render a heading) until Liss builds them out.

---

## 3. API Layer (`src/api/`)

### `client.js` — shared fetch wrapper

Signature: `client(path, options = {})`

Behavior:
1. Read `localStorage.getItem('token')`.
2. If present, merge `Authorization: Bearer <token>` into request headers. If absent, omit the header (not an error — login/register are pre-auth).
3. Call `fetch(path, mergedOptions)`. Path is the full path — callers supply the `/api/` or `/auth/` prefix themselves.
4. If response is 401: clear localStorage, call `window.location.replace('/login')`, return (no throw needed).
5. If response is not ok (other than 401): throw an `Error` with the status code.
6. Return `response.json()`.

### Modules

All modules import `client.js` and export named async functions. No raw `fetch` calls anywhere else in the app.

**`auth.js`**
- `login(email, password)` — POST `/auth/login`
- `register(email, username, password)` — POST `/auth/register`

**`session.js`**
- `startSession()` — POST `/api/sessions/`
- `endSession(id)` — POST `/api/sessions/:id/end`
- `sendHeartbeat(id)` — POST `/api/sessions/:id/heartbeat`

**`inventory.js`**
- `getInventory()` — GET `/api/inventory/`

**`user.js`**
- `getProfile()` — GET `/api/users/me`

**`notes.js`**
- `getNotes()` — GET `/api/users/me/notes`
- `createNote(title, body)` — POST `/api/users/me/notes` (backend requires both fields)
- `updateNote(id, title, body)` — PATCH `/api/users/me/notes/:id` (title and body both optional)
- `deleteNote(id)` — DELETE `/api/users/me/notes/:id`

---

## File Layout

```
frontend/dungeon-frontend/
├── vite.config.js          ← add server.proxy
├── src/
│   ├── main.jsx            ← wrap with BrowserRouter
│   ├── App.jsx             ← replace with Route declarations
│   ├── api/
│   │   ├── client.js
│   │   ├── auth.js
│   │   ├── session.js
│   │   ├── inventory.js
│   │   ├── user.js
│   │   └── notes.js
│   └── components/
│       ├── LoginPage.jsx   ← stub
│       ├── RegisterPage.jsx ← stub
│       └── Dashboard.jsx   ← stub (includes auth guard)
```