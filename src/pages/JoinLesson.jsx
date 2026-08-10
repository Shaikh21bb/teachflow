/**
 * /join/:code — Student join page for live lessons
 * No login required. Mobile-first design.
 */
import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE, liveAPI } from '../api'
import { CheckCircle, AlertCircle, Clock, Users, BookOpen } from 'lucide-react'

const STATES = {
    ENTER_NAME: 'enter-name',
    JOINING: 'joining',
    WAITING: 'waiting',
    POLL_ACTIVE: 'poll-active',
    ANSWERED: 'answered',
    SESSION_ENDED: 'session-ended',
    ERROR: 'error',
}

export default function JoinLesson() {
    const { code } = useParams()
    const upperCode = (code || '').toUpperCase()

    const [state, setState] = useState(STATES.ENTER_NAME)
    const [studentName, setStudentName] = useState('')
    const [nameError, setNameError] = useState('')
    const [activePoll, setActivePoll] = useState(null)
    const [chosenAnswer, setChosenAnswer] = useState(null)
    const [sessionInfo, setSessionInfo] = useState(null)
    const [errorMsg, setErrorMsg] = useState('')
    const [participantCount, setParticipantCount] = useState(0)
    const eventSourceRef = useRef(null)

    // ── SSE connection ──────────────────────────────────────
    function connectSSE(name) {
        if (eventSourceRef.current) eventSourceRef.current.close()
        const es = new EventSource(`${API_BASE}/live/${upperCode}/events`)
        eventSourceRef.current = es

        es.addEventListener('connected', () => {
            // SSE connected — we're good
        })

        es.addEventListener('slide-change', (e) => {
            const data = JSON.parse(e.data)
            if (data.active_poll) {
                setActivePoll(data.active_poll)
                setChosenAnswer(null)
                setState(STATES.POLL_ACTIVE)
            } else {
                setActivePoll(null)
                setChosenAnswer(null)
                setState(STATES.WAITING)
            }
        })

        es.addEventListener('answer-update', () => {
            // Stats updated — teacher sees this, we don't need to do anything for student
        })

        es.addEventListener('participant-joined', (e) => {
            const data = JSON.parse(e.data)
            setParticipantCount(data.participants_count)
        })

        es.addEventListener('session-ended', () => {
            setState(STATES.SESSION_ENDED)
            es.close()
        })

        es.onerror = () => {
            // Reconnect silently after 3s
            setTimeout(() => {
                if (eventSourceRef.current === es) connectSSE(name)
            }, 3000)
        }
    }

    useEffect(() => {
        return () => {
            if (eventSourceRef.current) eventSourceRef.current.close()
        }
    }, [])

    // ── Join handler ────────────────────────────────────────
    async function handleJoin(e) {
        e.preventDefault()
        const name = studentName.trim()
        if (!name) { setNameError('Введите ваше имя'); return }
        if (name.length < 2) { setNameError('Минимум 2 символа'); return }
        setNameError('')
        setState(STATES.JOINING)

        try {
            const result = await liveAPI.joinSession(upperCode, name)
            if (result.error) {
                setErrorMsg(result.error)
                setState(STATES.ERROR)
                return
            }
            setSessionInfo(result)
            if (result.active_poll) {
                setActivePoll(result.active_poll)
                setState(STATES.POLL_ACTIVE)
            } else {
                setState(STATES.WAITING)
            }
            connectSSE(name)
        } catch (err) {
            setErrorMsg('Не удалось подключиться: ' + err.message)
            setState(STATES.ERROR)
        }
    }

    // ── Answer handler ──────────────────────────────────────
    async function handleAnswer(label) {
        if (chosenAnswer) return // Already answered
        setChosenAnswer(label)
        setState(STATES.ANSWERED)
        try {
            await liveAPI.submitAnswer(upperCode, studentName.trim(), label)
        } catch { /* silent */ }
    }

    // ────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────

    const baseStyle = {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Inter', 'Outfit', sans-serif",
        color: 'white',
    }

    // ── SESSION ENDED ────────────────────────────────────────
    if (state === STATES.SESSION_ENDED) {
        return (
            <div style={baseStyle}>
                <div style={{ textAlign: 'center', maxWidth: '380px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px', lineHeight: 1 }}>
                        <CheckCircle size={72} color="#10b981" style={{ margin: '0 auto' }} />
                    </div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: '12px' }}>Урок завершён!</h1>
                    <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '1.1rem', lineHeight: 1.6 }}>
                        Отличная работа! Ты участвовал в интерактивном уроке.
                    </p>
                    <div style={{ marginTop: '28px', padding: '16px 24px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '16px', fontSize: '0.95rem', color: '#6ee7b7' }}>
                        Можешь закрыть эту вкладку
                    </div>
                </div>
            </div>
        )
    }

    // ── ERROR ─────────────────────────────────────────────────
    if (state === STATES.ERROR) {
        return (
            <div style={baseStyle}>
                <div style={{ textAlign: 'center', maxWidth: '380px' }}>
                    <AlertCircle size={64} color="#ef4444" style={{ margin: '0 auto 16px' }} />
                    <h2 style={{ marginBottom: '12px', fontSize: '1.5rem', fontWeight: 800 }}>Ошибка подключения</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px' }}>{errorMsg}</p>
                    <button
                        onClick={() => setState(STATES.ENTER_NAME)}
                        style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        )
    }

    // ── ENTER NAME ────────────────────────────────────────────
    if (state === STATES.ENTER_NAME || state === STATES.JOINING) {
        return (
            <div style={baseStyle}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    {/* Logo area */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                            <BookOpen size={32} color="white" />
                        </div>
                        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '8px', letterSpacing: '-0.5px' }}>
                            Присоединиться к уроку
                        </h1>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '30px', padding: '6px 16px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>Код урока</span>
                            <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '3px', color: '#a5b4fc' }}>{upperCode}</span>
                        </div>
                    </div>

                    <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px', color: 'rgba(255,255,255,0.8)' }}>
                                Ваше имя
                            </label>
                            <input
                                type="text"
                                value={studentName}
                                onChange={e => { setStudentName(e.target.value); setNameError('') }}
                                placeholder="Например: Алихан Сейткали"
                                autoFocus
                                maxLength={50}
                                style={{
                                    width: '100%', padding: '16px 18px',
                                    background: 'rgba(255,255,255,0.07)',
                                    border: `1.5px solid ${nameError ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                                    borderRadius: '14px', color: 'white', fontSize: '1rem',
                                    outline: 'none', boxSizing: 'border-box',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={e => e.target.style.borderColor = '#6366f1'}
                                onBlur={e => e.target.style.borderColor = nameError ? '#ef4444' : 'rgba(255,255,255,0.15)'}
                            />
                            {nameError && <p style={{ color: '#f87171', fontSize: '0.8rem', marginTop: '6px' }}>{nameError}</p>}
                        </div>

                        <button
                            type="submit"
                            disabled={state === STATES.JOINING}
                            style={{
                                padding: '16px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                color: 'white', border: 'none', borderRadius: '14px',
                                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                                boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
                                opacity: state === STATES.JOINING ? 0.7 : 1,
                                transition: 'all 0.2s'
                            }}
                        >
                            {state === STATES.JOINING ? 'Подключение...' : 'Войти в урок →'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: '24px' }}>
                        Регистрация не требуется
                    </p>
                </div>
            </div>
        )
    }

    // ── WAITING ───────────────────────────────────────────────
    if (state === STATES.WAITING) {
        return (
            <div style={baseStyle}>
                <div style={{ textAlign: 'center', maxWidth: '380px' }}>
                    {/* Animated waiting indicator */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginBottom: '32px' }}>
                        {[0, 0.2, 0.4].map(d => (
                            <div key={d} style={{
                                width: '14px', height: '14px', borderRadius: '50%',
                                background: '#6366f1',
                                animation: `waitingBounce 1.2s ease-in-out ${d}s infinite`
                            }} />
                        ))}
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '12px' }}>
                        Привет, {studentName.trim()}!
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '28px' }}>
                        Ожидайте следующего вопроса от учителя...
                    </p>
                    {participantCount > 0 && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '30px', padding: '8px 18px', fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)' }}>
                            <Users size={14} />
                            {participantCount} участников подключено
                        </div>
                    )}
                    <style>{`
                        @keyframes waitingBounce {
                            0%, 100% { transform: translateY(0); opacity: 0.4; }
                            50% { transform: translateY(-12px); opacity: 1; }
                        }
                    `}</style>
                </div>
            </div>
        )
    }

    // ── POLL ACTIVE ───────────────────────────────────────────
    if (state === STATES.POLL_ACTIVE && activePoll) {
        const labels = ['A', 'B', 'C', 'D']
        const optionColors = ['#6366f1', '#10b981', '#f59e0b', '#ec4899']
        return (
            <div style={{ ...baseStyle, justifyContent: 'flex-start', paddingTop: '40px' }}>
                <div style={{ width: '100%', maxWidth: '480px' }}>
                    <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(236,72,153,0.15)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '30px', padding: '6px 14px', fontSize: '0.8rem', color: '#f9a8d4', marginBottom: '16px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ec4899', animation: 'pulse 1.5s ease infinite' }} />
                            Вопрос учителя
                        </div>
                        <h2 style={{ fontSize: 'clamp(1.2rem,4vw,1.6rem)', fontWeight: 800, lineHeight: 1.35, margin: 0 }}>
                            {activePoll.question}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {(activePoll.options || []).map((opt, i) => {
                            const label = labels[i] || String(i + 1)
                            const color = optionColors[i % optionColors.length]
                            return (
                                <button
                                    key={i}
                                    onClick={() => handleAnswer(label)}
                                    style={{
                                        padding: '18px 20px',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: `2px solid rgba(255,255,255,0.12)`,
                                        borderRadius: '16px', color: 'white',
                                        textAlign: 'left', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '16px',
                                        fontSize: '1rem', fontWeight: 500, lineHeight: 1.4,
                                        transition: 'all 0.2s',
                                        WebkitTapHighlightColor: 'transparent'
                                    }}
                                    onTouchStart={e => e.currentTarget.style.background = `${color}20`}
                                    onTouchEnd={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                    onMouseEnter={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.borderColor = `${color}60` }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                                >
                                    <span style={{
                                        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                                        background: `${color}25`, color, fontWeight: 800, fontSize: '1rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>{label}</span>
                                    <span>{opt.replace(/^[A-D]\)\s*/, '')}</span>
                                </button>
                            )
                        })}
                    </div>

                    <style>{`
                        @keyframes pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
                    `}</style>
                </div>
            </div>
        )
    }

    // ── ANSWERED ──────────────────────────────────────────────
    if (state === STATES.ANSWERED) {
        return (
            <div style={baseStyle}>
                <div style={{ textAlign: 'center', maxWidth: '380px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(16,185,129,0.15)',
                            border: '2px solid rgba(16,185,129,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto'
                        }}>
                            <CheckCircle size={40} color="#10b981" />
                        </div>
                    </div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '10px' }}>
                        Ответ принят!
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1rem', lineHeight: 1.6, marginBottom: '24px' }}>
                        Вы выбрали вариант <strong style={{ color: '#a5b4fc', fontSize: '1.2rem' }}>{chosenAnswer}</strong>
                    </p>
                    <div style={{ padding: '14px 20px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                        <Clock size={15} /> Ожидайте следующего вопроса...
                    </div>
                </div>
            </div>
        )
    }

    return null
}
