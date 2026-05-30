import { render, screen, fireEvent } from '@testing-library/react'
import DungeonScene from './DungeonScene'

describe('DungeonScene', () => {
  it('renders nothing when inventory is empty', () => {
    const { container } = render(<DungeonScene inventory={[]} />)
    expect(container.querySelectorAll('.item-cell')).toHaveLength(0)
  })

  it('renders one item cell per inventory item', () => {
    const inventory = [
      { id: '1', name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' },
      { id: '2', name: 'Magic Shield', rarity: 'rare', spriteKey: 'magic-shield' },
    ]
    const { container } = render(<DungeonScene inventory={inventory} />)
    expect(container.querySelectorAll('.item-cell')).toHaveLength(2)
  })

  it('renders an img tag for each item', () => {
    const inventory = [{ id: '1', name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' }]
    render(<DungeonScene inventory={inventory} />)
    expect(screen.getByRole('img', { name: 'Iron Sword' })).toBeInTheDocument()
  })

  it('shows name and rarity placeholder when image fails to load', () => {
    const inventory = [{ id: '1', name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' }]
    render(<DungeonScene inventory={inventory} />)
    fireEvent.error(screen.getByRole('img', { name: 'Iron Sword' }))
    expect(screen.getByText('Iron Sword')).toBeInTheDocument()
    expect(screen.getByText('common')).toBeInTheDocument()
  })

  it('shows rarity label in placeholder for legendary item', () => {
    const inventory = [{ id: '1', name: 'Ancient Helm', rarity: 'legendary', spriteKey: 'ancient-helm' }]
    render(<DungeonScene inventory={inventory} />)
    fireEvent.error(screen.getByRole('img', { name: 'Ancient Helm' }))
    expect(screen.getByText('legendary')).toBeInTheDocument()
  })
})
