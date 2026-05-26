import { apiFetch } from './client'

describe('apiFetch', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
    // jsdom doesn't support location assignment — replace with a plain object
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prepends /api to the path', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    await apiFetch('/users/me')
    expect(fetchMock).toHaveBeenCalledWith('/api/users/me', expect.any(Object))
  })

  it('injects Authorization header when token is in localStorage', async () => {
    localStorage.setItem('token', 'test-token')
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    await apiFetch('/users/me')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/users/me',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
      })
    )
  })

  it('does not inject Authorization header when localStorage is empty', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    await apiFetch('/users/me')
    const headers = fetchMock.mock.calls[0][1].headers
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('returns null on 204 response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, status: 204 })
    const result = await apiFetch('/users/me')
    expect(result).toBeNull()
  })

  it('throws with err.status attached on non-ok response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'not found' }),
    })
    await expect(apiFetch('/users/me')).rejects.toMatchObject({
      message: 'not found',
      status: 404,
    })
  })

  it('on 401: clears localStorage and redirects to /login, then throws', async () => {
    localStorage.setItem('token', 'expired-token')
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'unauthorized' }),
    })
    await expect(apiFetch('/users/me')).rejects.toMatchObject({ status: 401 })
    expect(localStorage.getItem('token')).toBeNull()
    expect(window.location.href).toBe('/login')
  })
})