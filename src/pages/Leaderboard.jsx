import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { teachersAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import {
    Trophy, Eye, ShoppingBag, BookOpen, MapPin,
    School, Medal, Loader2, ChevronRight, Star
} from 'lucide-react'

// ── Avatar ────────────────────────────────────────────────────
function Avatar({ src, name, size = 44 }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const colors = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6']
    const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
    const [err, setErr] = useState(false)
    if (src && !err) return <img src={src} alt={name} onError={() => setErr(true)} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
    return <div style={{ width: size, height: size, borderRadius: '50%', background: color, color: 'white', fontWeight: 800, fontSize: size * 0.36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
}

// Medal configs
const MEDALS = {
    gold: { bg: '#fef9c3', border: '#fbbf24', icon: '🥇', label: 'gold' },
    silver: { bg: '#f9fafb', border: '#d1d5db', icon: '🥈', label: 'silver' },
    bronze: { bg: '#fff7ed', border: '#fb923c', icon: '🥉', label: 'bronze' },
}

export default function Leaderboard() {
    const { language } = useLanguage()
    const { user } = useAuth()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [tab, setTab] = useState('views')
    const [teachers, setTeachers] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        setLoading(true)
        teachersAPI.getLeaderboard(tab, 20)
            .then(d => setTeachers(d.teachers || []))
            .catch(() => setTeachers([]))
            .finally(() => setLoading(false))
    }, [tab])

    const myRank = teachers.findIndex(t => t.id === user?.id)

    return (
        <div style={{ maxWidth: 800, margin: '0 auto', paddingBottom: 60 }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
                <h1 style={{ margin: '0 0 4px', fontSize: '1.7rem', fontWeight: 900, color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Trophy size={28} color="#f59e0b" /> {L('Рейтинг учителей', 'Мұғалімдер рейтингі')}
                </h1>
                <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                    {L('Топ педагогов платформы Urpaq.ai', 'Urpaq.ai платформасының үздік педагогтары')}
                </p>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 10, padding: 3, marginBottom: 24, width: 'fit-content', gap: 2 }}>
                {[
                    { v: 'views', icon: <Eye size={15} />, l: L('По просмотрам', 'Қаралым') },
                    { v: 'sales', icon: <ShoppingBag size={15} />, l: L('По продажам', 'Сату') },
                ].map(t => (
                    <button key={t.v} onClick={() => setTab(t.v)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        background: tab === t.v ? 'white' : 'transparent',
                        color: tab === t.v ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
                        boxShadow: tab === t.v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s'
                    }}>
                        {t.icon} {t.l}
                    </button>
                ))}
            </div>

            {/* My rank hint */}
            {myRank >= 0 && (
                <div style={{ background: 'var(--color-primary-50)', border: '1px solid var(--color-primary-200)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                    <Star size={16} color="var(--color-primary-600)" />
                    {L(`Ваше место в рейтинге: #${myRank + 1}`, `Сіздің орныңыз: #${myRank + 1}`)}
                </div>
            )}

            {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                    <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                </div>
            ) : teachers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-gray-400)' }}>
                    <Trophy size={48} color="#d1d5db" style={{ marginBottom: 12 }} />
                    <h3 style={{ margin: '0 0 6px', color: 'var(--color-gray-600)' }}>{L('Пока нет данных', 'Деректер жоқ')}</h3>
                    <p style={{ margin: 0, fontSize: '0.875rem' }}>{L('Опубликуйте уроки чтобы попасть в рейтинг', 'Рейтингке кіру үшін сабақтар жариялаңыз')}</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {teachers.map((teacher, idx) => {
                        const medal = MEDALS[teacher.badge]
                        const isMe = teacher.id === user?.id
                        return (
                            <Link
                                key={teacher.id}
                                to={`/teachers/${teacher.id}`}
                                style={{ textDecoration: 'none', display: 'block' }}
                            >
                                <div style={{
                                    background: isMe ? 'var(--color-primary-50)' : medal ? medal.bg : 'white',
                                    border: isMe ? '2px solid var(--color-primary-300)' : medal ? `1.5px solid ${medal.border}` : '1px solid var(--color-gray-100)',
                                    borderRadius: 16, padding: '14px 18px',
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    transition: 'box-shadow 0.15s, transform 0.15s',
                                    cursor: 'pointer'
                                }}
                                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                                    onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'translateY(0)' }}
                                >
                                    {/* Rank */}
                                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: medal ? '1.2rem' : '0.9rem', background: medal ? 'transparent' : 'var(--color-gray-100)', color: 'var(--color-gray-600)' }}>
                                        {medal ? medal.icon : `#${idx + 1}`}
                                    </div>

                                    {/* Avatar */}
                                    <Avatar src={teacher.avatar_url} name={teacher.name} size={44} />

                                    {/* Info */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--color-gray-900)' }}>{teacher.name}</span>
                                            {isMe && <span style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>{L('Вы', 'Сіз')}</span>}
                                            {teacher.badge === 'gold' && <span style={{ background: '#fbbf24', color: 'white', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 20 }}>TOP #1</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 3 }}>
                                            {teacher.school && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--color-gray-500)' }}>
                                                    <School size={11} /> {teacher.school}
                                                </span>
                                            )}
                                            {teacher.city && (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.72rem', color: 'var(--color-gray-500)' }}>
                                                    <MapPin size={11} /> {teacher.city}
                                                </span>
                                            )}
                                        </div>
                                        {/* Subjects */}
                                        {teacher.subjects?.length > 0 && (
                                            <div style={{ display: 'flex', gap: 4, marginTop: 5, flexWrap: 'wrap' }}>
                                                {teacher.subjects.slice(0, 3).map(s => (
                                                    <span key={s} style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-600)', fontSize: '0.68rem', fontWeight: 600, padding: '1px 6px', borderRadius: 20 }}>{s}</span>
                                                ))}
                                                {teacher.subjects.length > 3 && <span style={{ fontSize: '0.68rem', color: 'var(--color-gray-400)' }}>+{teacher.subjects.length - 3}</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stats */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                        {tab === 'views' ? (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: '1rem', color: 'var(--color-gray-900)' }}>
                                                    <Eye size={14} color="#6366f1" /> {(teacher.total_views || 0).toLocaleString('ru-RU')}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>
                                                    <BookOpen size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }} />
                                                    {teacher.lesson_count} {L('уроков', 'сабақ')}
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: '1rem', color: 'var(--color-gray-900)' }}>
                                                    <ShoppingBag size={14} color="#10b981" /> {teacher.sales_count || 0}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>
                                                    {L('продаж', 'сату')}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <ChevronRight size={16} color="var(--color-gray-300)" />
                                </div>
                            </Link>
                        )
                    })}
                </div>
            )}

            {/* CTA to publish */}
            {myRank < 0 && teachers.length > 0 && (
                <div style={{ marginTop: 28, background: 'linear-gradient(135deg,#f5f3ff,#eff6ff)', border: '1px solid #ddd6fe', borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <Trophy size={28} color="#6366f1" style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, color: 'var(--color-gray-900)', marginBottom: 3 }}>
                            {L('Попадите в рейтинг', 'Рейтингке кіріңіз')}
                        </div>
                        <div style={{ fontSize: '0.82rem', color: 'var(--color-gray-500)' }}>
                            {L('Публикуйте уроки и получайте просмотры — это бесплатно', 'Сабақтарды жариялаңыз — бұл тегін')}
                        </div>
                    </div>
                    <Link to="/builder" style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: '#6366f1', color: 'white', borderRadius: 11, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0 }}>
                        {L('Создать урок', 'Сабақ жасау')} <ChevronRight size={14} />
                    </Link>
                </div>
            )}
        </div>
    )
}
