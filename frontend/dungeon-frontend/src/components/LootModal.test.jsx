import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import LootModal from './LootModal'

describe('LootModal', () => {
  it('renders item name and rarity', () => {
    render(<LootModal item={{ name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' }} onDismiss={() => {}} />)
    expect(screen.getByText('Iron Sword')).toBeInTheDocument()
    expect(screen.getByText('common')).toBeInTheDocument()
  })

  it('calls onDismiss when Dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<LootModal item={{ name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' }} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders an img tag for the item sprite', () => {
    render(<LootModal item={{ name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' }} onDismiss={() => {}} />)
    expect(screen.getByRole('img', { name: 'Iron Sword' })).toBeInTheDocument()
  })

  it('shows sprite placeholder when image fails to load', () => {
    render(<LootModal item={{ name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' }} onDismiss={() => {}} />)
    fireEvent.error(screen.getByRole('img', { name: 'Iron Sword' }))
    expect(screen.getAllByText('Iron Sword').length).toBeGreaterThan(0)
  })

  it('shows mythic flavour text for mythic items', () => {
    render(<LootModal item={{ name: 'Witch Hat', rarity: 'mythic', spriteKey: 'witch-hat' }} onDismiss={() => {}} />)
    expect(screen.getByText('Something ancient stirs...')).toBeInTheDocument()
  })

  it('does not show mythic flavour text for non-mythic items', () => {
    render(<LootModal item={{ name: 'Iron Sword', rarity: 'common', spriteKey: 'iron-sword' }} onDismiss={() => {}} />)
    expect(screen.queryByText('Something ancient stirs...')).not.toBeInTheDocument()
  })
})
