import { startSession, endSession, heartbeat } from './sessions'

describe('sessions', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('startSession calls POST /api/sessions/ with trailing slash', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sessionId: 'abc' }),
    })
    await startSession()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions/',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('endSession calls POST /api/sessions/:id/end with correct id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ qualifying: false }),
    })
    await endSession('sess-99')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions/sess-99/end',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('heartbeat calls POST /api/sessions/:id/heartbeat with correct id', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    })
    await heartbeat('sess-99')
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/sessions/sess-99/heartbeat',
      expect.objectContaining({ method: 'POST' })
    )
  })
})