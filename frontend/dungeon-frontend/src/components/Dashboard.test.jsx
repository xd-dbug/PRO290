import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Dashboard from './Dashboard'
import * as user from '../api/user'
import * as inventory from '../api/inventory'

vi.mock('../api/user')
vi.mock('../api/inventory')
vi.mock('./SessionTimer', () => ({ default: ({ onQualified }) => (
  <button onClick={() => onQualified({ name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' })}>
    MockTimer
  </button>
)}))
vi.mock('./DungeonScene', () => ({ default: ({ inventory: inv }) => <div data-testid="dungeon-scene">{inv.length} items</div> }))
vi.mock('./LootModal', () => ({ default: ({ item, onDismiss }) => <div><span>{item.name}</span><button onClick={onDismiss}>Dismiss</button></div> }))
vi.mock('./ProfileOverlay', () => ({ default: ({ onClose }) => <div><button onClick={onClose}>CloseProfile</button></div> }))
vi.mock('./NotesOverlay', () => ({ default: ({ onClose }) => <div><button onClick={onClose}>CloseNotes</button></div> }))

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    user.getProfile.mockResolvedValue({ username: 'damian', email: 'damian@test.com' })
    inventory.getInventory.mockResolvedValue([])
  })

  it('fetches profile on mount and displays username in bottom bar', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('damian')).toBeInTheDocument())
  })

  it('fetches inventory on mount', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => expect(inventory.getInventory).toHaveBeenCalledTimes(1))
  })

  it('shows loot modal when session qualifies', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    fireEvent.click(screen.getByText('MockTimer'))
    expect(screen.getByText('Iron Sword')).toBeInTheDocument()
  })

  it('hides loot modal and refetches inventory on dismiss', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    fireEvent.click(screen.getByText('MockTimer'))
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    await waitFor(() => expect(inventory.getInventory).toHaveBeenCalledTimes(2))
    expect(screen.queryByText('Iron Sword')).not.toBeInTheDocument()
  })

  it('shows profile overlay when Profile button is clicked', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    await waitFor(() => screen.getByText('damian'))
    fireEvent.click(screen.getByRole('button', { name: /^profile$/i }))
    expect(screen.getByRole('button', { name: 'CloseProfile' })).toBeInTheDocument()
  })

  it('shows notes overlay when Notes button is clicked', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /^notes$/i }))
    expect(screen.getByRole('button', { name: 'CloseNotes' })).toBeInTheDocument()
  })

  it('clears token and navigates to /login on logout', async () => {
    const removeSpy = vi.spyOn(Storage.prototype, 'removeItem')
    delete window.location
    window.location = { href: '' }
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /^logout$/i }))
    expect(removeSpy).toHaveBeenCalledWith('token')
    expect(window.location.href).toBe('/login')
  })
})
