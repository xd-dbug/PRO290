import { apiFetch } from './client'

export function getProfile() {
  return apiFetch('/users/me')
}

export function updateProfile(fields) {
  return apiFetch('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  })
}

export function deleteAccount() {
  return apiFetch('/users/me', { method: 'DELETE' })
}