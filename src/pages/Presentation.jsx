import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
    ChevronLeft, ChevronRight, X, Maximize, Minimize,
    Clock, List, StickyNote, PlayCircle, ChevronDown, ChevronUp,
    BookOpen, Users, Timer
} from 'lucide-react'
import { lessonsAPI, lessonFilesAPI } from '../api'

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
        subtitle: 'Отличная работа! 🎉',
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
function SlideThumbnail({ slide, index, isCurrent, onClick }) {
    const label = {
        cover: '🎯 Обложка',
        text: `📝 Слайд ${index + 1}`,
        youtube: '▶️ Видео',
        image: '🖼️ Фото',
        video: '📹 Видео',
        end: '🎉 Итог'
    }[slide.type] || `Слайд ${index + 1}`

    return (
        <button
            onClick={onClick}
            style={{
                width: '100%', padding: '10px 12px', border: 'none', borderRadius: '10px',
                background: isCurrent 
                    ? 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))' 
                    : 'rgba(255,255,255,0.05)',
                color: isCurrent ? '#a5b4fc' : 'rgba(255,255,255,0.6)',
                cursor: 'pointer', textAlign: 'left', fontSize: '0.78rem', fontWeight: isCurrent ? 700 : 400,
                borderLeft: isCurrent ? '3px solid #818cf8' : '3px solid transparent',
                transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: '8px'
            }}
        >
            <span style={{ 
                minWidth: '22px', height: '22px', borderRadius: '50%',
                background: isCurrent ? '#6366f1' : 'rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0
            }}>{index + 1}</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        </button>
    )
}

