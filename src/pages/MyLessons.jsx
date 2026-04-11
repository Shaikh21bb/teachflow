import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { lessonsAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

const SUBJECTS = ['Все', 'Математика', 'Физика', 'Химия', 'Биология', 'История', 'Литература', 'Информатика', 'Английский', 'Казахский', 'Русский']
const GRADES = ['Все', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
const STATUSES = [
    { value: '', label: 'Все (без архива)' },
    { value: 'published', label: '✅ Опубликованные' },
    { value: 'draft', label: '📝 Черновики' },
    { value: 'archived', label: '📦 Архив' },
]

const FILE_TYPE_ICONS = {
    pdf: '📄', video: '🎥', youtube: '▶️', image: '🖼️', docx: '📝', text: '📃', default: '📎'
}

function getFileIcon(type) {
    return FILE_TYPE_ICONS[type] || FILE_TYPE_ICONS.default
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MyLessons() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [lessons, setLessons] = useState([])
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [subject, setSubject] = useState('')
    const [grade, setGrade] = useState('')
    const [status, setStatus] = useState('')
    const [deletingId, setDeletingId] = useState(null)
    const [actionMenuId, setActionMenuId] = useState(null)
    const [shareModal, setShareModal] = useState(null)
    const [toast, setToast] = useState(null)
    const [view, setView] = useState('grid') // 'grid' | 'list'

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3000)
    }

    const loadLessons = useCallback(async () => {
        setLoading(true)
        try {
            const params = {}
            if (search) params.search = search
            if (subject && subject !== 'Все') params.subject = subject
            if (grade && grade !== 'Все') params.grade = grade
            if (status) params.status = status

            const data = await lessonsAPI.getAll(params)
            setLessons(data)
        } catch (e) {
            console.error(e)
            showToast('Ошибка загрузки уроков', 'error')
        } finally {
            setLoading(false)
        }
    }, [search, subject, grade, status])

    const loadStats = useCallback(async () => {
        try {
            const data = await lessonsAPI.getStatsSummary()
            setStats(data)
        } catch (e) {
            console.error(e)
        }
    }, [])

    useEffect(() => {
        loadLessons()
    }, [loadLessons])

    useEffect(() => {
        loadStats()
    }, [loadStats])

    // Close menu on outside click
    useEffect(() => {
        const handler = () => setActionMenuId(null)
        document.addEventListener('click', handler)
        return () => document.removeEventListener('click', handler)
    }, [])

    const handleDelete = async (id) => {
        if (!window.confirm('Удалить урок? Это действие нельзя отменить.')) return
        setDeletingId(id)
        try {
            await lessonsAPI.delete(id)
            setLessons(prev => prev.filter(l => l.id !== id))
            showToast('Урок удалён')
            loadStats()
        } catch (e) {
            showToast('Ошибка удаления', 'error')
        } finally {
            setDeletingId(null)
        }
    }

    const handleArchive = async (lesson) => {
        try {
            await lessonsAPI.archive(lesson.id)
            const action = lesson.is_archived ? 'восстановлен из архива' : 'архивирован'
            showToast(`Урок ${action}`)
            loadLessons()
            loadStats()
        } catch (e) {
            showToast('Ошибка', 'error')
        }
    }

    const handleDuplicate = async (id) => {
        try {
            await lessonsAPI.duplicate(id)
            showToast('Урок скопирован!')
            loadLessons()
            loadStats()
        } catch (e) {
            showToast('Ошибка дублирования', 'error')
        }
    }

    const handleShare = async (id) => {
        try {
            const data = await lessonsAPI.share(id)
            setShareModal(data.share_url)
        } catch (e) {
            showToast('Ошибка создания ссылки', 'error')
        }
    }

    const copyShareLink = () => {
        navigator.clipboard.writeText(shareModal)
        showToast('Ссылка скопирована!')
    }

    return (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 16px' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', padding: '12px 20px', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    animation: 'slideIn 0.3s ease',
                    fontWeight: 500
                }}>
                    {toast.type === 'error' ? '❌ ' : '✅ '}{toast.message}
                </div>
            )}

            {/* Share Modal */}
            {shareModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div style={{
                        background: 'var(--color-white, white)', borderRadius: '16px',
                        padding: '32px', maxWidth: '480px', width: '90%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
                    }}>
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>🔗 Ссылка для учеников</h3>
                        <p style={{ color: 'var(--color-gray-500, #6b7280)', margin: '0 0 16px', fontSize: '0.9rem' }}>
                            Поделитесь этой ссылкой — ученики смогут открыть урок без регистрации
                        </p>
                        <div style={{
                            background: 'var(--color-gray-100, #f3f4f6)', borderRadius: '8px',
                            padding: '12px 16px', wordBreak: 'break-all', fontSize: '0.85rem',
                            fontFamily: 'monospace', marginBottom: '16px'
                        }}>
                            {shareModal}
                        </div>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={copyShareLink} style={{
                                flex: 1, padding: '10px', background: 'var(--gradient-primary, linear-gradient(135deg,#6366f1,#8b5cf6))',
                                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600
                            }}>📋 Скопировать</button>
                            <button onClick={() => setShareModal(null)} style={{
                                padding: '10px 20px', background: 'var(--color-gray-100, #f3f4f6)',
                                border: 'none', borderRadius: '8px', cursor: 'pointer'
                            }}>Закрыть</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>📚 Мои уроки</h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-gray-500, #6b7280)' }}>
                        Привет, {user?.name}! Управляйте своими материалами
                    </p>
                </div>
                <Link to="/builder" style={{
                    background: 'var(--gradient-primary, linear-gradient(135deg,#6366f1,#8b5cf6))',
                    color: 'white', textDecoration: 'none', padding: '12px 24px',
                    borderRadius: '12px', fontWeight: 700, fontSize: '0.95rem',
                    display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}>
                    ➕ Создать урок
                </Link>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                    gap: '16px', marginBottom: '28px'
                }}>
                    {[
                        { label: 'Всего уроков', value: stats.total_lessons, icon: '📚', color: '#6366f1' },
                        { label: 'Опубликовано', value: stats.published, icon: '✅', color: '#10b981' },
                        { label: 'Черновики', value: stats.drafts, icon: '📝', color: '#f59e0b' },
                        { label: 'Просмотры', value: stats.total_views, icon: '👁', color: '#3b82f6' },
                        { label: 'Загрузки', value: stats.total_downloads, icon: '⬇️', color: '#8b5cf6' },
                    ].map(card => (
                        <div key={card.label} style={{
                            background: 'var(--color-white, white)', borderRadius: '16px',
                            padding: '20px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                            border: '1px solid var(--color-gray-100, #f3f4f6)',
                            textAlign: 'center', transition: 'transform 0.2s'
                        }}>
                            <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>{card.icon}</div>
                            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: card.color }}>{card.value ?? 0}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500, #6b7280)', marginTop: '4px' }}>{card.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div style={{
                background: 'var(--color-white, white)', borderRadius: '16px', padding: '20px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: '20px',
                display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 200px', minWidth: '180px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Поиск по названию..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px 10px 36px', borderRadius: '10px',
                            border: '1px solid var(--color-gray-200, #e5e7eb)', background: 'var(--color-gray-50, #f9fafb)',
                            fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box'
                        }}
                    />
                </div>

                <select value={subject} onChange={e => setSubject(e.target.value)} style={selectStyle}>
                    {SUBJECTS.map(s => <option key={s} value={s === 'Все' ? '' : s}>{s}</option>)}
                </select>

                <select value={grade} onChange={e => setGrade(e.target.value)} style={selectStyle}>
                    {GRADES.map(g => <option key={g} value={g === 'Все' ? '' : g}>{g === 'Все' ? 'Все классы' : `${g} класс`}</option>)}
                </select>

                <select value={status} onChange={e => setStatus(e.target.value)} style={selectStyle}>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>

                {/* View toggle */}
                <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                    {['grid', 'list'].map(v => (
                        <button key={v} onClick={() => setView(v)} style={{
                            padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                            background: view === v ? 'var(--gradient-primary, linear-gradient(135deg,#6366f1,#8b5cf6))' : 'var(--color-gray-100, #f3f4f6)',
                            color: view === v ? 'white' : 'var(--color-gray-600, #4b5563)',
                            fontSize: '1rem'
                        }}>
                            {v === 'grid' ? '⊞' : '☰'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lessons Grid/List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-gray-400, #9ca3af)' }}>
                    <div style={{ fontSize: '2rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
                    <p>Загрузка уроков...</p>
                </div>
            ) : lessons.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 20px',
                    background: 'var(--color-white, white)', borderRadius: '20px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📭</div>
                    <h3 style={{ margin: '0 0 8px', color: 'var(--color-gray-700, #374151)' }}>
                        {search || subject || grade || status ? 'Ничего не найдено' : 'У вас пока нет уроков'}
                    </h3>
                    <p style={{ color: 'var(--color-gray-400, #9ca3af)', margin: '0 0 24px' }}>
                        {search || subject || grade || status ? 'Попробуйте изменить фильтры' : 'Создайте первый урок и начните обучать!'}
                    </p>
                    {!search && !subject && !grade && !status && (
                        <Link to="/builder" style={{
                            background: 'var(--gradient-primary, linear-gradient(135deg,#6366f1,#8b5cf6))',
                            color: 'white', textDecoration: 'none', padding: '12px 28px',
                            borderRadius: '12px', fontWeight: 700, display: 'inline-flex', gap: '8px'
                        }}>
                            ➕ Создать первый урок
                        </Link>
                    )}
                </div>
            ) : (
                <div style={{
                    display: view === 'grid'
                        ? 'grid'
                        : 'flex',
                    gridTemplateColumns: view === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined,
                    flexDirection: view === 'list' ? 'column' : undefined,
                    gap: '16px'
                }}>
                    {lessons.map(lesson => (
                        <LessonCard
                            key={lesson.id}
                            lesson={lesson}
                            view={view}
                            actionMenuId={actionMenuId}
                            setActionMenuId={setActionMenuId}
                            deletingId={deletingId}
                            onEdit={() => navigate(`/builder?edit=${lesson.id}`)}
                            onDelete={() => handleDelete(lesson.id)}
                            onArchive={() => handleArchive(lesson)}
                            onDuplicate={() => handleDuplicate(lesson.id)}
                            onShare={() => handleShare(lesson.id)}
                        />
                    ))}
                </div>
            )}

            <style>{`
                @keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}

function LessonCard({ lesson, view, actionMenuId, setActionMenuId, deletingId, onEdit, onDelete, onArchive, onDuplicate, onShare }) {
    const isGrid = view === 'grid'

    const statusColor = lesson.is_archived
        ? '#6b7280' : lesson.is_published ? '#10b981' : '#f59e0b'
    const statusLabel = lesson.is_archived ? '📦 Архив' : lesson.is_published ? '✅ Опубликован' : '📝 Черновик'

    return (
        <div style={{
            background: 'var(--color-white, white)',
            borderRadius: '16px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: `1px solid var(--color-gray-100, #f3f4f6)`,
            overflow: 'hidden',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: isGrid ? 'flex' : 'flex',
            flexDirection: isGrid ? 'column' : 'row',
            opacity: lesson.is_archived ? 0.75 : 1,
        }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
        >
            {/* Thumbnail */}
            {isGrid && (
                <div style={{
                    height: '160px',
                    background: lesson.thumbnail_url
                        ? `url(${lesson.thumbnail_url}) center/cover`
                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative', flexShrink: 0
                }}>
                    {!lesson.thumbnail_url && (
                        <span style={{ fontSize: '3rem' }}>{getFileIcon(lesson.file_type)}</span>
                    )}
                    <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600
                    }}>
                        {statusLabel}
                    </div>
                </div>
            )}

            {/* Content */}
            <div style={{ padding: isGrid ? '16px' : '16px 20px', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ flex: 1 }}>
                        {!isGrid && (
                            <span style={{
                                background: statusColor + '20', color: statusColor,
                                fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                                marginBottom: '6px', display: 'inline-block'
                            }}>{statusLabel}</span>
                        )}
                        <h3 style={{
                            margin: isGrid ? '0 0 6px' : '4px 0 4px',
                            fontSize: '1rem', fontWeight: 700, lineHeight: 1.3,
                            color: 'var(--color-gray-900, #111827)',
                            overflow: 'hidden', textOverflow: 'ellipsis',
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                        }}>
                            {lesson.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                            {lesson.subject && (
                                <span style={{ fontSize: '0.75rem', color: '#6366f1', background: '#ede9fe', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                    {lesson.subject}
                                </span>
                            )}
                            {lesson.grade && (
                                <span style={{ fontSize: '0.75rem', color: '#0891b2', background: '#e0f2fe', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                                    {lesson.grade} класс
                                </span>
                            )}
                            {lesson.duration && (
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>⏱ {lesson.duration} мин</span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--color-gray-400, #9ca3af)' }}>
                            <span>👁 {lesson.views_count || 0}</span>
                            <span>📅 {formatDate(lesson.created_at)}</span>
                        </div>
                    </div>

                    {/* Action Menu */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === lesson.id ? null : lesson.id); }}
                            style={{
                                width: '32px', height: '32px', borderRadius: '8px', border: 'none',
                                background: 'var(--color-gray-100, #f3f4f6)', cursor: 'pointer',
                                fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >⋮</button>

                        {actionMenuId === lesson.id && (
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    position: 'absolute', top: '36px', right: 0, zIndex: 100,
                                    background: 'white', borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                    minWidth: '180px', padding: '6px',
                                    border: '1px solid var(--color-gray-100, #f3f4f6)'
                                }}
                            >
                                {[
                                    { icon: '✏️', label: 'Редактировать', action: onEdit },
                                    { icon: '📋', label: 'Дублировать', action: onDuplicate },
                                    { icon: '🔗', label: 'Поделиться', action: onShare },
                                    { icon: lesson.is_archived ? '📤' : '📦', label: lesson.is_archived ? 'Восстановить' : 'Архивировать', action: onArchive },
                                    { icon: '🗑️', label: 'Удалить', action: onDelete, danger: true },
                                ].map(item => (
                                    <button
                                        key={item.label}
                                        onClick={() => { item.action(); setActionMenuId(null); }}
                                        disabled={deletingId === lesson.id}
                                        style={{
                                            width: '100%', padding: '9px 12px', border: 'none',
                                            background: 'none', cursor: 'pointer', borderRadius: '8px',
                                            display: 'flex', gap: '10px', alignItems: 'center',
                                            fontSize: '0.875rem', fontWeight: 500, textAlign: 'left',
                                            color: item.danger ? '#ef4444' : 'var(--color-gray-700, #374151)',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#fef2f2' : 'var(--color-gray-50, #f9fafb)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                    >
                                        {item.icon} {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

const selectStyle = {
    padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--color-gray-200, #e5e7eb)',
    background: 'var(--color-gray-50, #f9fafb)', fontSize: '0.875rem', outline: 'none',
    cursor: 'pointer', minWidth: '120px'
}
