import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

let API_BASE = import.meta.env.VITE_API_URL || '';
if (!API_BASE) {
    if (typeof window !== 'undefined') {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            API_BASE = 'http://localhost:3001/api';
        } else {
            API_BASE = '/api';
        }
    } else {
        API_BASE = '/api';
    }
}

const AuthContext = createContext()

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

// ──────────────────────────────────────────
// Token storage helpers
// ──────────────────────────────────────────
const storage = {
    getToken: () => localStorage.getItem('auth_token'),
    getRefreshToken: () => localStorage.getItem('auth_refresh_token'),
    setTokens: (accessToken, refreshToken) => {
        localStorage.setItem('auth_token', accessToken)
        if (refreshToken) localStorage.setItem('auth_refresh_token', refreshToken)
    },
    clearTokens: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('auth_refresh_token')
    },
}

// ──────────────────────────────────────────
// Authenticated fetch with auto-refresh
// ──────────────────────────────────────────
let isRefreshing = false
let refreshQueue = [] // Pending requests during refresh

async function refreshAccessToken() {
    const refreshToken = storage.getRefreshToken()
    if (!refreshToken) throw new Error('No refresh token')

    const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
        throw new Error('Refresh failed')
    }

    const data = await res.json()
    storage.setTokens(data.token, data.refreshToken)
    return data.token
}

export async function authFetch(url, options = {}) {
    const token = storage.getToken()
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
    }

    let res = await fetch(url, { ...options, headers })

    // Auto-refresh on TOKEN_EXPIRED
    if (res.status === 401) {
        const body = await res.clone().json().catch(() => ({}))
        if (body.code === 'TOKEN_EXPIRED') {
            if (!isRefreshing) {
                isRefreshing = true
                try {
                    const newToken = await refreshAccessToken()
                    isRefreshing = false
                    // Retry all queued requests
                    refreshQueue.forEach((cb) => cb(newToken))
                    refreshQueue = []
                    // Retry original request
                    return fetch(url, {
                        ...options,
                        headers: { ...headers, Authorization: `Bearer ${newToken}` },
                    })
                } catch {
                    isRefreshing = false
                    refreshQueue.forEach((cb) => cb(null))
                    refreshQueue = []
                    storage.clearTokens()
                    window.location.href = '/login'
                    return res
                }
            } else {
                // Queue this request until refresh completes
                return new Promise((resolve) => {
                    refreshQueue.push((newToken) => {
                        if (newToken) {
                            resolve(
                                fetch(url, {
                                    ...options,
                                    headers: { ...headers, Authorization: `Bearer ${newToken}` },
                                })
                            )
                        } else {
                            resolve(res)
                        }
                    })
                })
            }
        }
    }

    return res
}

// ──────────────────────────────────────────
// Auth Provider
// ──────────────────────────────────────────
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(storage.getToken)

    const fetchUserInfo = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE}/auth/me`)
            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
            } else {
                // Could not recover — log out
                storage.clearTokens()
                setToken(null)
            }
        } catch {
            storage.clearTokens()
            setToken(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (token) {
            fetchUserInfo()
        } else {
            setLoading(false)
        }
    }, [token])

    async function register(name, email, password, subjects = []) {
        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, subjects }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Ошибка регистрации')

            // Auto-login after register
            if (data.token) {
                storage.setTokens(data.token, data.refreshToken)
                setToken(data.token)
                setUser(data.user)
            }

            return { success: true, message: data.message }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async function login(email, password) {
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Ошибка входа')

            storage.setTokens(data.token, data.refreshToken)
            setToken(data.token)
            setUser(data.user)

            return { success: true, user: data.user }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async function logout() {
        try {
            const refreshToken = storage.getRefreshToken()
            // Revoke refresh token on server
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken }),
            })
        } catch {
            // Silent — always clear local storage regardless
        } finally {
            storage.clearTokens()
            setToken(null)
            setUser(null)
        }
    }

    const value = {
        user,
        loading,
        token,
        isAuthenticated: !!user,
        register,
        login,
        logout,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
