import { apiFetch } from './client'

export function getNotes() {
  return apiFetch('/users/me/notes')
}

export function createNote(title, body) {
  return apiFetch('/users/me/notes', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  })
}

export function updateNote(noteId, title, body) {
  return apiFetch(`/users/me/notes/${noteId}`, {
    method: 'PATCH',
    body: JSON.stringify({ title, body }),
  })
}

export function deleteNote(noteId) {
  return apiFetch(`/users/me/notes/${noteId}`, { method: 'DELETE' })
}