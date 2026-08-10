import { useState, useEffect, useRef } from 'react'
import { classesAPI, openLessonsAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { useReactToPrint } from 'react-to-print'
import MaterialsTabs from '../components/MaterialsTabs'
import { 
    Plus, Save, Trash2, FileDown, Sparkles, MapPin, Users, Loader, AlertCircle, CheckCircle
} from 'lucide-react'
import { LibraryIcon, ShuffleTeamsIcon } from '../components/Icons'

const SUBJECTS_MAP = {
    math: { ru: 'Математика', kk: 'Математика', icon: 'M' },
    physics: { ru: 'Физика', kk: 'Физика', icon: 'F' },
    chemistry: { ru: 'Химия', kk: 'Химия', icon: 'X' },
    biology: { ru: 'Биология', kk: 'Биология', icon: 'B' },
    history: { ru: 'История', kk: 'Тарих', icon: 'H' },
    geography: { ru: 'География', kk: 'География', icon: 'G' },
    informatics: { ru: 'Информатика', kk: 'Информатика', icon: 'I' },
    kazakh: { ru: 'Казахский язык', kk: 'Қазақ тілі', icon: 'Қ' },
    russian: { ru: 'Русский язык', kk: 'Орыс тілі', icon: 'Р' },
    english: { ru: 'Английский язык', kk: 'Ағылшын тілі', icon: 'E' },
    literature: { ru: 'Литература', kk: 'Әдебиет', icon: 'Л' },
    music: { ru: 'Музыка', kk: 'Музыка', icon: 'М' },
    art: { ru: 'ИЗО', kk: 'Бейнелеу өнері', icon: 'А' },
    pe: { ru: 'Физкультура', kk: 'Дене тәрбиесі', icon: 'П' },
    technology: { ru: 'Технология', kk: 'Технология', icon: 'Т' },
    social: { ru: 'Познание мира', kk: 'Дүниетану', icon: 'С' },
}

const TEAM_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

function OpenLesson() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [lessons, setLessons] = useState([])
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState('list') // 'list' | 'create' | 'detail'
    const [selectedLesson, setSelectedLesson] = useState(null)
    const [savingTeams, setSavingTeams] = useState(false)

    // Form state
    const [form, setForm] = useState({
        title: '',
        subject: '',
        grade: '',
        topic: '',
        objectives: '',
        class_id: '',
        numTeams: 4
    })
    const [aiContent, setAiContent] = useState('')
    const [generating, setGenerating] = useState(false)
    const [saving, setSaving] = useState(false)

    // Teams state
    const [teams, setTeams] = useState([]) // [{team_name, student_ids, task}]
    const [classStudents, setClassStudents] = useState([])

    const printRef = useRef(null)

    // User subjects from profile
    const userSubjectIds = user?.subjects || []
    const userSubjects = userSubjectIds.length > 0
        ? userSubjectIds.map(id => ({ id, ...(SUBJECTS_MAP[id] || { ru: id, kk: id, icon: id.charAt(0).toUpperCase() }) }))
        : Object.entries(SUBJECTS_MAP).map(([id, v]) => ({ id, ...v }))

    useEffect(() => {
        fetchLessons()
        fetchClasses()
    }, [])

    async function fetchLessons() {
        setLoading(true)
        try {
            const data = await openLessonsAPI.getAll()
            setLessons(data)
        } catch (e) { console.error(e) }
        finally { setLoading(false) }
    }

    async function fetchClasses() {
        try {
            const data = await classesAPI.getAll()
            setClasses(data)
        } catch (e) { console.error(e) }
    }

    async function fetchClassStudents(classId) {
        if (!classId) { setClassStudents([]); return }
        try {
            const data = await classesAPI.getStudents(parseInt(classId))
            setClassStudents(data)
        } catch (e) { console.error(e) }
    }

    function handleFormChange(e) {
        const { name, value } = e.target
        setForm(prev => ({ ...prev, [name]: value }))
        if (name === 'class_id') fetchClassStudents(value)
    }

    async function handleGenerate() {
        if (!form.title || !form.subject || !form.topic) {
            alert(L('Заполните: название, предмет и тему', 'Атауын, пәнін және тақырыбын толтырыңыз'))
            return
        }
        setGenerating(true)
        setAiContent('')
        try {
            const res = await openLessonsAPI.generate({
                title: form.title,
                subject: SUBJECTS_MAP[form.subject]?.[language === 'kk' ? 'kk' : 'ru'] || form.subject,
                grade: form.grade || null,
                topic: form.topic,
                objectives: form.objectives,
                language,
                numTeams: parseInt(form.numTeams) || 4
            })
            setAiContent(res.content)
        } catch (e) {
            alert(L('Ошибка ИИ: ' + e.message, 'ИИ қатесі: ' + e.message))
        } finally {
            setGenerating(false)
        }
    }

    async function handleSave() {
        if (!form.title || !aiContent) {
            alert(L('Сначала сгенерируйте урок', 'Алдымен сабақ жасаңыз'))
            return
        }
        setSaving(true)
        try {
            const saved = await openLessonsAPI.create({
                title: form.title,
                subject: SUBJECTS_MAP[form.subject]?.[language === 'kk' ? 'kk' : 'ru'] || form.subject,
                grade: form.grade || null,
                topic: form.topic,
                objectives: form.objectives,
                content: aiContent,
                class_id: form.class_id || null
            })
            // Save teams if any
            if (teams.length > 0 && saved.id) {
                await openLessonsAPI.saveTeams(saved.id, teams)
            }
            await fetchLessons()
            alert(L('Урок сохранён!', 'Сабақ сақталды!'))
            setView('list')
            resetForm()
        } catch (e) {
            alert(L('Ошибка: ' + e.message, 'Қате: ' + e.message))
        } finally {
            setSaving(false)
        }
    }

    function resetForm() {
        setForm({ title: '', subject: '', grade: '', topic: '', objectives: '', class_id: '', numTeams: 4 })
        setAiContent('')
        setTeams([])
        setClassStudents([])
    }

    function handleSplitTeams() {
        if (classStudents.length === 0) {
            alert(L('Выберите класс с учениками', 'Оқушылары бар сынып таңдаңыз'))
            return
        }
        const n = parseInt(form.numTeams) || 4
        const shuffled = [...classStudents].sort(() => Math.random() - 0.5)
        const newTeams = Array.from({ length: n }, (_, i) => ({
            team_name: L(`Команда ${i + 1}`, `${i + 1}-команда`),
            student_ids: [],
            task: ''
        }))
        shuffled.forEach((s, i) => {
            newTeams[i % n].student_ids.push(s.id)
        })
        setTeams(newTeams)
    }

    function getStudentName(id) {
        return classStudents.find(s => s.id === id)?.name || `#${id}`
    }

    async function handleViewLesson(lesson) {
        try {
            const detail = await openLessonsAPI.getById(lesson.id)
            setSelectedLesson(detail)
            setView('detail')
        } catch (e) { console.error(e) }
    }

    async function handleDeleteLesson(id, e) {
        e.stopPropagation()
        if (!confirm(L('Удалить урок?', 'Сабақты жою?'))) return
        try {
            await openLessonsAPI.delete(id)
            await fetchLessons()
        } catch (e) { alert(e.message) }
    }

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: selectedLesson?.title || 'Lesson',
    })

    // ===== RENDER =====

    // DETAIL VIEW
    if (view === 'detail' && selectedLesson) {
        return (
            <div>
                <MaterialsTabs />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button className="btn btn-secondary no-print" onClick={() => setView('list')}>← {L('Назад', 'Артқа')}</button>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>{selectedLesson.title}</h1>
                    </div>
                    <button onClick={handlePrint} className="btn btn-primary no-print" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <FileDown size={16} /> {L('Скачать PDF', 'PDF жүктеу')}
                    </button>
                </div>
                <div ref={printRef} className="print-container" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>
                    <div className="widget" style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                            {selectedLesson.subject && <span className="badge badge-primary">{selectedLesson.subject}</span>}
                            {selectedLesson.grade && <span className="badge badge-gray">{selectedLesson.grade} {L('класс', 'сынып')}</span>}
                            {selectedLesson.class_name && <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Users size={12} /> {selectedLesson.class_name}</span>}
                        </div>
                        {selectedLesson.topic && <p style={{ color: 'var(--color-gray-600)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {L('Тема', 'Тақырып')}: <strong>{selectedLesson.topic}</strong></p>}
                        <div style={{
                            background: 'var(--color-gray-50)',
                            borderRadius: '12px',
                            padding: '20px',
                            whiteSpace: 'pre-wrap',
                            lineHeight: 1.7,
                            fontSize: '0.9rem'
                        }}>{selectedLesson.content}</div>
                    </div>
                    <div>
                        {selectedLesson.teams && selectedLesson.teams.length > 0 && (
                            <div className="widget" style={{ padding: '20px' }}>
                                <h3 style={{ fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}><Users size={16} /> {L('Команды', 'Командалар')}</h3>
                                {selectedLesson.teams.map((team, i) => (
                                    <div key={team.id} style={{
                                        borderRadius: '10px',
                                        padding: '14px',
                                        marginBottom: '12px',
                                        border: `2px solid ${TEAM_COLORS[i % TEAM_COLORS.length]}20`,
                                        background: `${TEAM_COLORS[i % TEAM_COLORS.length]}08`
                                    }}>
                                        <div style={{ fontWeight: 700, color: TEAM_COLORS[i % TEAM_COLORS.length], marginBottom: '8px' }}>
                                            {team.team_name}
                                        </div>
                                        <div className="print-avoid-break" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {(team.student_ids || []).map(sid => (
                                                <span key={sid} style={{
                                                    background: `${TEAM_COLORS[i % TEAM_COLORS.length]}20`,
                                                    color: TEAM_COLORS[i % TEAM_COLORS.length],
                                                    padding: '3px 10px',
                                                    borderRadius: '20px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 600
                                                }}>{getStudentName(sid)}</span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // CREATE VIEW
    if (view === 'create') {
        return (
            <div>
                <MaterialsTabs />
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                    <button className="btn btn-secondary" onClick={() => { setView('list'); resetForm() }}>
                        ← {L('Назад', 'Артқа')}
                    </button>
                    <div>
                        <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <LibraryIcon size={24} color="var(--color-primary-600)" /> {L('Создать открытый урок', 'Ашық сабақ жасау')}
                        </h1>
                        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                            {L('Используйте ИИ для полного плана урока', 'Толық сабақ жоспары үшін ИИ пайдаланыңыз')}
                        </p>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '24px', alignItems: 'start' }}>
                    {/* LEFT: Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div className="widget" style={{ padding: '20px' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} color="var(--color-primary-600)" /> {L('Параметры урока', 'Сабақ параметрлері')}
                            </h3>
                            <div style={{ marginBottom: '12px' }}>
                                <label className="label">{L('Название урока *', 'Сабақ атауы *')}</label>
                                <input className="input" name="title" value={form.title}
                                    onChange={handleFormChange}
                                    placeholder={L('Например: Открытый урок по алгебре', 'Мысалы: Алгебра ашық сабағы')} />
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label className="label">{L('Предмет *', 'Пән *')}</label>
                                <select className="filter-select" name="subject" value={form.subject}
                                    onChange={handleFormChange} style={{ width: '100%' }}>
                                    <option value="">{L('— Выберите предмет —', '— Пән таңдаңыз —')}</option>
                                    {userSubjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.icon} {language === 'kk' ? s.kk : s.ru}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                                <div>
                                    <label className="label">{L('Класс', 'Сынып')}</label>
                                    <select className="filter-select" name="grade" value={form.grade}
                                        onChange={handleFormChange} style={{ width: '100%' }}>
                                        <option value="">{L('Любой', 'Кез келген')}</option>
                                        {[1,2,3,4,5,6,7,8,9,10,11].map(g => (
                                            <option key={g} value={g}>{g} {L('кл.', 'сынып')}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">{L('Команд', 'Команда')}</label>
                                    <select className="filter-select" name="numTeams" value={form.numTeams}
                                        onChange={handleFormChange} style={{ width: '100%' }}>
                                        {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginBottom: '12px' }}>
                                <label className="label">{L('Тема урока *', 'Сабақ тақырыбы *')}</label>
                                <input className="input" name="topic" value={form.topic}
                                    onChange={handleFormChange}
                                    placeholder={L('Например: Квадратные уравнения', 'Мысалы: Квадрат теңдеулер')} />
                            </div>
                            <div style={{ marginBottom: '16px' }}>
                                <label className="label">{L('Цели урока', 'Сабақ мақсаттары')}</label>
                                <textarea className="input" name="objectives" value={form.objectives}
                                    onChange={handleFormChange} rows={3}
                                    style={{ resize: 'vertical' }}
                                    placeholder={L('Что должны узнать ученики?', 'Оқушылар не білуі тиіс?')} />
                            </div>
                            <button className="btn btn-primary" onClick={handleGenerate}
                                disabled={generating} style={{ width: '100%', fontSize: '1rem' }}>
                                {generating ? (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                        {L('ИИ генерирует...', 'ИИ жасауда...')}
                                    </span>
                                ) : (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                        <Sparkles size={16} /> {L('Сгенерировать с ИИ', 'ИИ-мен жасау')}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Class & Teams */}
                        <div className="widget" style={{ padding: '20px' }}>
                            <h3 style={{ fontWeight: 700, marginBottom: '16px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={16} /> {L('Деление на команды', 'Командаларға бөлу')}
                            </h3>
                            <div style={{ marginBottom: '12px' }}>
                                <label className="label">{L('Выберите класс', 'Сыныпты таңдаңыз')}</label>
                                <select className="filter-select" name="class_id" value={form.class_id}
                                    onChange={handleFormChange} style={{ width: '100%' }}>
                                    <option value="">{L('— Без класса —', '— Сыныпсыз —')}</option>
                                    {classes.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.student_count || 0} {L('уч.', 'оқ.')})</option>
                                    ))}
                                </select>
                            </div>
                            <button className="btn btn-secondary" onClick={handleSplitTeams}
                                disabled={!form.class_id || classStudents.length === 0}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                <ShuffleTeamsIcon size={16} /> {L('Случайное деление', 'Кездейсоқ бөлу')}
                            </button>

                            {teams.length > 0 && (
                                <div style={{ marginTop: '16px' }}>
                                    {teams.map((team, i) => (
                                        <div key={i} style={{
                                            borderRadius: '10px',
                                            padding: '12px',
                                            marginBottom: '10px',
                                            border: `2px solid ${TEAM_COLORS[i % TEAM_COLORS.length]}30`,
                                            background: `${TEAM_COLORS[i % TEAM_COLORS.length]}08`
                                        }}>
                                            <input
                                                style={{
                                                    border: 'none', background: 'transparent',
                                                    fontWeight: 700, color: TEAM_COLORS[i % TEAM_COLORS.length],
                                                    fontSize: '0.9rem', width: '100%', marginBottom: '8px', outline: 'none'
                                                }}
                                                value={team.team_name}
                                                onChange={e => {
                                                    const newTeams = [...teams]
                                                    newTeams[i].team_name = e.target.value
                                                    setTeams(newTeams)
                                                }}
                                            />
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
                                                {team.student_ids.map(sid => (
                                                    <span key={sid} style={{
                                                        background: `${TEAM_COLORS[i % TEAM_COLORS.length]}20`,
                                                        color: TEAM_COLORS[i % TEAM_COLORS.length],
                                                        padding: '2px 8px', borderRadius: '20px',
                                                        fontSize: '0.75rem', fontWeight: 600
                                                    }}>{getStudentName(sid)}</span>
                                                ))}
                                            </div>
                                            <input className="input" style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                                                placeholder={L('Задание для команды...', 'Команда тапсырмасы...')}
                                                value={team.task}
                                                onChange={e => {
                                                    const newTeams = [...teams]
                                                    newTeams[i].task = e.target.value
                                                    setTeams(newTeams)
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* RIGHT: AI Content */}
                    <div className="widget" style={{ padding: '24px', minHeight: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Sparkles size={16} color="var(--color-primary-600)" /> {L('План урока от ИИ', 'ИИ сабақ жоспары')}
                            </h3>
                            {aiContent && (
                                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {saving ? <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> {L('Сохранение...', 'Сақталуда...')}</> : <><Save size={14} /> {L('Сохранить урок', 'Сабақты сақтау')}</>}
                                </button>
                            )}
                        </div>

                        {!aiContent && !generating && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'var(--color-gray-400)', textAlign: 'center', gap: '16px' }}>
                                <Sparkles size={48} color="#d1d5db" />
                                <div>
                                    <p style={{ fontWeight: 600, marginBottom: '8px' }}>
                                        {L('Заполните форму и нажмите «Сгенерировать с ИИ»', 'Форманы толтырып, «ИИ-мен жасау» батырмасын басыңыз')}
                                    </p>
                                    <p style={{ fontSize: '0.85rem' }}>
                                        {L('ИИ создаст полный план открытого урока с целями, этапами и заданиями для команд',
                                            'ИИ мақсаттармен, кезеңдермен және командалар тапсырмасымен толық ашық сабақ жоспарын жасайды')}
                                    </p>
                                </div>
                            </div>
                        )}

                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', gap: '20px' }}>
                                <div style={{
                                    width: '60px', height: '60px',
                                    background: 'var(--gradient-primary)',
                                    borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                }}>
                                    <Sparkles size={28} color="white" />
                                </div>
                                <p style={{ fontWeight: 600, color: 'var(--color-primary-600)' }}>
                                    {L('ИИ создаёт план урока...', 'ИИ сабақ жоспарын жасауда...')}
                                </p>
                            </div>
                        )}

                        {aiContent && (
                            <textarea
                                value={aiContent}
                                onChange={e => setAiContent(e.target.value)}
                                style={{
                                    width: '100%',
                                    minHeight: '500px',
                                    border: '1px solid var(--color-gray-200)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    fontFamily: 'inherit',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.7,
                                    resize: 'vertical',
                                    outline: 'none'
                                }}
                            />
                        )}
                    </div>
                </div>

                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }`}</style>
            </div>
        )
    }

    // LIST VIEW
    return (
        <div>
            <MaterialsTabs />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <LibraryIcon size={28} color="var(--color-primary-600)" />
                        {L('База знаний', 'Білім базасы')}
                    </h1>
                    <p style={{ color: 'var(--color-gray-500)' }}>
                        {L('Открытые уроки с ИИ-поддержкой и делением на команды',
                            'ИИ қолдауымен ашық сабақтар және командаларға бөлу')}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setView('create')} style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={18} /> {L('Создать открытый урок', 'Ашық сабақ жасау')}
                </button>
            </div>

            {/* User subjects bar */}
            {userSubjectIds.length > 0 && (
                <div style={{
                    display: 'flex', gap: '8px', flexWrap: 'wrap',
                    marginBottom: '20px', padding: '12px 16px',
                    background: 'var(--color-primary-50)',
                    borderRadius: '12px', border: '1px solid var(--color-primary-100)'
                }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-primary-700)', fontWeight: 600 }}>
                        {L('Ваши предметы:', 'Сіздің пәндеріңіз:')}
                    </span>
                    {userSubjects.map(s => (
                        <span key={s.id} style={{
                            padding: '3px 10px', borderRadius: '20px',
                            background: 'white', border: '1px solid var(--color-primary-200)',
                            fontSize: '0.8rem', color: 'var(--color-primary-700)', fontWeight: 500
                        }}>{s.icon} {language === 'kk' ? s.kk : s.ru}</span>
                    ))}
                </div>
            )}

            {loading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-gray-400)' }}>
                    {L('Загрузка...', 'Жүктелуде...')}
                </div>
            ) : lessons.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '80px 40px',
                    background: 'white', borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px', display: 'flex', justifyContent: 'center' }}>
                        <LibraryIcon size={72} color="#d1d5db" />
                    </div>
                    <h2 style={{ fontWeight: 700, marginBottom: '8px' }}>
                        {L('Нет открытых уроков', 'Ашық сабақтар жоқ')}
                    </h2>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: '24px' }}>
                        {L('Создайте первый открытый урок с помощью ИИ',
                            'ИИ-мен алғашқы ашық сабақты жасаңыз')}
                    </p>
                    <button className="btn btn-primary" onClick={() => setView('create')} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={16} /> {L('Создать урок', 'Сабақ жасау')}
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {lessons.map(lesson => (
                        <div
                            key={lesson.id}
                            className="widget"
                            style={{
                                padding: '20px', cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                ':hover': { transform: 'translateY(-2px)' }
                            }}
                            onClick={() => handleViewLesson(lesson)}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '12px',
                                background: 'var(--gradient-primary)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <LibraryIcon size={22} color="white" />
                            </div>
                            <button
                                onClick={e => handleDeleteLesson(lesson.id, e)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-400)', padding: '4px', display: 'flex', alignItems: 'center' }}>
                                <Trash2 size={16} />
                            </button>
                            </div>
                            <h3 style={{ fontWeight: 700, marginBottom: '8px', lineHeight: 1.3 }}>{lesson.title}</h3>
                            {lesson.topic && (
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <MapPin size={12} /> {lesson.topic}
                                </p>
                            )}
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                {lesson.subject && <span className="badge badge-primary">{lesson.subject}</span>}
                                {lesson.grade && <span className="badge badge-gray">{lesson.grade} {L('кл.', 'сын.')}</span>}
                                {lesson.class_name && <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Users size={10} /> {lesson.class_name}</span>}
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-400)', marginTop: '12px' }}>
                                {new Date(lesson.created_at).toLocaleDateString(language === 'kk' ? 'kk-KZ' : 'ru-RU')}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default OpenLesson
