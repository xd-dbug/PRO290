import { useState } from 'react'
import SessionTimer from './SessionTimer'
import { getBackgroundImage } from '../utils/backgroundImage'

export default function Dashboard() {
  const [elapsed, setElapsed] = useState(0)
  // lootItem is set when a qualifying session ends; cleared on modal dismiss
  const [lootItem, setLootItem] = useState(null)

  const background = getBackgroundImage(elapsed)

  return (
    // Edit: change className or add a CSS file for the overall page layout
    <div
      className="dashboard"
      style={{
        // Edit: adjust backgroundSize/Position/Repeat here for how the image fills the screen
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      {/* Edit: move or restyle the timer by changing className on session-timer in SessionTimer.jsx */}
      <SessionTimer
        onQualified={setLootItem}
        onTick={setElapsed}
      />

      {/* Loot modal placeholder — replaced by real modal in the loot task */}
      {lootItem && (
        // Edit: replace this div with the real LootModal component once built
        <div>
          <p>You got: {lootItem.name} ({lootItem.rarity})</p>
          <button onClick={() => setLootItem(null)}>Dismiss</button>
        </div>
      )}
    </div>
  )
}