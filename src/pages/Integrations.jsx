import { useState, useEffect, useRef } from 'react'
import { integrationsAPI, aiAPI, lessonsAPI, quizzesAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { useAuth } from '../contexts/AuthContext'
import {
    CheckCircle, XCircle, Loader2, ExternalLink, Send,
    Download, Upload, Copy, AlertCircle, X, ChevronRight,
    BookOpen, FileText, Sparkles, Plug, Users
} from 'lucide-react'
import { TelegramIcon } from '../components/Icons'

// ── SVG logos as components (no emoji) ────────────────────────
function GoogleLogo({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335"/>
        </svg>
    )
}

function TeamsLogo({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M14 9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" fill="#5059C9"/>
            <path d="M16 11h4a2 2 0 0 1 2 2v5h-8v-5a2 2 0 0 1 2-2z" fill="#5059C9"/>
            <path d="M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" fill="#7B83EB"/>
            <path d="M16 18H2v-6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v6z" fill="#7B83EB"/>
        </svg>
    )
}

export default function Integrations() {
    const { language } = useLanguage()
    const { user } = useAuth()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [connected, setConnected] = useState({})
    const [modal, setModal] = useState(null)   // 'telegram' | 'teams' | 'classroom' | 'ai'
    const [formData, setFormData] = useState({})
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState(null)

    // Teams send state
    const [teamsSending, setTeamsSending] = useState(false)
    const [teamsSendModal, setTeamsSendModal] = useState(false)
    const [teamsPayload, setTeamsPayload] = useState({ title: '', description: '', url: '', type: 'lesson' })

    // Google Classroom CSV import
    const [csvImporting, setCsvImporting] = useState(false)
    const [csvStudents, setCsvStudents] = useState([])
    const [csvModal, setCsvModal] = useState(false)
    const [csvClass, setCsvClass] = useState('')
    const fileRef = useRef(null)

    // AI demo
    const [aiDemo, setAiDemo] = useState({ topic: '', subject: 'Математика', grade: 5, result: '', loading: false })

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        integrationsAPI.getAll()
            .then(d => setConnected(d))
            .catch(() => {})
    }, [])

    const isConnected = (id) => !!(connected[id]?.connected)

    // ── Handle connect modal submit ────────────────────────────
    const handleConnect = async () => {
        setLoading(true)
        try {
            if (modal === 'telegram') {
                const r = await integrationsAPI.connectTelegram(formData)
                setConnected(p => ({ ...p, telegram: { connected: true } }))
                showToast(r.message || L('Telegram подключён!', 'Telegram қосылды!'))
            } else if (modal === 'ai') {
                const r = await integrationsAPI.connectAI(formData)
                setConnected(p => ({ ...p, ai: { connected: true } }))
                showToast(r.message || 'AI подключён!')
            } else if (modal === 'teams') {
                const { authFetch } = await import('../contexts/AuthContext')
                const API_BASE = import.meta.env.VITE_API_URL || '/api'
                const r = await authFetch(`${API_BASE}/integrations/teams`, {
                    method: 'POST', body: JSON.stringify(formData)
                })
                if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
                setConnected(p => ({ ...p, teams: { connected: true } }))
                showToast(L('Microsoft Teams подключён!', 'Microsoft Teams қосылды!'))
            }
            setModal(null); setFormData({})
        } catch (e) {
            showToast(e.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDisconnect = async (type) => {
        try {
            await integrationsAPI.disconnect(type)
            setConnected(p => ({ ...p, [type]: { connected: false } }))
            showToast(L('Интеграция отключена', 'Интеграция өшірілді'))
        } catch (e) { showToast(e.message, 'error') }
    }

    // ── Teams send ─────────────────────────────────────────────
    const handleTeamsSend = async () => {
        setTeamsSending(true)
        try {
            const { authFetch } = await import('../contexts/AuthContext')
            const API_BASE = import.meta.env.VITE_API_URL || '/api'
            const r = await authFetch(`${API_BASE}/integrations/teams/send`, {
                method: 'POST', body: JSON.stringify(teamsPayload)
            })
            if (!r.ok) { const e = await r.json(); throw new Error(e.error) }
            showToast(L('Отправлено в Teams!', 'Teams-ке жіберілді!'))
            setTeamsSendModal(false)
        } catch (e) { showToast(e.message, 'error') }
        setTeamsSending(false)
    }

    // ── Google Classroom export (opens pre-filled Google Form URL) ──
    const openGoogleClassroomExport = async () => {
        try {
            const data = await lessonsAPI.getAll({ status: 'published' })
            const lessons = (Array.isArray(data) ? data : data.lessons || []).slice(0, 1)
            if (!lessons.length) { showToast(L('Нет опубликованных уроков', 'Жарияланған сабақтар жоқ'), 'error'); return }
            const lesson = lessons[0]
            const classroomUrl = `https://classroom.google.com/share?url=${encodeURIComponent(window.location.origin + '/my-lessons')}&title=${encodeURIComponent(lesson.title)}`
            window.open(classroomUrl, '_blank')
        } catch { window.open('https://classroom.google.com', '_blank') }
    }

    // ── CSV import for Google Classroom ───────────────────────
    const handleCsvFile = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
            const lines = ev.target.result.split('\n').filter(l => l.trim())
            const students = lines.slice(1).map(line => {
                const [name, email] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
                return { name: name || '', email: email || '' }
            }).filter(s => s.name)
            setCsvStudents(students)
            setCsvModal(true)
        }
        reader.readAsText(file)
    }

    // ── AI demo ────────────────────────────────────────────────
    const handleAiDemo = async () => {
        if (!aiDemo.topic) { showToast(L('Введите тему', 'Тақырып еңгізіңіз'), 'error'); return }
        setAiDemo(d => ({ ...d, loading: true, result: '' }))
        try {
            const data = await aiAPI.lessonPlan({ topic: aiDemo.topic, subject: aiDemo.subject, grade: aiDemo.grade, duration: 45, language: 'ru' })
            setAiDemo(d => ({ ...d, result: data.plan, loading: false }))
        } catch (e) {
            showToast('AI: ' + e.message, 'error')
            setAiDemo(d => ({ ...d, loading: false }))
        }
    }

    // ── Integration card definitions ───────────────────────────
    const CARDS = [
        {
            id: 'telegram',
            name: 'Telegram Bot',
            logo: <TelegramIcon size={26} color="#0088cc" />,
            color: '#0088cc', bg: '#e8f4fd',
            category: L('Уведомления', 'Хабарламалар'),
            desc: L('Получайте уведомления и управляйте уроками в Telegram', 'Telegram арқылы хабарламалар алыңыз'),
            features: [L('Уведомления о просмотрах', 'Қараулар туралы хабарлама'), L('Команды /mylessons /stats', 'Командалар'), L('Отправка уроков ученикам', 'Оқушыларға сабақ жіберу')],
            action: 'modal',
            fields: [
                { key: 'bot_token', label: 'Токен бота', placeholder: '123456789:ABCdef...', type: 'text' },
                { key: 'chat_id', label: L('Chat ID (необязательно)', 'Chat ID (міндетті емес)'), placeholder: '@userinfobot арқылы алыңыз', type: 'text' }
            ],
            steps: [
                L('Откройте @BotFather в Telegram', '@BotFather-ді Telegram-да ашыңыз'),
                L('Создайте бота командой /newbot', '/newbot командасымен бот жасаңыз'),
                L('Скопируйте токен и вставьте ниже', 'Токенді көшіріп, төменге қойыңыз')
            ]
        },
        {
            id: 'teams',
            name: 'Microsoft Teams',
            logo: <TeamsLogo size={26} />,
            color: '#5059C9', bg: '#eef0fb',
            category: L('Совместная работа', 'Бірлесіп жұмыс'),
            desc: L('Отправляйте уроки и тесты прямо в канал Teams', 'Сабақтар мен тесттерді Teams каналына жіберіңіз'),
            features: [L('Отправка урока в канал', 'Сабақты каналға жіберу'), L('Карточка с кнопкой «Открыть»', 'Ашу батырмасы бар карточка'), L('Webhook за 2 минуты', '2 минутта Webhook')],
            action: 'modal',
            fields: [
                { key: 'webhook_url', label: 'Webhook URL', placeholder: 'https://outlook.office.com/webhook/...', type: 'url' }
            ],
            steps: [
                L('В Teams: Канал → ⋯ → Connectors', 'Teams: Канал → ⋯ → Connectors'),
                L('Найдите «Incoming Webhook» → Настроить', '«Incoming Webhook» → Баптау'),
                L('Скопируйте URL и вставьте ниже', 'URL-ді көшіріп, төменге қойыңыз')
            ]
        },
        {
            id: 'google_classroom',
            name: 'Google Classroom',
            logo: <GoogleLogo size={26} />,
            color: '#4285f4', bg: '#e8f0fe',
            category: 'Google',
            desc: L('Экспортируйте уроки в Classroom и импортируйте учеников из CSV', 'Сабақтарды Classroom-ға экспорттаңыз'),
            features: [L('Поделиться уроком одной кнопкой', 'Сабақты бір батырмамен бөлісу'), L('Импорт учеников из CSV (Google Classroom)', 'CSV арқылы оқушыларды импорттау'), L('Открыть в Google Classroom', 'Google Classroom-да ашу')],
            action: 'classroom',
        },
        {
            id: 'ai',
            name: 'AI-ассистент',
            logo: <Sparkles size={26} color="#7c3aed" />,
            color: '#7c3aed', bg: '#f3e8ff',
            category: 'AI',
            desc: L('Генерация уроков, тестов и переводов через Groq AI', 'Groq AI арқылы сабақтар мен тесттер жасаңыз'),
            features: [L('Генерация плана урока', 'Сабақ жоспарын жасау'), L('Создание тестов по теме', 'Тест жасау'), L('Перевод на казахский', 'Қазақшаға аудару')],
            action: 'modal',
            fields: [
                { key: 'api_key', label: 'Groq API Key', placeholder: 'gsk_...', type: 'password' }
            ],
            steps: [
                L('Зарегистрируйтесь на console.groq.com', 'console.groq.com-да тіркеліңіз'),
                L('Создайте API ключ в разделе API Keys', 'API Keys бөліміндегі кілтті жасаңыз'),
                L('Вставьте ключ ниже', 'Кілтті төменге қойыңыз')
            ]
        },
    ]

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
            <style>{`@keyframes slideIn { from { transform:translateX(20px); opacity:0; } to { transform:translateX(0); opacity:1; } } @keyframes spin { to { transform:rotate(360deg); } }`}</style>

            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
                    background: 'var(--color-bg-card,white)', color: 'var(--color-gray-900)',
                    padding: '12px 20px', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontWeight: 500,
                    animation: 'slideIn 0.3s ease',
                    borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    {toast.type === 'error' ? <AlertCircle size={16} color="#ef4444" /> : <CheckCircle size={16} color="#10b981" />}
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Plug size={28} color="#6366f1" /> {L('Интеграции', 'Интеграциялар')}
                </h1>
                <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
                    {L('Подключите внешние сервисы для расширения возможностей платформы', 'Платформаның мүмкіндіктерін кеңейту үшін сыртқы сервистерді қосыңыз')}
                </p>
            </div>

            {/* Integration cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                {CARDS.map(card => {
                    const connected_ = isConnected(card.id)
                    return (
                        <div key={card.id} style={{
                            background: 'var(--color-white,white)', borderRadius: '20px', padding: '24px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
                            border: `1px solid ${connected_ ? card.color + '30' : 'var(--color-gray-100)'}`,
                            display: 'flex', flexDirection: 'column', gap: '14px',
                            position: 'relative', overflow: 'hidden', transition: 'transform 0.2s,box-shadow 0.2s'
                        }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.1)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.05)' }}
                        >
                            {connected_ && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${card.color},${card.color}80)` }} />}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: 48, height: 48, borderRadius: '14px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        {card.logo}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1rem', color: 'var(--color-gray-900)' }}>{card.name}</h3>
                                        <span style={{ fontSize: '0.72rem', color: 'var(--color-gray-400)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.category}</span>
                                    </div>
                                </div>
                                {connected_ && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>
                                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }} />
                                        {L('Подключено', 'Қосылды')}
                                    </div>
                                )}
                            </div>
                            <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.875rem', lineHeight: 1.5 }}>{card.desc}</p>
                            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {(card.features || []).map(f => (
                                    <li key={f} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>
                                        <CheckCircle size={13} color={card.color} style={{ flexShrink: 0 }} /> {f}
                                    </li>
                                ))}
                            </ul>
                            {/* Actions */}
                            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {card.action === 'classroom' ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={openGoogleClassroomExport} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: '#4285f420', color: '#1a56db', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                            <ExternalLink size={14} /> {L('Поделиться', 'Бөлісу')}
                                        </button>
                                        <button onClick={() => fileRef.current?.click()} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: '#4285f420', color: '#1a56db', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                            <Upload size={14} /> CSV {L('импорт', 'импорт')}
                                        </button>
                                        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleCsvFile} />
                                    </div>
                                ) : connected_ ? (
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {card.id === 'teams' && (
                                            <button onClick={() => setTeamsSendModal(true)} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: 'none', background: card.bg, color: card.color, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                                                <Send size={14} /> {L('Отправить', 'Жіберу')}
                                            </button>
                                        )}
                                        <button onClick={() => handleDisconnect(card.id)} style={{ flex: card.id === 'teams' ? 0 : 1, padding: '9px 14px', borderRadius: '10px', border: 'none', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                                            <XCircle size={14} /> {card.id !== 'teams' ? L('Отключить', 'Өшіру') : ''}
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => { setModal(card.id); setFormData({}) }} style={{ width: '100%', padding: '11px', borderRadius: '12px', border: 'none', background: `linear-gradient(135deg,${card.color},${card.color}bb)`, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxShadow: `0 4px 12px ${card.color}35` }}>
                                        {L('Подключить', 'Қосу')} <ChevronRight size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── Connect modal ── */}
            {modal && (() => {
                const card = CARDS.find(c => c.id === modal)
                if (!card) return null
                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                        <div style={{ background: 'white', borderRadius: 24, maxWidth: 480, width: '100%', padding: 32, boxShadow: '0 24px 80px rgba(0,0,0,0.25)', maxHeight: '90vh', overflow: 'auto' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
                                <div style={{ width: 52, height: 52, borderRadius: 14, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.logo}</div>
                                <div>
                                    <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.2rem' }}>{L('Подключить', 'Қосу')} {card.name}</h2>
                                    <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '0.85rem' }}>{card.desc}</p>
                                </div>
                                <button onClick={() => setModal(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}><X size={20} /></button>
                            </div>
                            {/* Steps */}
                            <div style={{ marginBottom: 20 }}>
                                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-gray-700)' }}>{L('Инструкция:', 'Нұсқаулық:')}</p>
                                {(card.steps || []).map((step, i) => (
                                    <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: card.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                                        <span style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: 1.5, paddingTop: 1 }}>{step}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Fields */}
                            {(card.fields || []).map(f => (
                                <div key={f.key} style={{ marginBottom: 12 }}>
                                    <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-800)' }}>{f.label}</label>
                                    <input type={f.type || 'text'} value={formData[f.key] || ''} onChange={e => setFormData(d => ({ ...d, [f.key]: e.target.value }))} placeholder={f.placeholder}
                                        style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                                </div>
                            ))}
                            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                                <button onClick={() => setModal(null)} style={{ padding: '10px 20px', background: '#f3f4f6', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>{L('Отмена', 'Болдырмау')}</button>
                                <button onClick={handleConnect} disabled={loading} style={{ flex: 1, padding: '12px', background: `linear-gradient(135deg,${card.color},${card.color}bb)`, color: 'white', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
                                    {loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : null}
                                    {L('Подключить', 'Қосу')}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            })()}

            {/* ── Teams send modal ── */}
            {teamsSendModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 20, maxWidth: 440, width: '100%', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <h3 style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><TeamsLogo size={20} /> {L('Отправить в Teams', 'Teams-ке жіберу')}</h3>
                            <button onClick={() => setTeamsSendModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
                        </div>
                        {[
                            { key: 'title', label: L('Заголовок', 'Тақырып'), placeholder: L('Новый урок по математике', 'Математикадан жаңа сабақ') },
                            { key: 'description', label: L('Описание', 'Сипаттама'), placeholder: L('Краткое описание...', 'Қысқаша сипаттама...') },
                            { key: 'url', label: 'URL (необязательно)', placeholder: 'https://...' },
                        ].map(f => (
                            <div key={f.key} style={{ marginBottom: 12 }}>
                                <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: '0.85rem' }}>{f.label}</label>
                                <input value={teamsPayload[f.key] || ''} onChange={e => setTeamsPayload(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e5e7eb', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        ))}
                        <div style={{ marginBottom: 16 }}>
                            <label style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 5, display: 'block' }}>{L('Тип', 'Түрі')}</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['lesson', 'quiz'].map(t => (
                                    <button key={t} onClick={() => setTeamsPayload(p => ({ ...p, type: t }))} style={{ flex: 1, padding: '8px', border: `1.5px solid ${teamsPayload.type === t ? '#5059C9' : '#e5e7eb'}`, borderRadius: 9, fontWeight: 600, fontSize: '0.85rem', background: teamsPayload.type === t ? '#eef0fb' : 'white', color: teamsPayload.type === t ? '#5059C9' : '#6b7280', cursor: 'pointer' }}>
                                        {t === 'lesson' ? L('Урок', 'Сабақ') : L('Тест', 'Тест')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button onClick={handleTeamsSend} disabled={teamsSending || !teamsPayload.title} style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg,#5059C9,#7B83EB)', color: 'white', border: 'none', borderRadius: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: teamsSending ? 0.7 : 1 }}>
                            {teamsSending ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                            {L('Отправить в канал', 'Каналға жіберу')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── CSV import modal ── */}
            {csvModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
                    <div style={{ background: 'white', borderRadius: 20, maxWidth: 500, width: '100%', padding: 28, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '80vh', overflow: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}><Users size={18} color="#4285f4" /> {L('Импорт учеников', 'Оқушыларды импорттау')} ({csvStudents.length})</h3>
                            <button onClick={() => setCsvModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
                        </div>
                        <p style={{ margin: '0 0 14px', fontSize: '0.85rem', color: '#6b7280', lineHeight: 1.5 }}>
                            {L('Формат CSV: Name, Email (первая строка — заголовок)', 'CSV форматы: Name, Email (бірінші жол — тақырып)')}
                        </p>
                        <div style={{ maxHeight: 240, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 10, marginBottom: 16 }}>
                            {csvStudents.slice(0, 20).map((s, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < csvStudents.length - 1 ? '1px solid #f3f4f6' : 'none', fontSize: '0.85rem' }}>
                                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                                    <span style={{ color: '#9ca3af' }}>{s.email || '—'}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: '0.85rem', color: '#15803d' }}>
                            <strong>{L('Готово к импорту:', 'Импортқа дайын:')}</strong> {csvStudents.length} {L('учеников', 'оқушы')}. {L('Откройте «Классы» → выберите класс → добавьте вручную.', '«Сыныптар» → сынып таңдаңыз → қолмен қосыңыз.')}
                        </div>
                        <button onClick={() => { setCsvModal(false); window.location.href = '/classes' }} style={{ width: '100%', padding: '11px', background: 'linear-gradient(135deg,#4285f4,#34A853)', color: 'white', border: 'none', borderRadius: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                            <ExternalLink size={16} /> {L('Перейти к классам', 'Сыныптарға өту')}
                        </button>
                    </div>
                </div>
            )}

            {/* ── AI demo ── */}
            <div style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 24, padding: 36, color: 'white', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 20 }}>
                    <div style={{ width: 52, height: 52, background: 'rgba(255,255,255,0.18)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Sparkles size={26} color="white" />
                    </div>
                    <div>
                        <h2 style={{ margin: '0 0 4px', fontSize: '1.3rem' }}>{L('AI-ассистент в действии', 'AI-ассистент іс жүзінде')}</h2>
                        <p style={{ margin: 0, opacity: 0.8, fontSize: '0.88rem' }}>{L('Попробуйте сгенерировать план урока прямо сейчас — бесплатно!', 'Қазір сабақ жоспарын жасап көріңіз — тегін!')}</p>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px', gap: 10, marginBottom: 14, alignItems: 'end' }}>
                    {[
                        { label: L('Тема урока', 'Сабақ тақырыбы'), value: aiDemo.topic, onChange: v => setAiDemo(d => ({ ...d, topic: v })), placeholder: L('Теорема Пифагора...', 'Пифагор теоремасы...'), type: 'text' },
                    ].map(f => (
                        <div key={f.label}>
                            <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: '0.82rem', opacity: 0.9 }}>{f.label}</label>
                            <input value={f.value} onChange={e => f.onChange(e.target.value)} placeholder={f.placeholder} style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.95)' }} />
                        </div>
                    ))}
                    <div>
                        <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: '0.82rem', opacity: 0.9 }}>{L('Предмет', 'Пән')}</label>
                        <select value={aiDemo.subject} onChange={e => setAiDemo(d => ({ ...d, subject: e.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: '0.875rem', background: 'rgba(255,255,255,0.95)', width: '100%' }}>
                            {['Математика','Физика','Химия','История','Информатика'].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, fontSize: '0.82rem', opacity: 0.9 }}>{L('Класс', 'Сынып')}</label>
                        <select value={aiDemo.grade} onChange={e => setAiDemo(d => ({ ...d, grade: +e.target.value }))} style={{ padding: '10px 12px', borderRadius: 10, border: 'none', fontSize: '0.875rem', background: 'rgba(255,255,255,0.95)', width: '100%' }}>
                            {[5,6,7,8,9,10,11].map(g => <option key={g}>{g}</option>)}
                        </select>
                    </div>
                </div>
                <button onClick={handleAiDemo} disabled={aiDemo.loading} style={{ padding: '12px 28px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: 12, color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: aiDemo.loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {aiDemo.loading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                    {aiDemo.loading ? L('Генерирую...', 'Жасалуда...') : L('Сгенерировать план урока', 'Сабақ жоспарын жасау')}
                </button>
                {aiDemo.result && (
                    <div style={{ marginTop: 18, background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 18, whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.875rem', maxHeight: 300, overflow: 'auto', border: '1px solid rgba(255,255,255,0.2)' }}>
                        {aiDemo.result}
                    </div>
                )}
            </div>
        </div>
    )
}
