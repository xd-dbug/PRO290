# Frontend Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up the Vite dev proxy, React Router, and a typed API layer (`src/api/`) so the frontend can talk to the backend through Nginx with zero raw `fetch` calls in components.

**Architecture:** Vite's `server.proxy` forwards both `/api/*` and `/auth/*` to Nginx (port 80) during dev only — auth endpoints are NOT under `/api/` in Nginx, so both entries are required. React Router v7 handles three routes (`/login`, `/register`, `/`). A shared `client.js` fetch wrapper injects the JWT and handles 401 globally; five thin modules (`auth`, `session`, `inventory`, `user`, `notes`) import it and supply full paths.

**Tech Stack:** React 19, Vite 8, react-router-dom, Vitest, jsdom, @testing-library/react, @testing-library/jest-dom

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `frontend/dungeon-frontend/vite.config.js` | Add `server.proxy` and Vitest `test` config |
| Create | `frontend/dungeon-frontend/src/test-setup.js` | Import `@testing-library/jest-dom` matchers |
| Modify | `frontend/dungeon-frontend/package.json` | Add deps + `test` script |
| Modify | `frontend/dungeon-frontend/src/main.jsx` | Wrap app in `<BrowserRouter>` |
| Modify | `frontend/dungeon-frontend/src/App.jsx` | Replace placeholder with route declarations |
| Create | `frontend/dungeon-frontend/src/components/LoginPage.jsx` | Stub |
| Create | `frontend/dungeon-frontend/src/components/RegisterPage.jsx` | Stub |
| Create | `frontend/dungeon-frontend/src/components/Dashboard.jsx` | Stub + auth guard |
| Create | `frontend/dungeon-frontend/src/components/Dashboard.test.jsx` | Auth guard tests |
| Create | `frontend/dungeon-frontend/src/api/client.js` | Shared fetch wrapper |
| Create | `frontend/dungeon-frontend/src/api/client.test.js` | client.js tests |
| Create | `frontend/dungeon-frontend/src/api/auth.js` | login, register |
| Create | `frontend/dungeon-frontend/src/api/auth.test.js` | auth.js tests |
| Create | `frontend/dungeon-frontend/src/api/session.js` | startSession, endSession, sendHeartbeat |
| Create | `frontend/dungeon-frontend/src/api/session.test.js` | session.js tests |
| Create | `frontend/dungeon-frontend/src/api/inventory.js` | getInventory |
| Create | `frontend/dungeon-frontend/src/api/inventory.test.js` | inventory.js tests |
| Create | `frontend/dungeon-frontend/src/api/user.js` | getProfile |
| Create | `frontend/dungeon-frontend/src/api/user.test.js` | user.js tests |
| Create | `frontend/dungeon-frontend/src/api/notes.js` | getNotes, createNote, updateNote, deleteNote |
| Create | `frontend/dungeon-frontend/src/api/notes.test.js` | notes.js tests |

---

### Task 1: Install dependencies

**Files:**
- Modify: `frontend/dungeon-frontend/package.json`

- [ ] **Step 1: Install runtime and dev dependencies**

```bash
cd frontend/dungeon-frontend
npm install react-router-dom
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom
```

Expected: packages added to `node_modules`, `package.json` updated.

- [ ] **Step 2: Commit**

```bash
git add frontend/dungeon-frontend/package.json frontend/dungeon-frontend/package-lock.json
git commit -m "chore: add react-router-dom and vitest deps"
```

---

### Task 2: Configure Vitest and Vite dev proxy

**Files:**
- Modify: `frontend/dungeon-frontend/vite.config.js`
- Create: `frontend/dungeon-frontend/src/test-setup.js`
- Modify: `frontend/dungeon-frontend/package.json` (add test script)

- [ ] **Step 1: Update vite.config.js**

