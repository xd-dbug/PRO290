import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from './api/auth'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async () => {
    setError(null)
    try {
      const { token } = await login(email, password)
      localStorage.setItem('token', token)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    // Edit: change className or structure for overall login page layout
    <div className="main">
      <div className="login-container">
        <h1>Please enter the correct information</h1>

        <div className="email-container">
          <p>Email</p>
          {/* Edit: change className or input type to style the email field */}
          <input
            type="text"
            placeholder="email"
            className="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
        </div>

        <div className="password-container">
          <p>Password</p>
          {/* Edit: change className to style the password field */}
          <input
            type="password"
            placeholder="password"
            className="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {/* Edit: change text or className to style the error message */}
        {error && <p className="login-error">{error}</p>}

        {/* Edit: change button text or className to style the login button */}
        <button onClick={handleSubmit}>Login</button>
      </div>
    </div>
  )
}