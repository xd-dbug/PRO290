import { useState } from 'react'
import { getRarityStyle } from '../utils/rarityStyle'
import '../utils/rarityStyle.css'
import './LootModal.css'

export default function LootModal({ item, onDismiss }) {
  const [imgFailed, setImgFailed] = useState(false)
  const style = getRarityStyle(item.rarity)

  return (
    <div className="loot-backdrop">
      <div
        className={`loot-modal${style.isMythic ? ' mythic-pulse' : ''}`}
        style={{
          border: `2px groove ${style.borderColor}`,
          backgroundColor: '#702963',
        }}
      >
        <span
          className="loot-modal__rarity"
          style={{ color: style.textColor, borderColor: style.borderColor }}
        >
          {item.rarity}
        </span>

        <h1 className="loot-modal__name">{item.name}</h1>

        {style.isMythic && (
          <p className="loot-modal__flavour">Something ancient stirs...</p>
        )}

        {!imgFailed ? (
          <img
            src={`/sprites/${item.spriteKey}.png`}
            alt={item.name}
            className="loot-modal__sprite"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div
            className="loot-modal__sprite-placeholder"
            style={{ borderColor: style.borderColor, backgroundColor: style.backgroundColor }}
          >
            <span style={{ color: style.textColor }}>{item.name}</span>
          </div>
        )}

        <button className="loot-modal__dismiss" onClick={onDismiss}>Dismiss</button>
      </div>
    </div>
  )
}
