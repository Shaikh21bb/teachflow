import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { marketplaceAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
    Search, Coins, ShoppingBag, BookOpen, Clock,
    Eye, CheckCircle, Loader2, Star, ChevronRight,
    TrendingUp, Gift, Lock, Filter
} from 'lucide-react'

const SUBJECTS = ['Математика','Физика','Химия','Биология','История','Информатика','Казахский язык','Русский язык','Английский язык']
const GRADES = Array.from({length:11}, (_,i)=>String(i+1))

// ── Avatar helper ────────────────────────────────────────────
function Avatar({ src, name, size = 28 }) {
    const initials = (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
    const colors = ['#6366f1','#10b981','#f59e0b','#ec4899','#06b6d4','#8b5cf6']
    const color = colors[(name?.charCodeAt(0)||0)%colors.length]
    const [err, setErr] = useState(false)
    if (src && !err) return <img src={src} alt={name} onError={()=>setErr(true)} style={{width:size,height:size,borderRadius:'50%',objectFit:'cover',flexShrink:0}} />
    return <div style={{width:size,height:size,borderRadius:'50%',background:color,color:'white',fontWeight:700,fontSize:size*0.36,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{initials}</div>
}

// ── Lesson card ──────────────────────────────────────────────
function LessonCard({ lesson, balance, onBuy, buying, language }) {
    const L = (ru, kk) => language === 'kk' ? kk : ru
    const isFree = lesson.price_tokens === 0
    const canAfford = balance >= lesson.price_tokens
    const owned = lesson.already_bought || lesson.is_own

    return (
        <div style={{
            background: 'white', borderRadius: 16,
            border: '1px solid #e5e7eb', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
            transition: 'transform 0.15s, box-shadow 0.15s'
        }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.09)'}}
            onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='none'}}
        >
            {/* Thumbnail */}
            <div style={{
                height: 130, flexShrink: 0, position: 'relative',
                background: lesson.thumbnail_url ? `url(${lesson.thumbnail_url}) center/cover` : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {!lesson.thumbnail_url && <BookOpen size={32} color="white" />}
                {/* Price badge */}
                <div style={{
                    position: 'absolute', top: 10, right: 10,
                    background: isFree ? '#10b981' : 'rgba(0,0,0,0.65)',
                    backdropFilter: 'blur(4px)',
                    color: 'white', borderRadius: 20, padding: '3px 10px',
                    fontSize: '0.72rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', gap: 4
                }}>
                    {isFree ? (
                        <>{L('Бесплатно', 'Тегін')}</>
                    ) : (
                        <><Coins size={11} /> {lesson.price_tokens}</>
                    )}
                </div>
                {/* Subject badge */}
                {lesson.subject && (
                    <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 600 }}>
                        {lesson.subject}
                    </div>
                )}
                {/* Owned overlay */}
                {owned && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: '#10b981', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <CheckCircle size={18} color="white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 700, color: '#111827', lineHeight: 1.35, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {lesson.title}
                </h3>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Avatar src={lesson.seller_avatar} name={lesson.seller_name} size={20} />
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {lesson.seller_name}
                    </span>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                    {lesson.duration && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: '#9ca3af' }}>
                            <Clock size={11} /> {lesson.duration} мин
                        </span>
                    )}
                    {lesson.grade && (
                        <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{lesson.grade} кл.</span>
                    )}
                    {lesson.views_count > 0 && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: '#9ca3af', marginLeft: 'auto' }}>
                            <Eye size={11} /> {lesson.views_count}
                        </span>
                    )}
                </div>

                {/* Buy button */}
                {owned ? (
                    <div style={{ padding: '9px', borderRadius: 10, background: '#f0fdf4', color: '#15803d', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <CheckCircle size={14} /> {lesson.is_own ? L('Ваш урок', 'Сіздің сабағыңыз') : L('Куплено', 'Сатып алынды')}
                    </div>
                ) : (
                    <button
                        onClick={() => onBuy(lesson)}
                        disabled={buying === lesson.id || (!isFree && !canAfford)}
                        style={{
                            padding: '9px', borderRadius: 10, border: 'none', cursor: (!isFree && !canAfford) ? 'not-allowed' : 'pointer',
                            fontWeight: 700, fontSize: '0.82rem',
                            background: (!isFree && !canAfford) ? '#f3f4f6' : isFree ? '#10b981' : '#6366f1',
                            color: (!isFree && !canAfford) ? '#9ca3af' : 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            transition: 'opacity 0.15s',
                            opacity: buying === lesson.id ? 0.7 : 1
                        }}
                    >
                        {buying === lesson.id ? (
                            <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                        ) : (!isFree && !canAfford) ? (
                            <><Lock size={13} /> {L('Мало токенов', 'Токен жетіспейді')}</>
                        ) : isFree ? (
                            <>{L('Получить бесплатно', 'Тегін алу')} <ChevronRight size={13} /></>
                        ) : (
                            <><Coins size={13} /> {lesson.price_tokens} {L('токенов', 'токен')}</>
                        )}
                    </button>
                )}
            </div>
        </div>
    )
}

