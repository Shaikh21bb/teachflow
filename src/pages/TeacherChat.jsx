import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { chatAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
    Send, Search, ArrowLeft, MessageSquare, Users,
    CheckCheck, Check, Loader2, X, User
} from 'lucide-react'

// ── Helpers ──────────────────────────────────────────────────
function timeAgo(dateStr, lang = 'ru') {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    if (mins < 1) return lang === 'kk' ? 'қазір' : 'только что'
    if (mins < 60) return lang === 'kk' ? `${mins} мин` : `${mins} мин`
    if (hours < 24) return lang === 'kk' ? `${hours} сағ` : `${hours} ч`
    if (days < 7) return lang === 'kk' ? `${days} күн` : `${days} дн`
    return new Date(dateStr).toLocaleDateString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'short' })
}

function fullTime(dateStr, lang = 'ru') {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString(lang === 'kk' ? 'kk-KZ' : 'ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function Avatar({ src, name, size = 40, style = {} }) {
    const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6']
    const color = colors[(name?.charCodeAt(0) || 0) % colors.length]
    return src ? (
        <img src={src} alt={name} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, ...style }} />
    ) : (
        <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: size * 0.36, flexShrink: 0, ...style }}>
            {initials}
        </div>
    )
}

export default function TeacherChat() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const [searchParams, setSearchParams] = useSearchParams()
    const navigate = useNavigate()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [conversations, setConversations] = useState([])
    const [activeConvId, setActiveConvId] = useState(null)
    const [messages, setMessages] = useState([])
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [msgLoading, setMsgLoading] = useState(false)
    const [sending, setSending] = useState(false)
    const [search, setSearch] = useState('')
    const [showSidebar, setShowSidebar] = useState(true)

    const messagesEndRef = useRef(null)
    const pollRef = useRef(null)
    const inputRef = useRef(null)
    const activeConvRef = useRef(null)
    activeConvRef.current = activeConvId

    // ── Load conversations ─────────────────────────────────
    const loadConversations = useCallback(async () => {
        try {
            const data = await chatAPI.getConversations()
            setConversations(data.conversations || [])
        } catch { /* silent */ }
    }, [])

    useEffect(() => {
        loadConversations().then(() => setLoading(false))
        // Poll for new messages every 3s
        pollRef.current = setInterval(async () => {
            await loadConversations()
            if (activeConvRef.current) {
                try {
                    const data = await chatAPI.getMessages(activeConvRef.current)
                    setMessages(data.messages || [])
                } catch { /* silent */ }
            }
        }, 3000)
        return () => clearInterval(pollRef.current)
    }, [loadConversations])

    // ── Open conversation from ?with= query param ──────────
    useEffect(() => {
        const withId = searchParams.get('with')
        if (withId) {
            openConversationWith(parseInt(withId))
        }
    }, [])

    const openConversationWith = async (userId) => {
        try {
            const data = await chatAPI.openConversation(userId)
            const convId = data.conversation.id
            setConversations(prev => {
                const exists = prev.find(c => c.id === convId)
                if (exists) return prev
                return [data.conversation, ...prev]
            })
            await openConversation(convId)
            // Remove ?with= from URL
            setSearchParams({})
        } catch (err) {
            console.error('Open conversation error:', err.message)
        }
    }

    const openConversation = async (convId) => {
        setActiveConvId(convId)
        setMsgLoading(true)
        if (window.innerWidth < 768) setShowSidebar(false)
        try {
            const data = await chatAPI.getMessages(convId)
            setMessages(data.messages || [])
            // Mark as read
            chatAPI.markRead(convId).catch(() => {})
            setConversations(prev => prev.map(c =>
                c.id === convId ? { ...c, unread_count: 0 } : c
            ))
        } catch { /* silent */ }
        setMsgLoading(false)
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
        setTimeout(() => inputRef.current?.focus(), 150)
    }

    const sendMessage = async (e) => {
        e?.preventDefault()
        if (!text.trim() || !activeConvId || sending) return
        const msgText = text.trim()
        setText('')
        setSending(true)
        // Optimistic UI
        const tempMsg = { id: `temp_${Date.now()}`, conversation_id: activeConvId, sender_id: user.id, text: msgText, is_read: 0, created_at: new Date().toISOString(), _temp: true }
        setMessages(prev => [...prev, tempMsg])
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
        try {
            const data = await chatAPI.sendMessage(activeConvId, msgText)
            setMessages(prev => prev.map(m => m._temp ? data.message : m))
            // Update conversation preview
            setConversations(prev => prev.map(c =>
                c.id === activeConvId ? { ...c, last_message: data.message, last_message_at: data.message.created_at } : c
            ).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at)))
        } catch { /* silent — temp message stays */ }
        setSending(false)
        inputRef.current?.focus()
    }

    const activeConv = conversations.find(c => c.id === activeConvId)
    const filteredConvs = conversations.filter(c =>
        !search || c.partner?.name?.toLowerCase().includes(search.toLowerCase())
    )
    const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0)

    // ── Group messages by date ────────────────────────────────
    function groupByDate(msgs) {
        const groups = []
        let lastDate = null
        msgs.forEach(msg => {
            const d = new Date(msg.created_at).toLocaleDateString(language === 'kk' ? 'kk-KZ' : 'ru-RU', { day: 'numeric', month: 'long' })
            if (d !== lastDate) { groups.push({ type: 'date', label: d }); lastDate = d }
            groups.push({ type: 'msg', msg })
        })
        return groups
    }

    return (
        <div style={{
            display: 'flex', height: 'calc(100vh - 64px)',
            background: 'var(--color-bg, #f8fafc)',
            borderRadius: '16px', overflow: 'hidden',
            boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
            border: '1px solid var(--color-gray-100, #f1f5f9)'
        }}>

            {/* ══ SIDEBAR ══════════════════════════════════════ */}
            {(showSidebar || !activeConvId) && (
                <div style={{
                    width: '320px', flexShrink: 0,
                    display: 'flex', flexDirection: 'column',
                    background: 'var(--color-white, white)',
                    borderRight: '1px solid var(--color-gray-100, #f1f5f9)'
                }}>
                    {/* Header */}
                    <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--color-gray-100)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <MessageSquare size={22} color="var(--color-primary-600, #4f46e5)" />
                                <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                                    {L('Чаты', 'Чаттар')}
                                </h2>
                                {totalUnread > 0 && (
                                    <span style={{ background: '#ef4444', color: 'white', borderRadius: '20px', padding: '1px 7px', fontSize: '0.72rem', fontWeight: 700 }}>
                                        {totalUnread}
                                    </span>
                                )}
                            </div>
                            <Link to="/profile?tab=colleagues" style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                                <Users size={15} /> {L('Коллеги', 'Әріптестер')}
                            </Link>
                        </div>
                        {/* Search */}
                        <div style={{ position: 'relative' }}>
                            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={L('Поиск по именам...', 'Атпен іздеу...')}
                                style={{
                                    width: '100%', padding: '8px 10px 8px 32px',
                                    border: '1px solid var(--color-gray-200, #e5e7eb)',
                                    borderRadius: '10px', fontSize: '0.85rem',
                                    background: 'var(--color-gray-50, #f9fafb)',
                                    outline: 'none', boxSizing: 'border-box',
                                    color: 'var(--color-gray-900)'
                                }}
                            />
                        </div>
                    </div>

                    {/* Conversation list */}
                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                <Loader2 size={28} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                            </div>
                        ) : filteredConvs.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--color-gray-400)' }}>
                                <MessageSquare size={44} color="#d1d5db" style={{ marginBottom: '12px' }} />
                                <p style={{ fontWeight: 600, margin: '0 0 4px' }}>
                                    {search ? L('Ничего не найдено', 'Ештеңе табылмады') : L('Нет диалогов', 'Хабарламалар жоқ')}
                                </p>
                                <p style={{ fontSize: '0.8rem', margin: 0 }}>
                                    {!search && L('Напишите коллеге со страницы профиля', 'Профиль бетінен əріптеске жазыңыз')}
                                </p>
                            </div>
                        ) : filteredConvs.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => openConversation(conv.id)}
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                    padding: '12px 16px', border: 'none', textAlign: 'left',
                                    background: activeConvId === conv.id ? 'var(--color-primary-50, #eef2ff)' : 'transparent',
                                    borderLeft: activeConvId === conv.id ? '3px solid #6366f1' : '3px solid transparent',
                                    cursor: 'pointer', transition: 'all 0.15s'
                                }}
                                onMouseEnter={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = 'var(--color-gray-50, #f9fafb)' }}
                                onMouseLeave={e => { if (activeConvId !== conv.id) e.currentTarget.style.background = 'transparent' }}
                            >
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <Avatar src={conv.partner?.avatar_url} name={conv.partner?.name} size={44} />
                                    {conv.unread_count > 0 && (
                                        <span style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, border: '2px solid white' }}>
                                            {conv.unread_count > 9 ? '9+' : conv.unread_count}
                                        </span>
                                    )}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                        <span style={{ fontWeight: conv.unread_count > 0 ? 800 : 600, fontSize: '0.9rem', color: 'var(--color-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                                            {conv.partner?.name || L('Учитель', 'Мұғалім')}
                                        </span>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', flexShrink: 0, marginLeft: '4px' }}>
                                            {timeAgo(conv.last_message_at, language)}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {conv.last_message?.sender_id === user?.id && (
                                            <CheckCheck size={13} color={conv.last_message?.is_read ? '#6366f1' : '#9ca3af'} style={{ flexShrink: 0 }} />
                                        )}
                                        <span style={{ fontSize: '0.8rem', color: conv.unread_count > 0 ? 'var(--color-gray-700)' : 'var(--color-gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: conv.unread_count > 0 ? 600 : 400 }}>
                                            {conv.last_message?.text || L('Начните переписку', 'Хат жазуды бастаңыз')}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ══ CHAT AREA ════════════════════════════════════ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: 'var(--color-bg, #f8fafc)' }}>

                {activeConvId && activeConv ? (
                    <>
                        {/* Chat header */}
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            padding: '14px 20px',
                            background: 'var(--color-white, white)',
                            borderBottom: '1px solid var(--color-gray-100)',
                            flexShrink: 0
                        }}>
                            {/* Back button (mobile) */}
                            <button onClick={() => { setShowSidebar(true); setActiveConvId(null) }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-gray-500)', padding: '4px', borderRadius: '8px' }}>
                                <ArrowLeft size={20} />
                            </button>
                            <Link to={`/teachers/${activeConv.partner?.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', flex: 1, minWidth: 0 }}>
                                <Avatar src={activeConv.partner?.avatar_url} name={activeConv.partner?.name} size={38} />
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-gray-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {activeConv.partner?.name}
                                    </div>
                                    {(activeConv.partner?.school || activeConv.partner?.city) && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {[activeConv.partner.school, activeConv.partner.city].filter(Boolean).join(' · ')}
                                        </div>
                                    )}
                                </div>
                            </Link>
                            <Link to={`/teachers/${activeConv.partner?.id}`} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600, flexShrink: 0 }}>
                                <User size={14} /> {L('Профиль', 'Профиль')}
                            </Link>
                        </div>

                        {/* Messages area */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {msgLoading ? (
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <Loader2 size={32} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                                </div>
                            ) : messages.length === 0 ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gray-400)', gap: '12px' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <MessageSquare size={28} color="#d1d5db" />
                                    </div>
                                    <p style={{ fontWeight: 600, margin: 0 }}>{L('Начните переписку!', 'Хат жазуды бастаңыз!')}</p>
                                    <p style={{ fontSize: '0.82rem', margin: 0 }}>{L('Напишите первое сообщение', 'Алғашқы хабарламаны жіберіңіз')}</p>
                                </div>
                            ) : (
                                groupByDate(messages).map((item, idx) => {
                                    if (item.type === 'date') {
                                        return (
                                            <div key={`date_${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '16px 0 8px' }}>
                                                <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                                                <span style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.label}</span>
                                                <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                                            </div>
                                        )
                                    }
                                    const msg = item.msg
                                    const isMe = msg.sender_id === user?.id
                                    return (
                                        <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: '4px' }}>
                                            <div style={{
                                                maxWidth: '72%', padding: '10px 14px',
                                                borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                                background: isMe ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--color-white, white)',
                                                color: isMe ? 'white' : 'var(--color-gray-900)',
                                                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                                                border: isMe ? 'none' : '1px solid var(--color-gray-100)',
                                            }}>
                                                <p style={{ margin: '0 0 4px', fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                                                    {msg.text}
                                                </p>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                                                    <span style={{ fontSize: '0.68rem', color: isMe ? 'rgba(255,255,255,0.65)' : 'var(--color-gray-400)' }}>
                                                        {fullTime(msg.created_at, language)}
                                                    </span>
                                                    {isMe && !msg._temp && (
                                                        msg.is_read
                                                            ? <CheckCheck size={13} color="rgba(255,255,255,0.8)" />
                                                            : <Check size={13} color="rgba(255,255,255,0.5)" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input area */}
                        <form onSubmit={sendMessage} style={{
                            display: 'flex', gap: '10px', alignItems: 'flex-end',
                            padding: '12px 20px 16px',
                            background: 'var(--color-white, white)',
                            borderTop: '1px solid var(--color-gray-100)',
                            flexShrink: 0
                        }}>
                            <textarea
                                ref={inputRef}
                                value={text}
                                onChange={e => setText(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                                placeholder={L('Написать сообщение... (Enter — отправить)', 'Хабарлама жазу... (Enter — жіберу)')}
                                rows={1}
                                maxLength={4000}
                                style={{
                                    flex: 1, padding: '10px 14px',
                                    border: '1.5px solid var(--color-gray-200)',
                                    borderRadius: '14px', fontSize: '0.9rem',
                                    resize: 'none', outline: 'none',
                                    background: 'var(--color-gray-50, #f9fafb)',
                                    color: 'var(--color-gray-900)',
                                    fontFamily: 'inherit', lineHeight: 1.5,
                                    maxHeight: '120px', overflowY: 'auto',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = 'var(--color-gray-200)'}
                            />
                            <button type="submit" disabled={!text.trim() || sending} style={{
                                width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
                                background: text.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'var(--color-gray-200)',
                                border: 'none', cursor: text.trim() ? 'pointer' : 'default',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'all 0.2s', boxShadow: text.trim() ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                            }}>
                                {sending ? <Loader2 size={18} color="white" style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} color={text.trim() ? 'white' : '#9ca3af'} />}
                            </button>
                        </form>
                    </>
                ) : (
                    /* Empty state — no conversation selected */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: 'var(--color-gray-400)', padding: '40px' }}>
                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 32px rgba(99,102,241,0.25)' }}>
                            <MessageSquare size={36} color="white" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <h3 style={{ margin: '0 0 8px', color: 'var(--color-gray-700)', fontWeight: 800, fontSize: '1.2rem' }}>
                                {L('Выберите диалог', 'Сұхбатты таңдаңыз')}
                            </h3>
                            <p style={{ margin: '0 0 20px', fontSize: '0.9rem', maxWidth: '280px' }}>
                                {L('Откройте чат с коллегой или найдите нового учителя', 'Əріптеспен чат ашыңыз немесе жаңа мұғалімді табыңыз')}
                            </p>
                            <Link to="/profile?tab=colleagues" style={{
                                display: 'inline-flex', alignItems: 'center', gap: '8px',
                                padding: '10px 20px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                color: 'white', borderRadius: '12px', textDecoration: 'none',
                                fontWeight: 700, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                            }}>
                                <Users size={16} /> {L('Найти коллег', 'Əріптестерді табу')}
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
