import { useState, useEffect } from 'react'
import { classesAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'

function ClassDashboard() {
    const { t, language } = useLanguage()
    const [classes, setClasses] = useState([])
    const [selectedClass, setSelectedClass] = useState(null)
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddStudent, setShowAddStudent] = useState(false)
    const [newStudent, setNewStudent] = useState({ name: '', email: '' })

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
    }

    async function handleAddStudent() {
        if (!newStudent.name) {
            alert(language === 'kk' ? 'Оқушының атын енгізіңіз' : 'Введите имя ученика')
            return
        }
        try {
            await classesAPI.addStudent(selectedClass, newStudent)
            setNewStudent({ name: '', email: '' })
            setShowAddStudent(false)
            fetchStudents(selectedClass)
            fetchClasses() // Refresh student count
        } catch (err) {
            alert(language === 'kk' ? 'Қате' : 'Ошибка')
        }
    }

    async function handleDeleteStudent(studentId) {
        if (confirm(t('common.delete') + '?')) {
            try {
                await classesAPI.deleteStudent(selectedClass, studentId)
                fetchStudents(selectedClass)
                fetchClasses()
            } catch (err) {
                alert(language === 'kk' ? 'Қате' : 'Ошибка')
            }
        }
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
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">{t('classes.title')}</h1>
                    <p className="page-subtitle">{t('classes.subtitle')}</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>+ {t('classes.addStudent')}</button>
            </div>

            {/* Class Tabs */}
            <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginBottom: 'var(--spacing-8)' }}>
                {classes.map(cls => (
                    <button
                        key={cls.id}
                        className={`btn ${selectedClass === cls.id ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleClassChange(cls.id)}
                    >
                        {cls.name} · {cls.subject}
                    </button>
                ))}
            </div>

            {/* Class Stats */}
            <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 'var(--spacing-8)' }}>
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-info">
                        <h3>{currentClass?.student_count || 0}</h3>
                        <p>{t('dashboard.totalStudents')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">⭐</div>
                    <div className="stat-info">
                        <h3>{avgGrade}</h3>
                        <p>{t('classes.avgGrade')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple">📊</div>
                    <div className="stat-info">
                        <h3>{Math.round(students.filter(s => s.avg_grade >= 3.5).length / Math.max(students.length, 1) * 100)}%</h3>
                        <p>{t('classes.performance')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange">📋</div>
                    <div className="stat-info">
                        <h3>12</h3>
                        <p>{t('nav.assignments')}</p>
                    </div>
                </div>
            </div>

            {/* Students Table */}
            <div className="widget">
                <div className="widget-header">
                    <h3 className="widget-title">{t('classes.studentsList')}</h3>
                    <input type="text" className="input" placeholder={t('common.searchPlaceholder')} style={{ width: '200px' }} />
                </div>

                <div style={{ padding: 'var(--spacing-4)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                                <th style={{ textAlign: 'left', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{language === 'kk' ? 'Оқушы' : 'Ученик'}</th>
                                <th style={{ textAlign: 'left', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>Email</th>
                                <th style={{ textAlign: 'center', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{t('classes.avgGrade')}</th>
                                <th style={{ textAlign: 'center', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{language === 'kk' ? 'Мәртебе' : 'Статус'}</th>
                                <th style={{ textAlign: 'right', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {students.map(student => (
                                <tr key={student.id} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                    <td style={{ padding: 'var(--spacing-4)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                            <div style={{
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: 'var(--gradient-primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontSize: 'var(--font-size-sm)',
                                                fontWeight: 600
                                            }}>
                                                {student.name.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <span style={{ fontWeight: 500 }}>{student.name}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)' }}>
                                        {student.email || '—'}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                        <span style={{
                                            fontWeight: 600,
                                            color: student.avg_grade >= 4.5 ? 'var(--color-success-500)' :
                                                student.avg_grade >= 3.5 ? 'var(--color-warning-500)' :
                                                    'var(--color-error-500)'
                                        }}>
                                            {student.avg_grade?.toFixed(1) || '—'}
                                        </span>
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                        {student.status === 'excellent' && <span className="badge badge-success">{language === 'kk' ? 'Өте жақсы' : 'Отлично'}</span>}
                                        {student.status === 'good' && <span className="badge badge-primary">{language === 'kk' ? 'Жақсы' : 'Хорошо'}</span>}
                                        {student.status === 'average' && <span className="badge badge-warning">{language === 'kk' ? 'Орташа' : 'Удовл.'}</span>}
                                        {student.status === 'attention' && <span className="badge" style={{ background: '#fef2f2', color: '#ef4444' }}>{language === 'kk' ? 'Назар аударыңыз' : 'Внимание'}</span>}
                                    </td>
                                    <td style={{ padding: 'var(--spacing-4)', textAlign: 'right' }}>
                                        <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteStudent(student.id)}>🗑️</button>
                                    </td>
                                </tr>
                            ))}

                            {students.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                                        <p style={{ color: 'var(--color-gray-500)' }}>{language === 'kk' ? 'Бұл сыныпта оқушылар жоқ' : 'Нет учеников в этом классе'}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Student Modal */}
            {showAddStudent && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowAddStudent(false)}>
                    <div style={{
                        background: 'white',
                        borderRadius: 'var(--radius-xl)',
                        padding: 'var(--spacing-8)',
                        width: '100%',
                        maxWidth: '400px'
                    }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ marginBottom: 'var(--spacing-6)' }}>{t('classes.addStudent')}</h2>

                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Аты-жөні' : 'Имя'}</label>
                            <input
                                className="input"
                                value={newStudent.name}
                                onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                                placeholder={language === 'kk' ? 'Мысалы: Омаров Арман' : 'Иванов Иван'}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <label className="label">Email</label>
                            <input
                                className="input"
                                type="email"
                                value={newStudent.email}
                                onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                                placeholder="email@school.ru"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-2)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowAddStudent(false)}>{t('common.cancel')}</button>
                            <button className="btn btn-primary" onClick={handleAddStudent}>{t('common.add')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClassDashboard
