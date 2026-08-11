import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { lessonsAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import {
    Search, BookOpen, Heart, Bookmark, BookmarkCheck, Eye, Clock,
    TrendingUp, Flame, Star, Filter, ChevronLeft, ChevronRight,
    User, School, Loader2, Library as LibraryIcon, Plus
} from 'lucide-react'

const SUBJECTS = [
    'Математика', 'Физика', 'Химия', 'Биология', 'История', 'География',
    'Информатика', 'Казахский язык', 'Русский язык', 'Английский язык',
    'Литература', 'Музыка', 'ИЗО', 'Физкультура', 'Технология'
]
const GRADES = Array.from({ length: 11 }, (_, i) => String(i + 1))

// ── Avatar helper ─────────────────────────────────────────────
function Avatar({ src, name, size = 28 }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const colors = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6']
    const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
    const [err, setErr] = useState(false)
    if (src && !err) return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    return <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: 'white', fontWeight: 700, fontSize: size * 0.36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
}

// ── LessonCard ────────────────────────────────────────────────
function LessonCard({ lesson, onLike, onSave, language }) {
    const L = (ru, kk) => language === 'kk' ? kk : ru
    const navigate = useNavigate()
    const [liked, setLiked] = useState(lesson.is_liked)
    const [saved, setSaved] = useState(lesson.is_saved)
    const [likes, setLikes] = useState(lesson.likes || 0)
    const [likeLoading, setLikeLoading] = useState(false)
    const [saveLoading, setSaveLoading] = useState(false)

    const handleLike = async (e) => {
        e.stopPropagation()
        setLikeLoading(true)
        try {
            const data = await lessonsAPI.like(lesson.id)
            setLiked(data.liked)
            setLikes(data.likes)
        } catch { /* silent */ }
        setLikeLoading(false)
    }

    const handleSave = async (e) => {
        e.stopPropagation()
        setSaveLoading(true)
        try {
            const data = await lessonsAPI.save(lesson.id)
            setSaved(data.saved)
        } catch { /* silent */ }
        setSaveLoading(false)
    }

    return (
        <div
            onClick={() => navigate(`/teachers/${lesson.author_id}`)}
            style={{
                background: 'var(--color-white, white)', borderRadius: '16px',
                border: '1px solid var(--color-gray-100)', overflow: 'hidden',
                transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer',
                display: 'flex', flexDirection: 'column'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
            {/* Thumbnail */}
            <div style={{
                height: '140px', flexShrink: 0,
                background: lesson.thumbnail_url
                    ? `url(${lesson.thumbnail_url}) center/cover`
                    : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {!lesson.thumbnail_url && <BookOpen size={36} color="white" />}
                {/* Badges */}
                <div style={{ position: 'absolute', top: '10px', left: '10px', display: 'flex', gap: '6px' }}>
                    {lesson.subject && (
                        <span style={{ background: 'rgba(0,0,0,0.55)', color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                            {lesson.subject}
                        </span>
                    )}
                    {lesson.grade && (
                        <span style={{ background: 'rgba(0,0,0,0.55)', color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600, backdropFilter: 'blur(4px)' }}>
                            {lesson.grade} {L('кл.', 'сын.')}
                        </span>
                    )}
                </div>
                {/* Action buttons */}
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                    <button onClick={handleSave} disabled={saveLoading} style={{
                        width: '30px', height: '30px', borderRadius: '8px',
                        background: saved ? '#6366f1' : 'rgba(255,255,255,0.85)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s', backdropFilter: 'blur(4px)'
                    }}>
                        {saveLoading ? <Loader2 size={13} color={saved ? 'white' : '#6366f1'} style={{ animation: 'spin 1s linear infinite' }} />
                            : saved ? <BookmarkCheck size={14} color="white" /> : <Bookmark size={14} color="#6366f1" />}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-gray-900)', lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {lesson.title}
                </h3>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Avatar src={lesson.author_avatar} name={lesson.author_name} size={22} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lesson.author_name}
                    </span>
                </div>

                {/* Stats row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid var(--color-gray-100)' }}>
                    {lesson.duration && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>
                            <Clock size={12} /> {lesson.duration} мин
                        </span>
                    )}
                    {lesson.views_count > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>
                            <Eye size={12} /> {lesson.views_count}
                        </span>
                    )}
                    {/* Like button */}
                    <button onClick={handleLike} disabled={likeLoading} style={{
                        marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px',
                        background: liked ? '#fff1f2' : 'transparent',
                        border: liked ? '1px solid #fecdd3' : '1px solid transparent',
                        borderRadius: '8px', padding: '4px 8px', cursor: 'pointer',
                        color: liked ? '#ef4444' : 'var(--color-gray-400)', fontSize: '0.75rem', fontWeight: 600,
                        transition: 'all 0.2s'
                    }}>
                        {likeLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            : <Heart size={13} fill={liked ? '#ef4444' : 'none'} />}
                        {likes > 0 && likes}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function LibraryPage() {
    const { t, language } = useLanguage()
    const { user } = useAuth()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [tab, setTab] = useState('community')  // 'community' | 'saved'
    const [lessons, setLessons] = useState([])
    const [savedLessons, setSavedLessons] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [subject, setSubject] = useState('')
    const [grade, setGrade] = useState('')
    const [sort, setSort] = useState('newest')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const searchTimeout = useRef(null)

    const fetchLessons = useCallback(async (p = 1) => {
        setLoading(true)
        try {
            const params = { sort, page: p }
            if (search) params.search = search
            if (subject) params.subject = subject
            if (grade) params.grade = grade
            const data = await lessonsAPI.getPublic(params)
            setLessons(data.lessons || [])
            setTotalPages(data.pages || 1)
            setTotal(data.total || 0)
            setPage(p)
        } catch (err) { console.error(err) }
        setLoading(false)
    }, [search, subject, grade, sort])

    const fetchSaved = useCallback(async () => {
        setLoading(true)
        try {
            const data = await lessonsAPI.getSaved()
            setSavedLessons(data.lessons || [])
        } catch { /* silent */ }
        setLoading(false)
    }, [])

    useEffect(() => {
        if (tab === 'community') fetchLessons(1)
        else fetchSaved()
    }, [tab, sort, subject, grade])

    const handleSearch = (val) => {
        setSearch(val)
        clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => fetchLessons(1), 450)
    }

    const sortOptions = [
        { value: 'newest', label: L('Новые', 'Жаңа'), icon: <TrendingUp size={14} /> },
        { value: 'popular', label: L('Популярные', 'Танымал'), icon: <Flame size={14} /> },
        { value: 'liked', label: L('Liked', 'Ұнаған'), icon: <Star size={14} /> },
    ]

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 style={{ margin: '0 0 4px', fontSize: '1.7rem', fontWeight: 900, color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LibraryIcon size={28} color="#6366f1" /> {L('Библиотека уроков', 'Сабақтар кітапханасы')}
                    </h1>
                    <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                        {L('Уроки от учителей со всего Казахстана', 'Қазақстан мұғалімдерінің сабақтары')}
                    </p>
                </div>
                <Link to="/builder" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                    <Plus size={16} /> {L('Добавить урок', 'Сабақ қосу')}
                </Link>
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', background: 'var(--color-gray-100)', borderRadius: '12px', padding: '4px', marginBottom: '20px', width: 'fit-content', gap: '2px' }}>
                {[
                    { id: 'community', label: L('Сообщество', 'Қоғамдастық'), icon: <BookOpen size={16} /> },
                    { id: 'saved', label: L('Сохранённые', 'Сақталған'), icon: <BookmarkCheck size={16} /> },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px',
                        border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                        background: tab === t.id ? 'white' : 'transparent',
                        color: tab === t.id ? 'var(--color-primary-600)' : 'var(--color-gray-600)',
                        boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {/* ── Filters (community tab only) ── */}
            {tab === 'community' && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px', alignItems: 'center' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '340px' }}>
                        <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                        <input value={search} onChange={e => handleSearch(e.target.value)}
                            placeholder={L('Поиск уроков, тем, учителей...', 'Сабақтарды іздеу...')}
                            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1px solid var(--color-gray-200)', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', background: 'white', boxSizing: 'border-box', color: 'var(--color-gray-900)' }}
                            onFocus={e => e.target.style.borderColor = '#6366f1'}
                            onBlur={e => e.target.style.borderColor = 'var(--color-gray-200)'}
                        />
                    </div>
                    {/* Subject */}
                    <select value={subject} onChange={e => { setSubject(e.target.value); fetchLessons(1) }} style={{ padding: '9px 12px', border: '1px solid var(--color-gray-200)', borderRadius: '10px', fontSize: '0.875rem', background: 'white', cursor: 'pointer', color: 'var(--color-gray-700)', minWidth: '140px' }}>
                        <option value="">{L('Все предметы', 'Барлық пәндер')}</option>
                        {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {/* Grade */}
                    <select value={grade} onChange={e => { setGrade(e.target.value); fetchLessons(1) }} style={{ padding: '9px 12px', border: '1px solid var(--color-gray-200)', borderRadius: '10px', fontSize: '0.875rem', background: 'white', cursor: 'pointer', color: 'var(--color-gray-700)', minWidth: '110px' }}>
                        <option value="">{L('Все классы', 'Барлық сынып')}</option>
                        {GRADES.map(g => <option key={g} value={g}>{g} {L('класс', 'сынып')}</option>)}
                    </select>
                    {/* Sort */}
                    <div style={{ display: 'flex', gap: '4px', marginLeft: 'auto' }}>
                        {sortOptions.map(opt => (
                            <button key={opt.value} onClick={() => setSort(opt.value)} style={{
                                display: 'flex', alignItems: 'center', gap: '5px',
                                padding: '8px 12px', border: `1px solid ${sort === opt.value ? '#6366f1' : 'var(--color-gray-200)'}`,
                                borderRadius: '10px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                                background: sort === opt.value ? '#eff6ff' : 'white',
                                color: sort === opt.value ? '#4f46e5' : 'var(--color-gray-600)',
                                transition: 'all 0.15s'
                            }}>
                                {opt.icon} {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Grid ── */}
            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                    <Loader2 size={40} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : (tab === 'community' ? lessons : savedLessons).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-gray-400)' }}>
                    <BookOpen size={56} color="#d1d5db" style={{ marginBottom: '16px' }} />
                    <h3 style={{ margin: '0 0 8px', color: 'var(--color-gray-600)' }}>
                        {tab === 'saved' ? L('Нет сохранённых уроков', 'Сақталған сабақтар жоқ') : L('Уроков не найдено', 'Сабақтар табылмады')}
                    </h3>
                    <p style={{ margin: '0 0 20px', fontSize: '0.875rem' }}>
                        {tab === 'saved'
                            ? L('Нажимайте на закладку в карточке урока', 'Сабақ картасындағы бетбелгіні басыңыз')
                            : L('Попробуйте изменить фильтры', 'Сүзгілерді өзгертіп көріңіз')}
                    </p>
                    {tab === 'community' && <button onClick={() => { setSearch(''); setSubject(''); setGrade(''); fetchLessons(1) }} className="btn btn-primary">{L('Сбросить фильтры', 'Сүзгілерді тазалау')}</button>}
                </div>
            ) : (
                <>
                    {tab === 'community' && (
                        <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
                            {L(`Найдено: ${total} урок(ов)`, `Табылды: ${total} сабақ`)}
                        </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px', marginBottom: '28px' }}>
                        {(tab === 'community' ? lessons : savedLessons).map(lesson => (
                            <LessonCard key={lesson.id} lesson={lesson} language={language} />
                        ))}
                    </div>

                    {/* Pagination (community only) */}
                    {tab === 'community' && totalPages > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                            <button onClick={() => fetchLessons(page - 1)} disabled={page <= 1} style={{ width: '36px', height: '36px', border: '1px solid var(--color-gray-200)', borderRadius: '9px', background: 'white', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronLeft size={18} />
                            </button>
                            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                                const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                                return (
                                    <button key={p} onClick={() => fetchLessons(p)} style={{
                                        width: '36px', height: '36px', border: `1px solid ${p === page ? '#6366f1' : 'var(--color-gray-200)'}`,
                                        borderRadius: '9px', fontWeight: p === page ? 700 : 400, cursor: 'pointer',
                                        background: p === page ? '#eff6ff' : 'white', color: p === page ? '#4f46e5' : 'var(--color-gray-700)', fontSize: '0.875rem'
                                    }}>{p}</button>
                                )
                            })}
                            <button onClick={() => fetchLessons(page + 1)} disabled={page >= totalPages} style={{ width: '36px', height: '36px', border: '1px solid var(--color-gray-200)', borderRadius: '9px', background: 'white', cursor: page < totalPages ? 'pointer' : 'not-allowed', opacity: page >= totalPages ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
