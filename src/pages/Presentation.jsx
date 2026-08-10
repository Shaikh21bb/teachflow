import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { 
    ChevronLeft, ChevronRight, X, Maximize, Minimize,
    Clock, List, StickyNote, PlayCircle, 
    BookOpen, Users, Timer, Pause, Play,
    Target, Layers, HelpCircle, CheckCircle, AlertCircle,
    RotateCcw, ArrowLeft, Radio, Copy, StopCircle
} from 'lucide-react'
import { lessonsAPI, lessonFilesAPI, liveAPI, API_BASE } from '../api'
import { TrophyIcon, ObjectivesIcon, HomeworkIcon, SummaryIcon, ExampleIcon, LiveDotIcon, QrCodeIcon } from '../components/Icons'

// ─── 5 Presentation Themes ─────────────────────────────────
const THEMES = {
    dark: {
        name: 'Dark',
        bg: '#0a0f1e',
        stageBg: '#0a0f1e',
        sidebar: 'rgba(15,23,42,0.95)',
        topbar: 'rgba(15,23,42,0.95)',
        card: 'rgba(255,255,255,0.04)',
        cardBorder: 'rgba(255,255,255,0.08)',
        accent: '#6366f1',
        accentGlow: 'rgba(99,102,241,0.3)',
        text: 'rgba(255,255,255,0.92)',
        subtext: 'rgba(255,255,255,0.55)',
        dot: '#fff',
    },
    light: {
        name: 'Light',
        bg: '#f8fafc',
        stageBg: '#f1f5f9',
        sidebar: '#ffffff',
        topbar: 'rgba(255,255,255,0.95)',
        card: '#ffffff',
        cardBorder: '#e2e8f0',
        accent: '#4f46e5',
        accentGlow: 'rgba(79,70,229,0.15)',
        text: '#0f172a',
        subtext: '#64748b',
        dot: '#4f46e5',
    },
    ocean: {
        name: 'Ocean',
        bg: '#030f1c',
        stageBg: '#041426',
        sidebar: 'rgba(3,20,40,0.97)',
        topbar: 'rgba(3,20,40,0.97)',
        card: 'rgba(14,165,233,0.06)',
        cardBorder: 'rgba(14,165,233,0.15)',
        accent: '#0ea5e9',
        accentGlow: 'rgba(14,165,233,0.25)',
        text: 'rgba(255,255,255,0.92)',
        subtext: 'rgba(186,230,253,0.65)',
        dot: '#38bdf8',
    },
    forest: {
        name: 'Forest',
        bg: '#071a10',
        stageBg: '#0a2014',
        sidebar: 'rgba(7,26,16,0.97)',
        topbar: 'rgba(7,26,16,0.97)',
        card: 'rgba(16,185,129,0.06)',
        cardBorder: 'rgba(16,185,129,0.15)',
        accent: '#10b981',
        accentGlow: 'rgba(16,185,129,0.25)',
        text: 'rgba(255,255,255,0.92)',
        subtext: 'rgba(167,243,208,0.65)',
        dot: '#34d399',
    },
    sunset: {
        name: 'Sunset',
        bg: '#18080e',
        stageBg: '#200b12',
        sidebar: 'rgba(24,8,14,0.97)',
        topbar: 'rgba(24,8,14,0.97)',
        card: 'rgba(236,72,153,0.06)',
        cardBorder: 'rgba(236,72,153,0.15)',
        accent: '#f97316',
        accentGlow: 'rgba(249,115,22,0.25)',
        text: 'rgba(255,255,255,0.92)',
        subtext: 'rgba(253,186,116,0.7)',
        dot: '#fb923c',
    },
}
const THEME_KEYS = Object.keys(THEMES)
const THEME_DOTS = { dark: '#6366f1', light: '#4f46e5', ocean: '#0ea5e9', forest: '#10b981', sunset: '#f97316' }

// ─── Slide Builders ────────────────────────────────────────
function buildSlides(lesson, files) {
    const slides = []

    // 1. Cover slide
    slides.push({
        type: 'cover',
        title: lesson.title,
        subject: lesson.subject,
        grade: lesson.grade,
        duration: lesson.duration,
        thumbnail: lesson.thumbnail_url,
        description: lesson.description,
        note: `Урок: ${lesson.title}. Класс: ${lesson.grade || '—'}. Длительность: ${lesson.duration || '?'} мин.`
    })

    // 2. Content slides (split by double newline)
    if (lesson.content) {
        const paragraphs = lesson.content.split(/\n\n+/).filter(p => p.trim())
        paragraphs.forEach((p, i) => {
            slides.push({ 
                type: 'text', 
                content: p.trim(),
                note: `Слайд ${i + 2}. Объясните материал своими словами.`
            })
        })
    }

    // 3. YouTube slides
    const ytFiles = (files || []).filter(f => f.file_type === 'youtube')
    ytFiles.forEach(f => {
        slides.push({ 
            type: 'youtube', url: f.file_url, title: f.file_name,
            note: `Видео: ${f.file_name}. Дайте ученикам время посмотреть.`
        })
    })

    // 4. Image slides
    const imageFiles = (files || []).filter(f => f.file_type === 'image')
    imageFiles.forEach(f => {
        slides.push({ 
            type: 'image', url: f.file_url, title: f.file_name,
            note: `Изображение: ${f.file_name}. Обсудите с учениками.`
        })
    })

    // 5. Video files
    const videoFiles = (files || []).filter(f => f.file_type === 'video')
    videoFiles.forEach(f => {
        slides.push({ 
            type: 'video', url: f.file_url, title: f.file_name,
            note: `Видео: ${f.file_name}.`
        })
    })

    // 6. End slide
    slides.push({ 
        type: 'end', 
        title: 'Урок завершён!', 
        subtitle: 'Отличная работа!',
        note: 'Подведите итоги. Задайте вопросы классу.'
    })

    return slides
}

