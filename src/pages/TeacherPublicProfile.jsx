import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { teachersAPI, chatAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
    MapPin, School, BookOpen, Users, UserPlus, UserCheck,
    MessageSquare, ExternalLink, Instagram, Youtube, Send,
    Globe, Loader2, ArrowLeft, Calendar, Eye, ChevronRight
} from 'lucide-react'
import { authFetch } from '../contexts/AuthContext'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

// ── Avatar helper ─────────────────────────────────────────────
function Avatar({ src, name, size = 96 }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6']
    const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
    const [imgError, setImgError] = useState(false)

    if (src && !imgError) {
        return (
            <img src={src} alt={name}
                onError={() => setImgError(true)}
                style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}
            />
        )
    }
    return (
        <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: size * 0.35, border: '4px solid white', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', flexShrink: 0 }}>
            {initials}
        </div>
    )
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ value, label, icon }) {
    return (
        <div style={{ textAlign: 'center', padding: '16px 20px', background: 'var(--color-white, white)', borderRadius: '14px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-100)', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '4px' }}>
                {icon}
                <span style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>{value ?? 0}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-gray-500)', fontWeight: 500 }}>{label}</div>
        </div>
    )
}

export default function TeacherPublicProfile() {
    const { id } = useParams()
    const { user, isAuthenticated } = useAuth()
    const { language } = useLanguage()
    const navigate = useNavigate()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isFollowing, setIsFollowing] = useState(false)
    const [followLoading, setFollowLoading] = useState(false)
    const [messageLoading, setMessageLoading] = useState(false)

    const isOwnProfile = isAuthenticated && user?.id === parseInt(id)

    useEffect(() => {
        loadProfile()
    }, [id])

    const loadProfile = async () => {
        setLoading(true)
        setError('')
        try {
            const result = await teachersAPI.getProfile(id)
            setData(result)
            // Check if current user is following this teacher
            if (isAuthenticated && !isOwnProfile) {
                checkFollowing(result)
            }
        } catch (err) {
            setError(L('Учитель не найден', 'Мұғалім табылмады'))
        } finally {
            setLoading(false)
        }
    }

    const checkFollowing = async (profileData) => {
        try {
            const res = await authFetch(`${API_BASE}/auth/colleagues`)
            if (!res.ok) return
            const d = await res.json()
            const found = (d.colleagues || []).find(c => c.id === parseInt(id))
            if (found) setIsFollowing(found.is_following)
        } catch { /* silent */ }
    }

    const handleFollow = async () => {
        if (!isAuthenticated) { navigate('/login'); return }
        setFollowLoading(true)
        try {
            const res = await authFetch(`${API_BASE}/auth/colleagues/toggle`, {
                method: 'POST',
                body: JSON.stringify({ targetId: parseInt(id) })
            })
            const result = await res.json()
            setIsFollowing(result.action === 'followed')
            setData(prev => ({
                ...prev,
                stats: {
                    ...prev.stats,
                    followers: result.action === 'followed'
                        ? prev.stats.followers + 1
                        : Math.max(0, prev.stats.followers - 1)
                }
            }))
        } catch { /* silent */ }
        setFollowLoading(false)
    }

    const handleMessage = async () => {
        if (!isAuthenticated) { navigate('/login'); return }
        setMessageLoading(true)
        try {
            await chatAPI.openConversation(parseInt(id))
            navigate(`/chat?with=${id}`)
        } catch { navigate(`/chat?with=${id}`) }
        setMessageLoading(false)
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} style={{ color: '#6366f1', animation: 'spin 1s linear infinite', marginBottom: '16px' }} />
                    <p style={{ color: 'var(--color-gray-500)' }}>{L('Загрузка...', 'Жүктелуде...')}</p>
                </div>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-gray-500)' }}>
                <Users size={56} color="#d1d5db" style={{ marginBottom: '16px' }} />
                <h2 style={{ marginBottom: '8px' }}>{error || L('Профиль не найден', 'Профиль табылмады')}</h2>
                <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ marginTop: '16px' }}>
                    {L('Назад', 'Артқа')}
                </button>
            </div>
        )
    }

    const { teacher, stats, lessons } = data
    const memberYear = teacher.member_since ? new Date(teacher.member_since).getFullYear() : null
    const hasSocial = teacher.social?.instagram || teacher.social?.youtube || teacher.social?.telegram || teacher.social?.website

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '0 0 80px' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Back button ────────────────────────────────── */}
            <button onClick={() => navigate(-1)} style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-gray-500)', fontWeight: 600, fontSize: '0.875rem',
                padding: '16px 0', marginBottom: '4px'
            }}>
                <ArrowLeft size={16} /> {L('Назад', 'Артқа')}
            </button>

            {/* ── Hero banner ────────────────────────────────── */}
            <div style={{
                background: 'linear-gradient(135deg, var(--color-primary-600, #4f46e5) 0%, #7c3aed 100%)',
                borderRadius: '20px', padding: '32px 28px 28px',
                marginBottom: '20px', position: 'relative', overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(79,70,229,0.25)'
            }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: 120, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap', position: 'relative' }}>
                    {/* Avatar */}
                    <Avatar src={teacher.avatar_url} name={teacher.name} size={88} />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <h1 style={{ margin: '0 0 8px', fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, color: 'white', lineHeight: 1.2 }}>
                            {teacher.name}
                        </h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                            {teacher.school && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                                    <School size={14} /> {teacher.school}
                                </span>
                            )}
                            {teacher.city && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
                                    <MapPin size={14} /> {teacher.city}
                                </span>
                            )}
                            {memberYear && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem' }}>
                                    <Calendar size={13} /> {L(`С ${memberYear} года`, `${memberYear} жылдан`)}
                                </span>
                            )}
                        </div>

                        {/* Subjects */}
                        {teacher.subjects?.length > 0 && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                {teacher.subjects.map(s => (
                                    <span key={s} style={{ background: 'rgba(255,255,255,0.18)', color: 'white', padding: '3px 10px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 600 }}>
                                        {s}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* Action buttons */}
                        {!isOwnProfile && isAuthenticated && (
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <button onClick={handleFollow} disabled={followLoading} style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '9px 18px',
                                    background: isFollowing ? 'rgba(255,255,255,0.15)' : 'white',
                                    color: isFollowing ? 'white' : '#4f46e5',
                                    border: isFollowing ? '1.5px solid rgba(255,255,255,0.4)' : 'none',
                                    borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem',
                                    cursor: followLoading ? 'default' : 'pointer', transition: 'all 0.2s',
                                    opacity: followLoading ? 0.7 : 1
                                }}>
                                    {followLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
                                        : isFollowing ? <UserCheck size={15} /> : <UserPlus size={15} />}
                                    {isFollowing ? L('Вы подписаны', 'Жазылдыңыз') : L('Подписаться', 'Жазылу')}
                                </button>
                                <button onClick={handleMessage} disabled={messageLoading} style={{
                                    display: 'flex', alignItems: 'center', gap: '7px',
                                    padding: '9px 18px',
                                    background: 'rgba(255,255,255,0.15)',
                                    color: 'white', border: '1.5px solid rgba(255,255,255,0.4)',
                                    borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem',
                                    cursor: messageLoading ? 'default' : 'pointer', transition: 'all 0.2s',
                                    opacity: messageLoading ? 0.7 : 1
                                }}>
                                    {messageLoading ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <MessageSquare size={15} />}
                                    {L('Написать', 'Жазу')}
                                </button>
                            </div>
                        )}

                        {isOwnProfile && (
                            <Link to="/profile" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '7px',
                                padding: '9px 18px', background: 'white', color: '#4f46e5',
                                borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem', textDecoration: 'none'
                            }}>
                                {L('Редактировать профиль', 'Профильді өзгерту')}
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Stats row ──────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <StatCard value={stats.lessons_published} label={L('Уроков', 'Сабақ')} icon={<BookOpen size={18} color="#6366f1" />} />
                <StatCard value={stats.followers} label={L('Подписчиков', 'Жазылушылар')} icon={<Users size={18} color="#10b981" />} />
                <StatCard value={stats.following} label={L('Подписок', 'Жазылымдар')} icon={<UserCheck size={18} color="#f59e0b" />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>

                {/* ── Bio ───────────────────────────────────────── */}
                {teacher.bio && (
                    <div style={{ background: 'var(--color-white, white)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-100)' }}>
                        <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#6366f1', borderRadius: '2px' }} />
                            {L('О себе', 'Өзім туралы')}
                        </h3>
                        <p style={{ margin: 0, color: 'var(--color-gray-700)', lineHeight: 1.7, fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}>
                            {teacher.bio}
                        </p>
                    </div>
                )}

                {/* ── Social links ───────────────────────────────── */}
                {hasSocial && (
                    <div style={{ background: 'var(--color-white, white)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-100)' }}>
                        <h3 style={{ margin: '0 0 14px', fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#10b981', borderRadius: '2px' }} />
                            {L('Контакты', 'Байланыс')}
                        </h3>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {teacher.social?.instagram && (
                                <a href={teacher.social.instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#cc2366)', color: 'white', borderRadius: '10px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Instagram size={16} /> Instagram
                                </a>
                            )}
                            {teacher.social?.youtube && (
                                <a href={teacher.social.youtube} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: '#ef4444', color: 'white', borderRadius: '10px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Youtube size={16} /> YouTube
                                </a>
                            )}
                            {teacher.social?.telegram && (
                                <a href={teacher.social.telegram.startsWith('http') ? teacher.social.telegram : `https://t.me/${teacher.social.telegram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: '#0088cc', color: 'white', borderRadius: '10px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Send size={16} /> Telegram
                                </a>
                            )}
                            {teacher.social?.website && (
                                <a href={teacher.social.website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 14px', background: 'var(--color-gray-700, #374151)', color: 'white', borderRadius: '10px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                                    <Globe size={16} /> {L('Сайт', 'Сайт')}
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Public lessons ───────────────────────────── */}
                {lessons?.length > 0 && (
                    <div style={{ background: 'var(--color-white, white)', borderRadius: '16px', padding: '20px 24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-100)' }}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '4px', height: '20px', background: '#f59e0b', borderRadius: '2px' }} />
                            {L('Опубликованные уроки', 'Жарияланған сабақтар')}
                            <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--color-gray-400)', fontWeight: 500 }}>
                                {stats.lessons_published}
                            </span>
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                            {lessons.map(lesson => (
                                <div key={lesson.id} style={{
                                    background: 'var(--color-gray-50, #f9fafb)',
                                    borderRadius: '12px', overflow: 'hidden',
                                    border: '1px solid var(--color-gray-100)',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'default'
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)' }}
                                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
                                >
                                    {/* Thumbnail or gradient */}
                                    <div style={{
                                        height: '80px',
                                        background: lesson.thumbnail_url ? `url(${lesson.thumbnail_url}) center/cover` : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {!lesson.thumbnail_url && <BookOpen size={28} color="white" />}
                                    </div>
                                    <div style={{ padding: '10px 12px' }}>
                                        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {lesson.title}
                                        </p>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                {lesson.subject && <span style={{ background: 'var(--color-primary-100, #e0e7ff)', color: 'var(--color-primary-700, #4338ca)', padding: '2px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>{lesson.subject}</span>}
                                                {lesson.grade && <span style={{ background: 'var(--color-gray-200)', color: 'var(--color-gray-600)', padding: '2px 7px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>{lesson.grade} {L('кл.', 'сын.')}</span>}
                                            </div>
                                            {lesson.views_count > 0 && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.7rem', color: 'var(--color-gray-400)' }}>
                                                    <Eye size={11} /> {lesson.views_count}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Empty lessons ─────────────────────────────── */}
                {lessons?.length === 0 && (
                    <div style={{ background: 'var(--color-white, white)', borderRadius: '16px', padding: '40px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid var(--color-gray-100)', color: 'var(--color-gray-400)' }}>
                        <BookOpen size={40} color="#d1d5db" style={{ marginBottom: '12px' }} />
                        <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{L('Нет опубликованных уроков', 'Жарияланған сабақтар жоқ')}</p>
                        <p style={{ fontSize: '0.82rem', margin: 0 }}>{L('Учитель ещё не опубликовал уроки', 'Мұғалім əлі сабақтарын жарияламаған')}</p>
                    </div>
                )}
            </div>
        </div>
    )
}
