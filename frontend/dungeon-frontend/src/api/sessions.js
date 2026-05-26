import { apiFetch } from './client'

export function startSession() {
  return apiFetch('/sessions', { method: 'POST' })
}

export function endSession(sessionId) {
  return apiFetch(`/sessions/${sessionId}/end`, { method: 'POST' })
}

export function heartbeat(sessionId) {
  return apiFetch(`/sessions/${sessionId}/heartbeat`, { method: 'POST' })
}