Replace the entire file with:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:80',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.js',
  },
})
```

- [ ] **Step 2: Create test-setup.js**

```js
import '@testing-library/jest-dom'
```

Save to `frontend/dungeon-frontend/src/test-setup.js`.

- [ ] **Step 3: Add test script to package.json**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Verify Vitest runs (no tests yet is fine)**

```bash
cd frontend/dungeon-frontend
npm test
```

Expected: `No test files found` or similar — no error, exit 0.

- [ ] **Step 5: Commit**

```bash
git add frontend/dungeon-frontend/vite.config.js frontend/dungeon-frontend/src/test-setup.js frontend/dungeon-frontend/package.json
git commit -m "feat: configure Vite dev proxy and Vitest"
```

---

### Task 3: Create stub page components (no auth guard yet)

**Files:**
- Create: `frontend/dungeon-frontend/src/components/LoginPage.jsx`
- Create: `frontend/dungeon-frontend/src/components/RegisterPage.jsx`
- Create: `frontend/dungeon-frontend/src/components/Dashboard.jsx`

Dashboard is intentionally minimal here — the auth guard is added in Task 4 after writing a failing test for it.

- [ ] **Step 1: Create LoginPage.jsx**

```jsx
export default function LoginPage() {
  return <h1>Login</h1>
}
```

- [ ] **Step 2: Create RegisterPage.jsx**

```jsx
export default function RegisterPage() {
  return <h1>Register</h1>
}
```

- [ ] **Step 3: Create Dashboard.jsx (stub only, no guard)**

```jsx
export default function Dashboard() {
  return <h1>Dashboard</h1>
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/dungeon-frontend/src/components/
git commit -m "feat: add stub page components"
```

---

### Task 4: TDD — Dashboard auth guard

**Files:**
- Create: `frontend/dungeon-frontend/src/components/Dashboard.test.jsx`
- Modify: `frontend/dungeon-frontend/src/components/Dashboard.jsx`

- [ ] **Step 1: Write the failing tests**

```jsx
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Dashboard from './Dashboard'

describe('Dashboard', () => {
  afterEach(() => localStorage.clear())

  it('redirects to /login when no token', () => {
    localStorage.clear()
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('renders dashboard when token present', () => {
    localStorage.setItem('token', 'test-token')
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests — verify the redirect test fails**

```bash
cd frontend/dungeon-frontend
npm test
```

Expected: `redirects to /login when no token` FAILS — Dashboard renders `<h1>Dashboard</h1>` instead of navigating. `renders dashboard when token present` PASSES.

- [ ] **Step 3: Add the auth guard to Dashboard.jsx**

Replace the entire file with:

```jsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login')
    }
  }, [navigate])

  return <h1>Dashboard</h1>
}
```

- [ ] **Step 4: Run tests — verify both pass**

```bash
npm test
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/dungeon-frontend/src/components/Dashboard.jsx frontend/dungeon-frontend/src/components/Dashboard.test.jsx
git commit -m "feat: add Dashboard auth guard with redirect to /login"
```

---

### Task 5: Wire React Router in App.jsx and main.jsx

**Files:**
- Modify: `frontend/dungeon-frontend/src/main.jsx`
- Modify: `frontend/dungeon-frontend/src/App.jsx`

- [ ] **Step 1: Update main.jsx**

Replace the entire file with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 2: Update App.jsx**

Replace the entire file with:

```jsx
import { Routes, Route } from 'react-router-dom'
import LoginPage from './components/LoginPage'
import RegisterPage from './components/RegisterPage'
import Dashboard from './components/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<Dashboard />} />
    </Routes>
  )
}
```

- [ ] **Step 3: Run all tests to confirm nothing broke**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/dungeon-frontend/src/main.jsx frontend/dungeon-frontend/src/App.jsx
git commit -m "feat: wire React Router with BrowserRouter and three routes"
```

---

### Task 6: Implement API client (client.js)

**Files:**
- Create: `frontend/dungeon-frontend/src/api/client.test.js`
- Create: `frontend/dungeon-frontend/src/api/client.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import client from './client'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.stubGlobal('location', { replace: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('client', () => {
  it('includes Authorization header when token present', async () => {
    localStorage.setItem('token', 'my-token')
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    })
    await client('/test')
    expect(fetch).toHaveBeenCalledWith(
      '/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-token',
        }),
      })
    )
  })

  it('omits Authorization header when no token', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    await client('/test')
    const [, options] = fetch.mock.calls[0]
    expect(options.headers?.Authorization).toBeUndefined()
  })

  it('returns parsed JSON on success', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: 42 }),
    })
    const data = await client('/test')
    expect(data).toEqual({ result: 42 })
  })

  it('throws with status code on non-ok non-401 response', async () => {
    fetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) })
    await expect(client('/test')).rejects.toThrow('500')
  })

  it('clears localStorage and redirects on 401', async () => {
    localStorage.setItem('token', 'bad-token')
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) })
    await client('/test')
    expect(localStorage.getItem('token')).toBeNull()
    expect(window.location.replace).toHaveBeenCalledWith('/login')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd frontend/dungeon-frontend
