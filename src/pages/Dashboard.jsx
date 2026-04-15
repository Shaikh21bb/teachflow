import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, ClipboardCheck, Users, CheckCircle, ClipboardList, ClipboardEdit, Zap, PenTool, BookOpen, Bell } from 'lucide-react'
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
                    dashboardAPI.getUpcomingLessons().catch(() => [])
                ])

                setStats(statsData)
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
                <h1 className="page-title">{t('dashboard.title')}, {user?.name || 'Пайдаланушы'}!</h1>
                <p className="page-subtitle">{t('dashboard.subtitle')}</p>
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
                    {/* Upcoming Lessons */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Calendar size={20} /> {t('dashboard.upcomingLessons')}</h3>
                            <Link to="/builder" className="btn btn-sm btn-secondary">+ {t('dashboard.createLesson')}</Link>
                        </div>
                        <div className="widget-body">
                            {upcomingLessons.length > 0 ? upcomingLessons.map((lesson, index) => (
                                <div key={index} className="upcoming-lesson">
                                    <div className="lesson-time">
                                        <div className="lesson-time-hour">{new Date(lesson.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                    </div>
                                    <div className={`lesson-color ${lesson.color || 'blue'}`}></div>
                                    <div className="lesson-info">
                                        <div className="lesson-name">{lesson.title || lesson.subject}</div>
                                        <div className="lesson-class">{language === 'kk' ? 'Сынып' : 'Класс'} {lesson.class_name || lesson.grade}</div>
                                    </div>
                                    <Link to={`/builder?id=${lesson.id}`} className="btn btn-sm btn-ghost">{language === 'kk' ? 'Ашу' : 'Открыть'} →</Link>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--color-gray-500)' }}>
                                    <Calendar size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>{language === 'kk' ? 'Әзірге сабақтар жоқ' : 'Пока нет уроков'}</p>
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
                                <Link to="/assignments" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <ClipboardList size={18} /> {t('dashboard.newAssignment')}
                                </Link>
                                <Link to="/library" className="btn btn-secondary" style={{ justifyContent: 'flex-start', gap: '8px' }}>
                                    <BookOpen size={18} /> {t('nav.library')}
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
