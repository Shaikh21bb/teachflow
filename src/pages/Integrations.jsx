import { useState, useEffect } from 'react'
import { integrationsAPI, aiAPI } from '../api'

const INTEGRATIONS = [
    {
        id: 'telegram',
        name: 'Telegram Bot',
        icon: '✈️',
        color: '#0088cc',
        bg: '#e8f4fd',
        category: 'Уведомления',
        description: 'Получайте уведомления и управляйте уроками прямо в Telegram',
        features: ['Уведомления о просмотрах', 'Команды /mylessons /stats', 'Отправка уроков ученикам'],
        status: 'available',
        steps: [
            'Откройте @BotFather в Telegram и создайте нового бота командой /newbot',
            'Скопируйте токен бота (формат: 123456:ABC-DEF...)',
            'Вставьте токен ниже и нажмите «Подключить»'
        ],
        fields: [
            { key: 'bot_token', label: 'Токен бота', placeholder: '123456789:ABCdef...', type: 'text' },
            { key: 'chat_id', label: 'Ваш Chat ID (необязательно)', placeholder: 'Получите у @userinfobot', type: 'text' }
        ],
        apiCall: (data) => integrationsAPI.connectTelegram(data)
    },
    {
        id: 'ai',
        name: 'AI-ассистент',
        icon: '🤖',
        color: '#7c3aed',
        bg: '#f3e8ff',
        category: 'AI',
        description: 'Генерация планов уроков, тестов, резюме и переводов через AI',
        features: ['Генерация плана урока', 'Создание тестов по содержимому', 'Перевод на казахский'],
        status: 'active',
        steps: [
            'Зарегистрируйтесь на console.groq.com (бесплатно)',
            'Создайте API ключ в разделе API Keys',
            'Вставьте ключ ниже для расширенных возможностей'
        ],
        fields: [
            { key: 'api_key', label: 'Groq API Key', placeholder: 'gsk_...', type: 'password' }
        ],
        apiCall: (data) => integrationsAPI.connectAI(data)
    },
    {
        id: 'google_classroom',
        name: 'Google Classroom',
        icon: '🏛️',
        color: '#4285f4',
        bg: '#e8f0fe',
        category: 'Google',
        description: 'Экспорт уроков прямо в Google Classroom и импорт списков учеников',
        features: ['Экспорт урока в класс', 'Синхронизация учеников', 'OAuth 2.0'],
        status: 'coming_soon',
        steps: ['Настройте Google OAuth', 'Подключите Google Classroom API', 'Авторизуйтесь'],
        fields: []
    },
    {
        id: 'youtube',
        name: 'YouTube / Google Drive',
        icon: '▶️',
        color: '#ff0000',
        bg: '#fff0f0',
        category: 'Google',
        description: 'Автоматическая загрузка видео на YouTube и синхронизация с Drive',
        features: ['Загрузка видео-уроков', 'Синхронизация с Google Drive', 'Встраивание видео'],
        status: 'coming_soon',
        steps: ['YouTube Data API v3', 'Google OAuth авторизация', 'Настройка канала'],
        fields: []
    },
    {
        id: 'zoom',
        name: 'Zoom',
        icon: '📹',
        color: '#2d8cff',
        bg: '#e8f3ff',
        category: 'Видеоконференции',
        description: 'Планируйте онлайн-уроки и получайте автоматические ссылки на встречи',
        features: ['Создание встреч', 'Ссылки в карточке урока', 'Расписание занятий'],
        status: 'coming_soon',
        steps: ['Zoom Developer Account', 'JWT или OAuth 2.0', 'Настройка вебхуков'],
        fields: []
    },
    {
        id: 'google_meet',
        name: 'Google Meet',
        icon: '📞',
        color: '#34a853',
        bg: '#e6f4ea',
        category: 'Видеоконференции',
        description: 'Создавайте онлайн-уроки и автоматически добавляйте ссылки',
        features: ['Автосоздание Meet-ссылок', 'Интеграция с Google Calendar', 'Уведомления ученикам'],
        status: 'coming_soon',
        steps: ['Google Calendar API', 'OAuth 2.0 авторизация', 'Настройка прав'],
        fields: []
    },
    {
        id: 'google_calendar',
        name: 'Google Calendar',
        icon: '📅',
        color: '#4285f4',
        bg: '#e8f0fe',
        category: 'Организация',
        description: 'Расписание уроков в календаре с напоминаниями',
        features: ['Расписание занятий', 'Напоминания перед уроком', 'Синхронизация событий'],
        status: 'coming_soon',
        steps: ['Google Calendar API', 'OAuth авторизация', 'Выбор календаря'],
        fields: []
    },
    {
        id: 'export',
        name: 'Экспорт журнала',
        icon: '📊',
        color: '#059669',
        bg: '#ecfdf5',
        category: 'Аналитика',
        description: 'Экспорт отметок и активности в Excel / CSV для электронных журналов',
        features: ['Экспорт в Excel/CSV', 'Отметки и активность', 'Совместимость с CRM школ'],
        status: 'coming_soon',
        steps: ['Выберите период и классы', 'Настройте поля экспорта', 'Скачайте файл'],
        fields: []
    }
]

