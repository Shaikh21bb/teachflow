import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Library from './pages/Library'
import LessonBuilder from './pages/LessonBuilder'
import Assignments from './pages/Assignments'
import ClassDashboard from './pages/ClassDashboard'
import Reports from './pages/Reports'
import Login from './pages/Login'
import Register from './pages/Register'
import AlFarabiBot from './pages/AlFarabiBot'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'

function App() {
    return (
        <LanguageProvider>
            <AuthProvider>
                <BrowserRouter>
                    <Routes>
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/library" element={<ProtectedRoute><DashboardLayout><Library /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/builder" element={<ProtectedRoute><DashboardLayout><LessonBuilder /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/assignments" element={<ProtectedRoute><DashboardLayout><Assignments /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/classes" element={<ProtectedRoute><DashboardLayout><ClassDashboard /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/reports" element={<ProtectedRoute><DashboardLayout><Reports /></DashboardLayout></ProtectedRoute>} />
                        <Route path="/alfarabi-bot" element={<ProtectedRoute><DashboardLayout><AlFarabiBot /></DashboardLayout></ProtectedRoute>} />
                    </Routes>
                </BrowserRouter>
            </AuthProvider>
        </LanguageProvider>
    )
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth()

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Загрузка...</div>
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    return children
}

function DashboardLayout({ children }) {
    const location = useLocation()
    const { t, language, toggleLanguage } = useLanguage()

    const navItems = [
        { path: '/dashboard', icon: '🏠', label: t('nav.home') },
        { path: '/library', icon: '📚', label: t('nav.library') },
        { path: '/builder', icon: '🛠️', label: t('nav.builder') },
        { path: '/assignments', icon: '📋', label: t('nav.assignments') },
        { path: '/classes', icon: '👥', label: t('nav.classes') },
        { path: '/reports', icon: '📊', label: t('nav.reports') },
        { path: '/alfarabi-bot', icon: '👳‍♂️', label: t('nav.alfarabi') },
    ]

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Link to="/" className="logo">
                        <div className="logo-icon-ai" style={{ width: '32px', height: '32px', fontSize: '0.9rem' }}>AI</div>
                        <span>yraq.ai</span>
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">{t('nav.menu')}</div>
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                <span>{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    <div className="sidebar-section">
                        <div className="sidebar-section-title">{t('nav.other')}</div>
                        <a href="#" className="sidebar-link">
                            <span className="sidebar-link-icon">🔗</span>
                            <span>{t('nav.integrations')}</span>
                        </a>
                        <a href="#" className="sidebar-link">
                            <span className="sidebar-link-icon">⚙️</span>
                            <span>{t('nav.settings')}</span>
                        </a>
                        <a href="#" className="sidebar-link">
                            <span className="sidebar-link-icon">❓</span>
                            <span>{t('nav.help')}</span>
                        </a>
                    </div>
                </nav>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-search">
                        <span>🔍</span>
                        <input type="text" placeholder={t('common.searchPlaceholder')} />
                    </div>

                    <div className="topbar-actions">
                        <button
                            onClick={toggleLanguage}
                            className="btn btn-ghost"
                            style={{
                                fontWeight: 'bold',
                                border: '1px solid #e2e8f0',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                marginRight: '10px'
                            }}
                        >
                            {language === 'kk' ? '🇰🇿 ҚАЗ' : '🇷🇺 РУС'}
                        </button>

                        {/* User Profile Component */}
                        <UserProfile />
                    </div>
                </header>

                <div className="page-content">
                    {children}
                </div>
            </main>
        </div>
    )
}

// User Profile Component
function UserProfile() {
    const { user, logout } = useAuth()
    const { language } = useLanguage()
    const [showDropdown, setShowDropdown] = useState(false)

    if (!user) return null

    function handleLogout() {
        logout()
        window.location.href = '/'
    }

    return (
        <div style={{ position: 'relative' }}>
            <div
                className="topbar-user"
                onClick={() => setShowDropdown(!showDropdown)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
            >
                <div className="topbar-icon">
                    <span>🔔</span>
                </div>
                <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600
                }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
            </div>

            {showDropdown && (
                <>
                    <div
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 999
                        }}
                        onClick={() => setShowDropdown(false)}
                    />
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: 'var(--spacing-2)',
                        background: 'white',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        minWidth: '220px',
                        padding: 'var(--spacing-2)',
                        zIndex: 1000
                    }}>
                        <div style={{
                            padding: 'var(--spacing-3)',
                            borderBottom: '1px solid var(--color-gray-200)'
                        }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{user.name}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{user.email}</div>
                        </div>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={handleLogout}
                            style={{ width: '100%', justifyContent: 'flex-start', marginTop: 'var(--spacing-2)' }}
                        >
                            🚪 {language === 'kk' ? 'Шығу' : 'Выйти'}
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}

export default App
