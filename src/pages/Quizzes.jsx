import { useState, useEffect } from 'react'
import { quizzesAPI, classesAPI } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import {
    Plus, Trash2, Edit3, BarChart2, Sparkles,
    ChevronDown, ChevronUp, CheckCircle, XCircle,
    FileQuestion, Clock, Users, BookOpen, Loader, Share2, Eye, Send
} from 'lucide-react'

const ALL_SUBJECTS = [
    { id: 'primary', ru: 'Бастауыш / Нач. классы' },
    { id: 'math', ru: 'Математика' },
    { id: 'physics', ru: 'Физика' },
    { id: 'chemistry', ru: 'Химия' },
    { id: 'biology', ru: 'Биология' },
    { id: 'history', ru: 'История' },
    { id: 'geography', ru: 'География' },
    { id: 'informatics', ru: 'Информатика' },
    { id: 'kazakh', ru: 'Казахский язык' },
    { id: 'russian', ru: 'Русский язык' },
    { id: 'english', ru: 'Английский язык' },
    { id: 'literature', ru: 'Литература' },
    { id: 'music', ru: 'Музыка' },
    { id: 'art', ru: 'ИЗО' },
    { id: 'pe', ru: 'Физкультура' },
    { id: 'technology', ru: 'Технология' },
    { id: 'social', ru: 'Познание мира' },
]

const GRADES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']

const emptyQuestion = () => ({
    question: '',
    options: ['A) ', 'B) ', 'C) ', 'D) '],
    correct: 'A',
    explanation: ''
})

