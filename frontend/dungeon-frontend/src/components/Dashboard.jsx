import { useState, useEffect } from 'react'
import SessionTimer from './SessionTimer'
import DungeonScene from './DungeonScene'
import LootModal from './LootModal'
import ProfileOverlay from './ProfileOverlay'
import NotesOverlay from './NotesOverlay'
import { getBackgroundImage } from '../utils/backgroundImage'
import { getProfile } from '../api/user'
import { getInventory } from '../api/inventory'
import './Dashboard.css'

export default function Dashboard() {
  const [elapsed, setElapsed] = useState(0)
  const [lootItem, setLootItem] = useState(null)
  const [profile, setProfile] = useState(null)
  const [inventory, setInventory] = useState([])
  const [refreshKey, setRefreshKey] = useState(0)
  const [showProfile, setShowProfile] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  const background = getBackgroundImage(elapsed)

  useEffect(() => {
    getProfile().then(setProfile).catch(() => {})
  }, [])

  useEffect(() => {
    getInventory()
      .then(data => setInventory(Array.isArray(data) ? data : (data.items ?? [])))
      .catch(() => {})
  }, [refreshKey])

  const handleLootDismiss = () => {
    setLootItem(null)
    setRefreshKey(k => k + 1)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }

  return (
    // Edit: change className for overall dashboard layout
    <div
      className="dashboard"
      style={{
        // Edit: adjust backgroundSize/Position/Repeat for how the image fills the screen
        backgroundImage: `url(${background})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        minHeight: '100vh',
      }}
    >
      <DungeonScene inventory={inventory} />

      {lootItem && <LootModal item={lootItem} onDismiss={handleLootDismiss} />}

      {showProfile && profile && (
        <ProfileOverlay
          profile={profile}
          onClose={() => setShowProfile(false)}
          onSave={updated => setProfile(updated)}
        />
      )}

      {showNotes && <NotesOverlay onClose={() => setShowNotes(false)} />}

      {/* Edit: change className for the bottom bar wrapper */}
      <div className="bottom-bar">
        {/* Edit: change className for the left side (timer area) */}
        <div className="bottom-bar__left">
          <SessionTimer onQualified={setLootItem} onTick={setElapsed} />
        </div>
        {/* Edit: change className for the right side (user area) */}
        <div className="bottom-bar__right">
          {/* Edit: change className to style the username label */}
          {profile && <span className="bottom-bar__username">{profile.username}</span>}
          {/* Edit: change button text or className to style the Notes button */}
          <button onClick={() => setShowNotes(true)}>Notes</button>
          {/* Edit: change button text or className to style the Profile button */}
          <button onClick={() => setShowProfile(true)}>Profile</button>
          {/* Edit: change button text or className to style the Logout button */}
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  )
}
