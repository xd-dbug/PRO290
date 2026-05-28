import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import Login from './Login'
import * as auth from './api/auth'

vi.mock('./api/auth')

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<div>Dashboard</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('calls login with email and password on submit', async () => {
    auth.login.mockResolvedValueOnce({ token: 'tok-1' })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }))
    })
    expect(auth.login).toHaveBeenCalledWith('user@test.com', 'secret')
  })

  it('stores token in localStorage and navigates to / on success', async () => {
    auth.login.mockResolvedValueOnce({ token: 'tok-1' })
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }))
    })
    expect(localStorage.getItem('token')).toBe('tok-1')
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('shows error message on failed login', async () => {
    auth.login.mockRejectedValueOnce(new Error('Invalid credentials'))
    renderLogin()
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'user@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /login/i }))
    })
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    expect(localStorage.getItem('token')).toBeNull()
  })
})