npm test
```

Expected: 5 tests fail with `Cannot find module './client'`.

- [ ] **Step 3: Implement client.js**

```js
export default async function client(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { ...options.headers }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(path, { ...options, headers })

  if (response.status === 401) {
    localStorage.clear()
    window.location.replace('/login')
    return
  }

  if (!response.ok) {
    throw new Error(String(response.status))
  }

  return response.json()
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: all 5 client tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/dungeon-frontend/src/api/
git commit -m "feat: implement API client with JWT injection and 401 handling"
```

---

### Task 7: Implement auth.js

**Files:**
- Create: `frontend/dungeon-frontend/src/api/auth.test.js`
- Create: `frontend/dungeon-frontend/src/api/auth.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import { login, register } from './auth'

vi.mock('./client')

describe('auth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('login POSTs to /auth/login with email and password', async () => {
    client.mockResolvedValue({ token: 'abc' })
    await login('user@example.com', 'password123')
    expect(client).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'password123' }),
    })
  })

  it('register POSTs to /auth/register with email, username, password', async () => {
    client.mockResolvedValue({ message: 'ok' })
    await register('user@example.com', 'damian', 'password123')
    expect(client).toHaveBeenCalledWith('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', username: 'damian', password: 'password123' }),
    })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: 2 new tests fail with `Cannot find module './auth'`.

- [ ] **Step 3: Implement auth.js**

```js
import client from './client'

export const login = (email, password) =>
  client('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

export const register = (email, username, password) =>
  client('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  })
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/dungeon-frontend/src/api/auth.js frontend/dungeon-frontend/src/api/auth.test.js
git commit -m "feat: implement auth API module"
```

---

### Task 8: Implement session.js

**Files:**
- Create: `frontend/dungeon-frontend/src/api/session.test.js`
- Create: `frontend/dungeon-frontend/src/api/session.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import { startSession, endSession, sendHeartbeat } from './session'

vi.mock('./client')

describe('session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('startSession POSTs to /api/sessions/', async () => {
    client.mockResolvedValue({ id: '123' })
    await startSession()
    expect(client).toHaveBeenCalledWith('/api/sessions/', { method: 'POST' })
  })

  it('endSession POSTs to /api/sessions/:id/end', async () => {
    client.mockResolvedValue({})
    await endSession('abc123')
    expect(client).toHaveBeenCalledWith('/api/sessions/abc123/end', { method: 'POST' })
  })

  it('sendHeartbeat POSTs to /api/sessions/:id/heartbeat', async () => {
    client.mockResolvedValue({})
    await sendHeartbeat('abc123')
    expect(client).toHaveBeenCalledWith('/api/sessions/abc123/heartbeat', { method: 'POST' })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: 3 new tests fail.

- [ ] **Step 3: Implement session.js**

```js
import client from './client'

