import { useState, useEffect, useCallback } from 'react'
import { telegramAPI, integrationsAPI } from '../api'
import {
    Send, Users, Link2, Copy, CheckCircle, XCircle, MessageSquare,
    Loader2, RefreshCw, ChevronDown, ChevronRight, Bell, Bot,
    Smartphone, UserCheck, UserX, Zap, Info, Plus
} from 'lucide-react'

const TG_BLUE = '#0088cc'
const TG_LIGHT = '#e8f4fd'

export default function TelegramHub() {
    const [status, setStatus] = useState(null)
    const [loading, setLoading] = useState(true)
    const [selectedClass, setSelectedClass] = useState(null)
    const [students, setStudents] = useState([])
    const [studentsLoading, setStudentsLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [sendMode, setSendMode] = useState('class') // 'class' | 'student'
    const [selectedStudent, setSelectedStudent] = useState(null)
    const [sending, setSending] = useState(false)
    const [inviteLoading, setInviteLoading] = useState(false)
    const [toast, setToast] = useState(null)
    const [copiedCode, setCopiedCode] = useState(null)
    const [connectModal, setConnectModal] = useState(false)
    const [botToken, setBotToken] = useState('')
    const [chatId, setChatId] = useState('')
    const [connecting, setConnecting] = useState(false)

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const loadStatus = useCallback(async () => {
        setLoading(true)
        try {
            const data = await telegramAPI.getStatus()
            setStatus(data)
            if (data.classes?.length > 0 && !selectedClass) {
                setSelectedClass(data.classes[0])
            }
        } catch (e) {
            setStatus({ connected: false })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { loadStatus() }, [loadStatus])

    useEffect(() => {
        if (!selectedClass) return
        setStudentsLoading(true)
        telegramAPI.getClassStudents(selectedClass.id)
            .then(data => setStudents(data.students || []))
            .catch(() => setStudents([]))
            .finally(() => setStudentsLoading(false))
        setSelectedStudent(null)
        setMessage('')
    }, [selectedClass])

    const handleGenerateInvite = async (classId) => {
        setInviteLoading(classId)
        try {
            const data = await telegramAPI.generateInviteCode(classId)
            showToast('Сілтеме жасалды!')
            await loadStatus()
            if (selectedClass?.id === classId) {
                setSelectedClass(prev => ({ ...prev, telegram_invite_code: data.code }))
            }
        } catch (e) {
            showToast(e.message, 'error')
        } finally {
            setInviteLoading(false)
        }
    }

    const copyLink = (code, botName) => {
        const link = botName ? `https://t.me/${botName}?start=${code}` : code
        navigator.clipboard.writeText(link)
        setCopiedCode(code)
        showToast('Сілтеме көшірілді!')
        setTimeout(() => setCopiedCode(null), 2000)
    }

    const handleSend = async () => {
        if (!message.trim()) return showToast('Хабарлама жазыңыз', 'error')
        setSending(true)
        try {
            if (sendMode === 'class') {
                if (!selectedClass) return showToast('Сыныпты таңдаңыз', 'error')
                const res = await telegramAPI.sendToClass(selectedClass.id, message)
                showToast(`✅ ${res.sent} оқушыға жіберілді!`)
            } else {
                if (!selectedStudent) return showToast('Оқушыны таңдаңыз', 'error')
                await telegramAPI.sendToStudent(selectedStudent.id, message)
                showToast('✅ Жіберілді!')
            }
            setMessage('')
        } catch (e) {
            showToast(e.message, 'error')
        } finally {
            setSending(false)
        }
    }

    const handleConnect = async () => {
        if (!botToken.trim()) return showToast('Bot Token жазыңыз', 'error')
        setConnecting(true)
        try {
            const result = await integrationsAPI.connectTelegram({ bot_token: botToken, chat_id: chatId })
            showToast(result.message || 'Бот қосылды!')
            setConnectModal(false)
            setBotToken('')
            setChatId('')
            await loadStatus()
        } catch (e) {
            showToast(e.message, 'error')
        } finally {
            setConnecting(false)
        }
    }

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: TG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Loader2 size={28} color={TG_BLUE} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
            <p style={{ color: 'var(--color-gray-500)', margin: 0 }}>Жүктелуде...</p>
        </div>
    )

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }
                @keyframes fadeUp { from { transform: translateY(12px); opacity:0; } to { transform: translateY(0); opacity:1; } }
                .tg-class-card { transition: all 0.2s; cursor: pointer; }
                .tg-class-card:hover { transform: translateY(-2px); }
                .tg-student-row { transition: background 0.15s; cursor: pointer; }
                .tg-student-row:hover { background: var(--color-gray-50) !important; }
                .send-mode-btn { transition: all 0.2s; }
                .tg-copy-btn { transition: all 0.15s; }
                .tg-copy-btn:hover { transform: scale(1.05); }
            `}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: 80, right: 24, zIndex: 9999,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', padding: '12px 20px', borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontWeight: 500,
                    animation: 'slideIn 0.3s ease'
                }}>{toast.type === 'error' ? '❌ ' : '✅ '}{toast.msg}</div>
            )}

            {/* Connect Modal */}
            {connectModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: 16
                }}>
                    <div style={{ background: 'white', borderRadius: 24, padding: 36, maxWidth: 480, width: '100%', boxShadow: '0 24px 80px rgba(0,0,0,0.25)', animation: 'fadeUp 0.3s ease' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                            <div style={{ width: 52, height: 52, borderRadius: 16, background: TG_LIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
                                ✈️
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Telegram Bot қосу</h2>
                                <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '0.875rem' }}>@BotFather арқылы токен алыңыз</p>
                            </div>
                        </div>

                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0369a1', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Info size={14} /> Нұсқаулық:
                            </div>
                            {[
                                '1. Telegram-да @BotFather-ды ашыңыз',
                                '2. /newbot командасын жіберіңіз',
                                '3. Бот атауын және username-ін енгізіңіз',
                                '4. Берілген токенді төмендегі өріске қойыңыз',
                            ].map((step, i) => (
                                <p key={i} style={{ margin: '3px 0', fontSize: '0.82rem', color: '#0369a1' }}>{step}</p>
                            ))}
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>Bot Token *</label>
                            <input
                                value={botToken} onChange={e => setBotToken(e.target.value)}
                                placeholder="123456789:ABCdef..."
                                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }}
                            />
                        </div>
                        <div style={{ marginBottom: 24 }}>
                            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', marginBottom: 6 }}>
                                Сіздің Chat ID <span style={{ color: '#9ca3af', fontWeight: 400 }}>(хабарлама алу үшін)</span>
                            </label>
                            <input
                                value={chatId} onChange={e => setChatId(e.target.value)}
                                placeholder="@userinfobot арқылы алыңыз"
                                style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setConnectModal(false)} style={{ padding: '11px 20px', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
                                Болдырмау
                            </button>
                            <button onClick={handleConnect} disabled={connecting} style={{
                                flex: 1, padding: '11px', background: `linear-gradient(135deg, ${TG_BLUE}, #006aad)`,
                                color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem'
                            }}>
                                {connecting ? '⟳ Қосылуда...' : '✈️ Ботты қосу'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Header ── */}
            <div style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 56, height: 56, borderRadius: 18, background: TG_LIGHT,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem'
                        }}>✈️</div>
                        <div>
                            <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>
                                Telegram Hub
                            </h1>
                            <p style={{ margin: '2px 0 0', color: 'var(--color-gray-500)', fontSize: '0.95rem' }}>
                                Оқушыларға хабарлама жіберу және байланысу
                            </p>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={loadStatus} style={{
                            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px',
                            background: 'var(--color-gray-100)', border: 'none', borderRadius: 10,
                            cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-700)'
                        }}>
                            <RefreshCw size={15} /> Жаңарту
                        </button>
                        {!status?.connected && (
                            <button onClick={() => setConnectModal(true)} style={{
                                display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px',
                                background: `linear-gradient(135deg, ${TG_BLUE}, #006aad)`,
                                color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700
                            }}>
                                <Plus size={15} /> Бот қосу
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Not Connected Banner ── */}
            {!status?.connected && (
                <div style={{
                    background: 'linear-gradient(135deg, #0088cc15, #0088cc05)',
                    border: '2px dashed #0088cc40', borderRadius: 20,
                    padding: '48px 32px', textAlign: 'center', marginBottom: 32, animation: 'fadeUp 0.4s ease'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: 16 }}>✈️</div>
                    <h2 style={{ margin: '0 0 10px', color: 'var(--color-gray-900)' }}>Telegram боты жоқ</h2>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: 24, maxWidth: 480, margin: '0 auto 24px' }}>
                        Telegram ботын қосу арқылы оқушылармен тікелей байланысыңыз, сыныпқа хабарлама жіберіңіз
                    </p>
                    <button onClick={() => setConnectModal(true)} style={{
                        padding: '14px 32px', background: `linear-gradient(135deg, ${TG_BLUE}, #006aad)`,
                        color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer',
                        fontWeight: 700, fontSize: '1rem', boxShadow: `0 8px 24px ${TG_BLUE}40`
                    }}>
                        ✈️ Telegram ботын қосу
                    </button>
                </div>
            )}

            {status?.connected && (
                <>
                    {/* ── Bot Status Card ── */}
                    <div style={{
                        background: `linear-gradient(135deg, ${TG_BLUE} 0%, #006aad 100%)`,
                        borderRadius: 20, padding: '24px 28px', marginBottom: 28, color: 'white',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        flexWrap: 'wrap', gap: 16, animation: 'fadeUp 0.3s ease'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                            <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem' }}>
                                🤖
                            </div>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
                                        @{status.bot_name || 'Бот'}
                                    </h2>
                                    <span style={{ background: '#10b981', color: 'white', padding: '2px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 700 }}>
                                        ● Белсенді
                                    </span>
                                </div>
                                <p style={{ margin: '4px 0 0', opacity: 0.8, fontSize: '0.875rem' }}>
                                    {status.classes?.length || 0} сынып · {status.classes?.reduce((a, c) => a + (c.tg_students || 0), 0)} оқушы Telegram-да
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 24 }}>
                            {[
                                { label: 'Сыныптар', value: status.classes?.length || 0, icon: <Users size={18} /> },
                                { label: 'TG оқушылар', value: status.classes?.reduce((a, c) => a + (c.tg_students || 0), 0), icon: <Smartphone size={18} /> },
                                { label: 'Барлық оқушылар', value: status.classes?.reduce((a, c) => a + (c.total_students || 0), 0), icon: <UserCheck size={18} /> },
                            ].map(s => (
                                <div key={s.label} style={{ textAlign: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.7, fontSize: '0.8rem', marginBottom: 4, justifyContent: 'center' }}>
                                        {s.icon} {s.label}
                                    </div>
                                    <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{s.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 24, alignItems: 'start' }}>

                        {/* ── Left: Classes List ── */}
                        <div>
                            <h3 style={{ margin: '0 0 14px', fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-gray-700)' }}>
                                📚 Сыныптар
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {(status.classes || []).length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 16, color: 'var(--color-gray-400)' }}>
                                        <Users size={36} style={{ marginBottom: 8 }} />
                                        <p style={{ margin: 0 }}>Сыныптар жоқ</p>
                                    </div>
                                ) : (status.classes || []).map(cls => {
                                    const isSelected = selectedClass?.id === cls.id
                                    const tgPct = cls.total_students > 0 ? Math.round((cls.tg_students / cls.total_students) * 100) : 0
                                    return (
                                        <div
                                            key={cls.id}
                                            className="tg-class-card"
                                            onClick={() => setSelectedClass(cls)}
                                            style={{
                                                background: isSelected ? `linear-gradient(135deg, ${TG_BLUE}12, ${TG_BLUE}05)` : 'white',
                                                border: `2px solid ${isSelected ? TG_BLUE : 'var(--color-gray-100)'}`,
                                                borderRadius: 16, padding: '16px 18px',
                                                boxShadow: isSelected ? `0 4px 16px ${TG_BLUE}20` : '0 2px 8px rgba(0,0,0,0.04)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-gray-900)' }}>{cls.name}</div>
                                                    {cls.subject && (
                                                        <span style={{ fontSize: '0.75rem', color: TG_BLUE, background: TG_LIGHT, padding: '2px 8px', borderRadius: 20, fontWeight: 600 }}>
                                                            {cls.subject}
                                                        </span>
                                                    )}
                                                </div>
                                                {isSelected && <ChevronRight size={16} color={TG_BLUE} />}
                                            </div>

                                            {/* TG progress bar */}
                                            <div style={{ marginBottom: 10 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--color-gray-500)', marginBottom: 4 }}>
                                                    <span>Telegram қосылды</span>
                                                    <span style={{ fontWeight: 700, color: tgPct > 0 ? TG_BLUE : 'var(--color-gray-400)' }}>
                                                        {cls.tg_students}/{cls.total_students}
                                                    </span>
                                                </div>
                                                <div style={{ height: 6, background: 'var(--color-gray-100)', borderRadius: 99 }}>
                                                    <div style={{
                                                        height: '100%', borderRadius: 99,
                                                        background: `linear-gradient(90deg, ${TG_BLUE}, #34aee4)`,
                                                        width: `${tgPct}%`, transition: 'width 0.6s ease'
                                                    }} />
                                                </div>
                                            </div>

                                            {/* Invite code row */}
                                            {cls.telegram_invite_code ? (
                                                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <div style={{
                                                        flex: 1, background: 'var(--color-gray-50)', borderRadius: 8,
                                                        padding: '6px 10px', fontSize: '0.78rem', fontFamily: 'monospace',
                                                        color: 'var(--color-gray-700)', fontWeight: 600, letterSpacing: 1
                                                    }}>
                                                        {cls.telegram_invite_code}
                                                    </div>
                                                    <button
                                                        className="tg-copy-btn"
                                                        onClick={e => { e.stopPropagation(); copyLink(cls.telegram_invite_code, status.bot_name) }}
                                                        style={{
                                                            padding: '6px 10px', background: copiedCode === cls.telegram_invite_code ? '#10b981' : TG_BLUE,
                                                            border: 'none', borderRadius: 8, cursor: 'pointer', color: 'white'
                                                        }}
                                                        title="Сілтемені көшіру"
                                                    >
                                                        {copiedCode === cls.telegram_invite_code ? <CheckCircle size={14} /> : <Copy size={14} />}
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleGenerateInvite(cls.id) }}
                                                    disabled={inviteLoading === cls.id}
                                                    style={{
                                                        width: '100%', padding: '7px', background: TG_LIGHT,
                                                        border: `1px dashed ${TG_BLUE}60`, borderRadius: 8,
                                                        cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: TG_BLUE,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                    }}
                                                >
                                                    {inviteLoading === cls.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Link2 size={13} />}
                                                    Сілтеме жасау
                                                </button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* ── Right: Main Panel ── */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                            {/* How it works */}
                            {!selectedClass && (
                                <div style={{ background: 'white', borderRadius: 20, padding: '28px', border: '1px solid var(--color-gray-100)', animation: 'fadeUp 0.4s ease' }}>
                                    <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>⚡ Қалай жұмыс істейді?</h3>
                                    {[
                                        { icon: '1️⃣', title: 'Сілтеме жасаңыз', desc: 'Сол жақтан сынып таңдаңыз → "Сілтеме жасау" батырмасын басыңыз' },
                                        { icon: '2️⃣', title: 'Оқушыларға жіберіңіз', desc: 'Сілтемені оқушыларға WhatsApp, Telegram немесе email арқылы жіберіңіз' },
                                        { icon: '3️⃣', title: 'Оқушылар тіркеледі', desc: 'Оқушы сілтемені басып ботты іске қосады — автоматты тіркеледі!' },
                                        { icon: '4️⃣', title: 'Хабарлама жіберіңіз', desc: 'Барлық тіркелген оқушыларға бір дауыспен Telegram хабарламасы жетеді' },
                                    ].map((step, i) => (
                                        <div key={i} style={{ display: 'flex', gap: 14, marginBottom: i < 3 ? 16 : 0 }}>
                                            <div style={{ fontSize: '1.4rem', flexShrink: 0 }}>{step.icon}</div>
                                            <div>
                                                <div style={{ fontWeight: 700, marginBottom: 2 }}>{step.title}</div>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)' }}>{step.desc}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedClass && (
                                <>
                                    {/* Students list */}
                                    <div style={{ background: 'white', borderRadius: 20, padding: 24, border: '1px solid var(--color-gray-100)', animation: 'fadeUp 0.3s ease' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <Users size={18} color={TG_BLUE} />
                                                {selectedClass.name} — Оқушылар
                                            </h3>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)' }}>
                                                {students.filter(s => s.telegram_chat_id).length}/{students.length} Telegram
                                            </span>
                                        </div>

                                        {studentsLoading ? (
                                            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-gray-400)' }}>
                                                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
                                            </div>
                                        ) : students.length === 0 ? (
                                            <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--color-gray-400)' }}>
                                                <Users size={40} style={{ marginBottom: 10, opacity: 0.4 }} />
                                                <p style={{ margin: 0, fontSize: '0.9rem' }}>Оқушылар жоқ</p>
                                                <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>Алдымен Сыныптар бетінен оқушы қосыңыз</p>
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                                {students.map(student => {
                                                    const hasTg = !!student.telegram_chat_id
                                                    const isSelectedSt = selectedStudent?.id === student.id
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            className="tg-student-row"
                                                            onClick={() => {
                                                                if (hasTg) {
                                                                    setSelectedStudent(isSelectedSt ? null : student)
                                                                    setSendMode('student')
                                                                }
                                                            }}
                                                            style={{
                                                                display: 'flex', alignItems: 'center', gap: 12,
                                                                padding: '10px 12px', borderRadius: 12,
                                                                background: isSelectedSt ? `${TG_BLUE}10` : 'transparent',
                                                                border: isSelectedSt ? `1.5px solid ${TG_BLUE}40` : '1.5px solid transparent',
                                                                cursor: hasTg ? 'pointer' : 'default'
                                                            }}
                                                        >
                                                            <div style={{
                                                                width: 38, height: 38, borderRadius: '50%',
                                                                background: hasTg ? TG_LIGHT : 'var(--color-gray-100)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontWeight: 700, fontSize: '0.9rem',
                                                                color: hasTg ? TG_BLUE : 'var(--color-gray-400)', flexShrink: 0
                                                            }}>
                                                                {student.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-gray-900)' }}>{student.name}</div>
                                                                {student.telegram_username && (
                                                                    <div style={{ fontSize: '0.75rem', color: TG_BLUE }}>@{student.telegram_username}</div>
                                                                )}
                                                                {!hasTg && (
                                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)' }}>Telegram-да жоқ</div>
                                                                )}
                                                            </div>
                                                            <div style={{
                                                                width: 28, height: 28, borderRadius: '50%',
                                                                background: hasTg ? '#d1fae5' : 'var(--color-gray-100)',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                            }}>
                                                                {hasTg
                                                                    ? <CheckCircle size={14} color="#10b981" />
                                                                    : <XCircle size={14} color="#d1d5db" />
                                                                }
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Invite Link Card */}
                                    {selectedClass.telegram_invite_code && (
                                        <div style={{
                                            background: `linear-gradient(135deg, ${TG_LIGHT}, white)`,
                                            border: `1.5px solid ${TG_BLUE}30`, borderRadius: 20, padding: 20,
                                            animation: 'fadeUp 0.3s ease'
                                        }}>
                                            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: TG_BLUE }}>
                                                <Link2 size={16} /> Оқушыларға жіберетін сілтеме
                                            </div>
                                            <div style={{
                                                background: 'white', borderRadius: 12, padding: '12px 14px',
                                                fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--color-gray-700)',
                                                border: '1px solid var(--color-gray-200)', marginBottom: 10, wordBreak: 'break-all'
                                            }}>
                                                {status.bot_name
                                                    ? `https://t.me/${status.bot_name}?start=${selectedClass.telegram_invite_code}`
                                                    : selectedClass.telegram_invite_code
                                                }
                                            </div>
                                            <button
                                                onClick={() => copyLink(selectedClass.telegram_invite_code, status.bot_name)}
                                                style={{
                                                    width: '100%', padding: '10px', background: TG_BLUE,
                                                    color: 'white', border: 'none', borderRadius: 10,
                                                    cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
                                                }}
                                            >
                                                <Copy size={14} /> Сілтемені көшіру
                                            </button>
                                            <p style={{ margin: '10px 0 0', fontSize: '0.77rem', color: 'var(--color-gray-400)', textAlign: 'center' }}>
                                                Оқушы сілтемені басып ботқа /start жіберіп тіркеледі
                                            </p>
                                        </div>
                                    )}

                                    {/* Send Message Panel */}
                                    <div style={{ background: 'white', borderRadius: 20, padding: 24, border: '1px solid var(--color-gray-100)', animation: 'fadeUp 0.3s ease' }}>
                                        <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <Send size={17} color={TG_BLUE} /> Хабарлама жіберу
                                        </h3>

                                        {/* Mode toggle */}
                                        <div style={{ display: 'flex', background: 'var(--color-gray-100)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                                            {[
                                                { id: 'class', label: `📣 Бүкіл сынып (${students.filter(s => s.telegram_chat_id).length})` },
                                                { id: 'student', label: '👤 Жеке оқушы' }
                                            ].map(m => (
                                                <button key={m.id} onClick={() => setSendMode(m.id)}
                                                    className="send-mode-btn"
                                                    style={{
                                                        flex: 1, padding: '9px 12px', border: 'none', borderRadius: 9,
                                                        cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem',
                                                        background: sendMode === m.id ? 'white' : 'transparent',
                                                        color: sendMode === m.id ? TG_BLUE : 'var(--color-gray-500)',
                                                        boxShadow: sendMode === m.id ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                                                        transition: 'all 0.2s'
                                                    }}>
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* Student selector */}
                                        {sendMode === 'student' && (
                                            <div style={{ marginBottom: 14 }}>
                                                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 6, color: 'var(--color-gray-700)' }}>
                                                    Оқушы таңдаңыз:
                                                </label>
                                                <select
                                                    value={selectedStudent?.id || ''}
                                                    onChange={e => {
                                                        const s = students.find(st => st.id == e.target.value)
                                                        setSelectedStudent(s || null)
                                                    }}
                                                    style={{
                                                        width: '100%', padding: '10px 12px', borderRadius: 10,
                                                        border: '1.5px solid var(--color-gray-200)', fontSize: '0.875rem',
                                                        outline: 'none', background: 'white', color: 'var(--color-gray-900)'
                                                    }}
                                                >
                                                    <option value="">— Оқушы таңдаңыз —</option>
                                                    {students.filter(s => s.telegram_chat_id).map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}{s.telegram_username ? ` (@${s.telegram_username})` : ''}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        {/* Message input */}
                                        <div style={{ marginBottom: 14 }}>
                                            <label style={{ display: 'block', fontWeight: 600, fontSize: '0.82rem', marginBottom: 6, color: 'var(--color-gray-700)' }}>
                                                Хабарлама мәтіні:
                                            </label>
                                            <textarea
                                                value={message}
                                                onChange={e => setMessage(e.target.value)}
                                                placeholder="Мысалы: Ертең сабақ болмайды. Үй тапсырмасын орындап қойыңыздар 📚"
                                                rows={4}
                                                style={{
                                                    width: '100%', padding: '12px 14px', borderRadius: 10,
                                                    border: '1.5px solid var(--color-gray-200)', fontSize: '0.9rem',
                                                    outline: 'none', resize: 'vertical', fontFamily: 'inherit',
                                                    boxSizing: 'border-box', lineHeight: 1.6,
                                                    transition: 'border-color 0.2s'
                                                }}
                                                onFocus={e => e.target.style.borderColor = TG_BLUE}
                                                onBlur={e => e.target.style.borderColor = 'var(--color-gray-200)'}
                                            />
                                            <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: 4 }}>
                                                {message.length} символ
                                            </div>
                                        </div>

                                        {/* Quick templates */}
                                        <div style={{ marginBottom: 14 }}>
                                            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 6 }}>Жылдам үлгілер:</div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {[
                                                    '📚 Үй тапсырмасы бар',
                                                    '⏰ Ертең сабақ жоқ',
                                                    '📝 Бақылау жұмысы',
                                                    '🎉 Жақсы нәтиже!'
                                                ].map(t => (
                                                    <button key={t} onClick={() => setMessage(t)} style={{
                                                        padding: '5px 10px', background: 'var(--color-gray-100)',
                                                        border: 'none', borderRadius: 8, cursor: 'pointer',
                                                        fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-gray-600)',
                                                        transition: 'all 0.15s'
                                                    }}>
                                                        {t}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Send button */}
                                        <button
                                            onClick={handleSend}
                                            disabled={sending || !message.trim()}
                                            style={{
                                                width: '100%', padding: '14px',
                                                background: sending || !message.trim()
                                                    ? 'var(--color-gray-200)'
                                                    : `linear-gradient(135deg, ${TG_BLUE}, #006aad)`,
                                                color: sending || !message.trim() ? 'var(--color-gray-400)' : 'white',
                                                border: 'none', borderRadius: 12, cursor: sending ? 'wait' : 'pointer',
                                                fontWeight: 700, fontSize: '0.95rem',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                                transition: 'all 0.2s',
                                                boxShadow: !sending && message.trim() ? `0 6px 20px ${TG_BLUE}40` : 'none'
                                            }}
                                        >
                                            {sending
                                                ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Жіберілуде...</>
                                                : <><Send size={17} /> {sendMode === 'class' ? `Бүкіл сыныпқа жіберу (${students.filter(s => s.telegram_chat_id).length})` : 'Жіберу'}</>
                                            }
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    )
}