export default function Quizzes() {
    const { user } = useAuth()
    const { language } = useLanguage()
    const [quizzes, setQuizzes] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [modal, setModal] = useState(null)
    const [activeQuiz, setActiveQuiz] = useState(null)
    const [classes, setClasses] = useState([])

    // Parse teacher's subjects from profile
    const userSubjectIds = (() => {
        try { return JSON.parse(user?.subjects || '[]') } catch { return [] }
    })()
    const SUBJECTS = userSubjectIds.length > 0
        ? ALL_SUBJECTS.filter(s => userSubjectIds.includes(s.id)).map(s => s.ru)
        : ALL_SUBJECTS.map(s => s.ru)
    // Form state
    const [form, setForm] = useState({
        title: '', subject: '', grade: '', description: '', time_limit: ''
    })
    const [questions, setQuestions] = useState([emptyQuestion()])
    const [saving, setSaving] = useState(false)

    // AI gen state
    const [aiForm, setAiForm] = useState({ topic: '', subject: '', grade: '', question_count: 5, language: 'ru' })
    const [aiLoading, setAiLoading] = useState(false)
    const [aiQuestions, setAiQuestions] = useState([])

    // Take quiz state
    const [takeAnswers, setTakeAnswers] = useState({})
    const [takeSubmitted, setTakeSubmitted] = useState(false)
    const [takeScore, setTakeScore] = useState(null)
    const [studentName, setStudentName] = useState('')
    const [timeLeft, setTimeLeft] = useState(null)

    useEffect(() => {
        loadQuizzes()
        loadClasses()
    }, [])

    // Timer for taking quiz
    useEffect(() => {
        if (modal === 'take' && activeQuiz?.time_limit && !takeSubmitted) {
            setTimeLeft(activeQuiz.time_limit * 60)
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { clearInterval(interval); handleSubmitQuiz(); return 0 }
                    return prev - 1
                })
            }, 1000)
            return () => clearInterval(interval)
        }
    }, [modal, activeQuiz])

    async function loadQuizzes() {
        try {
            setLoading(true)
            const data = await quizzesAPI.getAll()
            setQuizzes(data)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    async function loadClasses() {
        try {
            const data = await classesAPI.getAll()
            setClasses(data)
        } catch (e) {
            console.error('Failed to load classes', e)
        }
    }

    function openCreate() {
        setForm({ title: '', subject: '', grade: '', description: '', time_limit: '' })
        setQuestions([emptyQuestion()])
        setAiQuestions([])
        setModal('create')
    }

    function openEdit(quiz) {
        setActiveQuiz(quiz)
        setForm({
            title: quiz.title, subject: quiz.subject || '',
            grade: quiz.grade || '', description: quiz.description || '',
            time_limit: quiz.time_limit || ''
        })
        setQuestions(quiz.questions.length > 0 ? quiz.questions : [emptyQuestion()])
        setAiQuestions([])
        setModal('edit')
    }

    function openTake(quiz) {
        setActiveQuiz(quiz)
        setTakeAnswers({})
        setTakeSubmitted(false)
        setTakeScore(null)
        setStudentName('')
        setModal('take')
    }

    const [assignForm, setAssignForm] = useState({ class_id: '', deadline: '' })

    function openAssign(quiz) {
        setActiveQuiz(quiz)
        setAssignForm({ class_id: '', deadline: '' })
        setModal('assign')
    }

    function closeModal() {
        setModal(null)
        setActiveQuiz(null)
        setAiQuestions([])
    }

    // Questions management
    function updateQuestion(idx, field, value) {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q))
    }

    function updateOption(qIdx, optIdx, value) {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q
            const opts = [...q.options]
            opts[optIdx] = value
            return { ...q, options: opts }
        }))
    }

    function addQuestion() {
        setQuestions(prev => [...prev, emptyQuestion()])
    }

    function removeQuestion(idx) {
        if (questions.length <= 1) return
        setQuestions(prev => prev.filter((_, i) => i !== idx))
    }

    function importAiQuestions() {
        setQuestions(aiQuestions.length > 0 ? aiQuestions : [emptyQuestion()])
        setAiQuestions([])
    }

    async function handleAiGenerate() {
        if (!aiForm.topic) return
        try {
            setAiLoading(true)
            const result = await quizzesAPI.aiGenerate(aiForm)
            setAiQuestions(result.questions)
        } catch (e) {
            alert('ИИ ошибка: ' + e.message)
        } finally {
            setAiLoading(false)
        }
    }

    async function handleSaveQuiz() {
        if (!form.title) return alert('Введите название теста')
        const validQ = questions.filter(q => q.question.trim())
        if (validQ.length === 0) return alert('Добавьте хотя бы один вопрос')
        try {
            setSaving(true)
            const payload = {
                ...form,
                time_limit: form.time_limit ? parseInt(form.time_limit) : null,
                questions: validQ
            }
            if (modal === 'edit' && activeQuiz) {
                await quizzesAPI.update(activeQuiz.id, payload)
            } else {
                await quizzesAPI.create(payload)
            }
            await loadQuizzes()
            closeModal()
        } catch (e) {
            alert('Ошибка: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete(id) {
        if (!confirm('Удалить тест? Все результаты тоже удалятся.')) return
        try {
            await quizzesAPI.delete(id)
            setQuizzes(prev => prev.filter(q => q.id !== id))
        } catch (e) {
            alert('Ошибка удаления: ' + e.message)
        }
    }

    async function handleSubmitQuiz() {
        if (!studentName.trim()) return alert('Введите имя ученика')
            const quiz = activeQuiz
        let score = 0
        const answers = quiz.questions.map((q, idx) => {
            const ans = takeAnswers[idx] || ''
            if (ans === q.correct) score++
            return ans
        })
        try {
            await quizzesAPI.submitAttempt(quiz.id, {
                student_name: studentName,
                answers,
                score,
                max_score: quiz.questions.length,
                time_spent: quiz.time_limit ? quiz.time_limit * 60 - (timeLeft || 0) : 0
            })
            setTakeScore({ score, max: quiz.questions.length })
            setTakeSubmitted(true)
            loadQuizzes()
        } catch (e) {
            alert('Ошибка сохранения: ' + e.message)
        }
    }

    async function handleAssignQuiz() {
        if (!assignForm.class_id) return alert('Выберите класс')
        try {
            setSaving(true)
            await quizzesAPI.assign(activeQuiz.id, assignForm)
            alert('Тест успешно назначен классу!')
            closeModal()
        } catch (e) {
            alert('Ошибка: ' + e.message)
        } finally {
            setSaving(false)
        }
    }

    function copyLink(quiz) {
        const link = `${window.location.origin}/quizzes?take=${quiz.id}`
        navigator.clipboard.writeText(link).then(() => alert('Ссылка скопирована! Отправьте её ученикам.'))
    }

    function formatTime(secs) {
        const m = Math.floor(secs / 60).toString().padStart(2, '0')
        const s = (secs % 60).toString().padStart(2, '0')
        return `${m}:${s}`
    }

    // Check if URL has ?take=id
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const takeId = params.get('take')
        if (takeId && quizzes.length > 0) {
            const quiz = quizzes.find(q => q.id == takeId)
            if (quiz) openTake(quiz)
        }
    }, [quizzes])

    return (
        <div className="page-content" style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px' }}>
            {/* Page Header */}
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gray-900)', margin: 0 }}>
                        {language === 'kk' ? 'Тесттер' : 'Тесты'}
                    </h1>
                    <p style={{ color: 'var(--color-gray-500)', marginTop: 4, marginBottom: 0 }}>
                        {language === 'kk' 
                            ? 'Тесттерді қолмен немесе жасанды интеллект көмегімен жасаңыз' 
                            : 'Создавайте тесты вручную или с помощью ИИ, отслеживайте результаты'}
                    </p>
                </div>
                <button className="btn btn-primary" onClick={openCreate} style={{ gap: 8, display: 'flex', alignItems: 'center' }}>
                    <Plus size={18} /> {language === 'kk' ? 'Тест жасау' : 'Создать тест'}
                </button>
            </div>

            {/* Stats */}
            {quizzes.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
                    {[
                        { label: language === 'kk' ? 'Барлық тесттер' : 'Всего тестов', value: quizzes.length, icon: <FileQuestion size={22} />, color: '#6366f1' },
                        { label: language === 'kk' ? 'Барлық әрекеттер' : 'Всего попыток', value: quizzes.reduce((a, q) => a + (q.attempts_count || 0), 0), icon: <Users size={22} />, color: '#22c55e' },
                        { label: language === 'kk' ? 'Барлық сұрақтар' : 'Всего вопросов', value: quizzes.reduce((a, q) => a + (q.questions?.length || 0), 0), icon: <BookOpen size={22} />, color: '#f59e0b' },
                    ].map(s => (
                        <div key={s.label} className="stat-card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: s.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                                {s.icon}
                            </div>
                            <div>
                                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{s.value}</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>{s.label}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Quiz list */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: 60, color: 'var(--color-gray-500)' }}>
                    <Loader size={32} style={{ animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                    <p>{language === 'kk' ? 'Тесттер жүктелуде...' : 'Загрузка тестов...'}</p>
                </div>
            ) : quizzes.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--color-gray-100)', borderRadius: 20 }}>
                    <FileQuestion size={56} style={{ color: 'var(--color-gray-400)', marginBottom: 16 }} />
                    <h3 style={{ color: 'var(--color-gray-600)', marginBottom: 8 }}>{language === 'kk' ? 'Тесттер жоқ' : 'Нет тестов'}</h3>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: 24 }}>
                        {language === 'kk' ? 'Алғашқы тестті қолмен немесе ИИ көмегімен жасаңыз' : 'Создайте первый тест вручную или с помощью ИИ'}
                    </p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={16} /> {language === 'kk' ? 'Тест жасау' : 'Создать тест'}</button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                    {quizzes.map(quiz => (
                        <QuizCard key={quiz.id} quiz={quiz} language={language}
                            onEdit={() => openEdit(quiz)}
                            onDelete={() => handleDelete(quiz.id)}
                            onTake={() => openTake(quiz)}
                            onCopyLink={() => copyLink(quiz)}
                            onReport={() => window.location.href = `/quizzes/${quiz.id}/report`}
                            onAssign={() => openAssign(quiz)}
                        />
                    ))}
                </div>
            )}

            {/* ===== CREATE / EDIT MODAL ===== */}
            {(modal === 'create' || modal === 'edit') && (
                <Modal title={modal === 'edit' ? (language === 'kk' ? 'Тестті өңдеу' : 'Редактировать тест') : (language === 'kk' ? 'Тест жасау' : 'Создать тест')} onClose={closeModal} wide>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                        <div style={{ gridColumn: '1/-1' }}>
                            <label className="label">Название теста *</label>
                            <input className="input" placeholder="Например: Контрольная по алгебре" value={form.title}
                                onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Предмет</label>
                            <select className="input filter-select" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}>
                                <option value="">Выбрать...</option>
                                {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Класс</label>
                            <select className="input filter-select" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))}>
                                <option value="">Выбрать...</option>
                                {GRADES.map(g => <option key={g}>{g}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Лимит времени (минут, 0 = без лимита)</label>
                            <input className="input" type="number" min="0" placeholder="Например: 20"
                                value={form.time_limit} onChange={e => setForm(p => ({ ...p, time_limit: e.target.value }))} />
                        </div>
                        <div>
                            <label className="label">Описание</label>
                            <input className="input" placeholder="Необязательно" value={form.description}
                                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                        </div>
                    </div>

                    {/* AI Generator */}
                    <div style={{ background: 'linear-gradient(135deg, #6366f120, #8b5cf620)', border: '1px solid #6366f130', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, color: '#6366f1', fontWeight: 700, fontSize: '1rem' }}>
                            <Sparkles size={20} /> Генерация вопросов с помощью ИИ
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px', gap: 10, alignItems: 'end' }}>
                            <div>
                                <label className="label" style={{ fontSize: '0.78rem' }}>Тема</label>
                                <input className="input" placeholder="Например: Квадратные уравнения" value={aiForm.topic}
                                    onChange={e => setAiForm(p => ({ ...p, topic: e.target.value }))} />
                            </div>
                            <div>
                                <label className="label" style={{ fontSize: '0.78rem' }}>Предмет</label>
                                <select className="input filter-select" value={aiForm.subject} onChange={e => setAiForm(p => ({ ...p, subject: e.target.value }))}>
                                    <option value="">Любой</option>
                                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="label" style={{ fontSize: '0.78rem' }}>Кол-во</label>
                                <input className="input" type="number" min="2" max="20" value={aiForm.question_count}
                                    onChange={e => setAiForm(p => ({ ...p, question_count: parseInt(e.target.value) }))} />
                            </div>
                            <button className="btn btn-primary" onClick={handleAiGenerate} disabled={aiLoading || !aiForm.topic} style={{ padding: '10px 16px', fontSize: '0.85rem' }}>
                                {aiLoading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                            </button>
                        </div>
                        {aiQuestions.length > 0 && (
                            <div style={{ marginTop: 14, padding: 14, background: '#22c55e15', borderRadius: 10, border: '1px solid #22c55e30' }}>
                                <div style={{ color: '#22c55e', fontWeight: 600, marginBottom: 8 }}>
                                    ИИ сгенерировал {aiQuestions.length} вопросов!
                                </div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button className="btn btn-primary btn-sm" onClick={importAiQuestions}>
                                        Использовать эти вопросы
                                    </button>
                                    <button className="btn btn-secondary btn-sm" onClick={handleAiGenerate} disabled={aiLoading}>
                                        Сгенерировать заново
                                    </button>
                                </div>
                                <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
                                    {aiQuestions.map((q, i) => (
                                        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #22c55e20', fontSize: '0.85rem', color: 'var(--color-gray-700)' }}>
                                            <b>{i + 1}. {q.question}</b>
                                            <span style={{ color: '#22c55e', marginLeft: 8 }}>(Ответ: {q.correct})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Questions Editor */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: 'var(--color-gray-900)' }}>
                                Вопросы ({questions.length})
                            </h3>
                            <button className="btn btn-secondary btn-sm" onClick={addQuestion} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Plus size={14} /> Добавить вопрос
                            </button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {questions.map((q, qi) => (
                                <QuestionEditor key={qi} q={q} qi={qi}
                                    onChange={(f, v) => updateQuestion(qi, f, v)}
                                    onOptionChange={(oi, v) => updateOption(qi, oi, v)}
                                    onRemove={() => removeQuestion(qi)}
                                    canRemove={questions.length > 1}
                                />
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--color-gray-200)' }}>
                        <button className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                        <button className="btn btn-primary" onClick={handleSaveQuiz} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={16} />}
                            {modal === 'edit' ? 'Сохранить изменения' : 'Создать тест'}
                        </button>
                    </div>
                </Modal>
            )}

            {/* ===== TAKE QUIZ MODAL ===== */}
            {modal === 'take' && activeQuiz && (
                <Modal title={activeQuiz.title} onClose={closeModal} wide>
                    {!takeSubmitted ? (
                        <div>
                            <div style={{ display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' }}>
                                {activeQuiz.subject && <span className="badge badge-primary">{activeQuiz.subject}</span>}
                                {activeQuiz.grade && <span className="badge badge-gray">{activeQuiz.grade} класс</span>}
                                <span className="badge badge-gray">{activeQuiz.questions.length} вопросов</span>
                                {timeLeft !== null && (
                                    <span className="badge" style={{ background: timeLeft < 60 ? '#ef444420' : '#f59e0b20', color: timeLeft < 60 ? '#ef4444' : '#f59e0b', fontWeight: 700 }}>
                                        <Clock size={12} style={{ marginRight: 4 }} /> {formatTime(timeLeft)}
                                    </span>
                                )}
                            </div>

                            <div style={{ marginBottom: 20 }}>
                                <label className="label">Ваше имя *</label>
                                <input className="input" placeholder="Имя Фамилия ученика" value={studentName}
                                    onChange={e => setStudentName(e.target.value)} style={{ maxWidth: 320 }} />
                            </div>

                            {activeQuiz.questions.map((q, qi) => (
                                <div key={qi} style={{ marginBottom: 24, padding: 20, background: 'var(--color-gray-100)', borderRadius: 14, border: '1px solid var(--color-gray-200)' }}>
                                    <div style={{ fontWeight: 600, color: 'var(--color-gray-900)', marginBottom: 14 }}>
                                        {qi + 1}. {q.question}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                        {q.options.map((opt, oi) => {
                                            const letter = ['A', 'B', 'C', 'D'][oi]
                                            const selected = takeAnswers[qi] === letter
                                            return (
                                                <label key={oi} style={{
                                                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                                                    borderRadius: 10, cursor: 'pointer', border: '2px solid',
                                                    borderColor: selected ? 'var(--color-primary-500)' : 'var(--color-gray-200)',
                                                    background: selected ? 'var(--color-primary-50)' : 'var(--color-gray-50)',
                                                    transition: 'all 0.15s'
                                                }}>
                                                    <input type="radio" name={`q-${qi}`} value={letter}
                                                        checked={selected}
                                                        onChange={() => setTakeAnswers(p => ({ ...p, [qi]: letter }))}
                                                        style={{ display: 'none' }} />
                                                    <div style={{
                                                        width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        background: selected ? 'var(--color-primary-500)' : 'var(--color-gray-200)',
                                                        color: selected ? 'white' : 'var(--color-gray-600)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0
                                                    }}>{letter}</div>
                                                    <span style={{ color: 'var(--color-gray-700)' }}>{opt}</span>
                                                </label>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--color-gray-200)' }}>
                                <button className="btn btn-primary" onClick={handleSubmitQuiz} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle size={18} /> Сдать тест
                                </button>
                            </div>
                        </div>
                    ) : (
                        <QuizResult score={takeScore} quiz={activeQuiz} answers={takeAnswers} onClose={closeModal} />
                    )}
                </Modal>
            )}

            {/* ===== ASSIGN MODAL ===== */}
            {modal === 'assign' && activeQuiz && (
                <Modal title={language === 'kk' ? 'Сыныпқа тағайындау' : 'Назначить классу'} onClose={closeModal}>
                    <div style={{ marginBottom: 20 }}>
                        <label className="label">Выберите класс *</label>
                        <select className="input" value={assignForm.class_id} onChange={e => setAssignForm(p => ({ ...p, class_id: e.target.value }))}>
                            <option value="">-- Выберите класс --</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name} {c.grade ? `(${c.grade} кл)` : ''}</option>)}
                        </select>
                    </div>
                    <div style={{ marginBottom: 24 }}>
                        <label className="label">Дедлайн (необязательно)</label>
                        <input type="datetime-local" className="input" value={assignForm.deadline} onChange={e => setAssignForm(p => ({ ...p, deadline: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid var(--color-gray-200)' }}>
                        <button className="btn btn-secondary" onClick={closeModal}>Отмена</button>
                        <button className="btn btn-primary" onClick={handleAssignQuiz} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {saving ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
                            Назначить
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    )
}

// ============== Sub-components ==============

function QuizCard({ quiz, language, onEdit, onDelete, onTake, onCopyLink, onReport, onAssign }) {
    const pct = quiz.questions?.length > 0 ? Math.round(((quiz.attempts_count || 0) / Math.max(1, quiz.attempts_count || 1)) * 100) : 0
    return (
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 6px', fontWeight: 700, fontSize: '1.05rem', color: 'var(--color-gray-900)' }}>{quiz.title}</h3>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {quiz.subject && <span className="badge badge-primary" style={{ fontSize: '0.75rem' }}>{quiz.subject}</span>}
                        {quiz.grade && <span className="badge badge-gray" style={{ fontSize: '0.75rem' }}>{quiz.grade} {language === 'kk' ? 'сынып' : 'кл.'}</span>}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={onCopyLink} style={iconBtn} title={language === 'kk' ? 'Сілтеме көшіру' : 'Копировать ссылку'}><Share2 size={15} /></button>
                    <button onClick={onTake} style={iconBtn} title={language === 'kk' ? 'Көру' : 'Посмотреть'}><Eye size={15} /></button>
                    <button onClick={onEdit} style={iconBtn} title={language === 'kk' ? 'Өңдеу' : 'Редактировать'}><Edit3 size={15} /></button>
                    <button onClick={onDelete} style={{ ...iconBtn, color: '#ef4444', background: '#ef444415' }} title={language === 'kk' ? 'Жою' : 'Удалить'}><Trash2 size={15} /></button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                    { label: language === 'kk' ? 'Сұрақтар' : 'Вопросов', value: quiz.questions?.length || 0, icon: <FileQuestion size={14} /> },
                    { label: language === 'kk' ? 'Әрекеттер' : 'Попыток', value: quiz.attempts_count || 0, icon: <Users size={14} /> },
                    { label: language === 'kk' ? 'Минут' : 'Минут', value: quiz.time_limit || '∞', icon: <Clock size={14} /> },
                ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center', padding: '10px 8px', background: 'var(--color-gray-100)', borderRadius: 10 }}>
                        <div style={{ color: 'var(--color-gray-400)', marginBottom: 4 }}>{s.icon}</div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-gray-900)' }}>{s.value}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-gray-500)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={onAssign} style={{ flex: 1, fontSize: '0.85rem', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Send size={15} /> {language === 'kk' ? 'Беру' : 'Назначить'}
                </button>
                <button className="btn btn-secondary" onClick={onReport} style={{ flex: 1, fontSize: '0.85rem', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <BarChart2 size={15} /> {language === 'kk' ? 'Есептер' : 'Отчёт'}
                </button>
            </div>
        </div>
    )
}

function QuestionEditor({ q, qi, onChange, onOptionChange, onRemove, canRemove }) {
    const [open, setOpen] = useState(true)
    return (
        <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--color-gray-100)', cursor: 'pointer' }}
                onClick={() => setOpen(o => !o)}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-gray-700)' }}>
                    Вопрос {qi + 1}: {q.question ? q.question.substring(0, 50) + (q.question.length > 50 ? '...' : '') : '(пусто)'}
                </span>
                <div style={{ display: 'flex', gap: 8 }}>
                    {canRemove && <button onClick={e => { e.stopPropagation(); onRemove() }} style={iconBtn}><XCircle size={15} style={{ color: '#ef4444' }} /></button>}
                    {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
            </div>
            {open && (
                <div style={{ padding: 16 }}>
                    <div style={{ marginBottom: 12 }}>
                        <label className="label" style={{ fontSize: '0.8rem' }}>Вопрос *</label>
                        <textarea className="input" rows={2} placeholder="Текст вопроса..." value={q.question}
                            onChange={e => onChange('question', e.target.value)}
                            style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                        {q.options.map((opt, oi) => (
                            <div key={oi}>
                                <label className="label" style={{ fontSize: '0.78rem' }}>Вариант {['A', 'B', 'C', 'D'][oi]}</label>
                                <input className="input" value={opt} placeholder={`${['A', 'B', 'C', 'D'][oi]}) Ответ`}
                                    onChange={e => onOptionChange(oi, e.target.value)} />
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
                        <div>
                            <label className="label" style={{ fontSize: '0.78rem' }}>Правильный ответ</label>
                            <select className="input filter-select" value={q.correct} onChange={e => onChange('correct', e.target.value)}>
                                {['A', 'B', 'C', 'D'].map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label" style={{ fontSize: '0.78rem' }}>Объяснение (необязательно)</label>
                            <input className="input" value={q.explanation || ''} placeholder="Краткое объяснение правильного ответа"
                                onChange={e => onChange('explanation', e.target.value)} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function QuizResult({ score, quiz, answers, onClose }) {
    const pct = Math.round((score.score / score.max) * 100)
    const passed = pct >= 60
    return (
        <div style={{ textAlign: 'center' }}>
            <div style={{ width: 100, height: 100, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
                background: passed ? '#22c55e20' : '#ef444420', border: `4px solid ${passed ? '#22c55e' : '#ef4444'}` }}>
                {passed ? <CheckCircle size={48} color="#22c55e" /> : <XCircle size={48} color="#ef4444" />}
            </div>
            <h2 style={{ color: 'var(--color-gray-900)', margin: '0 0 8px' }}>{passed ? 'Отличный результат!' : 'Попробуй ещё раз'}</h2>
            <div style={{ fontSize: '3rem', fontWeight: 900, color: passed ? '#22c55e' : '#ef4444', marginBottom: 8 }}>{pct}%</div>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: 28 }}>
                Правильных ответов: <b>{score.score}</b> из <b>{score.max}</b>
            </p>
            <div style={{ textAlign: 'left', marginBottom: 24 }}>
                {quiz.questions.map((q, qi) => {
                    const userAns = answers[qi]
                    const correct = userAns === q.correct
                    return (
                        <div key={qi} style={{ padding: '12px 16px', marginBottom: 10, borderRadius: 12,
                            background: correct ? '#22c55e10' : '#ef444410',
                            border: `1px solid ${correct ? '#22c55e30' : '#ef444430'}` }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--color-gray-900)' }}>{qi + 1}. {q.question}</div>
                            <div style={{ fontSize: '0.875rem' }}>
                                <span style={{ color: correct ? '#22c55e' : '#ef4444' }}>
                                    {correct ? '✓' : '✗'} Ваш ответ: {userAns || 'не отвечено'}
                                </span>
                                {!correct && <span style={{ color: '#22c55e', marginLeft: 16 }}>Правильно: {q.correct}</span>}
                            </div>
                            {q.explanation && <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)', marginTop: 6 }}>Пояснение: {q.explanation}</div>}
                        </div>
                    )
                })}
            </div>
            <button className="btn btn-primary" onClick={onClose}>Закрыть</button>
        </div>
    )
}

function Modal({ title, children, onClose, wide }) {
    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '24px 16px', overflowY: 'auto' }}>
            <div style={{ background: 'var(--color-gray-50)', borderRadius: 20, width: '100%', maxWidth: wide ? 860 : 520, boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid var(--color-gray-200)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-gray-900)' }}>{title}</h2>
                    <button onClick={onClose} style={{ ...iconBtn, fontSize: '1.3rem', padding: '4px 8px', background: 'none' }}>✕</button>
                </div>
                <div style={{ padding: '24px 28px', maxHeight: '80vh', overflowY: 'auto' }}>
                    {children}
                </div>
            </div>
        </div>
    )
}

const iconBtn = {
    background: 'var(--color-gray-100)', border: 'none', borderRadius: 8, cursor: 'pointer',
    padding: '7px 9px', display: 'flex', alignItems: 'center', color: 'var(--color-gray-600)',
    transition: 'all 0.15s'
}
