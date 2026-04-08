import { useState, useEffect } from 'react'
import { classesAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'

const TEAM_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#84cc16']

function ClassDashboard() {
    const { t, language } = useLanguage()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [classes, setClasses] = useState([])
    const [selectedClass, setSelectedClass] = useState(null)
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)

    // Modals
    const [showAddStudent, setShowAddStudent] = useState(false)
    const [showAddClass, setShowAddClass] = useState(false)
    const [showTeams, setShowTeams] = useState(false)

    // Form states
    const [newStudent, setNewStudent] = useState({ name: '', email: '' })
    const [bulkNames, setBulkNames] = useState('')
    const [newClass, setNewClass] = useState({ name: '', subject: '', grade: '' })
    const [numTeams, setNumTeams] = useState(4)
    const [teams, setTeams] = useState([])

    useEffect(() => {
        fetchClasses()
    }, [])

    async function fetchClasses() {
        try {
            const data = await classesAPI.getAll()
            setClasses(data)
            if (data.length > 0 && !selectedClass) {
                setSelectedClass(data[0].id)
                fetchStudents(data[0].id)
            }
        } catch (err) {
            console.error('Failed to fetch classes:', err)
        } finally {
            setLoading(false)
        }
    }

    async function fetchStudents(classId) {
        try {
            const data = await classesAPI.getStudents(classId)
            setStudents(data)
        } catch (err) {
            console.error('Failed to fetch students:', err)
        }
    }

    function handleClassChange(classId) {
        setSelectedClass(classId)
        fetchStudents(classId)
        setTeams([])
        setShowTeams(false)
    }

    // Add single student
    async function handleAddStudent() {
        if (!newStudent.name.trim()) {
            alert(L('Введите имя ученика', 'Оқушының атын енгізіңіз'))
            return
        }
        try {
            await classesAPI.addStudent(selectedClass, newStudent)
            setNewStudent({ name: '', email: '' })
            setShowAddStudent(false)
            await fetchStudents(selectedClass)
            fetchClasses()
        } catch (err) {
            alert(L('Ошибка', 'Қате'))
        }
    }

    // Add bulk students (comma or newline separated names)
    async function handleBulkAdd() {
        const names = bulkNames
            .split(/[\n,]/)
            .map(n => n.trim())
            .filter(Boolean)

        if (names.length === 0) {
            alert(L('Введите имена', 'Аттарды енгізіңіз'))
            return
        }
        try {
            for (const name of names) {
                await classesAPI.addStudent(selectedClass, { name, email: '' })
            }
            setBulkNames('')
            setShowAddStudent(false)
            await fetchStudents(selectedClass)
            fetchClasses()
            alert(L(`Добавлено ${names.length} учеников`, `${names.length} оқушы қосылды`))
        } catch (err) {
            alert(L('Ошибка при добавлении', 'Қосу қатесі'))
        }
    }

    // Create new class
    async function handleAddClass() {
        if (!newClass.name.trim()) {
            alert(L('Введите название класса', 'Сынып атауын енгізіңіз'))
            return
        }
        try {
            const created = await classesAPI.create({
                name: newClass.name.trim(),
                subject: newClass.subject.trim(),
                grade: newClass.grade ? parseInt(newClass.grade) : null
            })
            setNewClass({ name: '', subject: '', grade: '' })
            setShowAddClass(false)
            await fetchClasses()
            setSelectedClass(created.id)
            setStudents([])
        } catch (err) {
            alert(L('Ошибка создания класса', 'Сынып жасау қатесі'))
        }
    }

    async function handleDeleteStudent(studentId) {
        if (confirm(L('Удалить ученика?', 'Оқушыны жою?'))) {
            try {
                await classesAPI.deleteStudent(selectedClass, studentId)
                fetchStudents(selectedClass)
                fetchClasses()
            } catch (err) {
                alert(L('Ошибка', 'Қате'))
            }
        }
    }

    async function handleDeleteClass(classId) {
        if (confirm(L('Удалить класс и всех его учеников?', 'Сыныпты және барлық оқушыларды жою?'))) {
            try {
                await classesAPI.delete(classId)
                const remaining = classes.filter(c => c.id !== classId)
                setClasses(remaining)
                if (remaining.length > 0) {
                    setSelectedClass(remaining[0].id)
                    fetchStudents(remaining[0].id)
                } else {
                    setSelectedClass(null)
                    setStudents([])
                }
                fetchClasses()
            } catch (err) {
                alert(L('Ошибка', 'Қате'))
            }
        }
    }

    // Split students into random teams
    function handleSplitTeams() {
        if (students.length === 0) {
            alert(L('Добавьте учеников в класс', 'Сыныпқа оқушыларды қосыңыз'))
            return
        }
        const n = parseInt(numTeams) || 4
        const shuffled = [...students].sort(() => Math.random() - 0.5)
        const newTeams = Array.from({ length: n }, (_, i) => ({
            name: L(`Команда ${i + 1}`, `${i + 1}-команда`),
            students: []
        }))
        shuffled.forEach((s, i) => {
            newTeams[i % n].students.push(s)
        })
        setTeams(newTeams)
        setShowTeams(true)
    }

    const currentClass = classes.find(c => c.id === selectedClass)
    const avgGrade = students.length > 0
        ? (students.reduce((sum, s) => sum + (s.avg_grade || 0), 0) / students.length).toFixed(1)
        : 0

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>{t('common.loading')}</div>
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">{t('classes.title')}</h1>
                    <p className="page-subtitle">{t('classes.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={() => setShowAddClass(true)}>
                        + {L('Новый класс', 'Жаңа сынып')}
                    </button>
                    {selectedClass && (
                        <>
                            <button className="btn btn-secondary" onClick={handleSplitTeams}>
                                🎲 {L('Разделить на команды', 'Командаларға бөлу')}
                            </button>
                            <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>
                                + {t('classes.addStudent')}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {classes.length === 0 ? (
                // Empty state
                <div style={{
                    textAlign: 'center', padding: '80px 40px',
                    background: 'white', borderRadius: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
                }}>
                    <div style={{ fontSize: '4rem', marginBottom: '16px' }}>👥</div>
                    <h2 style={{ fontWeight: 700, marginBottom: '8px' }}>
                        {L('Нет классов', 'Сыныптар жоқ')}
                    </h2>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: '24px' }}>
                        {L('Создайте первый класс и добавьте учеников', 'Алғашқы сыныпты жасап, оқушыларды қосыңыз')}
                    </p>
                    <button className="btn btn-primary" onClick={() => setShowAddClass(true)}>
                        + {L('Создать класс', 'Сынып жасау')}
                    </button>
                </div>
            ) : (
                <>
                    {/* Class Tabs */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
                        {classes.map(cls => (
                            <div key={cls.id} style={{ position: 'relative' }}>
                                <button
                                    className={`btn ${selectedClass === cls.id ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => handleClassChange(cls.id)}
                                    style={{ paddingRight: selectedClass === cls.id ? '36px' : '16px' }}
                                >
                                    {cls.name}{cls.subject ? ` · ${cls.subject}` : ''} ({cls.student_count || 0})
                                </button>
                                {selectedClass === cls.id && (
                                    <button onClick={() => handleDeleteClass(cls.id)}
                                        style={{
                                            position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', padding: '2px'
                                        }}>✕</button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Stats */}
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
                        <div className="stat-card">
                            <div className="stat-icon blue">👥</div>
                            <div className="stat-info">
                                <h3>{currentClass?.student_count || 0}</h3>
                                <p>{t('dashboard.totalStudents')}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon green">⭐</div>
                            <div className="stat-info"><h3>{avgGrade}</h3><p>{t('classes.avgGrade')}</p></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon purple">📊</div>
                            <div className="stat-info">
                                <h3>{Math.round(students.filter(s => s.avg_grade >= 3.5).length / Math.max(students.length, 1) * 100)}%</h3>
                                <p>{t('classes.performance')}</p>
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon orange">🎲</div>
                            <div className="stat-info">
                                <h3>{numTeams}</h3>
                                <p>{L('Команд', 'Команда')}</p>
                            </div>
                        </div>
                    </div>

                    {/* Teams Display (when split) */}
                    {showTeams && teams.length > 0 && (
                        <div className="widget" style={{ marginBottom: '24px', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h3 style={{ fontWeight: 700 }}>
                                    🎲 {L('Случайное деление на команды', 'Кездейсоқ командаларға бөлу')}
                                </h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <select
                                        value={numTeams}
                                        onChange={e => setNumTeams(parseInt(e.target.value))}
                                        className="filter-select"
                                    >
                                        {[2,3,4,5,6].map(n => <option key={n} value={n}>{n} {L('команды', 'команда')}</option>)}
                                    </select>
                                    <button className="btn btn-secondary" onClick={handleSplitTeams}>🔄 {L('Перемешать', 'Қайта бөлу')}</button>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setShowTeams(false)}>✕</button>
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                                {teams.map((team, i) => (
                                    <div key={i} style={{
                                        borderRadius: '14px',
                                        border: `2px solid ${TEAM_COLORS[i % TEAM_COLORS.length]}40`,
                                        background: `${TEAM_COLORS[i % TEAM_COLORS.length]}08`,
                                        padding: '16px'
                                    }}>
                                        <div style={{
                                            fontWeight: 800,
                                            color: TEAM_COLORS[i % TEAM_COLORS.length],
                                            marginBottom: '12px',
                                            fontSize: '0.95rem',
                                            display: 'flex', alignItems: 'center', gap: '8px'
                                        }}>
                                            <div style={{
                                                width: '28px', height: '28px', borderRadius: '8px',
                                                background: TEAM_COLORS[i % TEAM_COLORS.length],
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: '0.75rem', fontWeight: 800
                                            }}>{i + 1}</div>
                                            {team.name}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {team.students.map(s => (
                                                <div key={s.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '8px',
                                                    padding: '6px 10px',
                                                    background: `${TEAM_COLORS[i % TEAM_COLORS.length]}15`,
                                                    borderRadius: '8px'
                                                }}>
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '50%',
                                                        background: TEAM_COLORS[i % TEAM_COLORS.length],
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0
                                                    }}>{s.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{s.name}</span>
                                                </div>
                                            ))}
                                            {team.students.length === 0 && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-400)', textAlign: 'center', padding: '8px' }}>
                                                    {L('Пусто', 'Бос')}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Students Table */}
                    <div className="widget">
                        <div className="widget-header">
                            <h3 className="widget-title">{t('classes.studentsList')}</h3>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                {students.length > 0 && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <select
                                            value={numTeams}
                                            onChange={e => setNumTeams(parseInt(e.target.value))}
                                            className="filter-select"
                                            style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                                        >
                                            {[2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                        <button className="btn btn-secondary btn-sm" onClick={handleSplitTeams}>
                                            🎲 {L('На команды', 'Командаға')}
                                        </button>
                                    </div>
                                )}
                                <input type="text" className="input" placeholder={t('common.searchPlaceholder')} style={{ width: '200px' }} />
                            </div>
                        </div>

                        <div style={{ padding: 'var(--spacing-4)', overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                                        <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>
                                            {L('Ученик', 'Оқушы')}
                                        </th>
                                        <th style={{ textAlign: 'left', padding: '10px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>Email</th>
                                        <th style={{ textAlign: 'center', padding: '10px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>
                                            {t('classes.avgGrade')}
                                        </th>
                                        <th style={{ textAlign: 'center', padding: '10px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>
                                            {L('Статус', 'Мәртебе')}
                                        </th>
                                        <th style={{ width: '48px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map(student => (
                                        <tr key={student.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '50%',
                                                        background: 'var(--gradient-primary)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontSize: 'var(--font-size-sm)', fontWeight: 600, flexShrink: 0
                                                    }}>
                                                        {student.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                                                    </div>
                                                    <span style={{ fontWeight: 500 }}>{student.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                                {student.email || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    fontWeight: 600,
                                                    color: student.avg_grade >= 4.5 ? 'var(--color-success-500)' :
                                                        student.avg_grade >= 3.5 ? 'var(--color-warning-500)' : 'var(--color-error-500)'
                                                }}>
                                                    {student.avg_grade?.toFixed(1) || '—'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                {student.status === 'excellent' && <span className="badge badge-success">{L('Отлично', 'Үздік')}</span>}
                                                {student.status === 'good' && <span className="badge badge-primary">{L('Хорошо', 'Жақсы')}</span>}
                                                {student.status === 'average' && <span className="badge badge-warning">{L('Удовл.', 'Орташа')}</span>}
                                                {student.status === 'attention' && <span className="badge" style={{ background: '#fef2f2', color: '#ef4444' }}>{L('Внимание', 'Назар')}</span>}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteStudent(student.id)}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {students.length === 0 && (
                                        <tr>
                                            <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-gray-400)' }}>
                                                {L('В этом классе нет учеников', 'Бұл сыныпта оқушылар жоқ')}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ====== ADD STUDENT MODAL ====== */}
            {showAddStudent && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setShowAddStudent(false)}>
                    <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '420px' }}
                        onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '24px', fontWeight: 700 }}>
                            {L('Добавить ученика', 'Оқушы қосу')}
                        </h2>

                        {/* Single student */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="label">{L('Имя', 'Аты-жөні')}</label>
                            <input className="input" value={newStudent.name}
                                onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                placeholder={L('Иванов Иван', 'Оқушы аты')} />
                        </div>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="label">Email ({L('необязательно', 'міндетті емес')})</label>
                            <input className="input" type="email" value={newStudent.email}
                                onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                                placeholder="email@school.kz" />
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginBottom: '20px' }}
                            onClick={handleAddStudent}>
                            ✅ {L('Добавить ученика', 'Оқушыны қосу')}
                        </button>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                            <span style={{ color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>{L('или список', 'немесе тізім')}</span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                        </div>

                        {/* Bulk add */}
                        <div style={{ marginBottom: '16px' }}>
                            <label className="label">
                                {L('Массовое добавление (каждое имя с новой строки)', 'Жаппай қосу (әр атты жаңа жолдан)')}
                            </label>
                            <textarea className="input" rows={5}
                                value={bulkNames}
                                onChange={e => setBulkNames(e.target.value)}
                                placeholder={L('Иванов Иван\nПетрова Мария\nСидоров Алексей', 'Иванов Иван\nПетрова Мария')}
                                style={{ resize: 'vertical' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }}
                                onClick={() => setShowAddStudent(false)}>
                                {L('Отмена', 'Болдырмау')}
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1 }}
                                onClick={handleBulkAdd} disabled={!bulkNames.trim()}>
                                + {L('Добавить список', 'Тізімді қосу')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== ADD CLASS MODAL ====== */}
            {showAddClass && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
                    onClick={() => setShowAddClass(false)}>
                    <div style={{ background: 'white', borderRadius: '20px', padding: '28px', width: '100%', maxWidth: '380px' }}
                        onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: '24px', fontWeight: 700 }}>
                            {L('Создать новый класс', 'Жаңа сынып жасау')}
                        </h2>
                        <div style={{ marginBottom: '14px' }}>
                            <label className="label">{L('Название класса *', 'Сынып атауы *')}</label>
                            <input className="input" value={newClass.name}
                                onChange={e => setNewClass({ ...newClass, name: e.target.value })}
                                placeholder={L('Например: 5А', 'Мысалы: 5А')} />
                        </div>
                        <div style={{ marginBottom: '14px' }}>
                            <label className="label">{L('Предмет', 'Пән')}</label>
                            <input className="input" value={newClass.subject}
                                onChange={e => setNewClass({ ...newClass, subject: e.target.value })}
                                placeholder={L('Математика', 'Математика')} />
                        </div>
                        <div style={{ marginBottom: '24px' }}>
                            <label className="label">{L('Класс (номер)', 'Сынып нөмірі')}</label>
                            <select className="filter-select" value={newClass.grade}
                                onChange={e => setNewClass({ ...newClass, grade: e.target.value })}
                                style={{ width: '100%' }}>
                                <option value="">{L('— Не указан —', '— Жоқ —')}</option>
                                {[1,2,3,4,5,6,7,8,9,10,11].map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-secondary" style={{ flex: 1 }}
                                onClick={() => setShowAddClass(false)}>
                                {L('Отмена', 'Болдырмау')}
                            </button>
                            <button className="btn btn-primary" style={{ flex: 1 }}
                                onClick={handleAddClass}>
                                ✅ {L('Создать', 'Жасау')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClassDashboard
