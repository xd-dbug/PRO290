import { useState } from 'react'
import { updateProfile } from '../api/user'
import './ProfileOverlay.css'

export default function ProfileOverlay({ profile, onClose, onSave }) {
  const [username, setUsername] = useState(profile.username)
  const [email, setEmail] = useState(profile.email)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const validate = () => {
    const next = {}
    if (!username.trim()) next.username = 'Username is required'
    if (!email.trim()) next.email = 'Email is required'
    return next
  }

  const handleSave = async () => {
    const validation = validate()
    if (Object.keys(validation).length > 0) {
      setErrors(validation)
      return
    }
    setErrors({})
    setSubmitting(true)
    try {
      const updated = await updateProfile({ username: username.trim(), email: email.trim() })
      onSave(updated)
      onClose()
    } catch (err) {
      setErrors({ general: err.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    // Edit: change className for the full-screen backdrop
    <div className="overlay-backdrop">
      {/* Edit: change className for the overlay card */}
      <div className="profile-overlay">
        {/* Edit: change className or icon to style the close button */}
        <button className="overlay-close" aria-label="Close profile" onClick={onClose}>×</button>

        <h1>Edit Profile</h1>

        <div className="field-group">
          <p>Username</p>
          {/* Edit: change className to style the username input */}
          <input
            type="text"
            className="overlay-input"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
          {/* Edit: change className to style username validation errors */}
          {errors.username && <p className="field-error">{errors.username}</p>}
        </div>

        <div className="field-group">
          <p>Email</p>
          {/* Edit: change className to style the email input */}
          <input
            type="email"
            className="overlay-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          {/* Edit: change className to style email validation errors */}
          {errors.email && <p className="field-error">{errors.email}</p>}
        </div>

        {/* Edit: change className to style server-side error messages */}
        {errors.general && <p className="field-error">{errors.general}</p>}

        {/* Edit: change button text or className to style the save button */}
        <button onClick={handleSave} disabled={submitting}>
          {submitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}
