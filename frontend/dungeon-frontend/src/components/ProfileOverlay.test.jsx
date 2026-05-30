import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ProfileOverlay from './ProfileOverlay'
import * as user from '../api/user'

vi.mock('../api/user')

const mockProfile = { username: 'damian', email: 'damian@test.com' }

describe('ProfileOverlay', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders pre-filled username and email inputs', () => {
    render(<ProfileOverlay profile={mockProfile} onClose={() => {}} onSave={() => {}} />)
    expect(screen.getByDisplayValue('damian')).toBeInTheDocument()
    expect(screen.getByDisplayValue('damian@test.com')).toBeInTheDocument()
  })

  it('calls updateProfile and onSave with new values on save', async () => {
    user.updateProfile.mockResolvedValueOnce({ username: 'newname', email: 'damian@test.com' })
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<ProfileOverlay profile={mockProfile} onClose={onClose} onSave={onSave} />)
    fireEvent.change(screen.getByDisplayValue('damian'), { target: { value: 'newname' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(user.updateProfile).toHaveBeenCalledWith({ username: 'newname', email: 'damian@test.com' }))
    expect(onSave).toHaveBeenCalledWith({ username: 'newname', email: 'damian@test.com' })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows inline error when server returns an error', async () => {
    user.updateProfile.mockRejectedValueOnce(new Error('Username already taken'))
    render(<ProfileOverlay profile={mockProfile} onClose={() => {}} onSave={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(screen.getByText('Username already taken')).toBeInTheDocument())
  })

  it('shows validation error when username is empty', async () => {
    render(<ProfileOverlay profile={mockProfile} onClose={() => {}} onSave={() => {}} />)
    fireEvent.change(screen.getByDisplayValue('damian'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText('Username is required')).toBeInTheDocument()
    expect(user.updateProfile).not.toHaveBeenCalled()
  })

  it('shows validation error when email is empty', async () => {
    render(<ProfileOverlay profile={mockProfile} onClose={() => {}} onSave={() => {}} />)
    fireEvent.change(screen.getByDisplayValue('damian@test.com'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    expect(screen.getByText('Email is required')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<ProfileOverlay profile={mockProfile} onClose={onClose} onSave={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /close profile/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
