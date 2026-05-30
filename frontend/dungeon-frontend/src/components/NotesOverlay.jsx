import { useState, useEffect } from 'react'
import { getNotes, createNote, updateNote, deleteNote } from '../api/notes'
import './NotesOverlay.css'

function NoteItem({ note, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)

  const handleSave = async () => {
    await onUpdate(note.id, title, body)
    setEditing(false)
  }

  const handleCancel = () => {
    setTitle(note.title)
    setBody(note.body)
    setEditing(false)
  }

  return (
    // Edit: change className to style individual note cards
    <div className="note-item">
      {editing ? (
        // Edit: change className for the inline edit form layout
        <div className="note-item__edit">
          {/* Edit: change className to style the inline title input */}
          <input
            className="overlay-input"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          {/* Edit: change className to style the inline body textarea */}
          <textarea
            className="overlay-input"
            value={body}
            onChange={e => setBody(e.target.value)}
          />
          {/* Edit: change className for the save/cancel button row */}
          <div className="note-item__actions">
            <button onClick={handleSave}>Save</button>
            <button onClick={handleCancel}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="note-item__view">
          {/* Edit: change className to style the note title */}
          <p className="note-item__title">{note.title}</p>
          {/* Edit: change className to style the note body text */}
          {note.body && <p className="note-item__body">{note.body}</p>}
          {/* Edit: change className for the edit/delete button row */}
          <div className="note-item__actions">
            <button onClick={() => setEditing(true)}>Edit</button>
            {/* Edit: change button text to rename the delete action */}
            <button aria-label={`Delete ${note.title}`} onClick={() => onDelete(note.id)}>Delete</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function NotesOverlay({ onClose }) {
  const [notes, setNotes] = useState([])
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    getNotes().then(setNotes).catch(err => setError(err.message))
  }, [])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    try {
      const created = await createNote(newTitle.trim(), newBody.trim())
      setNotes(prev => [...prev, created])
      setNewTitle('')
      setNewBody('')
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (noteId) => {
    try {
      await deleteNote(noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdate = async (noteId, title, body) => {
    try {
      const updated = await updateNote(noteId, title, body)
      setNotes(prev => prev.map(n => n.id === noteId ? (updated ?? { ...n, title, body }) : n))
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    // Edit: change className for the full-screen backdrop
    <div className="overlay-backdrop">
      {/* Edit: change className for the notes card */}
      <div className="notes-overlay">
        {/* Edit: change className or icon to style the close button */}
        <button className="overlay-close" aria-label="Close notes" onClick={onClose}>×</button>

        <h1>Notes</h1>

        {/* Edit: change className for the new-note form area */}
        <div className="notes-create">
          {/* Edit: change placeholder text or className for the title input */}
          <input
            type="text"
            className="overlay-input"
            placeholder="Title"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
          />
          {/* Edit: change placeholder text or className for the body input */}
          <input
            type="text"
            className="overlay-input"
            placeholder="Body (optional)"
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
          />
          {/* Edit: change button text or className to style the add button */}
          <button onClick={handleCreate}>Add</button>
        </div>

        {/* Edit: change className to style error messages */}
        {error && <p className="field-error">{error}</p>}

        {/* Edit: change className for the scrollable notes list */}
        <div className="notes-list">
          {notes.map(note => (
            <NoteItem
              key={note.id}
              note={note}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
