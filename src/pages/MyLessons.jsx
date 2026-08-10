import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { lessonsAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { 
    Plus, Search, LayoutGrid, List, MoreVertical, 
    Share2, Edit3, Trash2, Archive, Copy, ExternalLink,
    BookOpen, Users, Eye, FileText, CheckCircle, Clock,
    Loader2, Calendar, PlayCircle, Film, Image, Paperclip,
    Youtube
} from 'lucide-react'
import MaterialsTabs from '../components/MaterialsTabs'
import { InboxEmptyIcon } from '../components/Icons'

const SUBJECTS = ['Все', 'Математика', 'Физика', 'Химия', 'Биология', 'История', 'Литература', 'Информатика', 'Английский', 'Казахский', 'Русский']
const GRADES = ['Все', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']
const STATUSES = [
    { value: '', label: 'Все (без архива)' },
    { value: 'published', label: 'Опубликованные' },
    { value: 'draft', label: 'Черновики' },
    { value: 'archived', label: 'Архив' },
]

function FileTypeIcon({ type, size = 24 }) {
    if (type === 'pdf') return <FileText size={size} color="#ef4444" />
    if (type === 'video') return <Film size={size} color="#6366f1" />
    if (type === 'youtube') return <Youtube size={size} color="#ef4444" />
    if (type === 'image') return <Image size={size} color="#10b981" />
    if (type === 'docx') return <FileText size={size} color="#3b82f6" />
    return <Paperclip size={size} color="#6b7280" />
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
                    background: 'var(--color-bg-card, white)',
                    color: 'var(--color-gray-900)',
                    padding: '12px 20px', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    animation: 'slideIn 0.3s ease',
                    fontWeight: 500,
                    borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    {toast.type === 'error'
                        ? <CheckCircle size={16} color="#ef4444" />
                        : <CheckCircle size={16} color="#10b981" />}
                    {toast.message}
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
                        <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem' }}>
                            <Share2 size={18} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                            Ссылка для учеников
                        </h3>
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
                                color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                            }}>
                                <Copy size={16} /> Скопировать
                            </button>
                            <button onClick={() => setShareModal(null)} style={{
                                padding: '10px 20px', background: 'var(--color-gray-100, #f3f4f6)',
                                border: 'none', borderRadius: '8px', cursor: 'pointer'
                            }}>Закрыть</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <MaterialsTabs />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <BookOpen size={32} color="#6366f1" /> Мои уроки
                    </h1>
                    <p style={{ margin: '4px 0 0', color: 'var(--color-gray-500)', fontSize: '1rem' }}>
                        Привет, <span style={{ fontWeight: 700, color: 'var(--color-primary-600)' }}>{user?.name}</span>! Управляйте своими материалами
                    </p>
                </div>
                <Link to="/builder" className="primary-btn" style={{ 
                    textDecoration: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px',
                    padding: '14px 28px',
                    background: 'var(--gradient-primary)',
                    boxShadow: '0 8px 25px rgba(37, 99, 235, 0.25)'
                }}>
                    <Plus size={20} /> Создать урок
                </Link>
            </div>

            {/* Stats Cards */}
            {stats && (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '20px', marginBottom: '40px'
                }}>
                    {[
                        { label: 'Всего уроков', value: stats.total_lessons, icon: <BookOpen size={24} />, color: '#6366f1', bg: 'rgba(99,102,241,0.08)' },
                        { label: 'Опубликовано', value: stats.published, icon: <CheckCircle size={24} />, color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
                        { label: 'Черновики', value: stats.drafts, icon: <FileText size={24} />, color: '#f59e0b', bg: 'rgba(245,158,11,0.08)' },
                        { label: 'Просмотры', value: stats.total_views, icon: <Eye size={24} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
                    ].map(card => (
                        <div key={card.label} className="builder-card" style={{
                            padding: '24px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px',
                                background: card.bg, color: card.color,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {card.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gray-900)', lineHeight: '1.2' }}>{card.value ?? 0}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{card.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="builder-card" style={{
                padding: '16px 20px',
                marginBottom: '32px',
                display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center'
            }}>
                {/* Search */}
                <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '240px' }}>
                    <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                    <input
                        type="text"
                        placeholder="Поиск по названию..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="builder-input"
                        style={{ paddingLeft: '44px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
                    <select value={subject} onChange={e => setSubject(e.target.value)} className="builder-input" style={{ width: 'auto', minWidth: '140px' }}>
                        {SUBJECTS.map(s => <option key={s} value={s === 'Все' ? '' : s}>{s}</option>)}
                    </select>

                    <select value={grade} onChange={e => setGrade(e.target.value)} className="builder-input" style={{ width: 'auto', minWidth: '130px' }}>
                        {GRADES.map(g => <option key={g} value={g === 'Все' ? '' : g}>{g === 'Все' ? 'Все классы' : `${g} класс`}</option>)}
                    </select>

                    <select value={status} onChange={e => setStatus(e.target.value)} className="builder-input" style={{ width: 'auto', minWidth: '160px' }}>
                        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>

                {/* View toggle */}
                <div style={{ display: 'flex', gap: '6px', background: 'var(--color-gray-100)', padding: '4px', borderRadius: '12px', marginLeft: 'auto' }}>
                    {[
                        { id: 'grid', icon: <LayoutGrid size={18} /> },
                        { id: 'list', icon: <List size={18} /> }
                    ].map(v => (
                        <button key={v.id} onClick={() => setView(v.id)} style={{
                            padding: '8px 12px', border: 'none', borderRadius: '8px', cursor: 'pointer',
                            background: view === v.id ? 'var(--color-white, white)' : 'transparent',
                            color: view === v.id ? 'var(--color-primary-600)' : 'var(--color-gray-500)',
                            boxShadow: view === v.id ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                            transition: 'all 0.2s',
                            display: 'flex', alignItems: 'center'
                        }}>
                            {v.icon}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lessons Grid/List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-gray-400, #9ca3af)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    <Loader2 size={40} style={{ animation: 'spin 1s linear infinite', color: '#6366f1' }} />
                    <p>Загрузка уроков...</p>
                </div>
            ) : lessons.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 20px',
                    background: 'var(--color-white, white)', borderRadius: '20px',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)'
                }}>
                    <InboxEmptyIcon size={64} color="#d1d5db" />
                    <h3 style={{ margin: '16px 0 8px', color: 'var(--color-gray-700, #374151)' }}>
                        {search || subject || grade || status ? 'Ничего не найдено' : 'У вас пока нет уроков'}
                    </h3>
                    <p style={{ color: 'var(--color-gray-400, #9ca3af)', margin: '0 0 24px' }}>
                        {search || subject || grade || status ? 'Попробуйте изменить фильтры' : 'Создайте первый урок и начните обучать!'}
                    </p>
                    {!search && !subject && !grade && !status && (
                        <Link to="/builder" style={{
                            background: 'var(--gradient-primary, linear-gradient(135deg,#6366f1,#8b5cf6))',
                            color: 'white', textDecoration: 'none', padding: '12px 28px',
                            borderRadius: '12px', fontWeight: 700, display: 'inline-flex', gap: '8px', alignItems: 'center'
                        }}>
                            <Plus size={18} /> Создать первый урок
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
                            onConduct={() => navigate(`/lesson/${lesson.id}/present?live=true`)}
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
                
                .lesson-card-wrapper {
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .lesson-card-wrapper:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0,0,0,0.08) !important;
                    border-color: var(--color-primary-200) !important;
                }
                
                .builder-card {
                    backdrop-filter: blur(8px);
                    background: var(--color-bg-card, rgba(255, 255, 255, 0.95)) !important;
                    border-radius: 20px;
                    border: 1px solid var(--color-gray-100);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
                }
                
                .builder-input {
                    width: 100%; padding: 12px 16px; border-radius: 12px;
                    border: 1px solid var(--color-gray-200);
                    background: var(--color-gray-50); fontSize: 0.9rem;
                    outline: none; transition: all 0.2s; color: var(--color-gray-900);
                }
                .builder-input:focus {
                    border-color: var(--color-primary-500);
                    box-shadow: 0 0 0 4px var(--color-primary-100);
                    background: white;
                }
                
                .primary-btn {
                    border: none; border-radius: 12px; cursor: pointer;
                    font-weight: 700; transition: all 0.2s; color: white;
                }
                .primary-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                }
            `}</style>
        </div>
    )
}

function LessonCard({ lesson, view, actionMenuId, setActionMenuId, deletingId, onConduct, onEdit, onDelete, onArchive, onDuplicate, onShare }) {
    const isGrid = view === 'grid'

    const statusColor = lesson.is_archived
        ? '#6b7280' : lesson.is_published ? '#10b981' : '#f59e0b'

    const StatusIcon = lesson.is_archived ? Archive : lesson.is_published ? CheckCircle : FileText
    const statusLabel = lesson.is_archived ? 'Архив' : lesson.is_published ? 'Опубликован' : 'Черновик'

    return (
        <div className="builder-card lesson-card-wrapper" style={{
            overflow: 'hidden',
            display: 'flex',
            flexDirection: isGrid ? 'column' : 'row',
            opacity: lesson.is_archived ? 0.75 : 1,
            padding: 0,
            border: '1px solid var(--color-gray-100)',
            height: '100%'
        }}>
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
                        <FileTypeIcon type={lesson.file_type} size={40} />
                    )}
                    <div style={{
                        position: 'absolute', top: '12px', right: '12px',
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        padding: '4px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: '5px'
                    }}>
                        <StatusIcon size={11} color={statusColor} />
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
                                marginBottom: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px'
                            }}>
                                <StatusIcon size={11} /> {statusLabel}
                            </span>
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
                                <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <Clock size={12} /> {lesson.duration} мин
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: '8px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={14} /> {lesson.views_count || 0}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> {formatDate(lesson.created_at)}</span>
                        </div>
                    </div>

                    {/* Action Menu */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                        <button
                            onClick={e => { e.stopPropagation(); setActionMenuId(actionMenuId === lesson.id ? null : lesson.id); }}
                            style={{
                                width: '36px', height: '36px', borderRadius: '10px', border: 'none',
                                background: 'var(--color-gray-100)', cursor: 'pointer',
                                color: 'var(--color-gray-600)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                        >
                            <MoreVertical size={18} />
                        </button>

                        {actionMenuId === lesson.id && (
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    position: 'absolute', top: '36px', right: 0, zIndex: 100,
                                    background: 'var(--color-bg-card, var(--color-white, white))', borderRadius: '12px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                                    minWidth: '180px', padding: '6px',
                                    border: '1px solid var(--color-gray-100, #f3f4f6)'
                                }}
                            >
                                {[
                                    { icon: <PlayCircle size={16} />, label: 'Вести урок', action: onConduct, highlight: true },
                                    { icon: <Edit3 size={16} />, label: 'Редактировать', action: onEdit },
                                    { icon: <Copy size={16} />, label: 'Дублировать', action: onDuplicate },
                                    { icon: <Share2 size={16} />, label: 'Поделиться', action: onShare },
                                    { icon: lesson.is_archived ? <ExternalLink size={16} /> : <Archive size={16} />, label: lesson.is_archived ? 'Восстановить' : 'Архивировать', action: onArchive },
                                    { icon: <Trash2 size={16} />, label: 'Удалить', action: onDelete, danger: true },
                                ].map(item => (
                                    <button
                                        key={item.label}
                                        onClick={() => { item.action(); setActionMenuId(null); }}
                                        disabled={deletingId === lesson.id}
                                        style={{
                                            width: '100%', padding: '9px 12px', border: 'none',
                                            background: item.highlight ? 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))' : 'none',
                                            cursor: 'pointer', borderRadius: '8px',
                                            display: 'flex', gap: '10px', alignItems: 'center',
                                            fontSize: '0.875rem', fontWeight: item.highlight ? 700 : 500, textAlign: 'left',
                                            color: item.danger ? '#ef4444' : item.highlight ? '#6366f1' : 'var(--color-gray-700, #374151)',
                                            transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = item.danger ? '#fef2f2' : item.highlight ? 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.15))' : 'var(--color-gray-50, #f9fafb)'}
                                        onMouseLeave={e => e.currentTarget.style.background = item.highlight ? 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))' : 'none'}
                                    >
                                        {item.icon} {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Conduct Lesson Button — visible directly on card */}
                <div style={{ padding: '0 16px 16px', paddingTop: 0 }}>
                    <button
                        onClick={onConduct}
                        style={{
                            width: '100%', padding: '10px 16px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                            color: 'white', border: 'none', borderRadius: '10px',
                            cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(99,102,241,0.25)'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(99,102,241,0.35)' }}
                        onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.25)' }}
                    >
                        <PlayCircle size={18} />
                        Вести урок
                    </button>
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
