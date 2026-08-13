import { useState, useEffect } from 'react'
import { adminAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useNavigate } from 'react-router-dom'
import {
    Users, Coins, BarChart2, Play, Plus, Edit3, Trash2, Eye,
    CheckCircle, X, AlertCircle, Loader2, ToggleLeft, ToggleRight,
    ShieldCheck, Search, TrendingUp, Film, Image, Link as LinkIcon
} from 'lucide-react'

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ icon, value, label, color, bg }) {
    return (
        <div style={{ background: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
            <div>
                <div style={{ fontWeight: 900, fontSize: '1.4rem', color: '#111827', lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString('ru-RU') : value}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{label}</div>
            </div>
        </div>
    )
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toast }) {
    if (!toast) return null
    return (
        <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 9999, background: 'white', border: '1px solid #e5e7eb', borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`, borderRadius: 12, padding: '12px 18px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: '0.875rem', color: '#111827', animation: 'slideIn 0.3s ease', maxWidth: 360 }}>
            {toast.type === 'error' ? <AlertCircle size={16} color="#ef4444" /> : <CheckCircle size={16} color="#10b981" />}
            {toast.msg}
        </div>
    )
}

const AD_TYPES = [
    { v: 'youtube', l: 'YouTube', icon: <Play size={14} /> },
    { v: 'video', l: 'Видео (MP4)', icon: <Film size={14} /> },
    { v: 'banner', l: 'Баннер (картинка)', icon: <Image size={14} /> },
    { v: 'link', l: 'Ссылка + изображение', icon: <LinkIcon size={14} /> },
]

export default function AdminPanel() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const navigate = useNavigate()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [tab, setTab] = useState('stats') // stats | users | ads
    const [stats, setStats] = useState(null)
    const [users, setUsers] = useState([])
    const [userTotal, setUserTotal] = useState(0)
    const [ads, setAds] = useState([])
    const [loading, setLoading] = useState(true)
    const [toast, setToast] = useState(null)
    const [search, setSearch] = useState('')
    const [planFilter, setPlanFilter] = useState('')
    const [page, setPage] = useState(1)

    // Ad modal
    const [adModal, setAdModal] = useState(false)
    const [editingAd, setEditingAd] = useState(null)
    const [adForm, setAdForm] = useState({ title: '', type: 'youtube', url: '', thumbnail_url: '', duration: 15, tokens_reward: 5, link_url: '' })
    const [adSaving, setAdSaving] = useState(false)

    // User token modal
    const [tokenModal, setTokenModal] = useState(null) // { user }
    const [tokenAmount, setTokenAmount] = useState('')
    const [tokenReason, setTokenReason] = useState('')
    const [tokenSaving, setTokenSaving] = useState(false)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    // Check admin access
    useEffect(() => {
        if (!user) return
        if (!user.role_admin && user.role !== 'admin') {
            navigate('/dashboard')
        }
    }, [user, navigate])

    const loadStats = async () => {
        setLoading(true)
        try { setStats(await adminAPI.getStats()) } catch (e) { showToast(e.message, 'error') }
        setLoading(false)
    }

    const loadUsers = async (p = 1) => {
        setLoading(true)
        try {
            const d = await adminAPI.getUsers({ search, plan: planFilter, page: p, limit: 25 })
            setUsers(d.users || [])
            setUserTotal(d.total || 0)
            setPage(p)
        } catch (e) { showToast(e.message, 'error') }
        setLoading(false)
    }

    const loadAds = async () => {
        setLoading(true)
        try { const d = await adminAPI.getAds(); setAds(d.ads || []) } catch (e) { showToast(e.message, 'error') }
        setLoading(false)
    }

    useEffect(() => {
        if (tab === 'stats') loadStats()
        else if (tab === 'users') loadUsers(1)
        else if (tab === 'ads') loadAds()
    }, [tab])

    useEffect(() => {
        if (tab === 'users') loadUsers(1)
    }, [search, planFilter])

    // ── Ad CRUD ───────────────────────────────────────────────
    const openAdModal = (ad = null) => {
        setEditingAd(ad)
        setAdForm(ad ? { title: ad.title, type: ad.type, url: ad.url, thumbnail_url: ad.thumbnail_url || '', duration: ad.duration, tokens_reward: ad.tokens_reward, link_url: ad.link_url || '' } : { title: '', type: 'youtube', url: '', thumbnail_url: '', duration: 15, tokens_reward: 5, link_url: '' })
        setAdModal(true)
    }

    const handleSaveAd = async (e) => {
        e.preventDefault()
        setAdSaving(true)
        try {
            if (editingAd) {
                const d = await adminAPI.updateAd(editingAd.id, adForm)
                setAds(d.ads)
                showToast(L('Реклама обновлена', 'Жарнама жаңартылды'))
            } else {
                const d = await adminAPI.createAd(adForm)
                setAds(d.ads)
                showToast(L('Реклама создана', 'Жарнама жасалды'))
            }
            setAdModal(false)
        } catch (e) { showToast(e.message, 'error') }
        setAdSaving(false)
    }

    const handleDeleteAd = async (id) => {
        if (!window.confirm(L('Удалить рекламу?', 'Жарнаманы жою?'))) return
        await adminAPI.deleteAd(id)
        setAds(prev => prev.filter(a => a.id !== id))
        showToast(L('Удалено', 'Жойылды'))
    }

    const handleToggleAd = async (id) => {
        const d = await adminAPI.toggleAd(id)
        setAds(prev => prev.map(a => a.id === id ? { ...a, is_active: d.is_active } : a))
    }

    // ── Token adjustment ──────────────────────────────────────
    const handleAdjustTokens = async (e) => {
        e.preventDefault()
        if (!tokenAmount) return
        setTokenSaving(true)
        try {
            const d = await adminAPI.adjustTokens(tokenModal.id, parseInt(tokenAmount), tokenReason)
            setUsers(prev => prev.map(u => u.id === tokenModal.id ? { ...u, token_balance: d.new_balance } : u))
            showToast(L(`Баланс обновлён: ${d.new_balance} токенов`, `Баланс: ${d.new_balance} токен`))
            setTokenModal(null); setTokenAmount(''); setTokenReason('')
        } catch (e) { showToast(e.message, 'error') }
        setTokenSaving(false)
    }

    const handleChangePlan = async (userId, plan) => {
        await adminAPI.changePlan(userId, plan)
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, plan } : u))
        showToast(L('План изменён', 'Жоспар өзгертілді'))
    }

    const handleBlock = async (userId, block) => {
        await adminAPI.blockUser(userId, block)
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: block ? 0 : 1 } : u))
        showToast(block ? L('Заблокирован', 'Бұғатталды') : L('Разблокирован', 'Бұғатынан шығарылды'))
    }

    const TABS = [
        { id: 'stats', icon: <BarChart2 size={16} />, l: L('Статистика', 'Статистика') },
        { id: 'users', icon: <Users size={16} />, l: L('Пользователи', 'Пайдаланушылар') },
        { id: 'ads', icon: <Play size={16} />, l: L('Реклама', 'Жарнама') },
    ]

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
            <style>{`@keyframes slideIn{from{transform:translateX(20px);opacity:0}to{transform:translateX(0);opacity:1}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
            <Toast toast={toast} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
                <div style={{ width: 44, height: 44, borderRadius: 13, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={24} color="white" />
                </div>
                <div>
                    <h1 style={{ margin: '0 0 2px', fontWeight: 900, fontSize: '1.5rem', color: '#111827' }}>{L('Панель администратора', 'Əкімші панелі')}</h1>
                    <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.82rem' }}>{user?.email}</p>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', background: '#f4f4f5', borderRadius: 11, padding: 3, marginBottom: 24, width: 'fit-content', gap: 2 }}>
                {TABS.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px', border: 'none', borderRadius: 9, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: tab === t.id ? 'white' : 'transparent', color: tab === t.id ? '#111827' : '#9ca3af', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.12s' }}>
                        {t.icon} {t.l}
                    </button>
                ))}
            </div>

            {/* ══ STATS TAB ══ */}
            {tab === 'stats' && (
                loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} /></div> :
                stats && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 28 }}>
                            <StatCard icon={<Users size={20} />} value={stats.users.total} label={L('Всего учителей', 'Барлық мұғалімдер')} color="#6366f1" bg="#eff6ff" />
                            <StatCard icon={<Users size={20} />} value={stats.users.new_this_week} label={L('Новых за неделю', 'Апталық жаңа')} color="#10b981" bg="#f0fdf4" />
                            <StatCard icon={<Coins size={20} />} value={stats.tokens.total_in_circulation} label={L('Токенов в обороте', 'Айналымдағы токен')} color="#f59e0b" bg="#fffbeb" />
                            <StatCard icon={<Eye size={20} />} value={stats.ads.total_views} label={L('Просмотров рекламы', 'Жарнама қаралымы')} color="#8b5cf6" bg="#f5f3ff" />
                            <StatCard icon={<TrendingUp size={20} />} value={`${stats.revenue.total_kzt?.toLocaleString('ru-RU') || 0} ₸`} label={L('Выручка', 'Табыс')} color="#06b6d4" bg="#ecfeff" />
                        </div>

                        {/* Plans breakdown */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                            <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '1rem' }}>{L('Тарифы', 'Тарифтер')}</h3>
                                {Object.entries(stats.users.by_plan || {}).map(([plan, count]) => (
                                    <div key={plan} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <span style={{ fontWeight: 600, textTransform: 'capitalize', color: '#374151' }}>{plan}</span>
                                        <span style={{ fontWeight: 800, color: '#6366f1' }}>{count}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #f1f5f9' }}>
                                <h3 style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '1rem' }}>{L('Топ по токенам', 'Токен бойынша топ')}</h3>
                                {(stats.top_tokens || []).map((u, i) => (
                                    <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                                        </div>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', fontWeight: 800, color: '#f59e0b' }}>
                                            <Coins size={13} />{(u.token_balance || 0).toLocaleString('ru-RU')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent transactions */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '20px 24px', border: '1px solid #f1f5f9' }}>
                            <h3 style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '1rem' }}>{L('Последние транзакции', 'Соңғы транзакциялар')}</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            {['Пользователь', 'Сумма', 'Тип', 'Время'].map(h => (
                                                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#6b7280', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(stats.recent_transactions || []).map(tx => (
                                            <tr key={tx.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{tx.name}</td>
                                                <td style={{ padding: '8px 12px', fontWeight: 700, color: tx.amount > 0 ? '#10b981' : '#ef4444' }}>
                                                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                                                </td>
                                                <td style={{ padding: '8px 12px', color: '#6b7280' }}>{tx.type}</td>
                                                <td style={{ padding: '8px 12px', color: '#9ca3af' }}>{new Date(tx.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )
            )}

            {/* ══ USERS TAB ══ */}
            {tab === 'users' && (
                <div>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 220, maxWidth: 320 }}>
                            <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input value={search} onChange={e => setSearch(e.target.value)} placeholder={L('Поиск по имени, email...', 'Іздеу...')}
                                style={{ width: '100%', padding: '9px 12px 9px 30px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', background: 'white', boxSizing: 'border-box' }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                        </div>
                        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', background: 'white' }}>
                            <option value="">{L('Все тарифы', 'Барлық тариф')}</option>
                            {['free', 'pro', 'premium', 'school'].map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                        <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>{L(`Найдено: ${userTotal}`, `Табылды: ${userTotal}`)}</span>
                    </div>

                    {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} /></div> : (
                        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                                    <thead>
                                        <tr style={{ background: '#f9fafb' }}>
                                            {['#', L('Имя', 'Аты'), 'Email', L('Тариф', 'Тариф'), L('Токены', 'Токен'), L('Кредиты', 'Кредит'), L('Статус', 'Статус'), L('Действия', 'Əрекет')].map(h => (
                                                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#6b7280', borderBottom: '2px solid #e5e7eb', whiteSpace: 'nowrap', fontSize: '0.78rem' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u, i) => (
                                            <tr key={u.id} style={{ borderBottom: '1px solid #f3f4f6', background: u.is_active ? 'transparent' : '#fef2f2' }}>
                                                <td style={{ padding: '10px 14px', color: '#9ca3af', fontWeight: 600 }}>{u.id}</td>
                                                <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                                                    {u.name}
                                                    {u.role_admin ? <span style={{ marginLeft: 6, background: '#ede9fe', color: '#7c3aed', fontSize: '0.65rem', fontWeight: 800, padding: '1px 6px', borderRadius: 20 }}>ADMIN</span> : null}
                                                </td>
                                                <td style={{ padding: '10px 14px', color: '#6b7280', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    {!u.role_admin ? (
                                                        <select value={u.plan || 'free'} onChange={e => handleChangePlan(u.id, e.target.value)}
                                                            style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: '0.78rem', background: 'white' }}>
                                                            {['free', 'pro', 'premium', 'school'].map(p => <option key={p} value={p}>{p}</option>)}
                                                        </select>
                                                    ) : <span style={{ color: '#7c3aed', fontWeight: 700 }}>admin</span>}
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <button onClick={() => setTokenModal(u)} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, color: '#92400e', fontSize: '0.78rem' }}>
                                                        <Coins size={12} color="#f59e0b" /> {(u.token_balance || 0).toLocaleString('ru-RU')}
                                                    </button>
                                                </td>
                                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#6b7280' }}>{u.credits}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <span style={{ background: u.is_active ? '#dcfce7' : '#fee2e2', color: u.is_active ? '#15803d' : '#dc2626', padding: '3px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700 }}>
                                                        {u.is_active ? L('Активен', 'Белсенді') : L('Заблок.', 'Бұғатталған')}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    {!u.role_admin && (
                                                        <button onClick={() => handleBlock(u.id, !!u.is_active)} style={{ padding: '5px 10px', border: '1px solid #e5e7eb', borderRadius: 7, background: 'white', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, color: u.is_active ? '#ef4444' : '#10b981' }}>
                                                            {u.is_active ? L('Блок', 'Бұғат') : L('Разблок', 'Ашу')}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Pagination */}
                    {userTotal > 25 && (
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 16 }}>
                            {Array.from({ length: Math.min(5, Math.ceil(userTotal / 25)) }, (_, i) => i + 1).map(p => (
                                <button key={p} onClick={() => loadUsers(p)} style={{ width: 34, height: 34, border: `1px solid ${p === page ? '#6366f1' : '#e5e7eb'}`, borderRadius: 8, fontWeight: p === page ? 700 : 400, cursor: 'pointer', background: p === page ? '#eff6ff' : 'white', color: p === page ? '#4f46e5' : '#374151', fontSize: '0.875rem' }}>{p}</button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ ADS TAB ══ */}
            {tab === 'ads' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div>
                            <h3 style={{ margin: '0 0 3px', fontWeight: 800 }}>{L('Управление рекламой', 'Жарнаманы басқару')}</h3>
                            <p style={{ margin: 0, fontSize: '0.82rem', color: '#9ca3af' }}>
                                {L('Учителя видят рекламу и получают токены за просмотр', 'Мұғалімдер жарнама қарап токен алады')}
                            </p>
                        </div>
                        <button onClick={() => openAdModal()} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 11, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                            <Plus size={16} /> {L('Добавить рекламу', 'Жарнама қосу')}
                        </button>
                    </div>

                    {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={36} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} /></div> :
                    ads.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16, border: '1px solid #e5e7eb' }}>
                            <Play size={44} color="#d1d5db" style={{ marginBottom: 12 }} />
                            <h3 style={{ margin: '0 0 6px', color: '#374151' }}>{L('Рекламы нет', 'Жарнама жоқ')}</h3>
                            <p style={{ margin: '0 0 18px', fontSize: '0.875rem', color: '#9ca3af' }}>{L('Добавьте первую рекламу', 'Бірінші жарнаманы қосыңыз')}</p>
                            <button onClick={() => openAdModal()} style={{ padding: '10px 22px', background: '#6366f1', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>+ {L('Добавить', 'Қосу')}</button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                            {ads.map(ad => (
                                <div key={ad.id} style={{ background: 'white', borderRadius: 16, border: `1px solid ${ad.is_active ? '#e5e7eb' : '#fee2e2'}`, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    {/* Preview */}
                                    <div style={{ height: 120, background: ad.thumbnail_url ? `url(${ad.thumbnail_url}) center/cover` : 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                        {!ad.thumbnail_url && <Play size={32} color="rgba(255,255,255,0.8)" />}
                                        <div style={{ position: 'absolute', top: 8, right: 8, background: ad.is_active ? '#10b981' : '#ef4444', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800 }}>
                                            {ad.is_active ? L('Активна', 'Белсенді') : L('Отключена', 'Өшірілген')}
                                        </div>
                                        <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: 20, padding: '2px 8px', fontSize: '0.68rem', fontWeight: 700 }}>
                                            {AD_TYPES.find(t => t.v === ad.type)?.l || ad.type}
                                        </div>
                                    </div>
                                    <div style={{ padding: '14px 16px' }}>
                                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</div>
                                        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#6b7280' }}><Eye size={12} /> {ad.views_count || 0} {L('просм.', 'қаралым')}</span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}><Coins size={12} /> +{ad.tokens_reward} {L('токенов', 'токен')}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{ad.duration}s</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => handleToggleAd(ad.id)} style={{ flex: 1, padding: '7px', border: `1px solid ${ad.is_active ? '#fca5a5' : '#bbf7d0'}`, borderRadius: 9, background: ad.is_active ? '#fef2f2' : '#f0fdf4', color: ad.is_active ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                                {ad.is_active ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                                                {ad.is_active ? L('Откл.', 'Өшіру') : L('Вкл.', 'Қосу')}
                                            </button>
                                            <button onClick={() => openAdModal(ad)} style={{ padding: '7px 12px', border: '1px solid #e5e7eb', borderRadius: 9, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#6b7280' }}>
                                                <Edit3 size={14} />
                                            </button>
                                            <button onClick={() => handleDeleteAd(ad.id)} style={{ padding: '7px 12px', border: 'none', borderRadius: 9, background: '#fef2f2', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#ef4444' }}>
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ══ AD MODAL ══ */}
            {adModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
                    onClick={() => setAdModal(false)}>
                    <div style={{ background: 'white', borderRadius: 20, maxWidth: 520, width: '100%', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>{editingAd ? L('Редактировать рекламу', 'Жарнаманы өзгерту') : L('Добавить рекламу', 'Жарнама қосу')}</h3>
                            <button onClick={() => setAdModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
                        </div>
                        <form onSubmit={handleSaveAd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {[
                                { key: 'title', label: L('Название *', 'Атауы *'), placeholder: L('Рекламодатель — Продукт', 'Жарнамашы — Өнім'), type: 'text', required: true },
                            ].map(f => (
                                <div key={f.key}>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5, color: '#374151' }}>{f.label}</label>
                                    <input required={f.required} type={f.type} value={adForm[f.key]} onChange={e => setAdForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                </div>
                            ))}
                            {/* Type selector */}
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 8, color: '#374151' }}>{L('Тип рекламы', 'Жарнама түрі')}</label>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {AD_TYPES.map(t => (
                                        <button key={t.v} type="button" onClick={() => setAdForm(p => ({ ...p, type: t.v }))} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', border: `1.5px solid ${adForm.type === t.v ? '#6366f1' : '#e5e7eb'}`, borderRadius: 9, background: adForm.type === t.v ? '#eff6ff' : 'white', color: adForm.type === t.v ? '#4f46e5' : '#6b7280', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
                                            {t.icon} {t.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* URL */}
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5, color: '#374151' }}>
                                    {adForm.type === 'youtube' ? 'YouTube URL *' : adForm.type === 'video' ? 'Видео URL (MP4) *' : 'Изображение URL *'}
                                </label>
                                <input required value={adForm.url} onChange={e => setAdForm(p => ({ ...p, url: e.target.value }))}
                                    placeholder={adForm.type === 'youtube' ? 'https://youtube.com/watch?v=...' : adForm.type === 'video' ? 'https://example.com/ad.mp4' : 'https://example.com/banner.jpg'}
                                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                            </div>
                            {/* Thumbnail (for youtube/video) */}
                            {(adForm.type === 'youtube' || adForm.type === 'video') && (
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5, color: '#374151' }}>
                                        {L('Превью изображение (URL)', 'Алдын ала қарау суреті (URL)')}
                                    </label>
                                    <input value={adForm.thumbnail_url} onChange={e => setAdForm(p => ({ ...p, thumbnail_url: e.target.value }))}
                                        placeholder="https://example.com/thumbnail.jpg"
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                                        onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                                </div>
                            )}
                            {/* Click-through URL */}
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5, color: '#374151' }}>
                                    {L('Ссылка при клике (необязательно)', 'Сілтеме (міндетті емес)')}
                                </label>
                                <input value={adForm.link_url} onChange={e => setAdForm(p => ({ ...p, link_url: e.target.value }))}
                                    placeholder="https://advertiser.com"
                                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={e => e.target.style.borderColor = '#6366f1'} onBlur={e => e.target.style.borderColor = '#e5e7eb'} />
                            </div>
                            {/* Duration + Tokens */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5, color: '#374151' }}>
                                        {L('Длительность (сек)', 'Ұзақтығы (сек)')}
                                    </label>
                                    <input type="number" min={5} max={120} value={adForm.duration} onChange={e => setAdForm(p => ({ ...p, duration: parseInt(e.target.value) || 15 }))}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5, color: '#374151' }}>
                                        {L('Токенов за просмотр', 'Қараудан токен')}
                                    </label>
                                    <input type="number" min={1} max={100} value={adForm.tokens_reward} onChange={e => setAdForm(p => ({ ...p, tokens_reward: parseInt(e.target.value) || 5 }))}
                                        style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                                <button type="button" onClick={() => setAdModal(false)} style={{ flex: 1, padding: '11px', border: '1px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontWeight: 600 }}>{L('Отмена', 'Болдырмау')}</button>
                                <button type="submit" disabled={adSaving} style={{ flex: 2, padding: '11px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, opacity: adSaving ? 0.7 : 1 }}>
                                    {adSaving ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : null}
                                    {editingAd ? L('Сохранить', 'Сақтау') : L('Создать', 'Жасау')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ══ TOKEN MODAL ══ */}
            {tokenModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
                    onClick={() => setTokenModal(null)}>
                    <div style={{ background: 'white', borderRadius: 20, maxWidth: 400, width: '100%', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
                        onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontWeight: 800 }}>{L('Токены', 'Токендер')}: {tokenModal.name}</h3>
                            <button onClick={() => setTokenModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
                        </div>
                        <p style={{ margin: '0 0 16px', color: '#6b7280', fontSize: '0.875rem' }}>
                            {L('Текущий баланс:', 'Ағымдағы баланс:')} <strong>{(tokenModal.token_balance || 0).toLocaleString('ru-RU')} {L('токенов', 'токен')}</strong>
                        </p>
                        <form onSubmit={handleAdjustTokens} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5 }}>
                                    {L('Сумма (+/-)', 'Сома (+/-)')}
                                </label>
                                <input type="number" value={tokenAmount} onChange={e => setTokenAmount(e.target.value)} required
                                    placeholder="+500 или -100"
                                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 5 }}>
                                    {L('Причина', 'Себеп')}
                                </label>
                                <input value={tokenReason} onChange={e => setTokenReason(e.target.value)}
                                    placeholder={L('Бонус / коррекция...', 'Бонус / түзету...')}
                                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e7eb', borderRadius: 9, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="button" onClick={() => setTokenModal(null)} style={{ flex: 1, padding: '10px', border: '1px solid #e5e7eb', borderRadius: 10, background: 'white', cursor: 'pointer', fontWeight: 600 }}>{L('Отмена', 'Болдырмау')}</button>
                                <button type="submit" disabled={tokenSaving} style={{ flex: 2, padding: '10px', border: 'none', borderRadius: 10, background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: 'white', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                                    {tokenSaving ? <Loader2 size={15} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Coins size={15} />}
                                    {L('Применить', 'Қолдану')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
