import { useState, useRef, useCallback } from 'react'
import { Info, FileText, Eye, Image as ImageIcon, Video, FolderUp, Film, Paperclip, CheckCircle, XCircle, Edit, Plus, Clock, Save, Rocket, Loader2, Bot, LayoutList, Check } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { lessonsAPI, lessonFilesAPI, uploadToCloudinary, aiAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'

const SUBJECTS = ['Математика', 'Физика', 'Химия', 'Биология', 'История', 'Литература', 'Информатика', 'Английский', 'Казахский', 'Русский язык', 'Казахская литература', 'Русская литература', 'Физическая культура', 'Музыка', 'Рисование', 'Технология']
const GRADES = Array.from({ length: 11 }, (_, i) => i + 1)
const FILE_TYPES = { 'application/pdf': 'pdf', 'video/mp4': 'video', 'video/quicktime': 'video', 'image/jpeg': 'image', 'image/png': 'image', 'image/gif': 'image', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx' }

const STEPS = ['Информация', 'Материалы', 'Превью']

export default function LessonBuilderNew() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const editId = searchParams.get('edit')
    const { user } = useAuth()

    const [step, setStep] = useState(0)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)
    const [aiLoading, setAiLoading] = useState(false)

    // Form state
    const [form, setForm] = useState({
        title: '', subject: SUBJECTS[0], grade: 5, duration: 45,
        description: '', content: '', file_type: 'text',
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
            showToast('🤖 План урока сгенерирован!')
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
            const payload = { ...form, is_published: publish }
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

            showToast(publish ? '🎉 Урок опубликован!' : '✅ Черновик сохранён')
            if (publish) {
                setTimeout(() => navigate('/my-lessons'), 1200)
            }
        } catch (e) {
            showToast('Ошибка сохранения: ' + e.message, 'error')
        } finally {
            setSaving(false)
        }
    }

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
                    background: toast.type === 'error' ? '#ef4444' : '#10b981',
                    color: 'white', padding: '12px 20px', borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontWeight: 500,
                    animation: 'slideIn 0.3s ease'
                }}>
                    {toast.type === 'error' ? '❌ ' : '✅ '}{toast.message}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
                <button onClick={() => navigate('/my-lessons')} style={{
                    background: 'none', border: '1px solid var(--color-gray-200,#e5e7eb)', borderRadius: '10px',
                    padding: '8px 14px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--color-gray-600,#4b5563)',
                    display: 'flex', alignItems: 'center', gap: '6px'
                }}>← Назад</button>
                <div>
                    <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {editId ? <><Edit size={24}/> Редактирование урока</> : <><Plus size={24}/> Новый урок</>}
                    </h1>
                    <p style={{ margin: '2px 0 0', fontSize: '0.875rem', color: 'var(--color-gray-400,#9ca3af)' }}>
                        Автор: {user?.name}
                    </p>
                </div>
            </div>

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '32px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--color-gray-100,#f3f4f6)' }}>
                {STEPS.map((s, i) => (
                    <button key={i} onClick={() => setStep(i)} style={{
                        flex: 1, padding: '14px', border: 'none', cursor: 'pointer', fontWeight: 600,
                        fontSize: '0.875rem', transition: 'all 0.2s',
                        background: step === i ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : i < step ? '#ede9fe' : 'white',
                        color: step === i ? 'white' : i < step ? '#6366f1' : 'var(--color-gray-500,#6b7280)',
                        borderRight: i < STEPS.length - 1 ? '1px solid var(--color-gray-100,#f3f4f6)' : 'none'
                    }}>
                        {i < step ? '✓ ' : ''}{s}
                    </button>
                ))}
            </div>

            {/* ─── STEP 0: INFO ──────────────────────────────── */}
            {step === 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <Card title={<><Info size={20} /> Основная информация</>}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ gridColumn: '1/-1' }}>
                                <Label>Название урока *</Label>
                                <input
                                    value={form.title}
                                    onChange={e => setField('title', e.target.value)}
                                    placeholder="Например: Квадратные уравнения — решение по формуле"
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <Label>Предмет</Label>
                                <select value={form.subject} onChange={e => setField('subject', e.target.value)} style={inputStyle}>
                                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Класс</Label>
                                <select value={form.grade} onChange={e => setField('grade', Number(e.target.value))} style={inputStyle}>
                                    {GRADES.map(g => <option key={g} value={g}>{g} класс</option>)}
                                </select>
                            </div>
                            <div>
                                <Label>Длительность (мин)</Label>
                                <input type="number" value={form.duration} onChange={e => setField('duration', Number(e.target.value))} min={5} max={180} style={inputStyle} />
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
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', marginBottom: '8px' }}>
                            <Label style={{ margin: 0 }}>Подробный план / содержание</Label>
                            <button onClick={generatePlan} disabled={aiLoading} style={{
                                background: 'linear-gradient(135deg,#8b5cf6,#a78bfa)', color: 'white',
                                border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer',
                                fontSize: '0.8rem', fontWeight: 700, display: 'flex', gap: '6px', alignItems: 'center',
                                opacity: aiLoading ? 0.7 : 1
                            }}>
                                {aiLoading ? <><Loader2 size={16} /> Генерирую...</> : <><Bot size={16} /> AI: Сгенерировать план</>}
                            </button>
                        </div>
                        <textarea
                            value={form.content}
                            onChange={e => setField('content', e.target.value)}
                            placeholder="Введите план урока вручную или нажмите «AI: Сгенерировать план»..."
                            rows={8}
                            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                        />
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setStep(1)} style={primaryBtn}>Далее →</button>
                    </div>
                </div>
            )}

            {/* ─── STEP 1: FILES ─────────────────────────────── */}
            {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                                <button onClick={() => thumbnailInputRef.current?.click()} style={{ ...primaryBtn, padding: '8px 16px', fontSize: '0.85rem' }}>
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
                                style={{ ...inputStyle, flex: 1, margin: 0 }}
                            />
                            <button onClick={addYoutube} style={{ ...primaryBtn, padding: '10px 20px', whiteSpace: 'nowrap' }}>
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
                            style={{
                                border: `2px dashed ${dragging ? '#6366f1' : 'var(--color-gray-200,#e5e7eb)'}`,
                                borderRadius: '16px', padding: '40px 20px', textAlign: 'center',
                                cursor: 'pointer', background: dragging ? '#ede9fe' : 'var(--color-gray-50,#f9fafb)',
                                transition: 'all 0.2s', marginBottom: '16px'
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
                        <button onClick={() => setStep(0)} style={ghostBtn}>← Назад</button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => saveDraft(false)} disabled={saving} style={{...ghostBtn, display: 'flex', alignItems: 'center', gap: '6px'}}>
                                {saving ? <Loader2 size={16} /> : <Save size={16} />} Сохранить черновик
                            </button>
                            <button onClick={() => setStep(2)} style={primaryBtn}>Просмотр →</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─── STEP 2: PREVIEW ───────────────────────────── */}
            {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                                            <span style={{ marginLeft: 'auto', color: '#6366f1' }}>↗</span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>

                    <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <button onClick={() => setStep(1)} style={ghostBtn}>← Назад</button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => saveDraft(false)} disabled={saving} style={{...ghostBtn, display: 'flex', alignItems: 'center', gap: '6px'}}>
                                {saving ? <Loader2 size={16} /> : <Save size={16} />} Сохранить черновик
                            </button>
                            <button onClick={() => saveDraft(true)} disabled={saving} style={{
                                ...primaryBtn,
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: 'linear-gradient(135deg,#10b981,#059669)',
                                boxShadow: '0 4px 12px rgba(16,185,129,0.35)'
                            }}>
                                {saving ? <Loader2 size={16} /> : <Rocket size={16} />} Опубликовать
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slideIn { from { transform:translateX(20px);opacity:0 } to { transform:translateX(0);opacity:1 } }
            `}</style>
        </div>
    )
}

// ─── Sub-components ──────────────
function Card({ title, children }) {
    return (
        <div style={{
            background: 'var(--color-white, white)', borderRadius: '20px',
            padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            border: '1px solid var(--color-gray-100,#f3f4f6)'
        }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>{title}</h3>
            {children}
        </div>
    )
}

function Label({ children, style }) {
    return <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-gray-700,#374151)', ...style }}>{children}</label>
}

const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: '10px',
    border: '1px solid var(--color-gray-200,#e5e7eb)',
    background: 'var(--color-gray-50,#f9fafb)', fontSize: '0.9rem',
    outline: 'none', boxSizing: 'border-box', marginBottom: '0',
    color: 'var(--color-gray-900,#111827)', fontFamily: 'inherit'
}

const primaryBtn = {
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: 'white', border: 'none', borderRadius: '12px',
    padding: '12px 28px', cursor: 'pointer', fontWeight: 700,
    fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(99,102,241,0.35)',
    transition: 'transform 0.15s, box-shadow 0.15s'
}

const ghostBtn = {
    background: 'none', color: 'var(--color-gray-600,#4b5563)',
    border: '1px solid var(--color-gray-200,#e5e7eb)',
    borderRadius: '12px', padding: '12px 20px', cursor: 'pointer',
    fontWeight: 600, fontSize: '0.9rem'
}
