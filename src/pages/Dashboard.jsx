import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
    Calendar, ClipboardCheck, Users, CheckCircle, ClipboardList, ClipboardEdit, 
    Zap, PenTool, BookOpen, Bell, Info, AlertCircle, MessageSquare,
    Sparkles, UserCircle, School, X, ChevronRight, Target, 
    Award, Rocket, Star, LayoutTemplate, Coins, Play
} from 'lucide-react'
import AdViewer from '../components/AdViewer'
import { dashboardAPI, assignmentsAPI, aiAPI, marketplaceAPI, scheduleAPI, adAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// ── Onboarding: Welcome Modal ────────────────────────────────
function WelcomeModal({ user, language, onClose }) {
    const L = (ru, kk) => language === 'kk' ? kk : ru
    const steps = [
        { icon: <PenTool size={20} />, color: '#6366f1', title: L('Создайте первый урок', 'Бірінші сабақ жасаңыз'), desc: L('AI поможет сгенерировать план за 30 секунд', 'AI 30 секундта жоспар жасайды'), link: '/builder' },
        { icon: <Users size={20} />, color: '#10b981', title: L('Добавьте класс', 'Сынып қосыңыз'), desc: L('Ведите журнал учеников и заданий', 'Оқушылар мен тапсырмалар журналы'), link: '/classes' },
        { icon: <Sparkles size={20} />, color: '#f59e0b', title: L('Попробуйте Al Farabi Bot', 'Al Farabi Bot қолданыңыз'), desc: L('Задайте любой педагогический вопрос', 'Кез келген педагогикалық сұрақ қойыңыз'), link: '/alfarabi-bot' },
    ]
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '24px', maxWidth: '520px', width: '100%', boxShadow: '0 30px 80px rgba(0,0,0,0.25)', overflow: 'hidden', animation: 'modalIn 0.4s cubic-bezier(0.16,1,0.3,1)' }}>
                {/* Header gradient */}
                <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', padding: '32px 28px 24px', position: 'relative', textAlign: 'center' }}>
                    <div style={{ position: 'absolute', top: '16px', right: '16px' }}>
                        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
                            <X size={16} />
                        </button>
                    </div>
                    {/* Trophy icon */}
                    <div style={{ width: '72px', height: '72px', background: 'rgba(255,255,255,0.18)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <Rocket size={36} color="white" />
                    </div>
                    <h2 style={{ color: 'white', margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 900 }}>
                        {L(`Добро пожаловать, ${user?.name?.split(' ')[0] || ''}!`, `Қош келдіңіз, ${user?.name?.split(' ')[0] || ''}!`)}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0, fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {L('Urpaq.ai поможет вам создавать уроки быстрее и интереснее', 'Urpaq.ai сабақтарды жылдамырақ және қызықты жасауға көмектеседі')}
                    </p>
                </div>
                {/* Steps */}
                <div style={{ padding: '24px 28px' }}>
                    <p style={{ margin: '0 0 16px', fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {L('С чего начать', 'Қайдан бастау керек')}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                        {steps.map((s, i) => (
                            <Link key={i} to={s.link} onClick={onClose} style={{
                                display: 'flex', alignItems: 'center', gap: '14px',
                                padding: '14px 16px', borderRadius: '14px', textDecoration: 'none',
                                border: '1.5px solid var(--color-gray-100)',
                                background: 'var(--color-gray-50)',
                                transition: 'all 0.2s', color: 'inherit'
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = s.color; e.currentTarget.style.background = `${s.color}08` }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-gray-100)'; e.currentTarget.style.background = 'var(--color-gray-50)' }}
                            >
                                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${s.color}18`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    {s.icon}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-gray-900)', marginBottom: '2px' }}>{s.title}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.desc}</div>
                                </div>
                                <ChevronRight size={16} color={s.color} />
                            </Link>
                        ))}
                    </div>
                    <button onClick={onClose} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                        {L('Начать работу →', 'Жұмысты бастау →')}
                    </button>
                </div>
            </div>
            <style>{`@keyframes modalIn { from { opacity:0; transform:scale(0.92) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }`}</style>
        </div>
    )
}

// ── Onboarding: Profile Completion Bar ──────────────────────
function ProfileCompletionBar({ language, profile }) {
    const L = (ru, kk) => language === 'kk' ? kk : ru
    if (!profile) return null

    const checks = [
        { done: !!profile.name, label: L('Имя', 'Аты') },
        { done: profile.subjects?.length > 0, label: L('Предметы', 'Пәндер') },
        { done: !!profile.avatar_url, label: L('Фото', 'Фото') },
        { done: !!profile.bio, label: L('Биография', 'Биография') },
        { done: !!profile.school, label: L('Школа', 'Мектеп') },
        { done: !!profile.city, label: L('Город', 'Қала') },
    ]
    const done = checks.filter(c => c.done).length
    const total = checks.length
    const pct = Math.round((done / total) * 100)
    if (pct === 100) return null

    return (
        <Link to="/profile" style={{ textDecoration: 'none', display: 'block', marginBottom: '16px' }}>
            <div style={{
                background: 'white', borderRadius: '14px',
                padding: '14px 18px', border: '1px solid var(--color-primary-100)',
                background: 'linear-gradient(to right, #eff6ff, white)',
                display: 'flex', alignItems: 'center', gap: '14px',
                boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
                transition: 'box-shadow 0.2s'
            }}
                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.14)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.08)'}
            >
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <UserCircle size={22} color="white" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-gray-900)' }}>
                            {L('Заполните профиль', 'Профильді толтырыңыз')} — {pct}%
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-primary-600)', fontWeight: 600 }}>
                            {done}/{total}
                        </span>
                    </div>
                    <div style={{ height: '6px', background: 'var(--color-gray-200)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: '3px', transition: 'width 0.6s ease' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap' }}>
                        {checks.map((c, i) => (
                            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: c.done ? '#10b981' : '#9ca3af', fontWeight: c.done ? 600 : 400 }}>
                                {c.done ? <CheckCircle size={11} color="#10b981" /> : <div style={{ width: '11px', height: '11px', borderRadius: '50%', border: '1.5px solid #d1d5db' }} />}
                                {c.label}
                            </span>
                        ))}
                    </div>
                </div>
                <ChevronRight size={16} color="var(--color-primary-400)" style={{ flexShrink: 0 }} />
            </div>
        </Link>
    )
}

// ── Onboarding: First Steps Checklist Widget ─────────────────
function FirstStepsWidget({ language, stats, onDismiss }) {
    const L = (ru, kk) => language === 'kk' ? kk : ru
    const steps = [
        { done: true, icon: <CheckCircle size={16} />, color: '#10b981', title: L('Регистрация завершена', 'Тіркеу аяқталды'), link: null },
        { done: stats?.totalLessons > 0, icon: <PenTool size={16} />, color: '#6366f1', title: L('Создать первый урок', 'Бірінші сабақ жасау'), link: '/builder' },
        { done: stats?.totalClasses > 0, icon: <Users size={16} />, color: '#f59e0b', title: L('Создать класс', 'Сынып жасау'), link: '/classes' },
        { done: stats?.totalStudents > 0, icon: <Star size={16} />, color: '#ec4899', title: L('Добавить учеников', 'Оқушылар қосу'), link: '/classes' },
        { done: stats?.totalAssignments > 0, icon: <ClipboardList size={16} />, color: '#8b5cf6', title: L('Создать задание', 'Тапсырма жасау'), link: '/assignments' },
        { done: stats?.hasProfile, icon: <Award size={16} />, color: '#06b6d4', title: L('Заполнить профиль', 'Профильді толтыру'), link: '/profile' },
    ]
    const doneCount = steps.filter(s => s.done).length
    if (doneCount === steps.length) return null

    return (
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--color-gray-100)', padding: '18px 20px', marginBottom: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Target size={18} color="white" />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>
                            {L('Первые шаги', 'Бірінші қадамдар')}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>
                            {doneCount}/{steps.length} {L('выполнено', 'орындалды')}
                        </p>
                    </div>
                </div>
                <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', display: 'flex', alignItems: 'center', padding: '4px' }}>
                    <X size={16} />
                </button>
            </div>
            {/* Progress mini bar */}
            <div style={{ height: '4px', background: 'var(--color-gray-100)', borderRadius: '2px', overflow: 'hidden', marginBottom: '14px' }}>
                <div style={{ height: '100%', width: `${(doneCount / steps.length) * 100}%`, background: 'linear-gradient(90deg,#f59e0b,#f97316)', borderRadius: '2px', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
                {steps.map((step, i) => (
                    step.link ? (
                        <Link key={i} to={step.link} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', borderRadius: '10px', textDecoration: 'none',
                            background: step.done ? '#f0fdf4' : 'var(--color-gray-50)',
                            border: `1px solid ${step.done ? '#bbf7d0' : 'var(--color-gray-100)'}`,
                            transition: 'all 0.15s', opacity: step.done ? 0.8 : 1
                        }}
                            onMouseEnter={e => { if (!step.done) { e.currentTarget.style.borderColor = step.color; e.currentTarget.style.background = `${step.color}08` } }}
                            onMouseLeave={e => { if (!step.done) { e.currentTarget.style.borderColor = 'var(--color-gray-100)'; e.currentTarget.style.background = 'var(--color-gray-50)' } }}
                        >
                            <div style={{ color: step.done ? '#10b981' : step.color, flexShrink: 0 }}>
                                {step.done ? <CheckCircle size={16} color="#10b981" /> : step.icon}
                            </div>
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: step.done ? '#15803d' : 'var(--color-gray-700)', textDecoration: step.done ? 'line-through' : 'none' }}>
                                {step.title}
                            </span>
                        </Link>
                    ) : (
                        <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', borderRadius: '10px',
                            background: '#f0fdf4', border: '1px solid #bbf7d0', opacity: 0.8
                        }}>
                            <CheckCircle size={16} color="#10b981" />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#15803d', textDecoration: 'line-through' }}>{step.title}</span>
                        </div>
                    )
                ))}
            </div>
        </div>
    )
}

// Map notification type → lucide icon
function NotifIcon({ type }) {
    const style = { flexShrink: 0 }
    if (type === 'success') return <CheckCircle size={16} color="#10b981" style={style} />
    if (type === 'warning') return <AlertCircle size={16} color="#f59e0b" style={style} />
    if (type === 'error') return <AlertCircle size={16} color="#ef4444" style={style} />
    if (type === 'message') return <MessageSquare size={16} color="#6366f1" style={style} />
    return <Info size={16} color="#3b82f6" style={style} />
}

function Dashboard() {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [stats, setStats] = useState({
        lessonsToday: 0,
        activeAssignments: 0,
        totalStudents: 0,
        pendingReviews: 0,
        totalLessons: 0,
        totalClasses: 0,
        totalAssignments: 0,
        hasProfile: false,
    })
    const [notifications, setNotifications] = useState([])
    const [pendingReviews, setPendingReviews] = useState([])
    const [upcomingLessons, setUpcomingLessons] = useState([])
    const [loading, setLoading] = useState(true)
    const [teacherProfile, setTeacherProfile] = useState(null)
    const [scheduleItems, setScheduleItems] = useState([])

    // Onboarding state
    const [showWelcome, setShowWelcome] = useState(false)
    const [showChecklist, setShowChecklist] = useState(true)

    // Token / ad state
    const [tokenBalance, setTokenBalance] = useState(user?.token_balance || 0)
    const [showAdViewer, setShowAdViewer] = useState(false)
    const [adResult, setAdResult] = useState(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsData, notifData, assignmentsData, upcomingData] = await Promise.all([
                    dashboardAPI.getStats(),
                    dashboardAPI.getNotifications(),
                    assignmentsAPI.getAll({ status: 'completed' }),
                    dashboardAPI.getUpcomingLessons().catch(() => [])
                ])

                setStats({
                    lessonsToday: statsData.lessonsToday ?? 0,
                    activeAssignments: statsData.activeAssignments ?? 0,
                    totalStudents: statsData.totalStudents ?? 0,
                    pendingReviews: statsData.pendingReviews ?? 0,
                    totalLessons: statsData.totalLessons ?? 0,
                    totalClasses: statsData.totalClasses ?? 0,
                    totalAssignments: statsData.totalAssignments ?? 0,
                    hasProfile: false,
                })
                setNotifications(notifData.map(n => ({
                    icon: n.icon,
                    type: n.type,
                    text: n.text,
                    time: getTimeAgo(n.created_at)
                })))
                setPendingReviews(assignmentsData.slice(0, 3).map(a => ({
                    title: a.title,
                    class: a.class_name,
                    count: a.submitted
                })))
                setUpcomingLessons(upcomingData || [])
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err)
            } finally {
                setLoading(false)
            }
        }

        async function fetchProfile() {
            try {
                const { authFetch } = await import('../contexts/AuthContext')
                const res = await authFetch(`${API_BASE}/auth/teacher-profile`)
                if (res.ok) {
                    const data = await res.json()
                    setTeacherProfile({ ...data.profile, name: data.user?.name, subjects: data.user?.subjects || [] })
                    setStats(prev => ({
                        ...prev,
                        hasProfile: !!(data.profile?.bio || data.profile?.school || data.profile?.city)
                    }))
                }
            } catch { /* silent */ }
        }

        fetchData()
        fetchProfile()
        // Load today's schedule
        scheduleAPI.getToday().then(d => setScheduleItems(d.lessons || [])).catch(() => {})
    }, [language])

    // Load token balance
    useEffect(() => {
        marketplaceAPI.getBalance().then(d => setTokenBalance(d.balance || 0)).catch(() => {})
    }, [])

    // Watch ad → open AdViewer modal
    const handleWatchAd = () => {
        setShowAdViewer(true)
    }

    const handleAdComplete = (earned, newBalance) => {
        setTokenBalance(newBalance || (tokenBalance + earned))
        setAdResult({ earned, success: true })
        setShowAdViewer(false)
        setTimeout(() => setAdResult(null), 4000)
    }

    // Detect first visit — show welcome modal once per user
    useEffect(() => {
        if (!user?.id) return
        const key = `tf_welcomed_${user.id}`
        const dismissed = localStorage.getItem(`tf_checklist_dismissed_${user.id}`)
        if (!localStorage.getItem(key)) {
            setShowWelcome(true)
            localStorage.setItem(key, '1')
        }
        if (dismissed) setShowChecklist(false)
    }, [user?.id])

    function getTimeAgo(dateString) {
        const diff = Date.now() - new Date(dateString).getTime()
        const mins = Math.floor(diff / 60000)
        if (mins < 60) return `${mins} ${t('library.minutes')} ${language === 'kk' ? 'бұрын' : 'назад'}`
        const hours = Math.floor(mins / 60)
        if (hours < 24) return `${hours} ${language === 'kk' ? 'сағат бұрын' : 'час назад'}`
        return `${Math.floor(hours / 24)} ${language === 'kk' ? 'күн бұрын' : 'дней назад'}`
    }

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>{t('common.loading')}</div>
    }

    return (
        <div>
            {/* ── Ad Viewer Modal ── */}
            {showAdViewer && (
                <AdViewer
                    onComplete={handleAdComplete}
                    onClose={() => setShowAdViewer(false)}
                />
            )}

            {/* ── Welcome Modal (first visit only) ── */}
            {showWelcome && (
                <WelcomeModal
                    user={user}
                    language={language}
                    onClose={() => setShowWelcome(false)}
                />
            )}

            {/* ── Profile Completion Bar ── */}
            <ProfileCompletionBar
                language={language}
                profile={teacherProfile}
            />

            {/* ── Token Widget ── */}
            <div style={{
                background: 'white', borderRadius: '14px', border: '1px solid #e5e7eb',
                padding: '14px 18px', marginBottom: '16px',
                display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                boxShadow: '0 1px 6px rgba(0,0,0,0.04)'
            }}>
                {/* Balance */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '10px', background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Coins size={18} color="#f59e0b" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#111827', lineHeight: 1 }}>
                            {tokenBalance.toLocaleString('ru-RU')}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                            {L('токенов', 'токен')}
                        </div>
                    </div>
                </div>

                {/* Ad button */}
                <button
                    onClick={handleWatchAd}
                    style={{
                        display: 'flex', alignItems: 'center', gap: '7px',
                        padding: '8px 16px', border: 'none', borderRadius: '9px',
                        background: 'linear-gradient(135deg,#f59e0b,#f97316)',
                        color: 'white', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                        boxShadow: '0 3px 8px rgba(245,158,11,0.3)'
                    }}
                >
                    <Play size={13} /> {L('+токены за рекламу', '+токен жарнамаға')}
                </button>
                {adResult?.success && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', color: '#15803d', fontWeight: 700, fontSize: '0.82rem' }}>
                        <CheckCircle size={14} /> +{adResult.earned} {L('токенов!', 'токен!')}
                    </div>
                )}

                {/* Marketplace link */}
                <Link to="/marketplace" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', color: '#6366f1', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                    {L('Маркетплейс', 'Маркетплейс')} <ChevronRight size={14} />
                </Link>

                <style>{`@keyframes spin { to { transform:rotate(360deg); } } @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }`}</style>
            </div>

            {/* ── First Steps Checklist ── */}
            {showChecklist && (
                <FirstStepsWidget
                    language={language}
                    stats={stats}
                    onDismiss={() => {
                        setShowChecklist(false)
                        localStorage.setItem(`tf_checklist_dismissed_${user?.id}`, '1')
                    }}
                />
            )}

            <div className="page-header">
                <div>
                    <h1 className="page-title">{t('dashboard.title')}, {user?.name || 'Пайдаланушы'}!</h1>
                    <p className="page-subtitle">{t('dashboard.subtitle')}</p>
                </div>
                
                {/* Subscription Status Badge */}
                <Link to="/pricing" style={{ 
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 16px',
                    background: user?.plan === 'pro' ? 'var(--color-success-50)' : (user?.plan === 'school' ? 'var(--color-warning-50)' : 'var(--color-primary-50)'),
                    borderRadius: '12px',
                    border: '1px solid currentColor',
                    color: user?.plan === 'pro' ? 'var(--color-success-700)' : (user?.plan === 'school' ? 'var(--color-warning-700)' : 'var(--color-primary-700)')
                }}>
                    <Zap size={18} fill="currentColor" />
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '12px', fontWeight: 500, opacity: 0.8 }}>{language === 'kk' ? 'Тариф' : 'Тариф'}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase' }}>
                            {user?.plan || 'free'}
                        </div>
                    </div>
                </Link>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Calendar size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.lessonsToday}</h3>
                        <p>{t('dashboard.lessonsToday')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ClipboardCheck size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.activeAssignments}</h3>
                        <p>{t('dashboard.activeAssignments')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Users size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.totalStudents}</h3>
                        <p>{t('dashboard.totalStudents')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle size={24} /></div>
                    <div className="stat-info">
                        <h3>{stats.pendingReviews}</h3>
                        <p>{t('dashboard.pendingReviews')}</p>
                    </div>
                </div>
            </div>

            {/* Main Widgets */}
            <div className="widget-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    {/* Upcoming / Today's schedule */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Calendar size={20} /> {L('Сегодня', 'Бүгін')}
                            </h3>
                            <Link to="/schedule" className="btn btn-sm btn-secondary">{L('Расписание', 'Кесте')} →</Link>
                        </div>
                        <div className="widget-body">
                            {scheduleItems.length > 0 ? scheduleItems.map((item, i) => (
                                <div key={item.id || i} className="upcoming-lesson">
                                    <div className="lesson-time">
                                        <div className="lesson-time-hour">{item.start_time}</div>
                                    </div>
                                    <div className="lesson-color" style={{ background: item.color || '#6366f1' }}></div>
                                    <div className="lesson-info">
                                        <div className="lesson-name">{item.title}</div>
                                        <div className="lesson-class">{[item.subject, item.class_name].filter(Boolean).join(' · ')} {item.duration && `· ${item.duration} мин`}</div>
                                    </div>
                                    {item.lesson_id && (
                                        <Link to={`/builder?edit=${item.lesson_id}`} className="btn btn-sm btn-ghost">{L('Открыть', 'Ашу')} →</Link>
                                    )}
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-gray-500)' }}>
                                    <Calendar size={40} style={{ opacity: 0.2, marginBottom: '12px' }} />
                                    <p style={{ margin: '0 0 12px' }}>{L('На сегодня уроков нет', 'Бүгін сабақтар жоқ')}</p>
                                    <Link to="/schedule" className="btn btn-sm btn-primary">{L('+ Добавить', '+ Қосу')}</Link>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pending Reviews */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={20} /> {t('dashboard.pendingReviews')}</h3>
                            <Link to="/assignments" className="btn btn-sm btn-secondary">{t('common.all')} {t('nav.assignments').toLowerCase()}</Link>
                        </div>
                        <div className="widget-body">
                            {pendingReviews.length > 0 ? pendingReviews.map((item, index) => (
                                <div key={index} className="upcoming-lesson">
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'var(--color-primary-100)',
                                        color: 'var(--color-primary-600)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem'
                                    }}>
                                        <ClipboardEdit size={24} />
                                    </div>
                                    <div className="lesson-info">
                                        <div className="lesson-name">{item.title}</div>
                                        <div className="lesson-class">{language === 'kk' ? 'Сынып' : 'Класс'} {item.class}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{
                                            fontWeight: 600,
                                            color: 'var(--color-primary-600)',
                                            marginBottom: '4px'
                                        }}>
                                            {item.count} {language === 'kk' ? 'жұмыс' : 'работ'}
                                        </div>
                                        <Link to="/assignments" className="btn btn-sm btn-primary">{t('common.search')}</Link>
                                    </div>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-gray-500)' }}>
                                    <ClipboardCheck size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>{language === 'kk' ? 'Жаңа тексерулер жоқ' : 'Нет новых проверок'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    {/* Plan Management Widget */}
                    <div className="widget" style={{ 
                        background: 'var(--gradient-primary)', 
                        color: 'white',
                        border: 'none'
                    }}>
                        <div className="widget-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <h3 className="widget-title" style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Zap size={20} /> {language === 'kk' ? 'Жазылым' : 'Подписка'}
                            </h3>
                        </div>
                        <div className="widget-body">
                            <div style={{ marginBottom: 'var(--spacing-4)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                                    <span>{language === 'kk' ? 'AI Кредиттер' : 'AI Кредиты'}</span>
                                    <span>{user?.credits || 0} / {user?.creditLimit || (user?.plan === 'pro' ? 100 : (user?.plan === 'school' ? 500 : 5))}</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.2)', borderRadius: '3px' }}>
                                    <div style={{ 
                                        width: `${Math.min(100, ((user?.credits || 0) / (user?.creditLimit || (user?.plan === 'pro' ? 100 : (user?.plan === 'school' ? 500 : 5)))) * 100)}%`, 
                                        height: '100%', 
                                        background: 'white', 
                                        borderRadius: '3px' 
                                    }}></div>
                                </div>
                            </div>
                            <Link to="/pricing" className="btn btn-white btn-sm" style={{ width: '100%', color: 'var(--color-primary-600)' }}>
                                {user?.plan === 'free' ? (language === 'kk' ? 'Тарифті жаңарту' : 'Обновить тариф') : (language === 'kk' ? 'Басқару' : 'Управление')}
                            </Link>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Zap size={20} /> {t('dashboard.quickActions')}</h3>
                        </div>
                        <div className="widget-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                                <Link to="/builder" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <PenTool size={18} /> {t('dashboard.createLesson')}
                                </Link>
                                <Link to="/templates" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <BookOpen size={18} /> {language === 'kk' ? 'Үлгілер' : 'Шаблоны'}
                                </Link>
                                <Link to="/marketplace" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <Coins size={18} /> {language === 'kk' ? 'Маркет' : 'Маркет'}
                                </Link>
                                <Link to="/schedule" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <Calendar size={18} /> {language === 'kk' ? 'Кесте' : 'Расписание'}
                                </Link>
                                <Link to="/leaderboard" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <Star size={18} /> {language === 'kk' ? 'Рейтинг' : 'Рейтинг'}
                                </Link>
                                <Link to="/classes" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <Users size={18} /> {t('classes.title')}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Bell size={20} /> {t('dashboard.notifications')}</h3>
                            <button className="btn btn-sm btn-ghost">{t('common.all')}</button>
                        </div>
                        <div className="widget-body">
                            {notifications.map((notif, index) => (
                                <div key={index} className="notification-item">
                                    <div className={`notification-icon ${notif.type}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <NotifIcon type={notif.type} />
                                    </div>
                                    <div className="notification-content">
                                        <div className="notification-text">{notif.text}</div>
                                        <div className="notification-time">{notif.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Dashboard
