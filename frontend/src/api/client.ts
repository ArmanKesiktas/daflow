import axios from 'axios'

function apiBaseUrl() {
  const configured = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  const isLocalApp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const pointsToLocalApi = configured?.includes('localhost') || configured?.includes('127.0.0.1')
  const base = configured && (isLocalApp || !pointsToLocalApi)
    ? configured
    : isLocalApp
      ? ''
      : 'https://daflow.onrender.com'

  if (!base) return '/api'

  const normalized = base.replace(/\/+$/, '')
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`
}

const api = axios.create({
  baseURL: apiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
})

// Inject JWT from localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 responses: attempt token refresh, retry, or redirect to login
let isRefreshing = false
let refreshSubscribers: ((token: string) => void)[] = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

async function refreshAccessToken(): Promise<string | null> {
  const SESSION_KEY = 'daflow_auth_session'
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    const refreshToken = session?.refresh_token
    if (!refreshToken) return null

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (!supabaseUrl || !supabaseKey) return null

    const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!res.ok) return null

    const data = await res.json()
    if (!data.access_token) return null

    // Update stored session
    const updatedSession = { ...session, access_token: data.access_token, refresh_token: data.refresh_token || refreshToken }
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession))
    localStorage.setItem('access_token', data.access_token)

    return data.access_token
  } catch {
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    originalRequest._retry = true

    if (isRefreshing) {
      // Wait for the ongoing refresh to complete
      return new Promise((resolve) => {
        subscribeTokenRefresh((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          resolve(api(originalRequest))
        })
      })
    }

    isRefreshing = true

    const newToken = await refreshAccessToken()

    if (newToken) {
      isRefreshing = false
      onTokenRefreshed(newToken)
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    }

    // Refresh failed — clear session and redirect to login
    isRefreshing = false
    refreshSubscribers = []
    localStorage.removeItem('daflow_auth_session')
    localStorage.removeItem('access_token')
    window.location.href = '/login'
    return Promise.reject(error)
  },
)

export default api
