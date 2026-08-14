import { useState, useRef, useCallback, useEffect } from 'react'
import { Info, FileText, Eye, Image as ImageIcon, Video, FolderUp, Film, Paperclip, CheckCircle, XCircle, Edit, Plus, Clock, Save, Rocket, Loader2, Bot, LayoutList, Check, Trash2, Youtube, AlertCircle, ExternalLink, GripVertical, ChevronDown, ChevronUp, BookOpen, Target, Layers, HelpCircle, ClipboardList, BarChart2, Palette, Camera, TrendingUp, Play } from 'lucide-react'
import { AiSparkIcon, ObjectivesIcon, HomeworkIcon, SummaryIcon, ExampleIcon } from '../components/Icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { lessonsAPI, lessonFilesAPI, uploadToCloudinary, aiAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useReactToPrint } from 'react-to-print'

const SUBJECTS = ['Математика', 'Физика', 'Химия', 'Биология', 'История', 'Литература', 'Информатика', 'Английский', 'Казахский', 'Русский язык', 'Казахская литература', 'Русская литература', 'Физическая культура', 'Музыка', 'Рисование', 'Технология']
const GRADES = Array.from({ length: 11 }, (_, i) => i + 1)
const FILE_TYPES = { 'application/pdf': 'pdf', 'video/mp4': 'video', 'video/quicktime': 'video', 'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' }

const STEPS = ['Информация', 'Материалы', 'Превью']