// ─── Timer Hook ────────────────────────────────────────────
function useTimer() {
    const [seconds, setSeconds] = useState(0)
    const [running, setRunning] = useState(true)
    const ref = useRef(null)

    useEffect(() => {
        if (running) {
            ref.current = setInterval(() => setSeconds(s => s + 1), 1000)
        } else {
            clearInterval(ref.current)
        }
        return () => clearInterval(ref.current)
    }, [running])

    const fmt = (s) => {
        const m = Math.floor(s / 60).toString().padStart(2, '0')
        const sec = (s % 60).toString().padStart(2, '0')
        return `${m}:${sec}`
    }

    return { time: fmt(seconds), running, toggleTimer: () => setRunning(r => !r), reset: () => setSeconds(0) }
}

// ─── Slide Thumbnail ───────────────────────────────────────
function SlideThumbnail({ slide, index, isCurrent, onClick, theme }) {
    const T = THEMES[theme] || THEMES.dark
    const isLight = theme === 'light'
    const label = {
        cover: 'Обложка', text: `Слайд ${index + 1}`,
        youtube: 'Видео', image: 'Фото', video: 'Видео', end: 'Итог',
        objectives: 'Цели', content: slide.title || `Слайд ${index + 1}`,
        example: 'Пример', poll: 'Опрос', quiz_slide: 'Тест',
        homework: 'Задание', summary: 'Итоги'
    }[slide.type] || `Слайд ${index + 1}`

    const typeColor = {
        cover: '#6366f1', text: '#a5b4fc', youtube: '#ef4444',
        image: '#10b981', video: '#f59e0b', end: '#fbbf24',
        objectives: '#06b6d4', content: '#8b5cf6', example: '#f97316',
        poll: '#ec4899', quiz_slide: '#3b82f6', homework: '#10b981', summary: '#6366f1'
    }[slide.type] || T.accent

    return (
        <button onClick={onClick} style={{
            width: '100%', padding: '9px 10px', border: 'none', borderRadius: '9px',
            background: isCurrent
                ? (isLight ? `${T.accent}15` : `${T.accent}25`)
                : 'transparent',
            color: isCurrent ? T.accent : T.subtext,
            cursor: 'pointer', textAlign: 'left', fontSize: '0.75rem', fontWeight: isCurrent ? 700 : 400,
            borderLeft: isCurrent ? `3px solid ${T.accent}` : `3px solid ${typeColor}30`,
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: '8px'
        }}>
            <span style={{
                minWidth: '20px', height: '20px', borderRadius: '50%',
                background: isCurrent ? T.accent : `${typeColor}20`,
                border: `1.5px solid ${isCurrent ? T.accent : typeColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 700,
                color: isCurrent ? 'white' : typeColor, flexShrink: 0
            }}>{index + 1}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </button>
    )
}

// ─── Main Component ────────────────────────────────────────
export default function Presentation() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const [lesson, setLesson] = useState(null)
    const [slides, setSlides] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showSidebar, setShowSidebar] = useState(true)
    const [showNotes, setShowNotes] = useState(false)
    const [theme, setTheme] = useState('dark')
    const [showThemePicker, setShowThemePicker] = useState(false)
    const [pollAnswers, setPollAnswers] = useState({}) // slideIndex → chosen option
    const { time, running, toggleTimer, reset } = useTimer()

    // ── Live session state ──────────────────────────────────
    const [liveSession, setLiveSession] = useState(null)   // { code, join_url, qr_url }
    const [showLiveModal, setShowLiveModal] = useState(false)
    const [liveStats, setLiveStats] = useState(null)       // poll result stats
    const [liveParticipants, setLiveParticipants] = useState(0)
    const [liveLoading, setLiveLoading] = useState(false)
    const [codeCopied, setCodeCopied] = useState(false)
    const liveStatsInterval = useRef(null)
    const liveEventSource = useRef(null)

    useEffect(() => {
        async function fetchData() {
            try {
                const lessonData = await lessonsAPI.getById(id)
                setLesson(lessonData)
                // Use slides_json if available, otherwise fallback to buildSlides
                if (lessonData.slides_json) {
                    let parsed = lessonData.slides_json
                    if (typeof parsed === 'string') {
                        try { parsed = JSON.parse(parsed) } catch { parsed = null }
                    }
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        // Add end slide
                        setSlides([...parsed, { type: 'end', title: 'Урок завершён!', subtitle: 'Отличная работа!' }])
                        setTheme(lessonData.theme || 'dark')
                        setLoading(false)
                        return
                    }
                }
                const filesData = await lessonFilesAPI.getByLesson(id).catch(() => [])
                setSlides(buildSlides(lessonData, filesData))
                setTheme(lessonData.theme || 'dark')
            } catch (err) {
                console.error(err)
                alert('Ошибка загрузки урока')
                navigate('/my-lessons')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [id, navigate])

    // Auto-start live session if ?live=true
    useEffect(() => {
        if (searchParams.get('live') === 'true' && lesson && !liveSession) {
            startLiveSession()
        }
    }, [lesson])

    // Cleanup live on unmount
    useEffect(() => {
        return () => {
            clearInterval(liveStatsInterval.current)
            if (liveEventSource.current) liveEventSource.current.close()
        }
    }, [])

    // ── Live session handlers ───────────────────────────────
    const startLiveSession = useCallback(async () => {
        if (liveLoading || liveSession) return
        setLiveLoading(true)
        try {
            const session = await liveAPI.start(lesson?.id || null)
            setLiveSession(session)
            setLiveParticipants(0)
            setShowLiveModal(true)
            // Connect SSE to track participants + stats
            const es = new EventSource(`${API_BASE}/live/${session.code}/events`)
            liveEventSource.current = es
            es.addEventListener('participant-joined', e => {
                const d = JSON.parse(e.data)
                setLiveParticipants(d.participants_count)
            })
            es.addEventListener('answer-update', e => {
                const d = JSON.parse(e.data)
                setLiveStats(d.stats)
            })
        } catch (err) {
            alert('Не удалось создать Live-сессию: ' + err.message)
        } finally {
            setLiveLoading(false)
        }
    }, [lesson, liveLoading, liveSession])

    const endLiveSession = useCallback(async () => {
        if (!liveSession) return
        try {
            await liveAPI.endSession(liveSession.code)
        } catch { /* silent */ }
        clearInterval(liveStatsInterval.current)
        if (liveEventSource.current) { liveEventSource.current.close(); liveEventSource.current = null }
        setLiveSession(null)
        setLiveStats(null)
        setLiveParticipants(0)
        setShowLiveModal(false)
    }, [liveSession])

    // Push slide change to students whenever currentSlide changes (if live)
    useEffect(() => {
        if (!liveSession) return
        const slide = slides[currentSlide]
        const activePoll = (slide?.type === 'poll' || slide?.type === 'quiz_slide') ? slide : null
        liveAPI.changeSlide(liveSession.code, currentSlide, activePoll).catch(() => {})
        // Fetch stats for the new slide
        if (activePoll) {
            setLiveStats(null) // reset
            liveStatsInterval.current = setInterval(async () => {
                try {
                    const s = await liveAPI.getStats(liveSession.code)
                    setLiveStats(s.stats)
                    setLiveParticipants(s.participants_count || 0)
                } catch { /* silent */ }
            }, 2000)
        } else {
            clearInterval(liveStatsInterval.current)
            setLiveStats(null)
        }
        return () => clearInterval(liveStatsInterval.current)
    }, [currentSlide, liveSession])

    const copyJoinLink = () => {
        if (!liveSession) return
        navigator.clipboard.writeText(liveSession.join_url).catch(() => {})
        setCodeCopied(true)
        setTimeout(() => setCodeCopied(false), 2000)
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide()
            if (e.key === 'ArrowLeft') prevSlide()
            if (e.key === 'Escape') navigate('/my-lessons')
            if (e.key === 'f' || e.key === 'F') handleFullscreen()
            if (e.key === 'n' || e.key === 'N') setShowNotes(v => !v)
            if (e.key === 's' || e.key === 'S') setShowSidebar(v => !v)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentSlide, slides.length])

    const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))
    const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0))
    const handleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen()
            setIsFullscreen(true)
        } else {
            document.exitFullscreen?.()
            setIsFullscreen(false)
        }
    }

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement)
        document.addEventListener('fullscreenchange', handler)
        return () => document.removeEventListener('fullscreenchange', handler)
    }, [])

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#0f172a', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <PlayCircle size={28} color="white" />
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem' }}>Подготовка урока...</div>
            </div>
        )
    }

    if (!lesson || slides.length === 0) return null

    const slide = slides[currentSlide]
    const progress = ((currentSlide + 1) / slides.length) * 100

    const T = THEMES[theme] || THEMES.dark
    const isLight = theme === 'light'

    return (
        <div style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: T.stageBg,
            color: T.text,
            zIndex: 99999, display: 'flex', flexDirection: 'column',
            fontFamily: "'Outfit', 'Inter', sans-serif"
        }}>

            {/* ── TOP BAR ── */}
            <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', 
                background: T.topbar,
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
                zIndex: 10, gap: '16px', flexShrink: 0
            }}>
                {/* Left: Close + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <button onClick={() => navigate('/my-lessons')} title="Закрыть (Esc)" style={{
                        background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
                        border: 'none', color: T.subtext,
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        transition: 'all 0.2s'
                    }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                       onMouseLeave={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'}>
                        <X size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ 
                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                            background: `linear-gradient(135deg,${T.accent},${T.accent}cc)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <BookOpen size={16} color="white" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: T.text }}>
                                {lesson.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: T.subtext, display: 'flex', gap: '8px' }}>
                                {lesson.subject && <span>{lesson.subject}</span>}
                                {lesson.grade && <span>· {lesson.grade} класс</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: slide counter */}
                <div style={{ 
                    background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)',
                    borderRadius: '10px', padding: '6px 16px', fontSize: '0.85rem', fontWeight: 600,
                    color: T.subtext, whiteSpace: 'nowrap', flexShrink: 0
                }}>
                    {currentSlide + 1} / {slides.length}
                </div>

                {/* Right: Theme + Timer + Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>

                    {/* Live button */}
                    {!liveSession ? (
                        <button
                            onClick={startLiveSession}
                            disabled={liveLoading}
                            title="Запустить Live-сессию"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.35)',
                                borderRadius: '10px', padding: '6px 14px',
                                color: '#f87171', fontWeight: 700, fontSize: '0.8rem',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                        >
                            <LiveDotIcon size={16} color="#ef4444" />
                            {liveLoading ? 'Запуск...' : 'Live'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setShowLiveModal(v => !v)}
                            title="Открыть Live-панель"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'rgba(239,68,68,0.2)',
                                border: '1px solid rgba(239,68,68,0.5)',
                                borderRadius: '10px', padding: '6px 12px',
                                color: '#f87171', fontWeight: 700, fontSize: '0.8rem',
                                cursor: 'pointer', animation: 'livePulse 2s ease infinite'
                            }}
                        >
                            <LiveDotIcon size={16} color="#ef4444" />
                            Live · {liveParticipants}
                        </button>
                    )}

                    {/* Theme picker */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => setShowThemePicker(v => !v)}
                            title="Тема оформления"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
                                border: 'none', borderRadius: '10px', padding: '6px 10px',
                                cursor: 'pointer', transition: 'all 0.2s'
                            }}
                        >
                            {THEME_KEYS.map(k => (
                                <div key={k} style={{
                                    width: '10px', height: '10px', borderRadius: '50%',
                                    background: THEME_DOTS[k],
                                    border: theme === k ? '2px solid white' : '2px solid transparent',
                                    transition: 'all 0.15s'
                                }} />
                            ))}
                        </button>
                        {showThemePicker && (
                            <>
                                <div style={{ position: 'fixed', inset: 0, zIndex: 999 }} onClick={() => setShowThemePicker(false)} />
                                <div style={{
                                    position: 'absolute', top: '110%', right: 0, zIndex: 1000,
                                    background: T.topbar, borderRadius: '14px',
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                    border: `1px solid ${isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)'}`,
                                    padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '140px'
                                }}>
                                    {THEME_KEYS.map(k => (
                                        <button key={k} onClick={() => { setTheme(k); setShowThemePicker(false) }} style={{
                                            display: 'flex', alignItems: 'center', gap: '10px',
                                            padding: '8px 12px', border: 'none', borderRadius: '9px',
                                            background: theme === k ? `${THEME_DOTS[k]}20` : 'transparent',
                                            cursor: 'pointer', color: T.text, fontWeight: theme === k ? 700 : 500,
                                            fontSize: '0.85rem', transition: 'all 0.15s'
                                        }}>
                                            <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: THEME_DOTS[k], flexShrink: 0 }} />
                                            {THEMES[k].name}
                                            {theme === k && <CheckCircle size={13} color={THEME_DOTS[k]} style={{ marginLeft: 'auto' }} />}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Timer */}
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: running ? `${T.accent}15` : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'),
                        border: `1px solid ${running ? T.accent + '40' : (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)')}`,
                        borderRadius: '10px', padding: '6px 12px'
                    }}>
                        <Timer size={14} color={running ? T.accent : T.subtext} />
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700, color: running ? T.accent : T.subtext, minWidth: '42px' }}>
                            {time}
                        </span>
                        <button onClick={toggleTimer} style={{
                            background: 'none', border: 'none', color: T.subtext,
                            cursor: 'pointer', padding: '2px', borderRadius: '4px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {running ? <Pause size={13} /> : <Play size={13} />}
                        </button>
                    </div>

                    {/* Notes toggle */}
                    <button onClick={() => setShowNotes(v => !v)} title="Заметки (N)" style={{
                        background: showNotes ? 'rgba(245,158,11,0.2)' : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'),
                        border: showNotes ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                        color: showNotes ? '#fbbf24' : T.subtext,
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <StickyNote size={16} />
                    </button>

                    {/* Sidebar toggle */}
                    <button onClick={() => setShowSidebar(v => !v)} title="Слайды (S)" style={{
                        background: showSidebar ? `${T.accent}25` : (isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)'),
                        border: showSidebar ? `1px solid ${T.accent}50` : '1px solid transparent',
                        color: showSidebar ? T.accent : T.subtext,
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <List size={16} />
                    </button>

                    {/* Fullscreen */}
                    <button onClick={handleFullscreen} title="Полный экран (F)" style={{
                        background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.07)',
                        border: 'none', color: T.subtext,
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                </div>
            </div>

            {/* ── LIVE MODAL OVERLAY ── */}
            {liveSession && showLiveModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 199999,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '24px'
                }} onClick={() => setShowLiveModal(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: '#1e1b4b', borderRadius: '24px',
                            padding: '32px', maxWidth: '420px', width: '100%',
                            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                            border: '1px solid rgba(139,92,246,0.3)',
                            color: 'white'
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <LiveDotIcon size={20} color="#ef4444" />
                                <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>Live-сессия активна</span>
                            </div>
                            <button onClick={() => setShowLiveModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                <X size={18} />
                            </button>
                        </div>

                        {/* QR code */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <img
                                src={liveSession.qr_url}
                                alt="QR для подключения"
                                style={{ width: '200px', height: '200px', borderRadius: '16px', background: 'white', padding: '8px' }}
                            />
                        </div>

                        {/* Code */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '1px' }}>Код урока</div>
                            <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '8px', color: '#a5b4fc', fontFamily: 'monospace' }}>
                                {liveSession.code}
                            </div>
                        </div>

                        {/* Join URL */}
                        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                                {liveSession.join_url}
                            </span>
                            <button
                                onClick={copyJoinLink}
                                style={{ background: codeCopied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 10px', color: codeCopied ? '#10b981' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600, flexShrink: 0, transition: 'all 0.2s' }}
                            >
                                {codeCopied ? <CheckCircle size={14} /> : <Copy size={14} />}
                                {codeCopied ? 'Скопировано' : 'Скопировать'}
                            </button>
                        </div>

                        {/* Participants */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '20px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                            <Users size={16} />
                            <span>{liveParticipants} участников подключено</span>
                        </div>

                        {/* End session */}
                        <button
                            onClick={endLiveSession}
                            style={{
                                width: '100%', padding: '12px', background: 'rgba(239,68,68,0.15)',
                                border: '1px solid rgba(239,68,68,0.35)', borderRadius: '12px',
                                color: '#f87171', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                fontSize: '0.9rem', transition: 'all 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.25)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.15)'}
                        >
                            <StopCircle size={16} /> Завершить сессию
                        </button>
                    </div>
                </div>
            )}

            {/* ── MAIN CONTENT AREA ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── SIDEBAR ── */}
                {showSidebar && (
                    <div style={{
                        width: '220px', flexShrink: 0,
                        background: T.sidebar,
                        borderRight: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
                        overflowY: 'auto', padding: '12px 10px',
                        display: 'flex', flexDirection: 'column', gap: '3px'
                    }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: T.subtext, textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 4px 8px' }}>
                            ПЛАН УРОКА
                        </div>
                        {slides.map((s, i) => (
                            <SlideThumbnail
                                key={i} slide={s} index={i}
                                isCurrent={i === currentSlide}
                                onClick={() => setCurrentSlide(i)}
                                theme={theme}
                            />
                        ))}
                    </div>
                )}

                {/* ── SLIDE STAGE ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: T.stageBg }}>
                    
                    {/* Slide */}
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        padding: '40px', position: 'relative', overflow: 'auto'
                    }}>
                        <div key={currentSlide} style={{
                            width: '100%', maxWidth: '960px',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            animation: 'slideIn 0.35s cubic-bezier(0.16,1,0.3,1)'
                        }}>

                            {/* ── COVER ── */}
                            {slide.type === 'cover' && (
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
                                    {slide.thumbnail ? (
                                        <img src={slide.thumbnail} alt="Cover" style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '24px', boxShadow: `0 30px 60px rgba(0,0,0,0.4)` }} />
                                    ) : (
                                        <div style={{ width: '110px', height: '110px', borderRadius: '28px', background: `linear-gradient(135deg,${T.accent},${T.accent}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 20px 40px ${T.accentGlow}` }}>
                                            <BookOpen size={48} color="white" />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {slide.subject && <span style={{ background: `${T.accent}20`, color: T.accent, padding: '8px 20px', borderRadius: '30px', fontWeight: 700, fontSize: '1rem', border: `1px solid ${T.accent}40` }}>{slide.subject}</span>}
                                        {slide.grade && <span style={{ background: `${T.accent}15`, color: T.text, padding: '8px 20px', borderRadius: '30px', fontWeight: 700, fontSize: '1rem', border: `1px solid ${T.cardBorder}` }}>{slide.grade} класс</span>}
                                        {slide.duration && <span style={{ background: `${T.accent}10`, color: T.subtext, padding: '8px 20px', borderRadius: '30px', fontWeight: 700, fontSize: '1rem', border: `1px solid ${T.cardBorder}`, display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={14} /> {slide.duration} мин</span>}
                                    </div>
                                    <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, margin: 0, lineHeight: 1.15, letterSpacing: '-1px', color: T.text }}>
                                        {slide.title}
                                    </h1>
                                    {(slide.subtitle || slide.description) && (
                                        <p style={{ fontSize: '1.2rem', color: T.subtext, maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
                                            {slide.subtitle || slide.description}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        {[0,0.3,0.6].map(d => <div key={d} style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.accent, animation: `pulseDot 1.5s ease-in-out ${d}s infinite` }} />)}
                                    </div>
                                </div>
                            )}

                            {/* ── OBJECTIVES ── */}
                            {slide.type === 'objectives' && (
                                <div style={{ width: '100%', maxWidth: '800px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ObjectivesIcon size={26} color={T.accent} />
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 900, color: T.text }}>{slide.title}</h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {(slide.items || []).map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', padding: '16px 20px', background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: '14px', borderLeft: `4px solid ${T.accent}` }}>
                                                <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: T.accent, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                                                <span style={{ fontSize: 'clamp(1rem,2vw,1.2rem)', color: T.text, lineHeight: 1.5 }}>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── CONTENT (bullets) ── */}
                            {slide.type === 'content' && (
                                <div style={{ width: '100%', maxWidth: '860px' }}>
                                    <h2 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 900, margin: '0 0 28px', color: T.text, lineHeight: 1.2 }}>{slide.title}</h2>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {(slide.bullets || []).map((b, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 18px', background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: '12px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.accent, flexShrink: 0, marginTop: '8px' }} />
                                                <span style={{ fontSize: 'clamp(1rem,1.8vw,1.25rem)', color: T.text, lineHeight: 1.6 }}>{b}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── TEXT (legacy) ── */}
                            {slide.type === 'text' && (
                                <div style={{ background: T.card, borderRadius: '24px', border: `1px solid ${T.cardBorder}`, padding: 'clamp(32px,5vw,60px)', maxWidth: '860px', width: '100%', boxShadow: `0 20px 60px rgba(0,0,0,0.15)` }}>
                                    <p style={{ fontSize: 'clamp(1.1rem,2.5vw,1.6rem)', lineHeight: 1.75, color: T.text, margin: 0, fontWeight: 400, whiteSpace: 'pre-wrap' }}>
                                        {slide.content}
                                    </p>
                                </div>
                            )}

                            {/* ── EXAMPLE ── */}
                            {slide.type === 'example' && (
                                <div style={{ width: '100%', maxWidth: '860px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(249,115,22,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <ExampleIcon size={22} color="#f97316" />
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 900, color: T.text }}>{slide.title}</h2>
                                    </div>
                                    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderLeft: '5px solid #f97316', borderRadius: '14px', padding: '24px 28px', marginBottom: '16px' }}>
                                        <p style={{ margin: 0, fontSize: 'clamp(1rem,2vw,1.25rem)', color: T.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{slide.content}</p>
                                    </div>
                                    {slide.highlight && (
                                        <div style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '12px', padding: '16px 22px', textAlign: 'center' }}>
                                            <span style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', fontWeight: 800, color: '#f97316', letterSpacing: '0.5px' }}>{slide.highlight}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── POLL ── */}
                            {slide.type === 'poll' && (
                                <div style={{ width: '100%', maxWidth: '800px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
                                        <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'rgba(236,72,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <HelpCircle size={22} color="#ec4899" />
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: 'clamp(1.3rem,2.8vw,1.9rem)', fontWeight: 900, color: T.text, lineHeight: 1.3 }}>{slide.question || slide.title}</h2>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {(slide.options || []).map((opt, i) => {
                                            const label = ['A','B','C','D'][i]
                                            const chosen = pollAnswers[currentSlide] === label
                                            const isCorrect = slide.correct === label
                                            const answered = pollAnswers[currentSlide] !== undefined
                                            return (
                                                <button key={i} onClick={() => setPollAnswers(p => ({ ...p, [currentSlide]: label }))} style={{
                                                    padding: '16px 20px', border: `2px solid ${chosen ? '#ec4899' : T.cardBorder}`,
                                                    borderRadius: '14px', background: chosen ? 'rgba(236,72,153,0.15)' : T.card,
                                                    color: T.text, textAlign: 'left', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '14px',
                                                    fontSize: 'clamp(0.9rem,1.6vw,1.1rem)', fontWeight: 500,
                                                    transition: 'all 0.2s'
                                                }}>
                                                    <span style={{ width: '32px', height: '32px', borderRadius: '8px', background: chosen ? '#ec4899' : `${T.accent}20`, color: chosen ? 'white' : T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{label}</span>
                                                    {opt.replace(/^[A-D]\)\s*/,'')}
                                                    {answered && isCorrect && <CheckCircle size={16} color="#10b981" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    {pollAnswers[currentSlide] && (
                                        <div style={{ marginTop: '16px', padding: '12px 18px', borderRadius: '12px', background: pollAnswers[currentSlide] === slide.correct ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', border: `1px solid ${pollAnswers[currentSlide] === slide.correct ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            {pollAnswers[currentSlide] === slide.correct ? <CheckCircle size={18} color="#10b981" /> : <AlertCircle size={18} color="#ef4444" />}
                                            <span style={{ color: T.text, fontSize: '0.95rem' }}>
                                                {pollAnswers[currentSlide] === slide.correct ? 'Верно!' : `Правильный ответ: ${slide.correct}`}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── HOMEWORK ── */}
                            {slide.type === 'homework' && (
                                <div style={{ width: '100%', maxWidth: '800px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <HomeworkIcon size={26} color="#10b981" />
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 900, color: T.text }}>{slide.title}</h2>
                                    </div>
                                    <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderLeft: '5px solid #10b981', borderRadius: '16px', padding: '28px 32px' }}>
                                        <p style={{ margin: '0 0 20px', fontSize: 'clamp(1rem,2vw,1.25rem)', color: T.text, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{slide.content}</p>
                                        {slide.due && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: 'rgba(16,185,129,0.1)', borderRadius: '10px', width: 'fit-content' }}>
                                                <Clock size={14} color="#10b981" />
                                                <span style={{ fontSize: '0.9rem', color: '#10b981', fontWeight: 600 }}>{slide.due}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* ── SUMMARY ── */}
                            {slide.type === 'summary' && (
                                <div style={{ width: '100%', maxWidth: '800px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '32px' }}>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '16px', background: `${T.accent}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <SummaryIcon size={26} color={T.accent} />
                                        </div>
                                        <h2 style={{ margin: 0, fontSize: 'clamp(1.6rem,3.5vw,2.4rem)', fontWeight: 900, color: T.text }}>{slide.title}</h2>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {(slide.items || []).map((item, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: '12px' }}>
                                                <CheckCircle size={18} color={T.accent} style={{ flexShrink: 0 }} />
                                                <span style={{ fontSize: 'clamp(1rem,1.8vw,1.2rem)', color: T.text, lineHeight: 1.5 }}>{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ── YOUTUBE ── */}
                            {slide.type === 'youtube' && (() => {
                                const match = slide.url?.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)
                                const videoId = match?.[1]
                                return videoId ? (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        {slide.title && <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: T.text }}>{slide.title}</h2>}
                                        <div style={{ width: '100%', maxWidth: '900px', aspectRatio: '16/9', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                            <iframe src={`https://www.youtube.com/embed/${videoId}?rel=0`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
                                        </div>
                                    </div>
                                ) : <div style={{ color: T.subtext, fontSize: '1.2rem' }}>Неверная ссылка YouTube</div>
                            })()}

                            {/* ── IMAGE ── */}
                            {slide.type === 'image' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                    {slide.title && <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: T.text }}>{slide.title}</h2>}
                                    <img src={slide.url} alt={slide.title} style={{ maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                                </div>
                            )}

                            {/* ── VIDEO ── */}
                            {slide.type === 'video' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                                    {slide.title && <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: T.text }}>{slide.title}</h2>}
                                    <video src={slide.url} controls style={{ maxWidth: '100%', maxHeight: '65vh', borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} />
                                </div>
                            )}

                            {/* ── END ── */}
                            {slide.type === 'end' && (
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
                                    <div style={{ animation: 'bounce 1s ease infinite' }}>
                                        <TrophyIcon size={96} color="#fbbf24" />
                                    </div>
                                    <div>
                                        <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px', color: T.text }}>{slide.title}</h1>
                                        <p style={{ fontSize: '1.3rem', color: T.subtext, margin: 0 }}>{slide.subtitle}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <button onClick={() => navigate('/my-lessons')} style={{ padding: '14px 32px', background: `linear-gradient(135deg,${T.accent},${T.accent}cc)`, color: 'white', border: 'none', borderRadius: '14px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer', boxShadow: `0 8px 24px ${T.accentGlow}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <ArrowLeft size={18} /> Вернуться к урокам
                                        </button>
                                        <button onClick={() => { setCurrentSlide(0); setPollAnswers({}) }} style={{ padding: '14px 32px', background: T.card, color: T.text, border: `1px solid ${T.cardBorder}`, borderRadius: '14px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <RotateCcw size={18} /> Начать заново
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: T.subtext }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Timer size={14} /> {time}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><List size={14} /> {slides.length} слайдов</span>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* ── NAV ARROWS ── */}
                        {currentSlide > 0 && (
                            <button onClick={prevSlide} style={{
                                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                                background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)',
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${T.cardBorder}`, color: T.text,
                                width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}
                               onMouseLeave={e => e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.08)'}>
                                <ChevronLeft size={28} />
                            </button>
                        )}
                        {currentSlide < slides.length - 1 && (
                            <button onClick={nextSlide} style={{
                                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                background: `linear-gradient(135deg,${T.accent}50,${T.accent}30)`,
                                backdropFilter: 'blur(10px)',
                                border: `1px solid ${T.accent}50`, color: T.text,
                                width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = `linear-gradient(135deg,${T.accent}80,${T.accent}50)`}
                               onMouseLeave={e => e.currentTarget.style.background = `linear-gradient(135deg,${T.accent}50,${T.accent}30)`}>
                                <ChevronRight size={28} />
                            </button>
                        )}
                    </div>

                    {/* ── LIVE STATS BARS (for poll slides) ── */}
                    {liveSession && liveStats && (
                        <div style={{
                            flexShrink: 0, borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
                            background: isLight ? 'rgba(239,68,68,0.04)' : 'rgba(239,68,68,0.06)',
                            padding: '14px 28px', display: 'flex', flexDirection: 'column', gap: '8px'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <LiveDotIcon size={14} color="#ef4444" />
                                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    ОТВЕТЫ УЧЕНИКОВ — {liveStats.total || 0} из {liveParticipants}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                                {Object.entries(liveStats.percentages || {}).map(([label, pct]) => {
                                    const isCorrect = liveStats.correct === label
                                    const barColor = isCorrect ? '#10b981' : T.accent
                                    return (
                                        <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                                <span style={{ fontWeight: 700, color: isCorrect ? '#10b981' : T.text }}>{label}</span>
                                                <span style={{ color: T.subtext }}>{pct}%</span>
                                            </div>
                                            <div style={{ height: '6px', background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '100%', borderRadius: '3px',
                                                    background: barColor,
                                                    width: `${pct}%`,
                                                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                                                    boxShadow: `0 0 8px ${barColor}60`
                                                }} />
                                            </div>
                                            <div style={{ fontSize: '0.65rem', color: T.subtext, textAlign: 'center' }}>
                                                {liveStats.counts?.[label] || 0}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* ── NOTES PANEL ── */}
                    {showNotes && (
                        <div style={{
                            flexShrink: 0, borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'}`,
                            background: 'rgba(245,158,11,0.05)', padding: '16px 32px',
                            display: 'flex', gap: '12px', alignItems: 'flex-start', maxHeight: '130px'
                        }}>
                            <StickyNote size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                    ЗАМЕТКИ УЧИТЕЛЯ
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: T.text, lineHeight: 1.5 }}>
                                    {slide.note || 'Нет заметок для этого слайда.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── PROGRESS BAR ── */}
                    <div style={{ height: '4px', background: isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.07)', flexShrink: 0 }}>
                        <div style={{
                            height: '100%',
                            background: `linear-gradient(90deg,${T.accent},${T.accent}cc)`,
                            width: `${progress}%`,
                            transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                            boxShadow: `0 0 10px ${T.accentGlow}`
                        }} />
                    </div>
                </div>
            </div>

            {/* ── BOTTOM KEYBOARD HINTS ── */}
            <div style={{
                display: 'flex', gap: '20px', justifyContent: 'center', padding: '8px',
                background: T.topbar, borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.04)'}`,
                flexShrink: 0
            }}>
                {[
                    ['← →', 'Слайды'], ['Space', 'Вперёд'], ['F', 'Полный экран'],
                    ['N', 'Заметки'], ['S', 'Список'], ['Esc', 'Выход'],
                ].map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: T.subtext }}>
                        <kbd style={{
                            background: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.08)',
                            border: `1px solid ${T.cardBorder}`,
                            borderRadius: '5px', padding: '2px 7px', fontFamily: 'monospace', fontSize: '0.7rem', color: T.subtext
                        }}>{key}</kbd>
                        <span>{label}</span>
                    </div>
                ))}
            </div>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(20px) scale(0.98); }
                    to   { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes pulseDot {
                    0%, 100% { transform: scale(1); opacity: 0.6; }
                    50% { transform: scale(1.4); opacity: 1; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-12px); }
                }
                @keyframes livePulse {
                    0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.4); }
                    50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
                }
            `}</style>
        </div>
    )
}
