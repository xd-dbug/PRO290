async function authFetch(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json()
}

export function login(email, password) {
  return authFetch('/auth/login', { email, password })
}

export function register(email, username, password) {
  return authFetch('/auth/register', { email, username, password })
}

export function logout() {
  localStorage.removeItem('token')
  window.location.href = '/login'
}