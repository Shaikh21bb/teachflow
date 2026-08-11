/**
 * NotificationBell — real-time bell icon with dropdown for the topbar
 * Polls /api/notifications/unread-count every 30s
 * Shows dropdown with all notifications on click
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, CheckCheck, MessageSquare, UserPlus, CheckCircle, AlertCircle, Info, X } from 'lucide-react'
import { dashboardAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'

function timeAgo(dateStr, lang = 'ru') {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return lang === 'kk' ? 'қазір' : 'только что'
    if (mins < 60) return `${mins} мин`
    if (hours < 24) return `${hours} ч`
    if (days < 7) return `${days} дн`
    return new Date(dateStr).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'short' })
}

function NotifIcon({ type, size = 16 }) {
    const s = { flexShrink: 0 }
    if (type === 'success')  return <UserPlus size={size} color="#10b981" style={s} />
    if (type === 'message')  return <MessageSquare size={size} color="#6366f1" style={s} />
    if (type === 'warning')  return <AlertCircle size={size} color="#f59e0b" style={s} />
    if (type === 'error')    return <AlertCircle size={size} color="#ef4444" style={s} />
    return <Info size={size} color="#3b82f6" style={s} />
}

export default function NotificationBell() {
    const { language } = useLanguage()
    const navigate = useNavigate()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [open, setOpen] = useState(false)
    const [unread, setUnread] = useState(0)
    const [notifications, setNotifications] = useState([])
    const [loading, setLoading] = useState(false)
    const dropdownRef = useRef(null)
    const pollRef = useRef(null)

    // Poll unread count every 30s
    const fetchUnread = useCallback(async () => {
        try {
            const data = await dashboardAPI.getUnreadCount()
            setUnread(data.count || 0)
        } catch { /* silent */ }
    }, [])

    useEffect(() => {
        fetchUnread()
        pollRef.current = setInterval(fetchUnread, 30000)
        return () => clearInterval(pollRef.current)
    }, [fetchUnread])

    // Close on outside click
    useEffect(() => {
        function handler(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        if (open) document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const openDropdown = async () => {
        setOpen(v => !v)
        if (!open) {
            setLoading(true)
            try {
                const data = await dashboardAPI.getNotifications()
                setNotifications(data || [])
            } catch { /* silent */ }
            setLoading(false)
        }
    }

    const markAllRead = async () => {
        try {
            await dashboardAPI.markAllRead()
            setUnread(0)
            setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })))
        } catch { /* silent */ }
    }

    const markOne = async (notif) => {
        if (!notif.is_read) {
            try {
                await dashboardAPI.markOneRead(notif.id)
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: 1 } : n))
                setUnread(prev => Math.max(0, prev - 1))
            } catch { /* silent */ }
        }
        // Navigate based on type
        if (notif.type === 'message') navigate('/chat')
        setOpen(false)
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Bell button */}
            <button
                onClick={openDropdown}
                style={{
                    position: 'relative',
                    background: open ? 'var(--color-primary-50, #eff6ff)' : 'var(--color-gray-100, #f4f4f5)',
                    border: 'none', borderRadius: '10px',
                    width: '38px', height: '38px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'all 0.2s',
                    color: open ? 'var(--color-primary-600)' : 'var(--color-gray-600)'
                }}
                aria-label="Notifications"
            >
                <Bell size={18} />
                {unread > 0 && (
                    <span style={{
                        position: 'absolute', top: '-2px', right: '-2px',
                        background: '#ef4444', color: 'white',
                        borderRadius: '20px', padding: '0 4px',
                        fontSize: '0.6rem', fontWeight: 800,
                        minWidth: '16px', height: '16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '2px solid white', lineHeight: 1,
                        animation: 'bellPulse 2s ease infinite'
                    }}>
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                    width: '340px', maxWidth: '90vw',
                    background: 'var(--color-white, white)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    border: '1px solid var(--color-gray-100)',
                    zIndex: 10000,
                    animation: 'dropdownSlide 0.2s ease',
                    overflow: 'hidden'
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderBottom: '1px solid var(--color-gray-100)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={16} color="var(--color-primary-600)" />
                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-gray-900)' }}>
                                {L('Уведомления', 'Хабарламалар')}
                            </span>
                            {unread > 0 && (
                                <span style={{ background: '#ef4444', color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>
                                    {unread}
                                </span>
                            )}
                        </div>
                        {unread > 0 && (
                            <button onClick={markAllRead} style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '5px',
                                color: 'var(--color-primary-600)', fontSize: '0.75rem', fontWeight: 600
                            }}>
                                <CheckCheck size={14} /> {L('Все прочитано', 'Барлығын оқыдым')}
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: '0.875rem' }}>
                                {L('Загрузка...', 'Жүктелуде...')}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center' }}>
                                <Bell size={36} color="#d1d5db" style={{ marginBottom: '10px' }} />
                                <p style={{ margin: 0, color: 'var(--color-gray-400)', fontSize: '0.875rem', fontWeight: 600 }}>
                                    {L('Нет уведомлений', 'Хабарламалар жоқ')}
                                </p>
                            </div>
                        ) : notifications.map(notif => (
                            <div
                                key={notif.id}
                                onClick={() => markOne(notif)}
                                style={{
                                    display: 'flex', alignItems: 'flex-start', gap: '12px',
                                    padding: '12px 16px', cursor: 'pointer',
                                    background: notif.is_read ? 'transparent' : 'var(--color-primary-50, #eff6ff)',
                                    borderBottom: '1px solid var(--color-gray-100)',
                                    transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                                onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : 'var(--color-primary-50)'}
                            >
                                {/* Icon */}
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0,
                                    background: notif.type === 'message' ? '#ede9fe'
                                        : notif.type === 'success' ? '#dcfce7'
                                        : notif.type === 'warning' ? '#fef3c7' : '#dbeafe',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <NotifIcon type={notif.type} size={16} />
                                </div>
                                {/* Text */}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        margin: '0 0 3px', fontSize: '0.85rem', lineHeight: 1.4,
                                        color: 'var(--color-gray-800)',
                                        fontWeight: notif.is_read ? 400 : 600
                                    }}>
                                        {notif.text}
                                    </p>
                                    <span style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>
                                        {timeAgo(notif.created_at, language)}
                                    </span>
                                </div>
                                {/* Unread dot */}
                                {!notif.is_read && (
                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0, marginTop: '4px' }} />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div style={{ padding: '10px 16px', borderTop: '1px solid var(--color-gray-100)', textAlign: 'center' }}>
                            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', fontSize: '0.78rem' }}>
                                {L('Закрыть', 'Жабу')}
                            </button>
                        </div>
                    )}
                </div>
            )}
            <style>{`
                @keyframes bellPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
            `}</style>
        </div>
    )
}
