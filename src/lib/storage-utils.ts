/**
 * Utility functions for safe localStorage access during SSR
 */

/**
 * Safely get an item from localStorage
 * Returns null if localStorage is not available (SSR) or if the item doesn't exist
 */
export function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  
  try {
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null
  } catch (error) {
    console.warn(`Error accessing localStorage for key "${key}":`, error)
    return null
  }
}

/**
 * Safely set an item in localStorage
 * Does nothing if localStorage is not available (SSR)
 */
export function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem(key, value)
  } catch (error) {
    console.warn(`Error setting localStorage for key "${key}":`, error)
  }
}

/**
 * Safely remove an item from localStorage
 * Does nothing if localStorage is not available (SSR)
 */
export function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.removeItem(key)
  } catch (error) {
    console.warn(`Error removing localStorage for key "${key}":`, error)
  }
}

/**
 * Get auth token safely
 */
export function getAuthToken(): string | null {
  return getStorageItem('auth_token')
}