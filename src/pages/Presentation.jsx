import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, X, Maximize, PlayCircle } from 'lucide-react'
import api from '../api'

export default function Presentation() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [lesson, setLesson] = useState(null)
    const [files, setFiles] = useState([])
    const [loading, setLoading] = useState(true)
    const [currentSlide, setCurrentSlide] = useState(0)

    useEffect(() => {
        async function fetchData() {
            try {
                const lessonData = await api.lessons.getById(id)
                setLesson(lessonData)
                const filesData = await api.lessonFiles.getByLesson(id).catch(() => [])
                setFiles(filesData)
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

    // Handle Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight' || e.key === 'Space') nextSlide()
            if (e.key === 'ArrowLeft') prevSlide()
            if (e.key === 'Escape') navigate('/my-lessons')
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [currentSlide, lesson])

    // Prepare slides
    const slides = []
    
    if (lesson) {
        // 1. Cover Slide
        slides.push({
            type: 'cover',
            title: lesson.title,
            subject: lesson.subject,
            grade: lesson.grade,
            duration: lesson.duration,
            thumbnail: lesson.thumbnail_url,
            description: lesson.description
        })

        // 2. Content Slides (Split by double newlines to make readable slides)
        if (lesson.content) {
            const paragraphs = lesson.content.split(/\n\n+/).filter(p => p.trim())
            paragraphs.forEach(p => {
                slides.push({ type: 'text', content: p.trim() })
            })
        }

        // 3. Media Slides
        const ytFiles = files.filter(f => f.file_type === 'youtube')
        ytFiles.forEach(f => {
            slides.push({ type: 'youtube', url: f.file_url, title: f.file_name })
        })

        const imageFiles = files.filter(f => f.file_type === 'image')
        imageFiles.forEach(f => {
            slides.push({ type: 'image', url: f.file_url, title: f.file_name })
        })

        const videoFiles = files.filter(f => f.file_type === 'video')
        videoFiles.forEach(f => {
            slides.push({ type: 'video', url: f.file_url, title: f.file_name })
        })
        
        // Final Slide
        slides.push({ type: 'end', title: 'Конец урока', subtitle: 'Отличная работа!' })
    }

    const nextSlide = () => setCurrentSlide(prev => Math.min(prev + 1, slides.length - 1))
    const prevSlide = () => setCurrentSlide(prev => Math.max(prev - 1, 0))
    const toggleFullScreen = () => {
        if (!document.fullscreenElement) document.documentElement.requestFullscreen()
        else document.exitFullscreen?.()
    }

    if (loading) {
        return (
            <div style={{ display: 'flex', height: '100vh', background: '#0f172a', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'white', fontSize: '1.5rem', animation: 'pulse 1s infinite' }}>Загрузка презентации...</div>
            </div>
        )
    }

    if (!lesson) return null

    const slide = slides[currentSlide]

    return (
        <div className="presentation-container" style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            background: 'var(--color-gray-900, #111827)', color: 'white',
            zIndex: 99999, display: 'flex', flexDirection: 'column'
        }}>
            {/* Top Bar */}
            <div style={{ 
                display: 'flex', justifyContent: 'space-between', padding: '16px 24px', 
                background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(10px)', zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <button onClick={() => navigate('/my-lessons')} style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'background 0.2s'
                    }} className="hover-bg-white-20">
                        <X size={20} />
                    </button>
                    <span style={{ fontWeight: 600, fontSize: '1.1rem', opacity: 0.8 }}>{lesson.title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <span style={{ opacity: 0.6, fontSize: '0.9rem' }}>
                        Слайд {currentSlide + 1} из {slides.length}
                    </span>
                    <button onClick={toggleFullScreen} style={{
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        width: '40px', height: '40px', borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        transition: 'background 0.2s'
                    }} className="hover-bg-white-20" title="На весь экран">
                        <Maximize size={18} />
                    </button>
                </div>
            </div>

            {/* Slide Content */}
            <div style={{ 
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', 
                position: 'relative', overflow: 'hidden', padding: '40px' 
            }}>
                <div style={{
                    width: '100%', maxWidth: '1000px', maxHeight: '100%',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    animation: 'fadeIn 0.4s ease-out', position: 'relative'
                }} key={currentSlide}>
                    
                    {slide.type === 'cover' && (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
                            {slide.thumbnail && (
                                <img src={slide.thumbnail} alt="Cover" style={{
                                    width: '300px', height: '300px', objectFit: 'cover', borderRadius: '24px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.4)', marginBottom: '20px'
                                }} />
                            )}
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                                {slide.subject && <span style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '6px 16px', borderRadius: '20px', fontWeight: 600 }}>{slide.subject}</span>}
                                {slide.grade && <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '6px 16px', borderRadius: '20px', fontWeight: 600 }}>{slide.grade} класс</span>}
                            </div>
                            <h1 style={{ fontSize: '3.5rem', fontWeight: 800, margin: 0, lineHeight: 1.2, textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>{slide.title}</h1>
                            {slide.description && <p style={{ fontSize: '1.25rem', opacity: 0.8, maxWidth: '600px', lineHeight: 1.6 }}>{slide.description}</p>}
                        </div>
                    )}

                    {slide.type === 'text' && (
                        <div style={{ 
                            fontSize: '2rem', lineHeight: 1.6, fontWeight: 500, textAlign: 'center',
                            maxWidth: '900px', textShadow: '0 2px 8px rgba(0,0,0,0.5)'
                        }}>
                            {slide.content}
                        </div>
                    )}

                    {slide.type === 'youtube' && (
                        <div style={{ width: '100%', height: '70vh', background: 'black', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                            <iframe 
                                src={`https://www.youtube.com/embed/${slide.url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1]}?autoplay=1`}
                                style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen allow="autoplay"
                            />
                        </div>
                    )}

                    {slide.type === 'image' && (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                            <img src={slide.url} alt={slide.title} style={{ 
                                maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', 
                                borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' 
                            }} />
                            {slide.title && <span style={{ opacity: 0.6, fontSize: '1.2rem' }}>{slide.title}</span>}
                        </div>
                    )}

                    {slide.type === 'video' && (
                        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                            <video src={slide.url} controls autoPlay style={{ 
                                maxWidth: '100%', maxHeight: '70vh', borderRadius: '24px', 
                                boxShadow: '0 20px 40px rgba(0,0,0,0.4)' 
                            }} />
                        </div>
                    )}

                    {slide.type === 'end' && (
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '5rem', marginBottom: '24px' }}>🎉</div>
                            <h1 style={{ fontSize: '4rem', fontWeight: 800, margin: '0 0 16px' }}>{slide.title}</h1>
                            <p style={{ fontSize: '1.5rem', opacity: 0.8 }}>{slide.subtitle}</p>
                            <button onClick={() => navigate('/my-lessons')} style={{
                                marginTop: '40px', background: '#6366f1', color: 'white', border: 'none',
                                padding: '16px 32px', fontSize: '1.2rem', fontWeight: 600, borderRadius: '12px',
                                cursor: 'pointer', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.4)'
                            }}>Вернуться к урокам</button>
                        </div>
                    )}

                </div>

                {/* Navigation Arrows */}
                {currentSlide > 0 && (
                    <button onClick={prevSlide} style={{
                        position: 'absolute', left: '24px', top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        width: '64px', height: '64px', borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        backdropFilter: 'blur(10px)', transition: 'background 0.2s, transform 0.2s'
                    }} className="hover-scale">
                        <ChevronLeft size={32} />
                    </button>
                )}
                {currentSlide < slides.length - 1 && (
                    <button onClick={nextSlide} style={{
                        position: 'absolute', right: '24px', top: '50%', transform: 'translateY(-50%)',
                        background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                        width: '64px', height: '64px', borderRadius: '50%', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        backdropFilter: 'blur(10px)', transition: 'background 0.2s, transform 0.2s'
                    }} className="hover-scale">
                        <ChevronRight size={32} />
                    </button>
                )}
            </div>

            {/* Progress Bar */}
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', width: '100%' }}>
                <div style={{ 
                    height: '100%', background: '#6366f1', 
                    width: `${((currentSlide + 1) / slides.length) * 100}%`,
                    transition: 'width 0.3s ease'
                }} />
            </div>

            <style>{`
                .hover-bg-white-20:hover { background: rgba(255,255,255,0.2) !important; }
                .hover-scale:hover { transform: translateY(-50%) scale(1.1) !important; background: rgba(255,255,255,0.2) !important; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
                @keyframes pulse { 0% { opacity: 0.6; } 50% { opacity: 1; } 100% { opacity: 0.6; } }
            `}</style>
        </div>
    )
}
