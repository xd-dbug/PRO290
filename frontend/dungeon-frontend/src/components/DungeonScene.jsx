import { useState } from 'react'
import { getRarityStyle } from '../utils/rarityStyle'
import '../utils/rarityStyle.css'
import './DungeonScene.css'

function ItemCell({ item }) {
  const [imgFailed, setImgFailed] = useState(false)
  const style = getRarityStyle(item.rarity)

  return (
    <div
      className={`item-cell${style.isMythic ? ' mythic-pulse' : ''}`}
      style={{
        border: `2px solid ${style.borderColor}`,
        backgroundColor: style.backgroundColor,
      }}
    >
      {!imgFailed ? (
        <img
          src={`/sprites/${item.spriteKey}.png`}
          alt={item.name}
          className="item-cell__sprite"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="item-cell__placeholder">
          <span className="item-cell__name" style={{ color: style.textColor }}>{item.name}</span>
          <span className="item-cell__rarity" style={{ color: style.textColor }}>{item.rarity}</span>
        </div>
      )}
    </div>
  )
}

export default function DungeonScene({ inventory }) {
  return (
    <div className="dungeon-scene">
      <div className="dungeon-scene__grid">
        {inventory.map(item => (
          <ItemCell key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}
