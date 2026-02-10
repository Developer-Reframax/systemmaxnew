export const SESSION_STORAGE_KEY = 'active_session_id'
export const LAST_SESSION_KEY = 'last_session_id'

type SessionEventType = 'login' | 'page_view' | 'action' | 'heartbeat' | 'logout' | 'end'

interface SessionEventPayload {
  type: SessionEventType
  path?: string
  label?: string
  metadata?: Record<string, unknown>
  occurred_at?: string
}

export function getActiveSessionId() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(SESSION_STORAGE_KEY)
}

export function setActiveSession(id: string) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_STORAGE_KEY, id)
  localStorage.setItem(LAST_SESSION_KEY, id)
}

export function clearStoredSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(SESSION_STORAGE_KEY)
  localStorage.removeItem(LAST_SESSION_KEY)
}

async function callSessionApi(
  method: 'POST' | 'PATCH',
  body: Record<string, unknown>,
  options?: { keepalive?: boolean }
) {
  const response = await fetch('/api/sessions', {
    method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body),
    keepalive: options?.keepalive === true
  })

  if (!response.ok) {
    return { ok: false }
  }

  const data = await response.json()
  return { ok: true, data }
}

export async function startUserSession(path: string = '/') {
  const started_at = new Date().toISOString()
  const result = await callSessionApi('POST', { started_at, path })

  if (result.ok && result.data?.sessionId) {
    setActiveSession(result.data.sessionId)
    return result.data.sessionId as string
  }

  return null
}

export async function logSessionEvent(
  event: SessionEventPayload,
  options?: { endSession?: boolean; keepalive?: boolean }
) {
  const sessionId = getActiveSessionId()
  if (!sessionId) return false

  const payload: Record<string, unknown> = {
    sessionId,
    event
  }

  if (options?.endSession) {
    payload.endSession = true
  }

  const result = await callSessionApi('PATCH', payload, { keepalive: options?.keepalive })

  if (options?.endSession && result.ok) {
    clearStoredSession()
  }

  return result.ok
}

export async function endUserSession(reason: 'logout' | 'tab_closed' = 'logout', keepalive = false) {
  return logSessionEvent(
    {
      type: reason === 'logout' ? 'logout' : 'end',
      label: reason,
      occurred_at: new Date().toISOString()
    },
    { endSession: true, keepalive }
  )
}

export async function endSpecificSession(sessionId: string, reason: 'logout' | 'stale' = 'stale') {
  const payload: Record<string, unknown> = {
    sessionId,
    event: {
      type: reason === 'logout' ? 'logout' : 'end',
      label: reason,
      occurred_at: new Date().toISOString()
    },
    endSession: true
  }

  const result = await callSessionApi('PATCH', payload)

  if (result.ok) {
    const activeId = getActiveSessionId()
    if (activeId === sessionId) {
      clearStoredSession()
    }
  }

  return result.ok
}