// ─── Main Component ────────────────────────────────────────
export default function Presentation() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [lesson, setLesson] = useState(null)
    const [slides, setSlides] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentSlide, setCurrentSlide] = useState(0)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showSidebar, setShowSidebar] = useState(true)
    const [showNotes, setShowNotes] = useState(false)
    const { time, running, toggleTimer, reset } = useTimer()

    useEffect(() => {
        async function fetchData() {
            try {
                const lessonData = await lessonsAPI.getById(id)
                setLesson(lessonData)
                const filesData = await lessonFilesAPI.getByLesson(id).catch(() => [])
                setSlides(buildSlides(lessonData, filesData))
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

    return (
        <div style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: '#0a0f1e', color: 'white',
            zIndex: 99999, display: 'flex', flexDirection: 'column',
            fontFamily: "'Outfit', 'Inter', sans-serif"
        }}>

            {/* ── TOP BAR ── */}
            <div style={{ 
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 20px', 
                background: 'rgba(15,23,42,0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                zIndex: 10, gap: '16px', flexShrink: 0
            }}>
                {/* Left: Close + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <button onClick={() => navigate('/my-lessons')} title="Закрыть (Esc)" style={{
                        background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.7)',
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        transition: 'all 0.2s'
                    }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}>
                        <X size={18} />
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <div style={{ 
                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <BookOpen size={16} color="white" />
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {lesson.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', display: 'flex', gap: '8px' }}>
                                {lesson.subject && <span>{lesson.subject}</span>}
                                {lesson.grade && <span>· {lesson.grade} класс</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Center: slide counter */}
                <div style={{ 
                    background: 'rgba(255,255,255,0.05)', borderRadius: '10px', 
                    padding: '6px 16px', fontSize: '0.85rem', fontWeight: 600,
                    color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', flexShrink: 0
                }}>
                    {currentSlide + 1} / {slides.length}
                </div>

                {/* Right: Timer + Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Timer */}
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: running ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${running ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '10px', padding: '6px 12px'
                    }}>
                        <Timer size={14} color={running ? '#10b981' : 'rgba(255,255,255,0.4)'} />
                        <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700, color: running ? '#10b981' : 'rgba(255,255,255,0.5)', minWidth: '42px' }}>
                            {time}
                        </span>
                        <button onClick={toggleTimer} style={{
                            background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer', padding: '2px', fontSize: '0.7rem', borderRadius: '4px'
                        }}>{running ? '⏸' : '▶'}</button>
                    </div>

                    {/* Notes toggle */}
                    <button onClick={() => setShowNotes(v => !v)} title="Заметки (N)" style={{
                        background: showNotes ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.07)',
                        border: showNotes ? '1px solid rgba(245,158,11,0.4)' : '1px solid transparent',
                        color: showNotes ? '#fbbf24' : 'rgba(255,255,255,0.6)',
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <StickyNote size={16} />
                    </button>

                    {/* Sidebar toggle */}
                    <button onClick={() => setShowSidebar(v => !v)} title="Слайды (S)" style={{
                        background: showSidebar ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.07)',
                        border: showSidebar ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                        color: showSidebar ? '#818cf8' : 'rgba(255,255,255,0.6)',
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        <List size={16} />
                    </button>

                    {/* Fullscreen */}
                    <button onClick={handleFullscreen} title="Полный экран (F)" style={{
                        background: 'rgba(255,255,255,0.07)', border: 'none', color: 'rgba(255,255,255,0.6)',
                        width: '36px', height: '36px', borderRadius: '10px', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                    }}>
                        {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                </div>
            </div>

            {/* ── MAIN CONTENT AREA ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── SIDEBAR ── */}
                {showSidebar && (
                    <div style={{
                        width: '220px', flexShrink: 0,
                        background: 'rgba(15,23,42,0.95)',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                        overflowY: 'auto', padding: '12px 10px',
                        display: 'flex', flexDirection: 'column', gap: '4px'
                    }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 4px 8px' }}>
                            ПЛАН УРОКА
                        </div>
                        {slides.map((s, i) => (
                            <SlideThumbnail
                                key={i}
                                slide={s}
                                index={i}
                                isCurrent={i === currentSlide}
                                onClick={() => setCurrentSlide(i)}
                            />
                        ))}
                    </div>
                )}

                {/* ── SLIDE STAGE ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                    
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
                                        <img src={slide.thumbnail} alt="Cover" style={{
                                            width: '220px', height: '220px', objectFit: 'cover', borderRadius: '28px',
                                            boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
                                        }} />
                                    ) : (
                                        <div style={{
                                            width: '120px', height: '120px', borderRadius: '28px',
                                            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 20px 40px rgba(99,102,241,0.4)'
                                        }}>
                                            <BookOpen size={48} color="white" />
                                        </div>
                                    )}
                                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                        {slide.subject && (
                                            <span style={{ background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '8px 20px', borderRadius: '30px', fontWeight: 700, fontSize: '1rem', border: '1px solid rgba(99,102,241,0.3)' }}>
                                                {slide.subject}
                                            </span>
                                        )}
                                        {slide.grade && (
                                            <span style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', padding: '8px 20px', borderRadius: '30px', fontWeight: 700, fontSize: '1rem', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                {slide.grade} класс
                                            </span>
                                        )}
                                        {slide.duration && (
                                            <span style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d', padding: '8px 20px', borderRadius: '30px', fontWeight: 700, fontSize: '1rem', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Clock size={14} /> {slide.duration} мин
                                            </span>
                                        )}
                                    </div>
                                    <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, margin: 0, lineHeight: 1.15, letterSpacing: '-1px', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                                        {slide.title}
                                    </h1>
                                    {slide.description && (
                                        <p style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.65)', maxWidth: '640px', lineHeight: 1.6, margin: 0 }}>
                                            {slide.description}
                                        </p>
                                    )}
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'pulseDot 1.5s ease-in-out infinite' }} />
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', animation: 'pulseDot 1.5s ease-in-out 0.3s infinite' }} />
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#a78bfa', animation: 'pulseDot 1.5s ease-in-out 0.6s infinite' }} />
                                    </div>
                                </div>
                            )}

                            {/* ── TEXT ── */}
                            {slide.type === 'text' && (
                                <div style={{
                                    background: 'rgba(255,255,255,0.03)', borderRadius: '24px',
                                    border: '1px solid rgba(255,255,255,0.07)',
                                    padding: 'clamp(32px,5vw,60px)', maxWidth: '860px', width: '100%',
                                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
                                }}>
                                    <p style={{
                                        fontSize: 'clamp(1.1rem,2.5vw,1.6rem)', lineHeight: 1.75,
                                        color: 'rgba(255,255,255,0.9)', margin: 0, fontWeight: 400,
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {slide.content}
                                    </p>
                                </div>
                            )}

                            {/* ── YOUTUBE ── */}
                            {slide.type === 'youtube' && (() => {
                                const match = slide.url?.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)
                                const videoId = match?.[1]
                                return videoId ? (
                                    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                                        {slide.title && <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, opacity: 0.8 }}>{slide.title}</h2>}
                                        <div style={{ width: '100%', maxWidth: '900px', aspectRatio: '16/9', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                                            <iframe
                                                src={`https://www.youtube.com/embed/${videoId}?rel=0`}
                                                style={{ width: '100%', height: '100%', border: 'none' }}
                                                allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.2rem' }}>⚠️ Неверная ссылка YouTube</div>
                                )
                            })()}

                            {/* ── IMAGE ── */}
                            {slide.type === 'image' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                                    {slide.title && <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, opacity: 0.8 }}>{slide.title}</h2>}
                                    <img src={slide.url} alt={slide.title} style={{
                                        maxWidth: '100%', maxHeight: '65vh', objectFit: 'contain',
                                        borderRadius: '20px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                    }} />
                                </div>
                            )}

                            {/* ── VIDEO ── */}
                            {slide.type === 'video' && (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%' }}>
                                    {slide.title && <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, opacity: 0.8 }}>{slide.title}</h2>}
                                    <video src={slide.url} controls style={{
                                        maxWidth: '100%', maxHeight: '65vh', borderRadius: '20px',
                                        boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                                    }} />
                                </div>
                            )}

                            {/* ── END ── */}
                            {slide.type === 'end' && (
                                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
                                    <div style={{ fontSize: '6rem', animation: 'bounce 1s ease infinite' }}>🎉</div>
                                    <div>
                                        <h1 style={{ fontSize: 'clamp(2rem,5vw,3.5rem)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-1px' }}>
                                            {slide.title}
                                        </h1>
                                        <p style={{ fontSize: '1.3rem', color: 'rgba(255,255,255,0.65)', margin: 0 }}>{slide.subtitle}</p>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                        <button onClick={() => navigate('/my-lessons')} style={{
                                            padding: '14px 32px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                                            color: 'white', border: 'none', borderRadius: '14px',
                                            fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
                                            boxShadow: '0 8px 24px rgba(99,102,241,0.4)'
                                        }}>
                                            ← Вернуться к урокам
                                        </button>
                                        <button onClick={() => setCurrentSlide(0)} style={{
                                            padding: '14px 32px', background: 'rgba(255,255,255,0.08)',
                                            color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '14px',
                                            fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
                                        }}>
                                            🔄 Начать заново
                                        </button>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
                                        <span>⏱ Время урока: {time}</span>
                                        <span>📊 {slides.length} слайдов</span>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* ── NAV ARROWS ── */}
                        {currentSlide > 0 && (
                            <button onClick={prevSlide} style={{
                                position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)',
                                background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(255,255,255,0.1)', color: 'white',
                                width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                               onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}>
                                <ChevronLeft size={28} />
                            </button>
                        )}
                        {currentSlide < slides.length - 1 && (
                            <button onClick={nextSlide} style={{
                                position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)',
                                background: 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(99,102,241,0.3)', color: 'white',
                                width: '52px', height: '52px', borderRadius: '50%', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s'
                            }} onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.5),rgba(139,92,246,0.5))'}
                               onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg,rgba(99,102,241,0.3),rgba(139,92,246,0.3))'}>
                                <ChevronRight size={28} />
                            </button>
                        )}
                    </div>

                    {/* ── NOTES PANEL ── */}
                    {showNotes && (
                        <div style={{
                            flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.06)',
                            background: 'rgba(245,158,11,0.05)', padding: '16px 32px',
                            display: 'flex', gap: '12px', alignItems: 'flex-start', maxHeight: '130px'
                        }}>
                            <StickyNote size={16} color="#fbbf24" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
                                    ЗАМЕТКИ УЧИТЕЛЯ
                                </div>
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>
                                    {slide.note || 'Нет заметок для этого слайда.'}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── PROGRESS BAR ── */}
                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.07)', flexShrink: 0 }}>
                        <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                            width: `${progress}%`,
                            transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)',
                            boxShadow: '0 0 10px rgba(99,102,241,0.6)'
                        }} />
                    </div>
                </div>
            </div>

            {/* ── BOTTOM KEYBOARD HINTS ── */}
            <div style={{
                display: 'flex', gap: '20px', justifyContent: 'center', padding: '8px',
                background: 'rgba(15,23,42,0.8)', borderTop: '1px solid rgba(255,255,255,0.04)',
                flexShrink: 0
            }}>
                {[
                    ['← →', 'Слайды'],
                    ['Space', 'Вперёд'],
                    ['F', 'Полный экран'],
                    ['N', 'Заметки'],
                    ['S', 'Список'],
                    ['Esc', 'Выход'],
                ].map(([key, label]) => (
                    <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)' }}>
                        <kbd style={{
                            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '5px', padding: '2px 7px', fontFamily: 'monospace', fontSize: '0.7rem',
                            color: 'rgba(255,255,255,0.5)'
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
            `}</style>
        </div>
    )
}
