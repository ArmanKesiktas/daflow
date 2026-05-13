import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi, type AuthSession } from '../api/auth'

interface AuthContextValue {
  session: AuthSession | null
  userEmail: string
  isAuthenticated: boolean
  authConfigured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<void>
  signOut: () => Promise<void>
}

const SESSION_KEY = 'daflow_auth_session'
const AUTH_SESSION_VERSION = 2

const AuthContext = createContext<AuthContextValue | null>(null)

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=')
    return JSON.parse(atob(padded)) as Record<string, unknown>
  } catch {
    return null
  }
}

function isUsableSession(session: AuthSession | null) {
  if (!session?.access_token || !session.user?.id) return false
  if ((session as AuthSession & { auth_version?: number }).auth_version !== AUTH_SESSION_VERSION) return false

  const payload = decodeJwtPayload(session.access_token)
  const exp = typeof payload?.exp === 'number' ? payload.exp : null
  if (exp && exp * 1000 <= Date.now()) return false
  return true
}

function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    const session = raw ? (JSON.parse(raw) as AuthSession) : null
    if (!isUsableSession(session)) {
      persistSession(null)
      return null
    }
    return session
  } catch {
    persistSession(null)
    return null
  }
}

function persistSession(session: AuthSession | null) {
  if (session) {
    const versionedSession = withSessionVersion(session)
    localStorage.setItem(SESSION_KEY, JSON.stringify(versionedSession))
    localStorage.setItem('access_token', session.access_token)
    return
  }
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem('access_token')
}

function withSessionVersion(session: AuthSession) {
  return { ...session, auth_version: AUTH_SESSION_VERSION }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => {
    const stored = readSession()
    if (stored?.access_token) localStorage.setItem('access_token', stored.access_token)
    return stored
  })

  useEffect(() => {
    if (session && !isUsableSession(session)) {
      persistSession(null)
      setSession(null)
    }
  }, [session])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    userEmail: session?.user?.email ?? '',
    isAuthenticated: Boolean(session?.access_token),
    authConfigured: authApi.configured(),
    signIn: async (email, password) => {
      const next = await authApi.signIn(email, password)
      const versioned = withSessionVersion(next)
      persistSession(versioned)
      setSession(versioned)
    },
    signUp: async (email, password, metadata) => {
      const next = await authApi.signUp(email, password, metadata)
      const versioned = withSessionVersion(next)
      persistSession(versioned)
      setSession(versioned)
    },
    signOut: async () => {
      const token = session?.access_token
      persistSession(null)
      setSession(null)
      if (token) await authApi.signOut(token)
    },
  }), [session])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