export default function Marketplace() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const navigate = useNavigate()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [lessons, setLessons] = useState([])
    const [balance, setBalance] = useState(0)
    const [loading, setLoading] = useState(true)
    const [buying, setBuying] = useState(null)
    const [search, setSearch] = useState('')
    const [subject, setSubject] = useState('')
    const [grade, setGrade] = useState('')
    const [sort, setSort] = useState('newest')
    const [page, setPage] = useState(1)
    const [totalPages, setTotalPages] = useState(1)
    const [total, setTotal] = useState(0)
    const [tab, setTab] = useState('browse') // browse | purchased
    const [purchased, setPurchased] = useState([])
    const [buySuccess, setBuySuccess] = useState(null)
    const searchTimeout = useRef(null)

    const loadBalance = useCallback(async () => {
        try {
            const d = await marketplaceAPI.getBalance()
            setBalance(d.balance || 0)
        } catch { /* silent */ }
    }, [])

    const loadLessons = useCallback(async (p = 1) => {
        setLoading(true)
        try {
            const params = { sort, page: p }
            if (search) params.search = search
            if (subject) params.subject = subject
            if (grade) params.grade = grade
            const d = await marketplaceAPI.browse(params)
            setLessons(d.lessons || [])
            setTotalPages(d.pages || 1)
            setTotal(d.total || 0)
            setPage(p)
        } catch { /* silent */ }
        setLoading(false)
    }, [sort, search, subject, grade])

    const loadPurchased = useCallback(async () => {
        setLoading(true)
        try {
            const d = await marketplaceAPI.getMyPurchases()
            setPurchased(d.lessons || [])
        } catch { /* silent */ }
        setLoading(false)
    }, [])

    useEffect(() => {
        loadBalance()
        if (tab === 'browse') loadLessons(1)
        else loadPurchased()
    }, [tab, sort, subject, grade])

    const handleSearch = (val) => {
        setSearch(val)
        clearTimeout(searchTimeout.current)
        searchTimeout.current = setTimeout(() => loadLessons(1), 400)
    }

    const handleBuy = async (lesson) => {
        if (!user) { navigate('/login'); return }
        setBuying(lesson.id)
        try {
            const result = await marketplaceAPI.buy(lesson.id)
            if (result.success) {
                setBalance(result.new_balance)
                setLessons(prev => prev.map(l => l.id === lesson.id ? { ...l, already_bought: true } : l))
                setBuySuccess(lesson.title)
                setTimeout(() => setBuySuccess(null), 3000)
            }
        } catch (err) {
            alert(err.message)
        }
        setBuying(null)
    }

    const sortOptions = [
        { v: 'newest', l: L('Новые', 'Жаңа') },
        { v: 'popular', l: L('Популярные', 'Танымал') },
        { v: 'free', l: L('Бесплатные', 'Тегін') },
        { v: 'price_asc', l: L('Цена ↑', 'Баға ↑') },
        { v: 'price_desc', l: L('Цена ↓', 'Баға ↓') },
    ]

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* Success toast */}
            {buySuccess && (
                <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, background: 'white', border: '1px solid #e5e7eb', borderLeft: '4px solid #10b981', borderRadius: 12, padding: '12px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10, animation: 'slideIn 0.3s ease', fontWeight: 600, color: '#111827', fontSize: '0.875rem' }}>
                    <CheckCircle size={16} color="#10b981" /> {L(`"${buySuccess}" добавлен в библиотеку`, `"${buySuccess}" кітапханаға қосылды`)}
                </div>
            )}

            {/* ── Header ── */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <h1 style={{ margin: '0 0 4px', fontSize: '1.7rem', fontWeight: 900, color: '#111827', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <ShoppingBag size={28} color="#6366f1" /> {L('Маркетплейс', 'Маркетплейс')}
                    </h1>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
                        {L('Покупайте и продавайте уроки за токены', 'Токенге сабақ сатып алыңыз және сатыңыз')}
                    </p>
                </div>

                {/* Balance chip */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '10px 16px' }}>
                    <Coins size={18} color="#f59e0b" />
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827', lineHeight: 1 }}>{balance.toLocaleString('ru-RU')}</div>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{L('токенов', 'токен')}</div>
                    </div>
                    <button onClick={() => navigate('/dashboard')} style={{ marginLeft: 4, background: '#f59e0b', border: 'none', borderRadius: 8, padding: '5px 10px', color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}>
                        + {L('Пополнить', 'Толтыру')}
                    </button>
                </div>
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 10, padding: 3, marginBottom: 20, width: 'fit-content', gap: 2 }}>
                {[
                    { id: 'browse', label: L('Витрина', 'Витрина'), icon: <ShoppingBag size={15} /> },
                    { id: 'purchased', label: L('Мои покупки', 'Сатып алғандарым'), icon: <BookOpen size={15} /> },
                ].map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
                        border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                        background: tab === t.id ? 'white' : 'transparent',
                        color: tab === t.id ? '#111827' : '#9ca3af',
                        boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                        transition: 'all 0.12s'
                    }}>
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            {tab === 'browse' && (
                <>
                    {/* ── Filters ── */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 320 }}>
                            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input value={search} onChange={e => handleSearch(e.target.value)}
                                placeholder={L('Поиск уроков...', 'Сабақтарды іздеу...')}
                                style={{ width: '100%', padding: '9px 12px 9px 30px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', background: 'white', boxSizing: 'border-box', color: '#111827' }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                            />
                        </div>
                        <select value={subject} onChange={e => setSubject(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', background: 'white', color: '#374151', cursor: 'pointer' }}>
                            <option value="">{L('Все предметы', 'Барлық пәндер')}</option>
                            {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={grade} onChange={e => setGrade(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', background: 'white', color: '#374151', cursor: 'pointer' }}>
                            <option value="">{L('Все классы', 'Барлық сынып')}</option>
                            {GRADES.map(g => <option key={g} value={g}>{g} {L('класс', 'сынып')}</option>)}
                        </select>
                        {/* Sort */}
                        <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', flexWrap: 'wrap' }}>
                            {sortOptions.map(o => (
                                <button key={o.v} onClick={() => setSort(o.v)} style={{
                                    padding: '7px 12px', border: `1px solid ${sort === o.v ? '#6366f1' : '#e5e7eb'}`,
                                    borderRadius: 8, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                    background: sort === o.v ? '#eff6ff' : 'white',
                                    color: sort === o.v ? '#4f46e5' : '#6b7280',
                                    transition: 'all 0.12s'
                                }}>{o.l}</button>
                            ))}
                        </div>
                    </div>

                    {/* ── Sell your lesson CTA ── */}
                    <div style={{ background: 'linear-gradient(135deg,#f5f3ff,#eff6ff)', border: '1px solid #ddd6fe', borderRadius: 14, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <Gift size={20} color="#6366f1" style={{ flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>
                                {L('Продавайте свои уроки', 'Сабақтарыңызды сатыңыз')}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                                {L('Публикация бесплатна. Цену ставите вы. Комиссии нет.', 'Жариялау тегін. Бағаны өзіңіз белгілейсіз. Комиссия жоқ.')}
                            </div>
                        </div>
                        <Link to="/my-lessons" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#6366f1', color: 'white', borderRadius: 9, textDecoration: 'none', fontWeight: 700, fontSize: '0.82rem' }}>
                            {L('Мои уроки', 'Сабақтарым')} <ChevronRight size={14} />
                        </Link>
                    </div>

                    {/* ── Grid ── */}
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
                            <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : lessons.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                            <ShoppingBag size={48} color="#d1d5db" style={{ marginBottom: 12 }} />
                            <h3 style={{ margin: '0 0 8px', color: '#374151', fontWeight: 700 }}>{L('Уроков не найдено', 'Сабақтар табылмады')}</h3>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}>{L('Попробуйте изменить фильтры', 'Сүзгілерді өзгертіп көріңіз')}</p>
                        </div>
                    ) : (
                        <>
                            <p style={{ margin: '0 0 14px', fontSize: '0.78rem', color: '#9ca3af' }}>
                                {L(`Найдено: ${total} урок(ов)`, `Табылды: ${total} сабақ`)}
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
                                {lessons.map(lesson => (
                                    <LessonCard key={lesson.id} lesson={lesson} balance={balance} onBuy={handleBuy} buying={buying} language={language} />
                                ))}
                            </div>
                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
                                    {Array.from({ length: Math.min(7, totalPages) }, (_, i) => i + 1).map(p => (
                                        <button key={p} onClick={() => loadLessons(p)} style={{
                                            width: 34, height: 34, border: `1px solid ${p === page ? '#6366f1' : '#e5e7eb'}`,
                                            borderRadius: 8, fontWeight: p === page ? 700 : 400, cursor: 'pointer',
                                            background: p === page ? '#eff6ff' : 'white', color: p === page ? '#4f46e5' : '#374151', fontSize: '0.875rem'
                                        }}>{p}</button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {/* ── My Purchases ── */}
            {tab === 'purchased' && (
                <div>
                    {loading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
                            <Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                        </div>
                    ) : purchased.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                            <BookOpen size={48} color="#d1d5db" style={{ marginBottom: 12 }} />
                            <h3 style={{ margin: '0 0 8px', color: '#374151', fontWeight: 700 }}>{L('Нет купленных уроков', 'Сатып алынған сабақтар жоқ')}</h3>
                            <p style={{ margin: '0 0 20px', fontSize: '0.875rem' }}>{L('Найдите интересный урок в витрине', 'Витринадан қызықты сабақ табыңыз')}</p>
                            <button onClick={() => setTab('browse')} style={{ padding: '10px 22px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>
                                {L('Перейти в витрину', 'Витринаға өту')}
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                            {purchased.map(lesson => (
                                <div key={lesson.id} style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                                    <div style={{ width: 52, height: 52, borderRadius: 10, background: lesson.thumbnail_url ? `url(${lesson.thumbnail_url}) center/cover` : 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {!lesson.thumbnail_url && <BookOpen size={22} color="white" />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: '0 0 3px', fontWeight: 700, fontSize: '0.875rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.title}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Avatar src={lesson.seller_avatar} name={lesson.seller_name} size={16} />
                                            <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{lesson.seller_name}</span>
                                            {lesson.tokens_paid === 0 ? (
                                                <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, marginLeft: 'auto' }}>{L('Бесплатно', 'Тегін')}</span>
                                            ) : (
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', color: '#f59e0b', fontWeight: 700, marginLeft: 'auto' }}><Coins size={10} />{lesson.tokens_paid}</span>
                                            )}
                                        </div>
                                    </div>
                                    <CheckCircle size={18} color="#10b981" style={{ flexShrink: 0 }} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