export default function Integrations() {
    const [connected, setConnected] = useState({})
    const [activeModal, setActiveModal] = useState(null)
    const [formData, setFormData] = useState({})
    const [loading, setLoading] = useState(false)
    const [toast, setToast] = useState(null)
    const [aiDemo, setAiDemo] = useState({ topic: '', subject: 'Математика', grade: 5, result: '', loading: false })
    const [filter, setFilter] = useState('Все')

    const categories = ['Все', ...new Set(INTEGRATIONS.map(i => i.category))]

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    useEffect(() => {
        integrationsAPI.getAll()
            .then(data => setConnected(data))
            .catch(e => console.log('Integrations load skipped:', e.message))
    }, [])

    const openModal = (integration) => {
        setActiveModal(integration)
        setFormData({})
    }

    const closeModal = () => {
        setActiveModal(null)
        setFormData({})
    }

    const handleConnect = async () => {
        if (!activeModal?.apiCall) return
        setLoading(true)
        try {
            const result = await activeModal.apiCall(formData)
            setConnected(prev => ({
                ...prev,
                [activeModal.id]: { connected: true, connected_at: new Date().toISOString() }
            }))
            showToast(result.message || `${activeModal.name} подключён!`)
            closeModal()
        } catch (e) {
            showToast(e.message, 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleDisconnect = async (type) => {
        try {
            await integrationsAPI.disconnect(type)
            setConnected(prev => ({ ...prev, [type]: { connected: false } }))
            showToast('Интеграция отключена')
        } catch (e) {
            showToast(e.message, 'error')
        }
    }

    const handleAiDemo = async () => {
        if (!aiDemo.topic) { showToast('Введите тему урока', 'error'); return }
        setAiDemo(d => ({ ...d, loading: true, result: '' }))
        try {
            const data = await aiAPI.lessonPlan({
                topic: aiDemo.topic, subject: aiDemo.subject,
                grade: aiDemo.grade, duration: 45, language: 'ru'
            })
            setAiDemo(d => ({ ...d, result: data.plan, loading: false }))
        } catch (e) {
            showToast('Ошибка AI: ' + e.message, 'error')
            setAiDemo(d => ({ ...d, loading: false }))
        }
    }

    const filtered = filter === 'Все' ? INTEGRATIONS : INTEGRATIONS.filter(i => i.category === filter)

    const getStatus = (integration) => {
        if (integration.status === 'coming_soon') return 'coming_soon'
        if (connected[integration.id]?.connected) return 'connected'
        return integration.status
    }

    const STATUS_CONFIG = {
        connected: { label: '✓ Подключено', bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
        available: { label: 'Подключить', bg: '#ede9fe', color: '#5b21b6', dot: '#8b5cf6' },
        active: { label: '🤖 Активен', bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
        coming_soon: { label: 'Скоро', bg: '#f3f4f6', color: '#9ca3af', dot: '#d1d5db' },
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 16px' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', padding: '12px 20px', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontWeight: 500,
                    animation: 'slideIn 0.3s ease'
                }}>
                    {toast.type === 'error' ? '❌ ' : '✅ '}{toast.message}
                </div>
            )}

            {/* Modal */}
            {activeModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '16px'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '24px', maxWidth: '500px', width: '100%',
                        padding: '32px', boxShadow: '0 24px 80px rgba(0,0,0,0.25)',
                        maxHeight: '90vh', overflow: 'auto'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                            <div style={{
                                width: '52px', height: '52px', borderRadius: '14px',
                                background: activeModal.bg, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0
                            }}>
                                {activeModal.icon}
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>
                                    Подключить {activeModal.name}
                                </h2>
                                <p style={{ margin: '2px 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                                    {activeModal.description}
                                </p>
                            </div>
                        </div>

                        {/* Steps */}
                        <div style={{ marginBottom: '24px' }}>
                            <p style={{ margin: '0 0 12px', fontWeight: 700, fontSize: '0.875rem', color: '#374151' }}>
                                📋 Инструкция подключения:
                            </p>
                            {activeModal.steps.map((step, i) => (
                                <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '10px', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                                        background: activeModal.color, color: 'white',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 800
                                    }}>{i + 1}</div>
                                    <span style={{ fontSize: '0.875rem', lineHeight: 1.5, color: '#4b5563', paddingTop: '2px' }}>{step}</span>
                                </div>
                            ))}
                        </div>

                        {/* Fields */}
                        {activeModal.fields.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                {activeModal.fields.map(field => (
                                    <div key={field.key} style={{ marginBottom: '12px' }}>
                                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem' }}>
                                            {field.label}
                                        </label>
                                        <input
                                            type={field.type || 'text'}
                                            value={formData[field.key] || ''}
                                            onChange={e => setFormData(d => ({ ...d, [field.key]: e.target.value }))}
                                            placeholder={field.placeholder}
                                            style={{
                                                width: '100%', padding: '10px 14px', borderRadius: '10px',
                                                border: '1px solid #e5e7eb', fontSize: '0.9rem', outline: 'none',
                                                boxSizing: 'border-box', fontFamily: 'inherit'
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={closeModal} style={{
                                flex: 0, padding: '10px 20px', background: '#f3f4f6',
                                border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600
                            }}>Отмена</button>
                            <button onClick={handleConnect} disabled={loading} style={{
                                flex: 1, padding: '12px',
                                background: `linear-gradient(135deg, ${activeModal.color}, ${activeModal.color}bb)`,
                                color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer',
                                fontWeight: 700, fontSize: '0.95rem', opacity: loading ? 0.7 : 1
                            }}>
                                {loading ? '⟳ Подключаю...' : `Подключить ${activeModal.name}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ margin: '0 0 8px', fontSize: '1.9rem', fontWeight: 800 }}>🔌 Интеграции</h1>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '1rem' }}>
                    Подключите внешние сервисы для расширения возможностей платформы
                </p>
            </div>

            {/* Stats bar */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '16px', marginBottom: '28px'
            }}>
                {[
                    { label: 'Всего сервисов', value: INTEGRATIONS.length, icon: '🔌' },
                    { label: 'Подключено', value: Object.values(connected).filter(c => c.connected).length, icon: '✅' },
                    { label: 'Скоро', value: INTEGRATIONS.filter(i => i.status === 'coming_soon').length, icon: '🔜' },
                ].map(s => (
                    <div key={s.label} style={{
                        background: 'white', borderRadius: '16px', padding: '20px',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textAlign: 'center',
                        border: '1px solid #f3f4f6'
                    }}>
                        <div style={{ fontSize: '1.6rem', marginBottom: '4px' }}>{s.icon}</div>
                        <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827' }}>{s.value}</div>
                        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '2px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Category filter */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '24px' }}>
                {categories.map(cat => (
                    <button key={cat} onClick={() => setFilter(cat)} style={{
                        padding: '8px 18px', border: 'none', borderRadius: '20px', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s',
                        background: filter === cat ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : '#f3f4f6',
                        color: filter === cat ? 'white' : '#6b7280',
                        boxShadow: filter === cat ? '0 4px 12px rgba(99,102,241,0.3)' : 'none'
                    }}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* Integration Cards Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px', marginBottom: '40px'
            }}>
                {filtered.map(integration => {
                    const status = getStatus(integration)
                    const cfg = STATUS_CONFIG[status]
                    const isConnected = status === 'connected' || status === 'active'
                    const isComingSoon = status === 'coming_soon'

                    return (
                        <div key={integration.id} style={{
                            background: 'white', borderRadius: '20px', padding: '24px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                            border: `1px solid ${isConnected ? integration.color + '30' : '#f3f4f6'}`,
                            opacity: isComingSoon ? 0.75 : 1,
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            position: 'relative', overflow: 'hidden'
                        }}
                            onMouseEnter={e => { if (!isComingSoon) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)' } }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
                        >
                            {/* Connected glow accent */}
                            {isConnected && (
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
                                    background: `linear-gradient(90deg, ${integration.color}, ${integration.color}80)`
                                }} />
                            )}

                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '14px',
                                        background: integration.bg, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '1.6rem', flexShrink: 0
                                    }}>
                                        {integration.icon}
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>{integration.name}</h3>
                                        <span style={{ fontSize: '0.72rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>
                                            {integration.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Status badge */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: cfg.bg, flexShrink: 0 }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: cfg.dot }} />
                                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: cfg.color, whiteSpace: 'nowrap' }}>{cfg.label}</span>
                                </div>
                            </div>

                            <p style={{ margin: '0 0 14px', color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>
                                {integration.description}
                            </p>

                            {/* Features */}
                            <ul style={{ margin: '0 0 20px', padding: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                {integration.features.map(f => (
                                    <li key={f} style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.8rem', color: '#4b5563' }}>
                                        <span style={{ color: integration.color, fontWeight: 700 }}>✓</span> {f}
                                    </li>
                                ))}
                            </ul>

                            {/* Action button */}
                            {isComingSoon ? (
                                <div style={{
                                    textAlign: 'center', padding: '10px', borderRadius: '10px',
                                    background: '#f9fafb', color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600
                                }}>🔜 Скоро появится</div>
                            ) : isConnected ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{
                                        flex: 1, padding: '10px', borderRadius: '10px', textAlign: 'center',
                                        background: '#d1fae5', color: '#065f46', fontSize: '0.85rem', fontWeight: 700
                                    }}>✓ Подключено</div>
                                    <button onClick={() => handleDisconnect(integration.id)} style={{
                                        padding: '10px 14px', borderRadius: '10px', border: 'none',
                                        background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem'
                                    }}>Отключить</button>
                                </div>
                            ) : (
                                <button onClick={() => openModal(integration)} style={{
                                    width: '100%', padding: '11px', borderRadius: '12px', border: 'none',
                                    background: `linear-gradient(135deg, ${integration.color}, ${integration.color}bb)`,
                                    color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                                    transition: 'opacity 0.15s', boxShadow: `0 4px 12px ${integration.color}40`
                                }}>
                                    Подключить →
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* AI Demo Section */}
            <div style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
                borderRadius: '24px', padding: '36px', color: 'white', marginBottom: '24px'
            }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '24px' }}>
                    <div style={{
                        width: '52px', height: '52px', background: 'rgba(255,255,255,0.2)',
                        borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.75rem', flexShrink: 0
                    }}>🤖</div>
                    <div>
                        <h2 style={{ margin: '0 0 4px', fontSize: '1.4rem' }}>AI-ассистент в действии</h2>
                        <p style={{ margin: 0, opacity: 0.8, fontSize: '0.9rem' }}>
                            Попробуйте сгенерировать план урока прямо сейчас — это бесплатно!
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '10px', marginBottom: '16px', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem', opacity: 0.9 }}>
                            Тема урока
                        </label>
                        <input
                            value={aiDemo.topic}
                            onChange={e => setAiDemo(d => ({ ...d, topic: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && handleAiDemo()}
                            placeholder="Например: Теорема Пифагора..."
                            style={{
                                width: '100%', padding: '11px 14px', borderRadius: '12px',
                                border: 'none', fontSize: '0.9rem', outline: 'none',
                                boxSizing: 'border-box', background: 'rgba(255,255,255,0.95)'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem', opacity: 0.9 }}>Предмет</label>
                        <select
                            value={aiDemo.subject}
                            onChange={e => setAiDemo(d => ({ ...d, subject: e.target.value }))}
                            style={{ padding: '11px 14px', borderRadius: '12px', border: 'none', fontSize: '0.875rem', background: 'rgba(255,255,255,0.95)' }}
                        >
                            {['Математика', 'Физика', 'Химия', 'История', 'Информатика'].map(s => <option key={s}>{s}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.85rem', opacity: 0.9 }}>Класс</label>
                        <select
                            value={aiDemo.grade}
                            onChange={e => setAiDemo(d => ({ ...d, grade: Number(e.target.value) }))}
                            style={{ padding: '11px 14px', borderRadius: '12px', border: 'none', fontSize: '0.875rem', background: 'rgba(255,255,255,0.95)' }}
                        >
                            {[5,6,7,8,9,10,11].map(g => <option key={g}>{g}</option>)}
                        </select>
                    </div>
                </div>

                <button onClick={handleAiDemo} disabled={aiDemo.loading} style={{
                    padding: '13px 32px', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)',
                    border: '1.5px solid rgba(255,255,255,0.5)', borderRadius: '12px', color: 'white',
                    cursor: 'pointer', fontWeight: 700, fontSize: '0.95rem',
                    transition: 'background 0.2s', opacity: aiDemo.loading ? 0.7 : 1
                }}>
                    {aiDemo.loading ? '⟳ Генерирую план...' : '✨ Сгенерировать план урока'}
                </button>

                {aiDemo.result && (
                    <div style={{
                        marginTop: '20px', background: 'rgba(255,255,255,0.12)',
                        borderRadius: '16px', padding: '20px', whiteSpace: 'pre-wrap',
                        lineHeight: 1.7, fontSize: '0.875rem', maxHeight: '320px',
                        overflow: 'auto', border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        {aiDemo.result}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes slideIn { from { transform: translateX(20px); opacity:0; } to { transform: translateX(0); opacity:1; } }
            `}</style>
        </div>
    )
}
