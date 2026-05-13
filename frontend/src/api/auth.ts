interface SupabaseUser {
  id: string
  email?: string
}

export interface AuthSession {
  access_token: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  user: SupabaseUser
}

interface AuthResponse {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  user?: SupabaseUser
  error?: string
  error_description?: string
  msg?: string
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

function configured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('your-project'))
}

async function requestAuth(path: string, body: Record<string, unknown>) {
  if (!configured()) {
    throw new Error('Supabase auth is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  const data = (text ? JSON.parse(text) : {}) as AuthResponse
  if (!res.ok) {
    throw new Error(authErrorMessage(data, 'Authentication failed'))
  }
  return data
}

function authErrorMessage(data: AuthResponse, fallback: string) {
  const raw = data.error_description || data.msg || data.error || fallback
  const normalized = raw.toLowerCase()
  if (normalized.includes('invalid login credentials')) {
    return 'E-posta veya şifre hatalı. Şifreni unuttuysan sıfırlama e-postası gönderebilirsin.'
  }
  if (normalized.includes('email not confirmed')) {
    return 'E-posta adresi doğrulanmamış. Gelen kutundaki doğrulama bağlantısını açıp tekrar giriş yap.'
  }
  return raw
}

function toSession(data: AuthResponse): AuthSession {
  if (!data.access_token || !data.user) {
    throw new Error('Check your email to confirm your account, then sign in.')
  }
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    token_type: data.token_type,
    user: data.user,
  }
}

export const authApi = {
  configured,

  async signIn(email: string, password: string) {
    const data = await requestAuth('token?grant_type=password', { email, password })
    return toSession(data)
  },

  async signUp(email: string, password: string, metadata?: Record<string, unknown>) {
    const data = await requestAuth('signup', { email, password, data: metadata ?? {} })
    return toSession(data)
  },

  async resetPassword(email: string, redirectTo?: string) {
    const query = redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''
    await requestAuth(`recover${query}`, { email })
  },

  async updatePassword(accessToken: string, newPassword: string) {
    if (!configured()) {
      throw new Error('Supabase auth is not configured.')
    }
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: newPassword }),
    })
    const text = await res.text()
    const data = (text ? JSON.parse(text) : {}) as AuthResponse
    if (!res.ok) {
      throw new Error(authErrorMessage(data, 'Password update failed'))
    }
    return data
  },

  async signOut(accessToken: string) {
    if (!configured()) return
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY!,
        Authorization: `Bearer ${accessToken}`,
      },
    })
  },
}
