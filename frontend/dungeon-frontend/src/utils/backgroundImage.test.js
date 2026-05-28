import { getBackgroundImage } from './backgroundImage'

describe('getBackgroundImage', () => {
  it('returns Day image at 0 seconds', () => {
    expect(getBackgroundImage(0)).toBe('/Day.png')
  })

  it('returns Day image just before 10 minute threshold', () => {
    expect(getBackgroundImage(599)).toBe('/Day.png')
  })

  it('returns Night image at exactly 10 minutes', () => {
    expect(getBackgroundImage(600)).toBe('/Night.png')
  })

  it('returns Night image just before 25 minute threshold', () => {
    expect(getBackgroundImage(1499)).toBe('/Night.png')
  })

  it('returns Dungeon image at exactly 25 minutes', () => {
    expect(getBackgroundImage(1500)).toBe('/Dungeon.jpg')
  })

  it('returns Dungeon image well past 25 minutes', () => {
    expect(getBackgroundImage(9999)).toBe('/Dungeon.jpg')
  })
})