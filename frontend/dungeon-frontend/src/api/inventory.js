import { apiFetch } from './client'

export function getInventory() {
  return apiFetch('/inventory')
}