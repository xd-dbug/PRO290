import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from './api/auth'
import './Register.css'

export default function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setError(null)
    try {
      await register(email, username, password)
      navigate('/login')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    // Edit: change className or structure for overall register page layout
    <div className="main">
      <div className="register-container">
        <h1>Please enter your name</h1>
        {/* Edit: change className or placeholder to style the username field */}
        <input
          type="text"
          placeholder="name"
          className="name"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />

        <h1>Please enter your email and password</h1>
        {/* Edit: change className to style the email field */}
        <input
          type="email"
          placeholder="email"
          className="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        {/* Edit: change className to style the password field */}
        <input
          type="password"
          placeholder="password"
          className="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {/* Edit: change className to style the error message */}
        {error && <p className="register-error">{error}</p>}

        {/* Edit: change button text or className to style the register button */}
        <button onClick={handleSubmit}>Register</button>
      </div>
    </div>
  )
}