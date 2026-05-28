import { login, register, logout } from './auth'

describe('auth', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('login calls POST /auth/login with email and password', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'jwt-token' }),
    })
    const result = await login('user@test.com', 'password123')
    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@test.com', password: 'password123' }),
      })
    )
    expect(result).toEqual({ token: 'jwt-token' })
  })

  it('register calls POST /auth/register with email, username, and password', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ message: 'User created successfully' }),
    })
    const result = await register('user@test.com', 'hero', 'password123')
    expect(fetchMock).toHaveBeenCalledWith(
      '/auth/register',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'user@test.com', username: 'hero', password: 'password123' }),
      })
    )
    expect(result).toEqual({ message: 'User created successfully' })
  })

  it('login does not send an Authorization header even if a token is in localStorage', async () => {
    localStorage.setItem('token', 'some-token')
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ token: 'new-token' }),
    })
    await login('user@test.com', 'password123')
    const headers = fetchMock.mock.calls[0][1].headers || {}
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('register does not send an Authorization header even if a token is in localStorage', async () => {
    localStorage.setItem('token', 'some-token')
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ message: 'User created successfully' }),
    })
    await register('user@test.com', 'hero', 'password123')
    const headers = fetchMock.mock.calls[0][1].headers || {}
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('logout removes token from localStorage', () => {
    localStorage.setItem('token', 'abc')
    logout()
    expect(localStorage.getItem('token')).toBeNull()
  })

  it('login throws with err.status on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    })
    await expect(login('user@test.com', 'wrong')).rejects.toMatchObject({
      message: 'Invalid credentials',
      status: 401,
    })
  })
})