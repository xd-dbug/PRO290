import { render, screen, fireEvent, act } from '@testing-library/react'
import { vi } from 'vitest'
import SessionTimer from './SessionTimer'
import * as sessions from '../api/sessions'

vi.mock('../api/sessions')

describe('SessionTimer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('displays 00:00 elapsed time when not running', () => {
    render(<SessionTimer onQualified={() => {}} />)
    expect(screen.getByText('00:00')).toBeInTheDocument()
  })

  it('calls startSession when start button is clicked', async () => {
    sessions.startSession.mockResolvedValueOnce({ sessionId: 'sess-1' })
    render(<SessionTimer onQualified={() => {}} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }))
    })
    expect(sessions.startSession).toHaveBeenCalledTimes(1)
  })

  it('increments elapsed display every second after start', async () => {
    sessions.startSession.mockResolvedValueOnce({ sessionId: 'sess-1' })
    render(<SessionTimer onQualified={() => {}} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }))
    })
    act(() => vi.advanceTimersByTime(3000))
    expect(screen.getByText('00:03')).toBeInTheDocument()
  })

  it('sends heartbeat every 30 seconds with the sessionId', async () => {
    sessions.startSession.mockResolvedValueOnce({ sessionId: 'sess-1' })
    sessions.heartbeat.mockResolvedValue({})
    render(<SessionTimer onQualified={() => {}} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }))
    })
    act(() => vi.advanceTimersByTime(90000))
    expect(sessions.heartbeat).toHaveBeenCalledTimes(3)
    expect(sessions.heartbeat).toHaveBeenCalledWith('sess-1')
  })

  it('calls endSession with the correct sessionId on stop', async () => {
    sessions.startSession.mockResolvedValueOnce({ sessionId: 'sess-1' })
    sessions.endSession.mockResolvedValueOnce({ qualifying: false })
    render(<SessionTimer onQualified={() => {}} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    })
    expect(sessions.endSession).toHaveBeenCalledWith('sess-1')
  })

  it('calls onQualified with the item when session is qualifying', async () => {
    const onQualified = vi.fn()
    sessions.startSession.mockResolvedValueOnce({ sessionId: 'sess-1' })
    sessions.endSession.mockResolvedValueOnce({ qualifying: true, item: { name: 'Iron Sword', rarity: 'common' } })
    render(<SessionTimer onQualified={onQualified} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    })
    expect(onQualified).toHaveBeenCalledWith({ name: 'Iron Sword', rarity: 'common' })
  })

  it('does not call onQualified when session is not qualifying', async () => {
    const onQualified = vi.fn()
    sessions.startSession.mockResolvedValueOnce({ sessionId: 'sess-1' })
    sessions.endSession.mockResolvedValueOnce({ qualifying: false })
    render(<SessionTimer onQualified={onQualified} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }))
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /stop/i }))
    })
    expect(onQualified).not.toHaveBeenCalled()
  })

  it('calls onTick with elapsed seconds on each tick', async () => {
    sessions.startSession.mockResolvedValueOnce({ sessionId: 'sess-1' })
    sessions.heartbeat.mockResolvedValue({})
    const onTick = vi.fn()
    render(<SessionTimer onQualified={() => {}} onTick={onTick} />)
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /start/i }))
    })
    act(() => vi.advanceTimersByTime(3000))
    expect(onTick).toHaveBeenCalledTimes(3)
    expect(onTick).toHaveBeenNthCalledWith(3, 3)
  })
})