import { getRarityStyle } from './rarityStyle'

describe('getRarityStyle', () => {
  it('returns grey styles for common', () => {
    const s = getRarityStyle('common')
    expect(s.borderColor).toBe('#aaa')
    expect(s.backgroundColor).toBe('#2a2a2a')
    expect(s.textColor).toBe('#ddd')
    expect(s.isMythic).toBe(false)
  })

  it('returns blue styles for rare', () => {
    const s = getRarityStyle('rare')
    expect(s.borderColor).toBe('#4a9eff')
    expect(s.backgroundColor).toBe('#1a3a5c')
    expect(s.textColor).toBe('#4a9eff')
    expect(s.isMythic).toBe(false)
  })

  it('returns purple styles for legendary', () => {
    const s = getRarityStyle('legendary')
    expect(s.borderColor).toBe('#a855f7')
    expect(s.backgroundColor).toBe('#2d1b4e')
    expect(s.textColor).toBe('#a855f7')
    expect(s.isMythic).toBe(false)
  })

  it('returns gold styles for mythic and sets isMythic true', () => {
    const s = getRarityStyle('mythic')
    expect(s.borderColor).toBe('#f59e0b')
    expect(s.backgroundColor).toBe('#2a1500')
    expect(s.textColor).toBe('#f59e0b')
    expect(s.isMythic).toBe(true)
  })

  it('falls back to common styles for unknown rarity', () => {
    const s = getRarityStyle('unknown')
    expect(s.borderColor).toBe('#aaa')
    expect(s.isMythic).toBe(false)
  })
})