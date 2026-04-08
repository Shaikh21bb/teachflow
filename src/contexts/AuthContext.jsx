import { createContext, useContext, useState, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const AuthContext = createContext()

export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider')
    }
    return context
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [token, setToken] = useState(localStorage.getItem('auth_token'))

    useEffect(() => {
        // Check if user is already logged in
        if (token) {
            fetchUserInfo()
        } else {
            setLoading(false)
        }
    }, [token])

    async function fetchUserInfo() {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (response.ok) {
                const data = await response.json()
                setUser(data.user)
            } else {
                // Token invalid or expired
                logout()
            }
        } catch (error) {
            console.error('Failed to fetch user info:', error)
            logout()
        } finally {
            setLoading(false)
        }
    }

    async function register(name, email, password, subjects = []) {
        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, subjects })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка регистрации')
            }

            return { success: true, message: data.message }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    async function login(email, password) {
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Ошибка входа')
            }

            // Save token and user
            localStorage.setItem('auth_token', data.token)
            setToken(data.token)
            setUser(data.user)

            return { success: true, user: data.user }
        } catch (error) {
            return { success: false, error: error.message }
        }
    }

    function logout() {
        localStorage.removeItem('auth_token')
        setToken(null)
        setUser(null)
    }

    const value = {
        user,
        loading,
        isAuthenticated: !!user,
        register,
        login,
        logout
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
