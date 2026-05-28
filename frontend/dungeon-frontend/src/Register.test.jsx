import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { vi } from 'vitest'
import Register from './Register'
import * as auth from './api/auth'

vi.mock('./api/auth')

function renderRegister() {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Register', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls register with email, username, and password on submit', async () => {
    auth.register.mockResolvedValueOnce({ message: 'User created successfully' })
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'hero' } })
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'hero@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /register/i }))
    })
    expect(auth.register).toHaveBeenCalledWith('hero@test.com', 'hero', 'secret')
  })

  it('redirects to /login on successful registration', async () => {
    auth.register.mockResolvedValueOnce({ message: 'User created successfully' })
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'hero' } })
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'hero@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /register/i }))
    })
    expect(screen.getByText('Login Page')).toBeInTheDocument()
  })

  it('shows error message on failed registration', async () => {
    auth.register.mockRejectedValueOnce(new Error('Email already in use'))
    renderRegister()
    fireEvent.change(screen.getByPlaceholderText(/name/i), { target: { value: 'hero' } })
    fireEvent.change(screen.getByPlaceholderText(/email/i), { target: { value: 'taken@test.com' } })
    fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'secret' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /register/i }))
    })
    expect(screen.getByText('Email already in use')).toBeInTheDocument()
  })
})