export const startSession = () => client('/api/sessions/', { method: 'POST' })
export const endSession = (id) => client(`/api/sessions/${id}/end`, { method: 'POST' })
export const sendHeartbeat = (id) => client(`/api/sessions/${id}/heartbeat`, { method: 'POST' })
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/dungeon-frontend/src/api/session.js frontend/dungeon-frontend/src/api/session.test.js
git commit -m "feat: implement session API module"
```

---

### Task 9: Implement inventory.js and user.js

**Files:**
- Create: `frontend/dungeon-frontend/src/api/inventory.test.js`
- Create: `frontend/dungeon-frontend/src/api/inventory.js`
- Create: `frontend/dungeon-frontend/src/api/user.test.js`
- Create: `frontend/dungeon-frontend/src/api/user.js`

- [ ] **Step 1: Write failing tests for inventory.js**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import { getInventory } from './inventory'

vi.mock('./client')

describe('inventory', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getInventory GETs /api/inventory/', async () => {
    client.mockResolvedValue([])
    await getInventory()
    expect(client).toHaveBeenCalledWith('/api/inventory/')
  })
})
```

- [ ] **Step 2: Write failing tests for user.js**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import { getProfile } from './user'

vi.mock('./client')

describe('user', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getProfile GETs /api/users/me', async () => {
    client.mockResolvedValue({ username: 'damian' })
    await getProfile()
    expect(client).toHaveBeenCalledWith('/api/users/me')
  })
})
```

- [ ] **Step 3: Run tests — verify they fail**

```bash
npm test
```

Expected: 2 new tests fail.

- [ ] **Step 4: Implement inventory.js**

```js
import client from './client'

export const getInventory = () => client('/api/inventory/')
```

- [ ] **Step 5: Implement user.js**

```js
import client from './client'

export const getProfile = () => client('/api/users/me')
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/dungeon-frontend/src/api/inventory.js frontend/dungeon-frontend/src/api/inventory.test.js frontend/dungeon-frontend/src/api/user.js frontend/dungeon-frontend/src/api/user.test.js
git commit -m "feat: implement inventory and user API modules"
```

---

### Task 10: Implement notes.js

Notes live under the user service at `/api/users/me/notes`. The backend requires both `title` and `body` when creating a note, and uses `PATCH` for updates.

**Files:**
- Create: `frontend/dungeon-frontend/src/api/notes.test.js`
- Create: `frontend/dungeon-frontend/src/api/notes.js`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import client from './client'
import { getNotes, createNote, updateNote, deleteNote } from './notes'

vi.mock('./client')

describe('notes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('getNotes GETs /api/users/me/notes', async () => {
    client.mockResolvedValue([])
    await getNotes()
    expect(client).toHaveBeenCalledWith('/api/users/me/notes')
  })

  it('createNote POSTs to /api/users/me/notes with title and body', async () => {
    client.mockResolvedValue({ message: 'note created successfully' })
    await createNote('My Title', 'note content')
    expect(client).toHaveBeenCalledWith('/api/users/me/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'My Title', body: 'note content' }),
    })
  })

  it('updateNote PATCHes /api/users/me/notes/:id with title and body', async () => {
    client.mockResolvedValue({ id: '1', title: 'Updated', body: 'updated content' })
    await updateNote('note-1', 'Updated', 'updated content')
    expect(client).toHaveBeenCalledWith('/api/users/me/notes/note-1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Updated', body: 'updated content' }),
    })
  })

  it('deleteNote DELETEs /api/users/me/notes/:id', async () => {
    client.mockResolvedValue(undefined)
    await deleteNote('note-1')
    expect(client).toHaveBeenCalledWith('/api/users/me/notes/note-1', { method: 'DELETE' })
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test
```

Expected: 4 new tests fail.

- [ ] **Step 3: Implement notes.js**

```js
import client from './client'

export const getNotes = () => client('/api/users/me/notes')

export const createNote = (title, body) =>
  client('/api/users/me/notes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  })

export const updateNote = (id, title, body) =>
  client(`/api/users/me/notes/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  })

export const deleteNote = (id) =>
  client(`/api/users/me/notes/${id}`, { method: 'DELETE' })
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add frontend/dungeon-frontend/src/api/notes.js frontend/dungeon-frontend/src/api/notes.test.js
git commit -m "feat: implement notes API module"
```