export default function LessonBuilderNew() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const editId = searchParams.get('edit')
    const { user, refreshUser } = useAuth()
    const lessonPlanCost = user?.creditCosts?.lesson_plan || 2

    // Form state — pre-fill from ?template= query params
    const templateTitle = searchParams.get('title') || ''
    const templateSubject = searchParams.get('subject') || SUBJECTS[0]
    const templateGrade = parseInt(searchParams.get('grade')) || 5
    const templateDuration = parseInt(searchParams.get('duration')) || 45
    const templateDescription = searchParams.get('description') || ''

    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)
    const [aiLoading, setAiLoading] = useState(false)

    // Form state
    const [form, setForm] = useState({
        title: templateTitle,
        subject: SUBJECTS.includes(templateSubject) ? templateSubject : SUBJECTS[0],
        grade: templateGrade,
        duration: templateDuration,
        description: templateDescription,
        content: '', file_type: 'text',
        thumbnail_url: '', content_url: '', is_published: false
    })

    // Files state
    const [uploadedFiles, setUploadedFiles] = useState([])
    const [uploadProgress, setUploadProgress] = useState({}) // { tempId: 0-100 }
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef()
    const thumbnailInputRef = useRef()

    // YouTube
    const [youtubeUrl, setYoutubeUrl] = useState('')
    const [savedLessonId, setSavedLessonId] = useState(null)
    const printRef = useRef(null)

    // ─── Slide cards state ────────────────────────────
    const [slides, setSlides] = useState([])          // structured slide array
    const [lessonTheme, setLessonTheme] = useState('dark')
    const [contentMode, setContentMode] = useState('simple') // 'simple' | 'slides'
    const [fullGenerating, setFullGenerating] = useState(false)
    const dragSrcIndex = useRef(null)

    // ── Auto-generate from template ──────────────────────────
    useEffect(() => {
        const templateId = searchParams.get('template')
        if (templateId && searchParams.get('title')) {
            const timer = setTimeout(() => { generateFullLesson() }, 700)
            return () => clearTimeout(timer)
        }
    }, []) // eslint-disable-line

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 3500)
    }

    // ─── Field update ───────────────────────────────
    const setField = (key, value) => setForm(f => ({ ...f, [key]: value }))

    // ─── Thumbnail upload ────────────────────────────
    const handleThumbnailUpload = async (file) => {
        if (!file) return
        const tempId = 'thumb_' + Date.now()
        setUploadProgress(p => ({ ...p, [tempId]: 0 }))
        try {
            const result = await uploadToCloudinary(file, (pct) => {
                setUploadProgress(p => ({ ...p, [tempId]: pct }))
            })
            setField('thumbnail_url', result.secure_url)
            showToast('Превью загружено!')
        } catch (e) {
            showToast(e.message.includes('VITE_CLOUDINARY') ? 'Настройте Cloudinary в .env' : 'Ошибка загрузки превью', 'error')
        } finally {
            setUploadProgress(p => { const n = { ...p }; delete n[tempId]; return n })
        }
    }

    // ─── File upload ─────────────────────────────────
    const handleFileUpload = useCallback(async (files) => {
        const arr = Array.from(files)
        for (const file of arr) {
            const tempId = 'file_' + Date.now() + Math.random()
            const detectedType = FILE_TYPES[file.type] || 'text'

            // Optimistic entry
            setUploadedFiles(prev => [...prev, {
                tempId, name: file.name, size: file.size,
                type: detectedType, status: 'uploading', url: null
            }])
            setUploadProgress(p => ({ ...p, [tempId]: 0 }))

            try {
                const result = await uploadToCloudinary(file, (pct) => {
                    setUploadProgress(p => ({ ...p, [tempId]: pct }))
                })
                setUploadedFiles(prev => prev.map(f =>
                    f.tempId === tempId
                        ? { ...f, status: 'done', url: result.secure_url, public_id: result.public_id }
                        : f
                ))
                showToast(`Файл "${file.name}" загружен!`)
                // Auto-set content_url if first video/pdf
                if (['video', 'pdf'].includes(detectedType) && !form.content_url) {
                    setField('content_url', result.secure_url)
                    setField('file_type', detectedType)
                }
            } catch (e) {
                setUploadedFiles(prev => prev.map(f =>
                    f.tempId === tempId ? { ...f, status: 'error' } : f
                ))
                showToast(e.message, 'error')
            } finally {
                setUploadProgress(p => { const n = { ...p }; delete n[tempId]; return n })
            }
        }
    }, [form.content_url])

    const removeFile = (tempId) => {
        setUploadedFiles(prev => prev.filter(f => f.tempId !== tempId))
    }

    const handleDrop = useCallback((e) => {
        e.preventDefault()
        setDragging(false)
        handleFileUpload(e.dataTransfer.files)
    }, [handleFileUpload])

    // ─── Add YouTube link ────────────────────────────
    const addYoutube = () => {
        if (!youtubeUrl.trim()) return
        const tempId = 'yt_' + Date.now()
        setUploadedFiles(prev => [...prev, {
            tempId, name: youtubeUrl, size: 0,
            type: 'youtube', status: 'done', url: youtubeUrl
        }])
        if (!form.content_url) {
            setField('content_url', youtubeUrl)
            setField('file_type', 'youtube')
        }
        setYoutubeUrl('')
        showToast('YouTube-ссылка добавлена!')
    }

    // ─── AI Full Lesson (slides + quiz + homework) ───
    const generateFullLesson = async () => {
        if (!form.title && !form.subject) { showToast('Введите название или тему', 'error'); return }
        setFullGenerating(true)
        try {
            const data = await aiAPI.generateLesson({
                topic: form.title || form.description,
                subject: form.subject,
                grade: form.grade,
                duration: form.duration,
                language: 'ru'
            })
            if (data.slides && data.slides.length > 0) {
                setSlides(data.slides.map((s, i) => ({ ...s, _id: `slide_${Date.now()}_${i}` })))
                setContentMode('slides')
                // Also populate text plan as fallback
                if (data.homework) setField('content', data.homework)
                await refreshUser?.()
                showToast(`Урок создан! ${data.slides.length} слайдов. -${data.creditsCharged || 5} кредитов`)
            }
        } catch (e) {
            showToast('Ошибка AI: ' + e.message, 'error')
        } finally {
            setFullGenerating(false)
        }
    }

    // ─── Slide DnD helpers ───────────────────────────
    const handleDragStartSlide = (index) => { dragSrcIndex.current = index }
    const handleDragOverSlide = (e, index) => {
        e.preventDefault()
        if (dragSrcIndex.current === null || dragSrcIndex.current === index) return
        const next = [...slides]
        const [moved] = next.splice(dragSrcIndex.current, 1)
        next.splice(index, 0, moved)
        dragSrcIndex.current = index
        setSlides(next)
    }
    const handleDragEndSlide = () => { dragSrcIndex.current = null }

    const updateSlide = (id, field, value) => {
        setSlides(prev => prev.map(s => s._id === id ? { ...s, [field]: value } : s))
    }
    const updateSlideItem = (id, index, value) => {
        setSlides(prev => prev.map(s => {
            if (s._id !== id) return s
            const arr = [...(s.items || s.bullets || [])]
            arr[index] = value
            return s.items ? { ...s, items: arr } : { ...s, bullets: arr }
        }))
    }
    const removeSlide = (id) => setSlides(prev => prev.filter(s => s._id !== id))
    const addSlide = (type) => {
        const defaults = {
            cover:       { title: 'Новый слайд', subtitle: '' },
            objectives:  { title: 'Цели урока', items: ['Цель 1', 'Цель 2'] },
            content:     { title: 'Новый слайд', bullets: ['Пункт 1', 'Пункт 2'] },
            example:     { title: 'Пример', content: '', highlight: '' },
            photo:       { title: '', caption: '', image_url: '' },
            video:       { title: '', video_url: '', description: '' },
            infographic: { title: 'Инфографика', items: [
                { icon: '📊', label: 'Показатель 1', value: '' },
                { icon: '📈', label: 'Показатель 2', value: '' },
            ]},
            theme_card:  { title: 'Главная мысль урока', subtitle: '', bg_color: '#6366f1' },
            statistics:  { title: 'Статистика', stats: [
                { value: '', label: 'Показатель 1' },
                { value: '', label: 'Показатель 2' },
                { value: '', label: 'Показатель 3' },
            ]},
            poll:        { question: 'Вопрос?', options: ['A) Вариант 1', 'B) Вариант 2', 'C) Вариант 3', 'D) Вариант 4'], correct: 'A' },
            homework:    { title: 'Домашнее задание', content: '', due: 'К следующему уроку' },
            summary:     { title: 'Итоги урока', items: ['Вывод 1', 'Вывод 2'] },
        }
        setSlides(prev => [...prev, {
            type, _id: `slide_${Date.now()}`,
            ...(defaults[type] || { title: 'Слайд' })
        }])
    }

    // ─── AI Lesson Plan ──────────────────────────────
    const generatePlan = async () => {
        if (!form.title && !form.subject) { showToast('Введите название или тему', 'error'); return }
        setAiLoading(true)
        try {
            const data = await aiAPI.lessonPlan({
                topic: form.title || form.description,
                subject: form.subject,
                grade: form.grade,
                duration: form.duration,
                language: 'ru'
            })
            setField('content', data.plan)
            await refreshUser?.()
            showToast(`AI план урока сгенерирован! -${data.creditsCharged || lessonPlanCost} кредит`)
        } catch (e) {
            showToast('Ошибка AI: ' + e.message, 'error')
        } finally {
            setAiLoading(false)
        }
    }

    // ─── Save lesson ─────────────────────────────────
    const saveDraft = async (publish = false) => {
        if (!form.title.trim()) { showToast('Введите название урока', 'error'); return }
        setSaving(true)
        try {
        const payload = { 
            ...form, 
            is_published: publish,
            slides_json: slides.length > 0 ? slides.map(({ _id, ...rest }) => rest) : null,
            theme: lessonTheme
        }
            let lesson
            if (savedLessonId || editId) {
                lesson = await lessonsAPI.update(savedLessonId || editId, payload)
            } else {
                lesson = await lessonsAPI.create(payload)
                setSavedLessonId(lesson.id)
            }

            // Save file records
            const doneFiles = uploadedFiles.filter(f => f.status === 'done')
            for (let i = 0; i < doneFiles.length; i++) {
                const f = doneFiles[i]
                try {
                    await lessonFilesAPI.create({
                        lesson_id: lesson.id,
                        file_url: f.url,
                        file_name: f.name,
                        file_size: f.size,
                        file_type: f.type,
                        public_id: f.public_id,
                        order_index: i
                    })
                } catch (fe) {
                    console.warn('File record error:', fe.message)
                }
            }

            showToast(publish ? 'Урок опубликован!' : 'Черновик сохранён')
            if (publish) {
                setTimeout(() => navigate('/my-lessons'), 1200)
            }
        } catch (e) {
            showToast('Ошибка сохранения: ' + e.message, 'error')
        } finally {
            setSaving(false)
        }
    }
    const handleDelete = async () => {
        const idToDelete = savedLessonId || editId;
        if (!idToDelete) return;
        if (window.confirm('Вы уверены, что хотите удалить этот урок? Это действие необратимо.')) {
            try {
                setSaving(true);
                await lessonsAPI.delete(idToDelete);
                showToast('Урок успешно удален!');
                setTimeout(() => navigate('/my-lessons'), 1000);
            } catch (e) {
                showToast('Ошибка при удалении: ' + e.message, 'error');
                setSaving(false);
            }
        }
    };

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: form.title || 'Lesson_Plan',
    })

    const YoutubeEmbed = ({ url }) => {
        const videoId = url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1]
        if (!videoId) return <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>Неверная YouTube ссылка</div>
        return (
            <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                style={{ width: '100%', height: '300px', border: 'none', borderRadius: '12px' }}
                allowFullScreen
            />
        )
    }

    return (
        <div style={{ maxWidth: '860px', margin: '0 auto', padding: '24px 16px' }}>
            {/* Toast */}
            {toast && (
                <div style={{
                    position: 'fixed', top: '80px', right: '24px', zIndex: 9999,
                    background: 'var(--color-bg-card, white)',
                    color: 'var(--color-gray-900)',
                    padding: '12px 20px', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontWeight: 500,
                    animation: 'slideIn 0.3s ease',
                    borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
                    display: 'flex', alignItems: 'center', gap: '10px'
                }}>
                    {toast.type === 'error'
                        ? <AlertCircle size={16} color="#ef4444" />
                        : <CheckCircle size={16} color="#10b981" />}
                    {toast.message}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <button onClick={() => navigate('/my-lessons')} style={{
                    background: 'none', border: '1px solid var(--color-gray-200,#e5e7eb)', borderRadius: '10px',
                    padding: '8px 14px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-gray-600,#4b5563)',
                    display: 'flex', alignItems: 'center', gap: '6px'
                }}>← Назад</button>
                <div style={{ flex: 1 }}>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {editId ? <><Edit size={24}/> Редактирование урока</> : <><Plus size={24}/> Новый урок</>}
                    </h1>
                    <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--color-gray-400,#9ca3af)' }}>
                        Автор: {user?.name}
                    </p>
                </div>
                {(savedLessonId || editId) && (
                    <button onClick={handleDelete} disabled={saving} style={{
                        background: '#fee2e2', color: '#ef4444', border: 'none',
                        padding: '8px 14px', borderRadius: '10px', cursor: 'pointer',
                        fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px',
                        transition: 'background 0.2s'
                    }}>
                        {saving ? <Loader2 size={18} /> : <Trash2 size={18} />} 
                        <span className="hide-on-mobile">Удалить</span>
                    </button>
                )}
            </div>

            {/* Step indicator */}
            <div className="step-tabs" style={{ 
                display: 'flex', 
                gap: '12px', 
                marginBottom: '32px', 
                padding: '8px',
                background: 'var(--color-gray-100, #f3f4f6)',
                borderRadius: '16px',
            }}>
                {STEPS.map((s, i) => (
                    <button 
                        key={i} 
                        className={`step-tab ${step === i ? 'active' : ''}`}
                        onClick={() => setStep(i)} 
                        style={{
                            flex: 1, 
                            padding: '12px', 
                            border: 'none', 
                            cursor: 'pointer', 
                            fontWeight: 600,
                            fontSize: '0.875rem', 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            background: step === i ? 'var(--color-white, #fff)' : 'transparent',
                            color: step === i ? 'var(--color-primary-600)' : 'var(--color-gray-500)',
                            boxShadow: step === i ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
                        }}
                    >
                        <span style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: step === i ? 'var(--color-primary-600)' : i < step ? 'var(--color-success-500)' : 'var(--color-gray-300)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}>
                            {i < step ? '✓' : i + 1}
                        </span>
                        <span className="hide-on-mobile">{s}</span>
                    </button>
                ))}
            </div>

            {/* ─── STEP 0: INFO ──────────────────────────────── */}
            {step === 0 && (
                <div className="step-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Card title={<><Info size={20} /> Основная информация</>}>
                        <div className="builder-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <Label>Название урока *</Label>
                                <input
                                    value={form.title}
                                    onChange={e => setField('title', e.target.value)}
                                    placeholder="Например: Квадратные уравнения — решение по формуле"
                                    className="builder-input"
                                />
                            </div>
                            <div>
                                <Label>Предмет</Label>
                                <select value={form.subject} onChange={e => setField('subject', e.target.value)} className="builder-input">
                                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Класс</Label>
                                <select value={form.grade} onChange={e => setField('grade', Number(e.target.value))} className="builder-input">
                                    {GRADES.map(g => <option key={g} value={g}>{g} класс</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Длительность (мин)</Label>
                                <input type="number" value={form.duration} onChange={e => setField('duration', Number(e.target.value))} min={5} max={180} className="builder-input" />
                            </div>
                        </div>
                    </Card>

                    <Card title={<><LayoutList size={20} /> Описание и план урока</>}>
                        <Label>Краткое описание</Label>
                        <textarea
                            value={form.description}
                            onChange={e => setField('description', e.target.value)}
                            placeholder="Чему научатся ученики, что нужно знать заранее..."
                            rows={3}
                            className="builder-input"
                            style={{ resize: 'vertical', fontFamily: 'inherit' }}
                        />

                        {/* ── Mode toggle ── */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '20px', marginBottom: '8px' }}>
                            <button
                                onClick={() => setContentMode('simple')}
                                style={{
                                    flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                    background: contentMode === 'simple' ? 'var(--gradient-primary)' : 'var(--color-gray-100,#f3f4f6)',
                                    color: contentMode === 'simple' ? 'white' : 'var(--color-gray-600)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Простой план
                            </button>
                            <button
                                onClick={() => setContentMode('slides')}
                                style={{
                                    flex: 1, padding: '10px', border: 'none', borderRadius: '10px',
                                    cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                                    background: contentMode === 'slides' ? 'var(--gradient-primary)' : 'var(--color-gray-100,#f3f4f6)',
                                    color: contentMode === 'slides' ? 'white' : 'var(--color-gray-600)',
                                    transition: 'all 0.2s'
                                }}
                            >
                                Слайды {slides.length > 0 && `(${slides.length})`}
                            </button>
                        </div>

                        {/* ── AI generation buttons ── */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                            <button onClick={generatePlan} disabled={aiLoading || fullGenerating} style={{
                                background: 'var(--color-gray-100,#f3f4f6)', color: 'var(--color-gray-700)',
                                border: 'none', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 600, display: 'flex', gap: '6px', alignItems: 'center',
                                opacity: aiLoading ? 0.7 : 1
                            }}>
                                {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Bot size={14} />}
                                Простой план
                            </button>
                            <button onClick={generateFullLesson} disabled={aiLoading || fullGenerating} style={{
                                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white',
                                border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'center',
                                opacity: fullGenerating ? 0.7 : 1,
                                boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                            }}>
                                {fullGenerating
                                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Генерирую...</>
                                    : <><AiSparkIcon size={14} /> Создать полный урок (-5 кр.)</>}
                            </button>
                        </div>

                        {/* ── Simple mode: textarea ── */}
                        {contentMode === 'simple' && (
                            <textarea
                                value={form.content}
                                onChange={e => setField('content', e.target.value)}
                                placeholder="Введите план урока вручную или нажмите «Простой план»..."
                                rows={8}
                                className="builder-input"
                                style={{ resize: 'vertical', fontFamily: 'inherit' }}
                            />
                        )}

                        {/* ── Slides mode: card list ── */}
                        {contentMode === 'slides' && (
                            <div>
                                {slides.length === 0 ? (
                                    <div style={{
                                        border: '2px dashed var(--color-gray-200,#e5e7eb)',
                                        borderRadius: '14px', padding: '40px 20px',
                                        textAlign: 'center', color: 'var(--color-gray-400)'
                                    }}>
                                        <AiSparkIcon size={40} color="#d1d5db" />
                                        <p style={{ marginTop: '12px', fontWeight: 600 }}>Нажмите «Создать полный урок» — AI сгенерирует слайды</p>
                                        <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Или добавьте слайды вручную кнопкой ниже</p>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {slides.map((slide, idx) => (
                                            <SlideCard
                                                key={slide._id}
                                                slide={slide}
                                                index={idx}
                                                total={slides.length}
                                                onDragStart={() => handleDragStartSlide(idx)}
                                                onDragOver={(e) => handleDragOverSlide(e, idx)}
                                                onDragEnd={handleDragEndSlide}
                                                onUpdate={(field, val) => updateSlide(slide._id, field, val)}
                                                onUpdateItem={(i, val) => updateSlideItem(slide._id, i, val)}
                                                onRemove={() => removeSlide(slide._id)}
                                            />
                                        ))}
                                    </div>
                                )}

                                {/* Add slide dropdown */}
                                <AddSlideButton onAdd={addSlide} />
                            </div>
                        )}
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setStep(1)} className="primary-btn">Далее →</button>
                    </div>
                </div>
            )}

            {/* ─── STEP 1: FILES ─────────────────────────────── */}
            {step === 1 && (
                <div className="step-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Thumbnail */}
                    <Card title={<><ImageIcon size={20} /> Обложка урока</>}>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                            <div
                                onClick={() => thumbnailInputRef.current?.click()}
                                style={{
                                    width: '160px', height: '100px', borderRadius: '12px', flexShrink: 0,
                                    background: form.thumbnail_url ? `url(${form.thumbnail_url}) center/cover` : 'var(--color-gray-100,#f3f4f6)',
                                    border: '2px dashed var(--color-gray-200,#e5e7eb)', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {!form.thumbnail_url && <ImageIcon size={32} color="var(--color-gray-400)" />}
                            </div>
                            <div>
                                <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Загрузите обложку урока</p>
                                <p style={{ margin: '0 0 12px', fontSize: '0.85rem', color: '#6b7280' }}>JPG, PNG до 5MB. Рекомендуется 16:9</p>
                                <button onClick={() => thumbnailInputRef.current?.click()} className="primary-btn" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                                    Выбрать изображение
                                </button>
                                <input ref={thumbnailInputRef} type="file" accept="image/*" hidden onChange={e => handleThumbnailUpload(e.target.files[0])} />
                            </div>
                        </div>
                    </Card>

                    {/* YouTube link */}
                    <Card title={<><Video size={20} /> YouTube-ссылка</>}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                value={youtubeUrl}
                                onChange={e => setYoutubeUrl(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addYoutube()}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="builder-input"
                                style={{ flex: 1, margin: 0 }}
                            />
                            <button onClick={addYoutube} className="primary-btn" style={{ padding: '10px 20px', whiteSpace: 'nowrap' }}>
                                + Добавить
                            </button>
                        </div>
                    </Card>

                    {/* File Upload */}
                    <Card title={<><FolderUp size={20} /> Файлы урока</>}>
                        <div
                            onDragOver={e => { e.preventDefault(); setDragging(true) }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`drag-area ${dragging ? 'drag-area-active' : ''}`}
                            style={{
                                border: `2px dashed ${dragging ? '#6366f1' : 'var(--color-gray-200,#e5e7eb)'}`,
                                borderRadius: '16px', padding: '40px 20px', textAlign: 'center',
                                cursor: 'pointer', background: dragging ? 'var(--color-primary-50,#ede9fe)' : 'var(--color-bg-card, var(--color-gray-50,#f9fafb))',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', marginBottom: '16px',
                                position: 'relative', overflow: 'hidden'
                            }}
                        >
                            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'center' }}><FolderUp size={40} color="var(--color-gray-400)" /></div>
                            <p style={{ margin: 0, fontWeight: 600 }}>Перетащите файлы сюда или нажмите для выбора</p>
                            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#6b7280' }}>
                                PDF, DOCX, MP4, JPG, PNG — до 100 MB каждый
                            </p>
                        </div>
                        <input ref={fileInputRef} type="file" multiple hidden accept=".pdf,.docx,.mp4,.mov,.jpg,.jpeg,.png,.gif" onChange={e => handleFileUpload(e.target.files)} />

                        {/* Uploaded files list */}
                        {uploadedFiles.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {uploadedFiles.map(file => (
                                    <div key={file.tempId} style={{
                                        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                                        background: 'white', borderRadius: '12px', border: '1px solid var(--color-gray-100,#f3f4f6)',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center' }}>
                                            {file.type === 'pdf' ? <FileText size={24} color="#ef4444" /> : file.type === 'video' ? <Film size={24} color="#6366f1" /> : file.type === 'youtube' ? <Video size={24} color="#ef4444" /> : file.type === 'image' ? <ImageIcon size={24} color="#10b981" /> : <Paperclip size={24} color="#6b7280" />}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {file.name}
                                            </div>
                                            {uploadProgress[file.tempId] !== undefined && (
                                                <div style={{ marginTop: '4px' }}>
                                                    <div style={{
                                                        height: '4px', borderRadius: '2px',
                                                        background: 'var(--color-gray-100,#f3f4f6)', overflow: 'hidden'
                                                    }}>
                                                        <div style={{
                                                            height: '100%', borderRadius: '2px',
                                                            background: 'linear-gradient(90deg,#6366f1,#8b5cf6)',
                                                            width: `${uploadProgress[file.tempId]}%`,
                                                            transition: 'width 0.2s'
                                                        }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.7rem', color: '#6366f1' }}>{uploadProgress[file.tempId]}%</span>
                                                </div>
                                            )}
                                            {file.status === 'done' && <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Загружен</span>}
                                            {file.status === 'error' && <span style={{ fontSize: '0.75rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Ошибка</span>}
                                        </div>
                                        <button onClick={() => removeFile(file.tempId)} style={{
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: '#9ca3af', fontSize: '1.1rem', padding: '4px', borderRadius: '6px',
                                            flexShrink: 0
                                        }}>✕</button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <button onClick={() => setStep(0)} className="ghost-btn">← Назад</button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => saveDraft(false)} disabled={saving} className="ghost-btn" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                {saving ? <Loader2 size={16} /> : <Save size={16} />} Сохранить черновик
                            </button>
                            <button onClick={() => setStep(2)} className="primary-btn">Просмотр →</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── STEP 2: PREVIEW ───────────────────────────── */}
            {step === 2 && (
                <div className="step-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div ref={printRef} className="print-container">
                    <Card title={<><Eye size={20} /> Предварительный просмотр</>}>
                        {/* Thumbnail */}
                        {form.thumbnail_url && (
                            <div style={{
                                height: '220px', borderRadius: '14px', marginBottom: '20px',
                                background: `url(${form.thumbnail_url}) center/cover`,
                                boxShadow: '0 4px 16px rgba(0,0,0,0.08)'
                            }} />
                        )}

                        <h1 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800 }}>{form.title || 'Название урока'}</h1>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                            <span style={{ background: '#ede9fe', color: '#6366f1', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                                {form.subject}
                            </span>
                            <span style={{ background: '#e0f2fe', color: '#0891b2', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700 }}>
                                {form.grade} класс
                            </span>
                            <span style={{ background: '#fef9c3', color: '#854d0e', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> {form.duration} мин
                            </span>
                        </div>

                        {form.description && (
                            <p style={{ color: '#4b5563', lineHeight: 1.6, marginBottom: '16px' }}>{form.description}</p>
                        )}

                        {/* Content preview */}
                        {form.content && (
                            <div style={{
                                background: 'var(--color-gray-50,#f9fafb)', borderRadius: '12px',
                                padding: '16px', marginBottom: '16px', whiteSpace: 'pre-wrap',
                                lineHeight: 1.7, fontSize: '0.9rem', maxHeight: '300px', overflow: 'auto',
                                border: '1px solid var(--color-gray-100,#f3f4f6)'
                            }}>
                                {form.content}
                            </div>
                        )}

                        {/* YouTube embed */}
                        {uploadedFiles.filter(f => f.type === 'youtube').map(f => (
                            <div key={f.tempId} style={{ marginBottom: '16px' }}>
                                <h4 style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Video size={16} color="#ef4444" /> Видеоматериал</h4>
                                <iframe
                                    src={`https://www.youtube.com/embed/${f.url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)?.[1]}`}
                                    style={{ width: '100%', height: '280px', border: 'none', borderRadius: '12px' }}
                                    allowFullScreen
                                />
                            </div>
                        ))}

                        {/* Other files list */}
                        {uploadedFiles.filter(f => f.status === 'done' && f.type !== 'youtube').length > 0 && (
                            <div>
                                <h4 style={{ margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: '6px' }}><Paperclip size={16} /> Прикреплённые материалы</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {uploadedFiles.filter(f => f.status === 'done' && f.type !== 'youtube').map(f => (
                                        <a key={f.tempId} href={f.url} target="_blank" rel="noreferrer" style={{
                                            display: 'flex', gap: '10px', alignItems: 'center',
                                            padding: '10px 14px', background: 'white', borderRadius: '10px',
                                            textDecoration: 'none', color: '#374151', fontWeight: 500, fontSize: '0.875rem',
                                            border: '1px solid var(--color-gray-100,#f3f4f6)',
                                            transition: 'background 0.15s'
                                        }}>
                                            <span style={{ display: 'flex', alignItems: 'center' }}>{f.type === 'pdf' ? <FileText size={18} color="#ef4444" /> : f.type === 'video' ? <Film size={18} color="#6366f1" /> : <ImageIcon size={18} color="#10b981" />}</span>
                                            {f.name}
                                            <ExternalLink size={14} style={{ marginLeft: 'auto', color: '#6366f1' }} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <button onClick={() => setStep(1)} className="ghost-btn">← Назад</button>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handlePrint} className="no-print ghost-btn" style={{ color: 'var(--color-success-600)', borderColor: 'var(--color-success-200)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={16} /> Скачать PDF
                            </button>
                            <button onClick={() => saveDraft(false)} disabled={saving} className="ghost-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {saving ? <Loader2 size={16} className="spin" /> : <Save size={16} />} Сохранить черновик
                            </button>
                            <button onClick={() => saveDraft(true)} disabled={saving} className="primary-btn" style={{
                                display: 'flex', alignItems: 'center', gap: '8px',
                                background: 'linear-gradient(135deg, var(--color-success-500), var(--color-success-700))',
                                boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                            }}>
                                {saving ? <Loader2 size={16} className="spin" /> : <Rocket size={16} />} Опубликовать
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn { from { transform:translateX(20px);opacity:0; } to { transform:translateX(0);opacity:1; } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes pulse-border { 0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); } 70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); } 100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); } }
                
                .step-content { 
                    animation: fadeIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; 
                }
                
                .drag-area-active { 
                    animation: pulse-border 1.5s infinite; 
                    transform: scale(1.01); 
                    border-color: var(--color-primary-500) !important; 
                    background: var(--color-primary-50) !important;
                }
                
                .drag-area:hover:not(.drag-area-active) { 
                    border-color: var(--color-primary-400) !important; 
                    background: var(--color-gray-50) !important; 
                    transform: translateY(-2px);
                }
                
                .step-tab:hover:not(.active) {
                    background: rgba(255,255,255,0.5) !important;
                    color: var(--color-primary-500) !important;
                }

                .builder-card {
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    background: var(--color-bg-card, rgba(255, 255, 255, 0.95)) !important;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .builder-card:hover {
                    box-shadow: 0 12px 40px rgba(0,0,0,0.06) !important;
                    transform: translateY(-2px);
                }

                .builder-input {
                    width: 100%; padding: 12px 16px; border-radius: 12px;
                    border: 1px solid var(--color-gray-200, #e5e7eb);
                    background: var(--color-gray-50, #f9fafb); fontSize: 0.9rem;
                    outline: none; transition: all 0.2s; color: var(--color-gray-900);
                    font-family: inherit;
                }

                .builder-input:focus {
                    border-color: var(--color-primary-500) !important;
                    box-shadow: 0 0 0 4px var(--color-primary-100) !important;
                    background: var(--color-white, #fff) !important;
                }

                .primary-btn {
                    background: var(--gradient-primary, linear-gradient(135deg, #2563eb, #7c3aed));
                    color: white; border: none; borderRadius: 12px;
                    padding: 12px 28px; cursor: pointer; fontWeight: 700;
                    fontSize: 0.9rem; transition: all 0.2s;
                    boxShadow: 0 4px 15px rgba(37, 99, 235, 0.35);
                }

                .primary-btn:hover {
                    transform: translateY(-2px);
                    filter: brightness(1.1);
                    boxShadow: 0 6px 20px rgba(37, 99, 235, 0.45);
                }

                .ghost-btn {
                    background: var(--color-white, #fff); color: var(--color-gray-600);
                    border: 1px solid var(--color-gray-200);
                    borderRadius: 12px; padding: 12px 24px; cursor: pointer;
                    fontWeight: 600; fontSize: 0.9rem; transition: all 0.2s;
                }

                .ghost-btn:hover {
                    background: var(--color-gray-50);
                    border-color: var(--color-gray-300);
                    transform: translateY(-1px);
                }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                @media (max-width: 600px) {
                    .hide-on-mobile { display: none !important; }
                    .builder-grid { grid-template-columns: 1fr !important; }
                    .step-tabs { 
                        flex-direction: row; 
                        padding: 4px;
                        gap: 4px;
                    }
                    .step-tab { 
                        padding: 8px 4px !important;
                        font-size: 0.75rem !important;
                    }
                }
            `}</style>
        </div>
    )
}

// ─── SlideCard ────────────────────────────────────────
const SLIDE_TYPE_META = {
    cover:       { label: 'Обложка',         color: '#6366f1', Icon: BookOpen },
    objectives:  { label: 'Цели',            color: '#06b6d4', Icon: Target },
    content:     { label: 'Контент',         color: '#8b5cf6', Icon: Layers },
    example:     { label: 'Пример',          color: '#f97316', Icon: ExampleIcon },
    photo:       { label: 'Фото',            color: '#10b981', Icon: Camera },
    video:       { label: 'Видео',           color: '#ef4444', Icon: Play },
    infographic: { label: 'Инфографика',     color: '#f59e0b', Icon: BarChart2 },
    theme_card:  { label: 'Тема урока',      color: '#8b5cf6', Icon: Palette },
    statistics:  { label: 'Статистика',      color: '#3b82f6', Icon: TrendingUp },
    poll:        { label: 'Опрос',           color: '#ec4899', Icon: HelpCircle },
    quiz_slide:  { label: 'Тест',            color: '#3b82f6', Icon: ClipboardList },
    homework:    { label: 'Домашнее задание',color: '#10b981', Icon: HomeworkIcon },
    summary:     { label: 'Итоги',           color: '#fbbf24', Icon: SummaryIcon },
}

function SlideCard({ slide, index, onDragStart, onDragOver, onDragEnd, onUpdate, onUpdateItem, onRemove }) {
    const [expanded, setExpanded] = useState(true)
    const meta = SLIDE_TYPE_META[slide.type] || { label: slide.type, color: '#6b7280', Icon: FileText }
    const { Icon } = meta

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            style={{
                background: 'var(--color-bg-card, white)',
                border: `1.5px solid ${meta.color}30`,
                borderRadius: '14px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                cursor: 'grab',
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '10px 14px',
                background: `${meta.color}08`,
                borderBottom: expanded ? `1px solid ${meta.color}20` : 'none',
            }}>
                <GripVertical size={16} color="#9ca3af" style={{ flexShrink: 0, cursor: 'grab' }} />
                <div style={{
                    width: '28px', height: '28px', borderRadius: '8px',
                    background: `${meta.color}20`, color: meta.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                    <Icon size={14} />
                </div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {index + 1}. {meta.label}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <input
                        value={slide.title || ''}
                        onChange={e => onUpdate('title', e.target.value)}
                        style={{
                            border: 'none', background: 'transparent', fontWeight: 600,
                            fontSize: '0.875rem', color: 'var(--color-gray-900)', width: '100%',
                            outline: 'none', cursor: 'text'
                        }}
                        placeholder="Заголовок слайда..."
                        onClick={e => e.stopPropagation()}
                    />
                </div>
                <button onClick={() => setExpanded(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    <Trash2 size={14} />
                </button>
            </div>

            {/* Body */}
            {expanded && (
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* Subtitle (cover only) */}
                    {slide.type === 'cover' && (
                        <input
                            value={slide.subtitle || ''}
                            onChange={e => onUpdate('subtitle', e.target.value)}
                            className="builder-input" style={{ fontSize: '0.85rem' }}
                            placeholder="Подзаголовок (необязательно)"
                        />
                    )}

                    {/* Bullet items (content / objectives / summary) */}
                    {(slide.type === 'content' || slide.type === 'objectives' || slide.type === 'summary') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {(slide.items || slide.bullets || []).map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: meta.color, flexShrink: 0, marginTop: '2px' }} />
                                    <input
                                        value={item}
                                        onChange={e => onUpdateItem(i, e.target.value)}
                                        className="builder-input"
                                        style={{ fontSize: '0.85rem', flex: 1 }}
                                        placeholder={`Пункт ${i + 1}`}
                                    />
                                </div>
                            ))}
                            <button
                                onClick={() => {
                                    const arr = slide.items ? [...slide.items, ''] : [...(slide.bullets || []), '']
                                    slide.items ? onUpdate('items', arr) : onUpdate('bullets', arr)
                                }}
                                style={{
                                    background: 'none', border: `1px dashed ${meta.color}50`,
                                    borderRadius: '8px', padding: '5px 10px',
                                    color: meta.color, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                + Добавить пункт
                            </button>
                        </div>
                    )}

                    {/* Content / highlight (example) */}
                    {slide.type === 'example' && (
                        <>
                            <textarea
                                value={slide.content || ''}
                                onChange={e => onUpdate('content', e.target.value)}
                                className="builder-input" rows={3}
                                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
                                placeholder="Описание примера..."
                            />
                            <input
                                value={slide.highlight || ''}
                                onChange={e => onUpdate('highlight', e.target.value)}
                                className="builder-input" style={{ fontSize: '0.85rem' }}
                                placeholder="Выделенная формула / ключевая фраза"
                            />
                        </>
                    )}

                    {/* Poll */}
                    {slide.type === 'poll' && (
                        <>
                            <input
                                value={slide.question || ''}
                                onChange={e => onUpdate('question', e.target.value)}
                                className="builder-input" style={{ fontSize: '0.85rem', fontWeight: 600 }}
                                placeholder="Вопрос..."
                            />
                            {(slide.options || []).map((opt, i) => (
                                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: slide.correct === ['A','B','C','D'][i] ? '#10b981' : '#f3f4f6', color: slide.correct === ['A','B','C','D'][i] ? 'white' : '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0, cursor: 'pointer' }}
                                        onClick={() => onUpdate('correct', ['A','B','C','D'][i])}>
                                        {['A','B','C','D'][i]}
                                    </span>
                                    <input
                                        value={opt}
                                        onChange={e => {
                                            const opts = [...slide.options]; opts[i] = e.target.value; onUpdate('options', opts)
                                        }}
                                        className="builder-input" style={{ fontSize: '0.85rem', flex: 1 }}
                                        placeholder={`Вариант ${['A','B','C','D'][i]}`}
                                    />
                                </div>
                            ))}
                            <p style={{ fontSize: '0.72rem', color: '#9ca3af', margin: 0 }}>Нажмите на букву чтобы выбрать правильный ответ</p>
                        </>
                    )}

                    {/* Homework */}
                    {slide.type === 'homework' && (
                        <>
                            <textarea
                                value={slide.content || ''}
                                onChange={e => onUpdate('content', e.target.value)}
                                className="builder-input" rows={3}
                                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
                                placeholder="Описание домашнего задания..."
                            />
                            <input
                                value={slide.due || ''}
                                onChange={e => onUpdate('due', e.target.value)}
                                className="builder-input" style={{ fontSize: '0.85rem' }}
                                placeholder="Срок сдачи (напр. К следующему уроку)"
                            />
                        </>
                    )}

                    {/* ── PHOTO slide ── */}
                    {slide.type === 'photo' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {/* Preview */}
                            {slide.image_url && (
                                <div style={{ borderRadius: '10px', overflow: 'hidden', height: '160px', background: '#f3f4f6', position: 'relative' }}>
                                    <img src={slide.image_url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={() => onUpdate('image_url', '')} style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <XCircle size={14} />
                                    </button>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <input
                                    value={slide.image_url || ''}
                                    onChange={e => onUpdate('image_url', e.target.value)}
                                    className="builder-input" style={{ flex: 1, fontSize: '0.82rem' }}
                                    placeholder="URL изображения (или загрузите ниже)"
                                />
                                <PhotoUploadButton onUrl={url => onUpdate('image_url', url)} color={meta.color} />
                            </div>
                            <input
                                value={slide.caption || ''}
                                onChange={e => onUpdate('caption', e.target.value)}
                                className="builder-input" style={{ fontSize: '0.85rem' }}
                                placeholder="Подпись к фото (необязательно)"
                            />
                        </div>
                    )}

                    {/* ── VIDEO slide ── */}
                    {slide.type === 'video' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                value={slide.video_url || ''}
                                onChange={e => onUpdate('video_url', e.target.value)}
                                className="builder-input" style={{ fontSize: '0.85rem' }}
                                placeholder="YouTube ссылка или прямой URL видео"
                            />
                            {/* Preview */}
                            {slide.video_url && (() => {
                                const ytm = slide.video_url.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)
                                if (ytm) return (
                                    <div style={{ borderRadius: '10px', overflow: 'hidden', aspectRatio: '16/9', background: '#000' }}>
                                        <iframe src={`https://www.youtube.com/embed/${ytm[1]}?rel=0`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                                    </div>
                                )
                                return null
                            })()}
                            <textarea
                                value={slide.description || ''}
                                onChange={e => onUpdate('description', e.target.value)}
                                className="builder-input" rows={2}
                                style={{ resize: 'vertical', fontFamily: 'inherit', fontSize: '0.85rem' }}
                                placeholder="Описание / вопросы для обсуждения..."
                            />
                        </div>
                    )}

                    {/* ── INFOGRAPHIC slide ── */}
                    {slide.type === 'infographic' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>ДО 6 БЛОКОВ</p>
                            {(slide.items || []).map((item, i) => (
                                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input
                                        value={item.icon || ''}
                                        onChange={e => {
                                            const arr = [...slide.items]; arr[i] = { ...arr[i], icon: e.target.value }; onUpdate('items', arr)
                                        }}
                                        style={{ width: '44px', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '6px', fontSize: '1.1rem', textAlign: 'center', outline: 'none', background: 'var(--color-gray-50,#f9fafb)' }}
                                        placeholder="📊"
                                    />
                                    <input
                                        value={item.value || ''}
                                        onChange={e => {
                                            const arr = [...slide.items]; arr[i] = { ...arr[i], value: e.target.value }; onUpdate('items', arr)
                                        }}
                                        className="builder-input" style={{ width: '80px', fontWeight: 800, fontSize: '1rem' }}
                                        placeholder="95%"
                                    />
                                    <input
                                        value={item.label || ''}
                                        onChange={e => {
                                            const arr = [...slide.items]; arr[i] = { ...arr[i], label: e.target.value }; onUpdate('items', arr)
                                        }}
                                        className="builder-input" style={{ flex: 1, fontSize: '0.85rem' }}
                                        placeholder="Подпись..."
                                    />
                                    <button onClick={() => {
                                        const arr = slide.items.filter((_, j) => j !== i); onUpdate('items', arr)
                                    }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            {(slide.items || []).length < 6 && (
                                <button onClick={() => onUpdate('items', [...(slide.items || []), { icon: '', value: '', label: '' }])}
                                    style={{ background: 'none', border: `1px dashed ${meta.color}50`, borderRadius: '8px', padding: '5px 10px', color: meta.color, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                                    + Добавить блок
                                </button>
                            )}
                        </div>
                    )}

                    {/* ── THEME CARD slide ── */}
                    {slide.type === 'theme_card' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <input
                                value={slide.subtitle || ''}
                                onChange={e => onUpdate('subtitle', e.target.value)}
                                className="builder-input" style={{ fontSize: '0.85rem' }}
                                placeholder="Дополнительный текст или цитата"
                            />
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' }}>Цвет фона:</label>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#0f172a','#1e40af'].map(c => (
                                        <button key={c} type="button" onClick={() => onUpdate('bg_color', c)} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c, border: slide.bg_color === c ? '3px solid #111' : '2px solid transparent', cursor: 'pointer', flexShrink: 0 }} />
                                    ))}
                                </div>
                                <input type="color" value={slide.bg_color || '#6366f1'} onChange={e => onUpdate('bg_color', e.target.value)} style={{ width: '28px', height: '28px', border: 'none', cursor: 'pointer', borderRadius: '6px', padding: 0 }} />
                            </div>
                            {/* Preview */}
                            <div style={{ borderRadius: '10px', padding: '16px 20px', background: slide.bg_color || '#6366f1', marginTop: '4px' }}>
                                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'white', marginBottom: '4px' }}>{slide.title || 'Главная мысль'}</div>
                                {slide.subtitle && <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)' }}>{slide.subtitle}</div>}
                            </div>
                        </div>
                    )}

                    {/* ── STATISTICS slide ── */}
                    {slide.type === 'statistics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <p style={{ margin: '0 0 4px', fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600 }}>ДО 4 ПОКАЗАТЕЛЕЙ</p>
                            {(slide.stats || []).map((stat, i) => (
                                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <input
                                        value={stat.value || ''}
                                        onChange={e => {
                                            const arr = [...slide.stats]; arr[i] = { ...arr[i], value: e.target.value }; onUpdate('stats', arr)
                                        }}
                                        className="builder-input" style={{ width: '90px', fontWeight: 900, fontSize: '1.1rem', color: meta.color }}
                                        placeholder="94%"
                                    />
                                    <input
                                        value={stat.label || ''}
                                        onChange={e => {
                                            const arr = [...slide.stats]; arr[i] = { ...arr[i], label: e.target.value }; onUpdate('stats', arr)
                                        }}
                                        className="builder-input" style={{ flex: 1, fontSize: '0.85rem' }}
                                        placeholder="Учеников сдали тест"
                                    />
                                    <button onClick={() => onUpdate('stats', slide.stats.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', flexShrink: 0 }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            ))}
                            {(slide.stats || []).length < 4 && (
                                <button onClick={() => onUpdate('stats', [...(slide.stats || []), { value: '', label: '' }])}
                                    style={{ background: 'none', border: `1px dashed ${meta.color}50`, borderRadius: '8px', padding: '5px 10px', color: meta.color, fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}>
                                    + Добавить показатель
                                </button>
                            )}
                            {/* Preview */}
                            {(slide.stats || []).some(s => s.value) && (
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    {(slide.stats || []).filter(s => s.value).map((s, i) => (
                                        <div key={i} style={{ flex: 1, minWidth: '70px', background: `${meta.color}10`, borderRadius: '10px', padding: '10px 12px', textAlign: 'center', border: `1px solid ${meta.color}20` }}>
                                            <div style={{ fontWeight: 900, fontSize: '1.3rem', color: meta.color }}>{s.value}</div>
                                            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px', lineHeight: 1.3 }}>{s.label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

// ─── PhotoUploadButton ───────────────────────────────
function PhotoUploadButton({ onUrl, color = '#10b981' }) {
    const ref = useRef()
    const [uploading, setUploading] = useState(false)

    const handleFile = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setUploading(true)
        try {
            const { uploadToCloudinary } = await import('../api')
            const result = await uploadToCloudinary(file)
            onUrl(result.secure_url)
        } catch { /* silent */ }
        setUploading(false)
    }

    return (
        <>
            <button type="button" onClick={() => ref.current?.click()} style={{
                padding: '6px 12px', background: `${color}18`, border: `1px solid ${color}40`,
                borderRadius: '8px', color, fontWeight: 700, fontSize: '0.78rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0,
                opacity: uploading ? 0.7 : 1
            }}>
                {uploading ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Camera size={13} />}
                {uploading ? '...' : 'Загрузить'}
            </button>
            <input ref={ref} type="file" accept="image/*" hidden onChange={handleFile} />
        </>
    )
}

// ─── AddSlideButton ───────────────────────────────────
function AddSlideButton({ onAdd }) {
    const [open, setOpen] = useState(false)
    const types = Object.entries(SLIDE_TYPE_META)
    return (
        <div style={{ position: 'relative', marginTop: '12px' }}>
            <button
                onClick={() => setOpen(v => !v)}
                style={{
                    width: '100%', padding: '10px', border: '1.5px dashed var(--color-gray-200,#e5e7eb)',
                    borderRadius: '12px', background: 'transparent', cursor: 'pointer',
                    color: 'var(--color-gray-500)', fontWeight: 600, fontSize: '0.875rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#6366f1'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--color-gray-200,#e5e7eb)'}
            >
                <Plus size={16} /> Добавить слайд
            </button>
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setOpen(false)} />
                    <div style={{
                        position: 'absolute', bottom: '110%', left: 0, right: 0,
                        background: 'var(--color-bg-card, white)', borderRadius: '14px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                        border: '1px solid var(--color-gray-100,#f3f4f6)',
                        padding: '8px', zIndex: 100,
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px'
                    }}>
                        {types.map(([type, meta]) => {
                            const { Icon } = meta
                            return (
                                <button key={type} onClick={() => { onAdd(type); setOpen(false) }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    padding: '8px 10px', border: 'none', borderRadius: '10px',
                                    background: 'transparent', cursor: 'pointer', textAlign: 'left',
                                    fontSize: '0.82rem', fontWeight: 500, color: 'var(--color-gray-700)',
                                    transition: 'background 0.15s'
                                }}
                                    onMouseEnter={e => e.currentTarget.style.background = `${meta.color}10`}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: `${meta.color}20`, color: meta.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                        <Icon size={13} />
                                    </div>
                                    {meta.label}
                                </button>
                            )
                        })}
                    </div>
                </>
            )}
        </div>
    )
}

// ─── Sub-components ──────────────
function Card({ title, children }) {
    return (
        <div className="builder-card" style={{
            background: 'var(--color-bg-card, var(--color-white, white))', borderRadius: '24px',
            padding: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
            border: '1px solid var(--color-gray-200, #f3f4f6)'
        }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>{title}</h3>
            {children}
        </div>
    )
}

function Label({ children, style }) {
    return <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-700)', ...style }}>{children}</label>
}
