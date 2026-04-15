import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { 
    Home, BookOpen, LayoutTemplate, Library, 
    ClipboardList, Users, BarChart, Bot, 
    Plug, Settings, HelpCircle, Search, 
    Bell, LogOut, Moon, Sun, FileQuestion,
    PanelLeftClose, PanelLeftOpen, UserCircle2
} from 'lucide-react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import LibraryPage from './pages/Library'
import LessonBuilder from './pages/LessonBuilder'
import Assignments from './pages/Assignments'
import ClassDashboard from './pages/ClassDashboard'
import Reports from './pages/Reports'
import Login from './pages/Login'
import Register from './pages/Register'
import AlFarabiBot from './pages/AlFarabiBot'
import OpenLesson from './pages/OpenLesson'
import MyLessons from './pages/MyLessons'
import Integrations from './pages/Integrations'
import Quizzes from './pages/Quizzes'
import QuizReport from './pages/QuizReport'
import SettingsPage from './pages/Settings'
import ProfilePage from './pages/Profile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><Dashboard /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/library" element={<ProtectedRoute><DashboardLayout><LibraryPage /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/builder" element={<ProtectedRoute><DashboardLayout><LessonBuilder /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/assignments" element={<ProtectedRoute><DashboardLayout><Assignments /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/classes" element={<ProtectedRoute><DashboardLayout><ClassDashboard /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/reports" element={<ProtectedRoute><DashboardLayout><Reports /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/alfarabi-bot" element={<ProtectedRoute><DashboardLayout><AlFarabiBot /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/open-lessons" element={<ProtectedRoute><DashboardLayout><OpenLesson /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/my-lessons" element={<ProtectedRoute><DashboardLayout><MyLessons /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/integrations" element={<ProtectedRoute><DashboardLayout><Integrations /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/quizzes" element={<ProtectedRoute><DashboardLayout><Quizzes /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/quizzes/:id/report" element={<ProtectedRoute><DashboardLayout><QuizReport /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/profile" element={<ProtectedRoute><DashboardLayout><ProfilePage /></DashboardLayout></ProtectedRoute>} />
                        </Routes>
                    </BrowserRouter>
                </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    )
}

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth()
    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Загрузка...</div>
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return children
}

function DashboardLayout({ children }) {
    const location = useLocation()
    const { t, language, toggleLanguage } = useLanguage()

    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebarCollapsed') === 'true' } catch { return false }
    })

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev
            try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
            return next
        })
    }

    const navItems = [
        { path: '/dashboard', icon: <Home size={20} />, label: t('nav.home') },
        { path: '/my-lessons', icon: <BookOpen size={20} />, label: t('nav.myLessons') },
        { path: '/builder', icon: <LayoutTemplate size={20} />, label: t('nav.builder') },
        { path: '/open-lessons', icon: <Library size={20} />, label: t('nav.openLessons') },
        { path: '/quizzes', icon: <FileQuestion size={20} />, label: t('nav.quizzes') },
        { path: '/assignments', icon: <ClipboardList size={20} />, label: t('nav.assignments') },
        { path: '/classes', icon: <Users size={20} />, label: t('nav.classes') },
        { path: '/reports', icon: <BarChart size={20} />, label: t('nav.reports') },
        { path: '/alfarabi-bot', icon: <Bot size={20} />, label: t('nav.alfarabi') },
    ]

    const otherItems = [
        { path: '/profile', icon: <UserCircle2 size={20} />, label: t('nav.profile') },
        { path: '/integrations', icon: <Plug size={20} />, label: language === 'kk' ? 'Интеграция' : 'Интеграции' },
    ]

    return (
        <div className="dashboard">
            <aside className={"sidebar " + (collapsed ? 'collapsed' : '') + " hide-on-mobile"}>
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-logo-area">
                        <div className="logo-icon-ai" style={{ width: '32px', height: '32px', fontSize: '0.9rem', flexShrink: 0 }}>AI</div>
                        <span className="sidebar-logo-text">Urpaq.ai</span>
                    </Link>
                    <button
                        className="sidebar-toggle-btn hide-on-mobile"
                        onClick={toggleCollapsed}
                        title={collapsed ? 'Открыть' : 'Свернуть'}
                    >
                        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">{t('nav.menu')}</div>
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                                data-label={item.label}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                <span className="sidebar-link-label">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    <div className="sidebar-section">
                        <div className="sidebar-section-title">{t('nav.other')}</div>
                        {otherItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                                data-label={item.label}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                <span className="sidebar-link-label">{item.label}</span>
                            </NavLink>
                        ))}
                        <NavLink
                            to="/settings"
                            className={({ isActive }) => 'sidebar-link' + (isActive ? ' active' : '')}
                            data-label={t('nav.settings')}
                        >
                            <span className="sidebar-link-icon"><Settings size={20} /></span>
                            <span className="sidebar-link-label">{t('nav.settings')}</span>
                        </NavLink>
                        <a
                            href="https://wa.me/77771225784"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="sidebar-link"
                            data-label={t('nav.help')}
                        >
                            <span className="sidebar-link-icon"><HelpCircle size={20} /></span>
                            <span className="sidebar-link-label">{t('nav.help')}</span>
                        </a>
                    </div>
                </nav>
            </aside>

            <main className={"main-content " + (collapsed ? 'sidebar-collapsed' : '')}>
                <header className="topbar">
                    <Link to="/" className="mobile-header-logo hide-on-desktop">
                        <div className="logo-icon-ai" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>AI</div>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>Urpaq.ai</span>
                    </Link>

                    <div className="topbar-search">
                        <Search size={18} style={{ color: 'var(--color-gray-400)' }} />
                        <input type="text" placeholder={t('common.searchPlaceholder')} />
                    </div>

                    <div className="topbar-actions">
                        <ThemeToggleButton />
                        <button
                            onClick={toggleLanguage}
                            className="btn btn-ghost"
                            style={{
                                fontWeight: 'bold',
                                border: '1px solid var(--color-gray-200)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                marginRight: '10px'
                            }}
                        >
                            {language === 'kk' ? 'KAZ' : 'RUS'}
                        </button>
                        <UserProfile />
                    </div>
                </header>

                <div className="page-content" style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}>
                    {children}
                </div>
            </main>

            <MobileBottomNav items={navItems} />
        </div>
    )
}

function MobileBottomNav({ items }) {
    const { t, language } = useLanguage()
    const primaryItems = items.filter(i =>
        ['/dashboard', '/builder', '/open-lessons', '/alfarabi-bot'].includes(i.path)
    )
    return (
        <nav className="mobile-bottom-nav hide-on-desktop">
            {primaryItems.map(item => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
                >
                    <div className="bottom-nav-icon">{item.icon}</div>
                    <span className="bottom-nav-label" style={{ fontSize: '10px', marginTop: '4px' }}>{item.label}</span>
                </NavLink>
            ))}
            <NavLink
                to="/profile"
                className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}
            >
                <div className="bottom-nav-icon"><UserCircle2 size={20} /></div>
                <span className="bottom-nav-label" style={{ fontSize: '10px', marginTop: '4px' }}>
                    {t('nav.profile')}
                </span>
            </NavLink>
        </nav>
    )
}

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
                <div className="topbar-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <Bell size={20} />
                </div>
                <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 600
                }}>
                    {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                </div>
            </div>

            {showDropdown && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowDropdown(false)} />
                    <div style={{
                        position: 'absolute', top: '100%', right: 0,
                        marginTop: 'var(--spacing-2)', background: 'white',
                        borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
                        minWidth: '220px', padding: 'var(--spacing-2)', zIndex: 1000
                    }}>
                        <div style={{ padding: 'var(--spacing-3)', borderBottom: '1px solid var(--color-gray-200)' }}>
                            <div style={{ fontWeight: 600, marginBottom: '4px' }}>{user.name}</div>
                            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>{user.email}</div>
                        </div>
                        <div style={{ padding: '4px' }}>
                            <a
                                href="/profile"
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 12px', borderRadius: '8px',
                                    color: 'var(--color-gray-700)', textDecoration: 'none',
                                    fontSize: 'var(--font-size-sm)', fontWeight: 500
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-100)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                onClick={() => setShowDropdown(false)}
                            >
                                <UserCircle2 size={16} />
                                {language === 'kk' ? 'Профилім' : 'Мой профиль'}
                            </a>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleLogout}
                                style={{
                                    width: '100%', justifyContent: 'flex-start',
                                    marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px'
                                }}
                            >
                                <LogOut size={16} />
                                <span>{language === 'kk' ? 'Шығу' : 'Выйти'}</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}

function ThemeToggleButton() {
    const { theme, toggleTheme } = useTheme()
    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            style={{
                fontSize: '1.2rem', padding: '6px 10px', borderRadius: '8px',
                color: 'var(--color-gray-700)', background: 'var(--color-gray-100)',
                border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            aria-label="Toggle Theme"
        >
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
    )
}

export default App
