import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import NotesOverlay from './NotesOverlay'
import * as notes from '../api/notes'

vi.mock('../api/notes')

describe('NotesOverlay', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fetches and displays notes on open', async () => {
    notes.getNotes.mockResolvedValueOnce([
      { id: '1', title: 'Buy milk', body: 'Whole milk' },
    ])
    render(<NotesOverlay onClose={() => {}} />)
    await waitFor(() => expect(screen.getByText('Buy milk')).toBeInTheDocument())
  })

  it('creates a note and adds it to the list', async () => {
    notes.getNotes.mockResolvedValue([])
    notes.createNote.mockResolvedValueOnce({ id: '2', title: 'New note', body: '' })
    render(<NotesOverlay onClose={() => {}} />)
    fireEvent.change(screen.getByPlaceholderText('Title'), { target: { value: 'New note' } })
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => expect(notes.createNote).toHaveBeenCalledWith('New note', ''))
    await waitFor(() => expect(screen.getByText('New note')).toBeInTheDocument())
  })

  it('does not call createNote when title is empty', async () => {
    notes.getNotes.mockResolvedValue([])
    render(<NotesOverlay onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /^add$/i }))
    expect(notes.createNote).not.toHaveBeenCalled()
  })

  it('deletes a note and removes it from the list', async () => {
    notes.getNotes.mockResolvedValue([{ id: '1', title: 'Buy milk', body: '' }])
    notes.deleteNote.mockResolvedValueOnce(null)
    render(<NotesOverlay onClose={() => {}} />)
    await waitFor(() => screen.getByText('Buy milk'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete Buy milk' }))
    await waitFor(() => expect(notes.deleteNote).toHaveBeenCalledWith('1'))
    await waitFor(() => expect(screen.queryByText('Buy milk')).not.toBeInTheDocument())
  })

  it('enters inline edit mode on Edit button click', async () => {
    notes.getNotes.mockResolvedValue([{ id: '1', title: 'Buy milk', body: 'Whole milk' }])
    render(<NotesOverlay onClose={() => {}} />)
    await waitFor(() => screen.getByText('Buy milk'))
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    expect(screen.getByDisplayValue('Buy milk')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Whole milk')).toBeInTheDocument()
  })

  it('saves an edited note', async () => {
    notes.getNotes.mockResolvedValue([{ id: '1', title: 'Buy milk', body: 'Whole milk' }])
    notes.updateNote.mockResolvedValueOnce({ id: '1', title: 'Buy oat milk', body: 'Whole milk' })
    render(<NotesOverlay onClose={() => {}} />)
    await waitFor(() => screen.getByText('Buy milk'))
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    fireEvent.change(screen.getByDisplayValue('Buy milk'), { target: { value: 'Buy oat milk' } })
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => expect(notes.updateNote).toHaveBeenCalledWith('1', 'Buy oat milk', 'Whole milk'))
    await waitFor(() => expect(screen.getByText('Buy oat milk')).toBeInTheDocument())
  })

  it('cancels edit without saving', async () => {
    notes.getNotes.mockResolvedValue([{ id: '1', title: 'Buy milk', body: '' }])
    render(<NotesOverlay onClose={() => {}} />)
    await waitFor(() => screen.getByText('Buy milk'))
    fireEvent.click(screen.getByRole('button', { name: /^edit$/i }))
    fireEvent.change(screen.getByDisplayValue('Buy milk'), { target: { value: 'Changed' } })
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(notes.updateNote).not.toHaveBeenCalled()
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    notes.getNotes.mockResolvedValue([])
    const onClose = vi.fn()
    render(<NotesOverlay onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: /close notes/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
