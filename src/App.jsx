import { BrowserRouter, Routes, Route, NavLink, Link, useLocation, Navigate } from 'react-router-dom'
import { useState, useEffect, lazy, Suspense } from 'react'
import RouteBoundary from './components/RouteBoundary'
import { 
    Home, BookOpen, LayoutTemplate, Library, 
    ClipboardList, Users, BarChart, Bot, 
    Plug, Settings, HelpCircle, Search, 
    Bell, LogOut, Moon, Sun, FileQuestion, Zap,
    PanelLeftClose, PanelLeftOpen, UserCircle2, MessageSquare, ShoppingBag, CalendarDays, Trophy, ShieldCheck, Gamepad2
} from 'lucide-react'
import Landing from './pages/Landing'
const Dashboard = lazy(() => import('./pages/Dashboard'));
const LibraryPage = lazy(() => import('./pages/Library'));
const LessonBuilder = lazy(() => import('./pages/LessonBuilder'));
const Assignments = lazy(() => import('./pages/Assignments'));
const ClassDashboard = lazy(() => import('./pages/ClassDashboard'));
const Reports = lazy(() => import('./pages/Reports'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AlFarabiBot = lazy(() => import('./pages/AlFarabiBot'));
const OpenLesson = lazy(() => import('./pages/OpenLesson'));
const MyLessons = lazy(() => import('./pages/MyLessons'));
const Integrations = lazy(() => import('./pages/Integrations'));
const Quizzes = lazy(() => import('./pages/Quizzes'));
const QuizReport = lazy(() => import('./pages/QuizReport'));
const SettingsPage = lazy(() => import('./pages/Settings'));
const ProfilePage = lazy(() => import('./pages/Profile'));
const TelegramHub = lazy(() => import('./pages/TelegramHub'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Pricing = lazy(() => import('./pages/Pricing'));
const MockPayment = lazy(() => import('./pages/MockPayment'));

const StudentLogin = lazy(() => import('./pages/student/StudentLogin'));
const StudentRegister = lazy(() => import('./pages/student/StudentRegister'));
const StudentDashboard = lazy(() => import('./student/StudentHome'));
const StudentShell = lazy(() => import('./student/StudentShell'));
const StudentQuest = lazy(() => import('./student/StudentQuest'));
const StudentHistory = lazy(() => import('./student/StudentHistory'));
const QuestStudio = lazy(() => import('./pages/QuestStudio'));
const StudentQuiz = lazy(() => import('./pages/student/StudentQuiz'));
const StudentResults = lazy(() => import('./pages/student/StudentResults'));
const StudentAssignment = lazy(() => import('./pages/student/StudentAssignment'));
const JoinLesson = lazy(() => import('./pages/JoinLesson'));

import GlobalSearch from './components/GlobalSearch'
import { TelegramIcon } from './components/Icons'
import NotificationBell from './components/NotificationBell'
import InstallPrompt from './components/InstallPrompt'
const Presentation = lazy(() => import('./pages/Presentation'));
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { AuthProvider, useAuth, authFetch } from './contexts/AuthContext'
import { chatAPI } from './api'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
const TeacherChat = lazy(() => import('./pages/TeacherChat'));
const TeacherPublicProfile = lazy(() => import('./pages/TeacherPublicProfile'));
const LessonTemplates = lazy(() => import('./pages/LessonTemplates'));
const ParentPortal = lazy(() => import('./pages/ParentPortal'));
const Marketplace = lazy(() => import('./pages/Marketplace'));
const Schedule = lazy(() => import('./pages/Schedule'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Games = lazy(() => import('./pages/Games'));
const ArenaGame = lazy(() => import('./pages/ArenaGame'));

function App() {
    return (
        <ThemeProvider>
            <LanguageProvider>
                <AuthProvider>
                    <BrowserRouter>
                        <RouteBoundary><Suspense fallback={<div className="page-state" role="status">Жүктелуде / Загрузка...</div>}>
                        <Routes>
                            <Route path="/" element={<Landing />} />
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/forgot-password" element={<ForgotPassword />} />
                            <Route path="/reset-password" element={<ResetPassword />} />
                            <Route path="/lesson/:id/present" element={<ProtectedRoute><Presentation /></ProtectedRoute>} />
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
                            <Route path="/telegram" element={<ProtectedRoute><DashboardLayout><TelegramHub /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/quizzes" element={<ProtectedRoute><DashboardLayout><Quizzes /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/games" element={<ProtectedRoute><DashboardLayout><Games /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/quests" element={<ProtectedRoute><DashboardLayout><QuestStudio /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/games/host/:code" element={<ProtectedRoute><ArenaGame host /></ProtectedRoute>} />
                            <Route path="/play" element={<ArenaGame />} />
                            <Route path="/play/:code" element={<ArenaGame />} />
                            <Route path="/quizzes/:id/report" element={<ProtectedRoute><DashboardLayout><QuizReport /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/profile" element={<ProtectedRoute><DashboardLayout><ProfilePage /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/pricing" element={<ProtectedRoute><DashboardLayout><Pricing /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/mock-payment" element={<MockPayment />} />

                            {/* Student Portal Routes */}
                            <Route path="/student/login" element={<StudentLogin />} />
                            <Route path="/student/register" element={<StudentRegister />} />
                            <Route path="/student" element={<StudentShell />}>
                                <Route index element={<Navigate to="/student/dashboard" replace />} />
                                <Route path="dashboard" element={<StudentDashboard />} />
                                <Route path="class" element={<StudentDashboard classroomOnly />} />
                                <Route path="quests/:id" element={<StudentQuest />} />
                                <Route path="history" element={<StudentHistory />} />
                            </Route>
                            <Route path="/student/quiz/:id" element={<StudentQuiz />} />
                            <Route path="/student/assignment/:id" element={<StudentAssignment />} />
                            <Route path="/student/results" element={<StudentResults />} />

                            {/* Live lesson join — no auth required */}
                            <Route path="/join/:code" element={<JoinLesson />} />

                            {/* Teacher community */}
                            <Route path="/teachers/:id" element={<TeacherPublicProfile />} />
                            <Route path="/chat" element={<ProtectedRoute><DashboardLayout><TeacherChat /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/templates" element={<ProtectedRoute><DashboardLayout><LessonTemplates /></DashboardLayout></ProtectedRoute>} />

                            {/* Parent portal — no auth */}
                            <Route path="/parent/:token" element={<ParentPortal />} />

                            {/* Marketplace */}
                            <Route path="/marketplace" element={<ProtectedRoute><DashboardLayout><Marketplace /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/schedule" element={<ProtectedRoute><DashboardLayout><Schedule /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/leaderboard" element={<ProtectedRoute><DashboardLayout><Leaderboard /></DashboardLayout></ProtectedRoute>} />
                            <Route path="/admin" element={<ProtectedRoute><DashboardLayout><AdminPanel /></DashboardLayout></ProtectedRoute>} />
                            <Route path="*" element={<div className="page-state"><h1>404</h1><p>Страница не найдена / Бет табылмады</p><Link className="btn btn-primary" to="/">На главную</Link></div>} />
                        </Routes>
                        </Suspense></RouteBoundary>
                    </BrowserRouter>
                </AuthProvider>
            </LanguageProvider>
        </ThemeProvider>
    )
}

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth()
    if (loading) return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: '#0f172a', flexDirection: 'column', gap: '20px'
        }}>
            <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite'
            }}>
                <img src="/logo.jpg" alt="Urpaq" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', fontFamily: 'Inter,sans-serif' }}>
                Загрузка...
            </div>
            <style>{`@keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4);} 50%{box-shadow:0 0 0 12px rgba(99,102,241,0);} }`}</style>
        </div>
    )
    if (!isAuthenticated) return <Navigate to="/login" replace />
    return children
}

function DashboardLayout({ children }) {
    const location = useLocation()
    const { t, language, toggleLanguage } = useLanguage()
    const { isAuthenticated, user } = useAuth()

    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebarCollapsed') === 'true' } catch { return false }
    })
    const [unreadCount, setUnreadCount] = useState(0)

    // Poll unread chat count every 30s
    useEffect(() => {
        if (!isAuthenticated) return
        const fetchUnread = async () => {
            try {
                const data = await chatAPI.getUnreadCount()
                setUnreadCount(data.count || 0)
            } catch { /* silent */ }
        }
        fetchUnread()
        const interval = setInterval(fetchUnread, 30000)
        return () => clearInterval(interval)
    }, [isAuthenticated])

    const toggleCollapsed = () => {
        setCollapsed(prev => {
            const next = !prev
            try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
            return next
        })
    }

    const navItems = [
        { path: '/dashboard', icon: <Home size={20} />, label: t('nav.home') },
        { path: '/my-lessons', icon: <BookOpen size={20} />, label: language === 'kk' ? 'Сабақтар' : 'Уроки', matchPaths: ['/my-lessons', '/builder', '/templates', '/library', '/open-lessons'] },
        { path: '/schedule', icon: <CalendarDays size={20} />, label: language === 'kk' ? 'Кесте' : 'Расписание' },
        { path: '/marketplace', icon: <ShoppingBag size={20} />, label: language === 'kk' ? 'Маркет' : 'Маркет' },
        { path: '/classes', icon: <Users size={20} />, label: language === 'kk' ? 'Сыныптар' : 'Классы' },
        { path: '/games', icon: <Gamepad2 size={20} />, label: language === 'kk' ? 'Ойындар' : 'Игры', matchPaths: ['/games', '/quests'] },
        { path: '/alfarabi-bot', icon: <Bot size={20} />, label: language === 'kk' ? 'AI Бот' : 'AI Бот' },
        { path: '/leaderboard', icon: <Trophy size={20} />, label: language === 'kk' ? 'Рейтинг' : 'Рейтинг' },
        {
            path: '/chat',
            icon: (
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                    <MessageSquare size={20} />
                    {unreadCount > 0 && (
                        <span style={{
                            position: 'absolute', top: '-6px', right: '-8px',
                            background: '#ef4444', color: 'white',
                            borderRadius: '20px', padding: '0 4px',
                            fontSize: '0.6rem', fontWeight: 800,
                            minWidth: '14px', height: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1, border: '1.5px solid var(--color-bg-sidebar, white)'
                        }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </span>
            ),
            label: language === 'kk' ? 'Чат' : 'Чат'
        },
        { path: '/pricing', icon: <Zap size={20} />, label: language === 'kk' ? 'Тариф' : 'Тариф' },
    ]

    // Profile is shown as a footer block, not a nav item
    // Settings, Integrations, Telegram, Help — merged into Profile page

    // Admin link (only for admin users)
    const isAdmin = user?.role_admin || user?.role === 'admin'

    return (
        <div className="dashboard">
            <aside className={"sidebar " + (collapsed ? 'collapsed' : '') + " hide-on-mobile"}>
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-logo-area">
                        <img src="/logo.jpg" alt="Urpaq Logo" className="logo-icon-ai" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
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
                        {navItems.map(item => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) => {
                                    const extraActive = item.matchPaths?.some(p => location.pathname.startsWith(p))
                                    return 'sidebar-link' + (isActive || extraActive ? ' active' : '')
                                }}
                                data-label={item.label}
                            >
                                <span className="sidebar-link-icon">{item.icon}</span>
                                <span className="sidebar-link-label">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>
                </nav>

                {/* ── Account block at bottom ── */}
                <div className="sidebar-account-block">
                    {isAdmin && (
                        <NavLink to="/admin" className={({ isActive }) => 'sidebar-account-link' + (isActive ? ' active' : '')} style={{ marginBottom: 4, background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}>
                            <span className="sidebar-link-icon"><ShieldCheck size={20} /></span>
                            <span className="sidebar-link-label" style={{ fontWeight: 700 }}>{language === 'kk' ? 'Əкімші' : 'Админ'}</span>
                        </NavLink>
                    )}
                    <NavLink to="/profile" className={({ isActive }) => 'sidebar-account-link' + (isActive ? ' active' : '')}>
                        <span className="sidebar-link-icon"><UserCircle2 size={20} /></span>
                        <span className="sidebar-link-label">{language === 'kk' ? 'Аккаунт' : 'Аккаунт'}</span>
                    </NavLink>
                </div>
            </aside>

            <main className={"main-content " + (collapsed ? 'sidebar-collapsed' : '')}>
                <header className="topbar">
                    <Link to="/" className="mobile-header-logo hide-on-desktop">
                        <img src="/logo.jpg" alt="Urpaq Logo" className="logo-icon-ai" style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }} />
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>Urpaq.ai</span>
                    </Link>

                    <GlobalSearch />

                    <div className="topbar-actions">
                            <Link to="/pricing" className="credit-balance" title={language === 'kk' ? 'AI кредиттері' : 'AI-кредиты'}><Zap size={15} /><span>{user?.credits ?? 0}</span><span className="hide-on-mobile">AI</span></Link>
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

            <MobileBottomNav items={navItems} unreadCount={unreadCount} />
            <InstallPrompt />
        </div>
    )
}

function MobileBottomNav({ items, unreadCount = 0 }) {
    const { t, language } = useLanguage()
    // Show 5 items: home, lessons, classes, AI bot, profile
    const primaryItems = items.filter(i =>
        ['/dashboard', '/my-lessons', '/classes', '/games', '/alfarabi-bot'].includes(i.path)
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
            {/* Chat with badge */}
            <NavLink to="/chat" className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
                <div className="bottom-nav-icon" style={{ position: 'relative' }}>
                    <MessageSquare size={20} />
                    {unreadCount > 0 && (
                        <span style={{ position: 'absolute', top: '-4px', right: '-6px', background: '#ef4444', color: 'white', borderRadius: '20px', padding: '0 3px', fontSize: '0.58rem', fontWeight: 800, minWidth: '13px', height: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid white' }}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </div>
                <span className="bottom-nav-label" style={{ fontSize: '10px', marginTop: '4px' }}>
                    {language === 'kk' ? 'Чат' : 'Чат'}
                </span>
            </NavLink>
            {/* Profile */}
            <NavLink to="/profile" className={({ isActive }) => 'bottom-nav-item' + (isActive ? ' active' : '')}>
                <div className="bottom-nav-icon"><UserCircle2 size={20} /></div>
                <span className="bottom-nav-label" style={{ fontSize: '10px', marginTop: '4px' }}>
                    {language === 'kk' ? 'Аккаунт' : 'Аккаунт'}
                </span>
            </NavLink>
        </nav>
    )
}

function UserProfile() {
    const { user, logout } = useAuth()
    const { language } = useLanguage()
    const [showDropdown, setShowDropdown] = useState(false)
    const [avatarUrl, setAvatarUrl] = useState(null)
    const [imgErr, setImgErr] = useState(false)
    const API_BASE = import.meta.env.VITE_API_URL || '/api'

    // Load avatar from teacher_profiles
    useEffect(() => {
        if (!user) return
        const loadAvatar = async () => {
            try {
                const res = await authFetch(`${API_BASE}/auth/teacher-profile`)
                if (res.ok) {
                    const data = await res.json()
                    const url = data.profile?.avatar_url || data.user?.avatar_url || null
                    if (url) setAvatarUrl(url)
                }
            } catch { /* silent */ }
        }
        loadAvatar()
    }, [user?.id])

    if (!user) return null

    function handleLogout() {
        logout()
        window.location.href = '/'
    }

    const initials = user.name
        ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
        : '?'

    const planLabel = user.plan === 'pro' ? 'Pro' : user.plan === 'school' ? 'School' : 'Free'
    const planColor = user.plan === 'pro' ? '#10b981' : user.plan === 'school' ? '#f59e0b' : '#6366f1'

    const AvatarEl = () => avatarUrl && !imgErr ? (
        <img
            src={avatarUrl}
            alt={user.name}
            onError={() => setImgErr(true)}
            style={{
                width: '36px', height: '36px', borderRadius: '50%',
                objectFit: 'cover', border: '2px solid rgba(99,102,241,0.3)',
                display: 'block'
            }}
        />
    ) : (
        <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '0.875rem',
            border: '2px solid rgba(99,102,241,0.3)',
            flexShrink: 0, userSelect: 'none'
        }}>
            {initials}
        </div>
    )

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <NotificationBell />
            <div style={{ position: 'relative' }}>
                {/* Avatar button */}
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    aria-label={language === 'kk' ? 'Аккаунт мәзірі' : 'Меню аккаунта'}
                    aria-expanded={showDropdown}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        background: showDropdown ? 'var(--color-gray-100)' : 'transparent',
                        border: '1px solid transparent',
                        borderRadius: '40px', padding: '3px 10px 3px 3px',
                        cursor: 'pointer', transition: 'all 0.15s',
                        outline: 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-100)'}
                    onMouseLeave={e => { if (!showDropdown) e.currentTarget.style.background = 'transparent' }}
                >
                    <AvatarEl />
                    <div style={{ textAlign: 'left', display: 'none' }} className="profile-summary hide-on-mobile">
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--color-gray-900)', lineHeight: 1.2, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.name?.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: planColor, fontWeight: 600, lineHeight: 1 }}>
                            {planLabel}
                        </div>
                    </div>
                </button>

                {/* Dropdown */}
                {showDropdown && (
                    <>
                        <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowDropdown(false)} />
                        <div style={{
                            position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                            background: 'var(--color-white)', borderRadius: '8px',
                            boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                            border: '1px solid var(--color-gray-100)',
                            minWidth: '240px', zIndex: 1000, overflow: 'hidden',
                            animation: 'dropdownSlide 0.18s ease'
                        }}>
                            {/* Header with avatar + info */}
                            <div style={{ padding: '16px', background: 'var(--color-gray-50)', borderBottom: '1px solid var(--color-gray-100)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    {avatarUrl && !imgErr ? (
                                        <img src={avatarUrl} alt={user.name} onError={() => setImgErr(true)} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #6366f130' }} />
                                    ) : (
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>
                                            {initials}
                                        </div>
                                    )}
                                    {/* Plan badge */}
                                    <div style={{ position: 'absolute', bottom: -2, right: -2, background: planColor, borderRadius: '20px', padding: '1px 5px', fontSize: '0.6rem', fontWeight: 800, color: 'white', border: '1.5px solid white' }}>
                                        {planLabel}
                                    </div>
                                </div>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {user.email}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '3px' }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                        <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>
                                            {language === 'kk' ? 'Белсенді' : 'Активен'}
                                        </span>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--color-gray-400)', marginLeft: 4 }}>
                                            · {user.credits || 0} {language === 'kk' ? 'кредит' : 'кредитов'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Menu items */}
                            <div style={{ padding: '8px' }}>
                                {[
                                    { href: '/profile', icon: <UserCircle2 size={16} />, label: language === 'kk' ? 'Профиль' : 'Профиль' },
                                    { href: '/profile?tab=settings', icon: <Settings size={16} />, label: language === 'kk' ? 'Баптаулар' : 'Настройки' },
                                    { href: '/pricing', icon: <Zap size={16} />, label: language === 'kk' ? 'Тариф' : 'Тариф' },
                                ].map(item => (
                                    <a key={item.href} href={item.href}
                                        onClick={() => setShowDropdown(false)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '10px', color: 'var(--color-gray-700)', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500, transition: 'background 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <span style={{ color: 'var(--color-gray-400)' }}>{item.icon}</span>
                                        {item.label}
                                    </a>
                                ))}
                                <div style={{ height: '1px', background: 'var(--color-gray-100)', margin: '6px 0' }} />
                                <button
                                    onClick={handleLogout}
                                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: '10px', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600, transition: 'background 0.12s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <LogOut size={16} />
                                    {language === 'kk' ? 'Шығу' : 'Выйти'}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
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
