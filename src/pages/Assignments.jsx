import { useState, useEffect } from 'react'
import { assignmentsAPI, classesAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'

function Assignments() {
    const { t, language } = useLanguage()
    const [filter, setFilter] = useState('all')
    const [assignments, setAssignments] = useState([])
    const [classes, setClasses] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [reviewModal, setReviewModal] = useState(null)
    const [reviewLoading, setReviewLoading] = useState(false)
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        type: 'homework',
        class_id: '',
        instructions: '',
        answer_key: '',
        max_score: 100,
        due_date: ''
    })

    useEffect(() => {
        fetchData()
    }, [filter, language])

    async function fetchData() {
        try {
            setLoading(true)
            const [assignmentsData, classesData] = await Promise.all([
                assignmentsAPI.getAll(filter !== 'all' ? { status: filter } : {}),
                classesAPI.getAll()
            ])
            setAssignments(assignmentsData)
            setClasses(classesData)
        } catch (err) {
            console.error('Failed to fetch:', err)
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        if (!newAssignment.title || !newAssignment.class_id) {
            alert(language === 'kk' ? 'Барлық өрістерді толтырыңыз' : 'Заполните все поля')
            return
        }

        try {
            const selectedClass = classes.find(c => c.id === parseInt(newAssignment.class_id))
            await assignmentsAPI.create({
                ...newAssignment,
                class_id: parseInt(newAssignment.class_id, 10),
                max_score: parseInt(newAssignment.max_score, 10) || 100,
                total: selectedClass?.student_count || 0
            })
            setShowModal(false)
            setNewAssignment({ title: '', type: 'homework', class_id: '', instructions: '', answer_key: '', max_score: 100, due_date: '' })
            fetchData()
        } catch (err) {
            alert(language === 'kk' ? 'Қате орын алды' : 'Ошибка создания')
        }
    }

    async function openReview(assignment) {
        try {
            setReviewLoading(true)
            setReviewModal({ assignment, submissions: [] })
            const data = await assignmentsAPI.getSubmissions(assignment.id)
            setReviewModal(data)
        } catch (err) {
            alert(language === 'kk' ? 'Нәтижелерді жүктеу мүмкін болмады' : 'Не удалось загрузить результаты')
            setReviewModal(null)
        } finally {
            setReviewLoading(false)
        }
    }

    async function handleDelete(id) {
        if (confirm(t('common.delete') + '?')) {
            try {
                await assignmentsAPI.delete(id)
                fetchData()
            } catch (err) {
                alert('Ошибка удаления')
            }
        }
    }

    const stats = {
        active: assignments.filter(a => a.status === 'active').length,
        pending: assignments.filter(a => a.status === 'completed').reduce((sum, a) => sum + a.submitted, 0),
        graded: assignments.filter(a => a.status === 'graded').reduce((sum, a) => sum + a.total, 0)
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">{t('assignments.title')}</h1>
                    <p className="page-subtitle">{t('assignments.subtitle')}</p>
                </div>
                <button className="btn btn-primary hide-on-mobile" onClick={() => setShowModal(true)}>+ {t('dashboard.newAssignment')}</button>
                <button className="fab-mobile hide-on-desktop" onClick={() => setShowModal(true)}>
                    <span className="btn-icon">✚</span>
                </button>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 'var(--spacing-8)' }}>
                <div className="stat-card">
                    <div className="stat-icon blue">📋</div>
                    <div className="stat-info">
                        <h3>{stats.active}</h3>
                        <p>{t('assignments.active')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange">⏳</div>
                    <div className="stat-info">
                        <h3>{stats.pending}</h3>
                        <p>{t('dashboard.pendingReviews')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">✅</div>
                    <div className="stat-info">
                        <h3>{stats.graded}</h3>
                        <p>{t('assignments.graded')}</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-6)' }}>
                {['all', 'active', 'completed', 'graded'].map(f => (
                    <button
                        key={f}
                        className={`btn ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? t('common.all') :
                            f === 'active' ? (language === 'kk' ? 'Белсенді' : 'Активные') :
                                f === 'completed' ? (language === 'kk' ? 'Тексеруді күтуде' : 'Ожидают проверки') :
                                    (language === 'kk' ? 'Тексерілді' : 'Проверенные')}
                    </button>
                ))}
            </div>

            {/* Assignments List */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>{t('common.loading')}</div>
            ) : (
                <div className="assignments-list">
                    {assignments.map(assignment => (
                        <div key={assignment.id} className="assignment-card">
                            <div className={`assignment-icon ${assignment.type}`}>
                                {assignment.type === 'test' && '📝'}
                                {assignment.type === 'homework' && '📚'}
                                {assignment.type === 'quiz' && '❓'}
                            </div>

                            <div className="assignment-info">
                                <div className="assignment-title">{assignment.title}</div>
                                <div className="assignment-meta">
                                    <span>👥 {assignment.class_name || (language === 'kk' ? 'Сынып' : 'Класс')}</span>
                                    <span>📅 {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString(language === 'kk' ? 'kk-KZ' : 'ru-RU') : '—'}</span>
                                    <span>
                                        {assignment.status === 'active' && <span className="badge badge-primary">{language === 'kk' ? 'Белсенді' : 'Активно'}</span>}
                                        {assignment.status === 'completed' && <span className="badge badge-warning">{language === 'kk' ? 'Тексеруде' : 'Ожидает проверки'}</span>}
                                        {assignment.status === 'graded' && <span className="badge badge-success">{language === 'kk' ? 'Тексерілді' : 'Проверено'}</span>}
                                    </span>
                                </div>
                            </div>

                            <div className="assignment-status">
                                <div className="assignment-progress">
                                    {assignment.submitted} / {assignment.total} {language === 'kk' ? 'тапсырды' : 'сдали'}
                                </div>
                                <div className="progress-bar">
                                    <div
                                        className="progress-fill"
                                        style={{ width: `${assignment.total > 0 ? (assignment.submitted / assignment.total) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => openReview(assignment)}>
                                    {language === 'kk' ? 'Тексеру' : 'Проверить'}
                                </button>
                                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(assignment.id)}>🗑️</button>
                            </div>
                        </div>
                    ))}

                    {assignments.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '60px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
                            <h3>{t('common.noResults')}</h3>
                            <p style={{ color: 'var(--color-gray-500)' }}>{language === 'kk' ? 'Бірінші тапсырманы жасаңыз' : 'Создайте первое задание'}</p>
                        </div>
                    )}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowModal(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--spacing-8)',
                        width: '100%',
                        maxWidth: '480px'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>{t('dashboard.newAssignment')}</h2>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Атауы' : 'Название'}</label>
                            <input
                                className="input"
                                value={newAssignment.title}
                                onChange={e => setNewAssignment({ ...newAssignment, title: e.target.value })}
                                placeholder="..."
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Түрі' : 'Тип'}</label>
                            <select
                                className="filter-select"
                                style={{ width: '100%' }}
                                value={newAssignment.type}
                                onChange={e => setNewAssignment({ ...newAssignment, type: e.target.value })}
                            >
                                <option value="homework">{language === 'kk' ? 'Үй жұмысы' : 'Домашнее задание'}</option>
                                <option value="test">{language === 'kk' ? 'Бақылау жұмысы' : 'Контрольная'}</option>
                                <option value="quiz">{language === 'kk' ? 'Тест' : 'Тест'}</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Оқушыға нұсқаулық' : 'Инструкция для ученика'}</label>
                            <textarea
                                className="input"
                                style={{ minHeight: '90px', resize: 'vertical' }}
                                value={newAssignment.instructions}
                                onChange={e => setNewAssignment({ ...newAssignment, instructions: e.target.value })}
                                placeholder={language === 'kk' ? 'Мысалы: есептің шешу жолын толық жаз...' : 'Например: распиши решение полностью...'}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'AI үшін дұрыс жауап/критерий' : 'Эталон/критерии для AI'}</label>
                            <textarea
                                className="input"
                                style={{ minHeight: '90px', resize: 'vertical' }}
                                value={newAssignment.answer_key}
                                onChange={e => setNewAssignment({ ...newAssignment, answer_key: e.target.value })}
                                placeholder={language === 'kk' ? 'Дұрыс жауап, негізгі ұғымдар немесе бағалау критерийлері' : 'Правильный ответ, ключевые понятия или критерии оценивания'}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Максималды балл' : 'Максимальный балл'}</label>
                            <input
                                type="number"
                                min="1"
                                max="1000"
                                className="input"
                                value={newAssignment.max_score}
                                onChange={e => setNewAssignment({ ...newAssignment, max_score: e.target.value })}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Сынып' : 'Класс'}</label>
                            <select
                                className="filter-select"
                                style={{ width: '100%' }}
                                value={newAssignment.class_id}
                                onChange={e => setNewAssignment({ ...newAssignment, class_id: e.target.value })}
                            >
                                <option value="">{t('classes.allClasses')}</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <label className="label">{language === 'kk' ? 'Мерзімі' : 'Дедлайн'}</label>
                            <input
                                type="date"
                                className="input"
                                value={newAssignment.due_date}
                                onChange={e => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                            <button className="btn btn-primary" onClick={handleCreate}>{t('common.create')}</button>
                        </div>
                    </div>
                </div>
            )}

            {reviewModal && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.55)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setReviewModal(null)}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--spacing-8)',
                        width: '100%',
                        maxWidth: '900px',
                        maxHeight: '85vh',
                        overflow: 'auto'
                    }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', marginBottom: 'var(--spacing-6)' }}>
                            <div>
                                <h2 style={{ marginBottom: '8px' }}>{reviewModal.assignment.title}</h2>
                                <p style={{ color: 'var(--color-gray-500)', margin: 0 }}>
                                    {language === 'kk' ? 'Оқушылар жіберген жауаптар және AI бағасы' : 'Ответы учеников и AI-оценка'}
                                </p>
                            </div>
                            <button className="btn btn-secondary" onClick={() => setReviewModal(null)}>{language === 'kk' ? 'Жабу' : 'Закрыть'}</button>
                        </div>

                        {reviewLoading ? (
                            <div style={{ padding: '40px', textAlign: 'center' }}>{t('common.loading')}</div>
                        ) : reviewModal.submissions.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-500)' }}>
                                {language === 'kk' ? 'Әзірге оқушылар жауап жібермеді' : 'Ученики пока не отправили ответы'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                                {reviewModal.submissions.map(sub => (
                                    <div key={sub.id} className="card" style={{ padding: 'var(--spacing-5)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                                            <div>
                                                <h3 style={{ margin: 0 }}>{sub.student_name}</h3>
                                                <p style={{ margin: '4px 0 0', color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
                                                    {new Date(sub.submitted_at).toLocaleString(language === 'kk' ? 'kk-KZ' : 'ru-RU')}
                                                </p>
                                            </div>
                                            <div style={{
                                                background: 'rgba(16, 185, 129, 0.1)',
                                                color: '#059669',
                                                borderRadius: '12px',
                                                padding: '8px 12px',
                                                fontWeight: 800,
                                                height: 'fit-content'
                                            }}>
                                                {sub.score}/{sub.max_score} · {language === 'kk' ? 'Баға' : 'Оценка'} {sub.grade_label}
                                            </div>
                                        </div>
                                        <div style={{ whiteSpace: 'pre-wrap', background: 'var(--color-gray-50)', borderRadius: '12px', padding: '14px', marginBottom: '12px' }}>
                                            {sub.answer_text}
                                        </div>
                                        <div style={{ color: 'var(--color-gray-700)', lineHeight: 1.6 }}>
                                            <strong>{language === 'kk' ? 'AI кері байланысы:' : 'AI обратная связь:'}</strong> {sub.feedback}
                                        </div>
                                        {sub.mistakes?.length > 0 && (
                                            <ul style={{ marginBottom: 0, color: 'var(--color-gray-600)' }}>
                                                {sub.mistakes.map((m, idx) => <li key={idx}>{m}</li>)}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

export default Assignments
