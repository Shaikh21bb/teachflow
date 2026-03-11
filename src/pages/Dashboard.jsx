import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dashboardAPI, assignmentsAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function Dashboard() {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const [stats, setStats] = useState({
        lessonsToday: 0,
        activeAssignments: 0,
        totalStudents: 0,
        pendingReviews: 0
    })
    const [notifications, setNotifications] = useState([])
    const [pendingReviews, setPendingReviews] = useState([])
    const [upcomingLessons, setUpcomingLessons] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsData, notifData, assignmentsData, upcomingData] = await Promise.all([
                    dashboardAPI.getStats(),
                    dashboardAPI.getNotifications(),
                    assignmentsAPI.getAll({ status: 'completed' }),
                    fetch(`${API_BASE}/dashboard/upcoming-lessons`).then(r => r.json()).catch(() => [])
                ])

                setStats(statsData)
                setNotifications(notifData.map(n => ({
                    icon: n.icon,
                    type: n.type,
                    text: n.text, // Normally this should come as a key or be localized on backend
                    time: getTimeAgo(n.created_at)
                })))
                setPendingReviews(assignmentsData.slice(0, 3).map(a => ({
                    title: a.title,
                    class: a.class_name,
                    count: a.submitted
                })))

                // Set upcoming lessons or use demo data if empty
                if (upcomingData && upcomingData.length > 0) {
                    setUpcomingLessons(upcomingData)
                } else {
                    // Demo data as fallback
                    setUpcomingLessons([
                        { time: '09:00', subject: language === 'kk' ? 'Математика' : 'Математика', class: '5А', color: 'math' },
                        { time: '10:00', subject: language === 'kk' ? 'Физика' : 'Физика', class: '7Б', color: 'physics' },
                        { time: '11:30', subject: language === 'kk' ? 'Алгебра' : 'Алгебра', class: '9В', color: 'math' },
                        { time: '13:00', subject: language === 'kk' ? 'Ағылшын тілі' : 'Английский', class: '6А', color: 'english' },
                    ])
                }
            } catch (err) {
                console.error('Failed to fetch dashboard data:', err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [language]) // Refetch/recalc if language changes (mainly for timeAgo if updated)

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
            <div className="page-header">
                <h1 className="page-title">{t('dashboard.title')}, {user?.name || 'Пайдаланушы'}! 👋</h1>
                <p className="page-subtitle">{t('dashboard.subtitle')}</p>
            </div>

            {/* Stats Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon blue">📅</div>
                    <div className="stat-info">
                        <h3>{stats.lessonsToday}</h3>
                        <p>{t('dashboard.lessonsToday')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">📋</div>
                    <div className="stat-info">
                        <h3>{stats.activeAssignments}</h3>
                        <p>{t('dashboard.activeAssignments')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple">👥</div>
                    <div className="stat-info">
                        <h3>{stats.totalStudents}</h3>
                        <p>{t('dashboard.totalStudents')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange">✅</div>
                    <div className="stat-info">
                        <h3>{stats.pendingReviews}</h3>
                        <p>{t('dashboard.pendingReviews')}</p>
                    </div>
                </div>
            </div>

            {/* Main Widgets */}
            <div className="widget-grid">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    {/* Upcoming Lessons */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title">📅 {t('dashboard.upcomingLessons')}</h3>
                            <Link to="/builder" className="btn btn-sm btn-secondary">+ {t('dashboard.createLesson')}</Link>
                        </div>
                        <div className="widget-body">
                            {upcomingLessons.map((lesson, index) => (
                                <div key={index} className="upcoming-lesson">
                                    <div className="lesson-time">
                                        <div className="lesson-time-hour">{lesson.time}</div>
                                    </div>
                                    <div className={`lesson-color ${lesson.color}`}></div>
                                    <div className="lesson-info">
                                        <div className="lesson-name">{lesson.subject}</div>
                                        <div className="lesson-class">{language === 'kk' ? 'Сынып' : 'Класс'} {lesson.class}</div>
                                    </div>
                                    <button className="btn btn-sm btn-ghost">{language === 'kk' ? 'Ашу' : 'Открыть'} →</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pending Reviews */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title">📝 {t('dashboard.pendingReviews')}</h3>
                            <Link to="/assignments" className="btn btn-sm btn-secondary">{t('common.all')} {t('nav.assignments').toLowerCase()}</Link>
                        </div>
                        <div className="widget-body">
                            {pendingReviews.map((item, index) => (
                                <div key={index} className="upcoming-lesson">
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        background: 'var(--color-primary-100)',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '1.25rem'
                                    }}>
                                        📝
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
                                        <button className="btn btn-sm btn-primary">{t('common.search')}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-6)' }}>
                    {/* Quick Actions */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title">⚡ {t('dashboard.quickActions')}</h3>
                        </div>
                        <div className="widget-body">
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-3)' }}>
                                <Link to="/builder" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                    📝 {t('dashboard.createLesson')}
                                </Link>
                                <Link to="/assignments" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                    📋 {t('dashboard.newAssignment')}
                                </Link>
                                <Link to="/library" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                    📚 {t('nav.library')}
                                </Link>
                                <Link to="/classes" className="btn btn-secondary" style={{ justifyContent: 'flex-start' }}>
                                    👥 {t('classes.title')}
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title">🔔 {t('dashboard.notifications')}</h3>
                            <button className="btn btn-sm btn-ghost">{t('common.all')}</button>
                        </div>
                        <div className="widget-body">
                            {notifications.map((notif, index) => (
                                <div key={index} className="notification-item">
                                    <div className={`notification-icon ${notif.type}`}>
                                        {notif.icon}
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
