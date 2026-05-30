const RARITY_STYLES = {
  rare:      { borderColor: '#4a9eff', backgroundColor: '#1a3a5c', textColor: '#4a9eff', isMythic: false },
  legendary: { borderColor: '#a855f7', backgroundColor: '#2d1b4e', textColor: '#a855f7', isMythic: false },
  mythic:    { borderColor: '#f59e0b', backgroundColor: '#2a1500', textColor: '#f59e0b', isMythic: true  },
}

const COMMON = { borderColor: '#aaa', backgroundColor: '#2a2a2a', textColor: '#ddd', isMythic: false }

export function getRarityStyle(rarity) {
  return RARITY_STYLES[rarity] ?? COMMON
}