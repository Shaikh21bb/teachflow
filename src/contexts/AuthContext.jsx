import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

import { API_BASE, authFetch, authStorage as storage } from '../lib/http'
export { authFetch } from '../lib/http'

const AuthContext = createContext()

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}


// ──────────────────────────────────────────
// Auth Provider
// ──────────────────────────────────────────
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(storage.getToken)
    useEffect(() => {
        const expire = () => { setUser(null); setToken(null); };
        const creditsChanged = event => setUser(current => current ? { ...current, credits: event.detail } : current);
        window.addEventListener('auth:expired', expire);
        window.addEventListener('credits:changed', creditsChanged);
        return () => {
            window.removeEventListener('auth:expired', expire);
            window.removeEventListener('credits:changed', creditsChanged);
        };
    }, [])

    const fetchUserInfo = useCallback(async () => {
        try {
            const res = await authFetch(`${API_BASE}/auth/me`)
            if (res.ok) {
                const data = await res.json()
                setUser(data.user)
            } else if (res.status === 401 || res.status === 403) {
                // Only clear tokens on explicit auth failure, not on server errors
                storage.clearTokens()
                setToken(null)
                setUser(null)
            }
            // On 5xx or network error — keep user logged in, just don't update
        } catch {
            // Network error — don't log out, just set loading to false
            // User might be offline temporarily
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
        refreshUser: fetchUserInfo,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
