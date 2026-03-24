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
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        type: 'homework',
        class_id: '',
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
                total: selectedClass?.student_count || 0
            })
            setShowModal(false)
            setNewAssignment({ title: '', type: 'homework', class_id: '', due_date: '' })
            fetchData()
        } catch (err) {
            alert(language === 'kk' ? 'Қате орын алды' : 'Ошибка создания')
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
                                <button className="btn btn-secondary btn-sm">{language === 'kk' ? 'Ашу' : 'Открыть'}</button>
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
        </div>
    )
}

export default Assignments
