import { apiFetch } from './client'

export function startSession() {
  // trailing slash required — nginx location block is /api/sessions/ (not /api/sessions)
  return apiFetch('/sessions/', { method: 'POST' })
}

export function endSession(sessionId) {
  return apiFetch(`/sessions/${sessionId}/end`, { method: 'POST' })
}

export function heartbeat(sessionId) {
  return apiFetch(`/sessions/${sessionId}/heartbeat`, { method: 'POST' })
}