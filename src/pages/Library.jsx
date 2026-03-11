import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { lessonsAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'

function Library() {
    const { t, language } = useLanguage()
    const [subject, setSubject] = useState('all')
    const [grade, setGrade] = useState('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [lessons, setLessons] = useState([])
    const [loading, setLoading] = useState(true)

    const subjects = [
        { id: 'math', name: language === 'kk' ? 'Математика' : 'Математика', icon: '📐' },
        { id: 'physics', name: language === 'kk' ? 'Физика' : 'Физика', icon: '⚡' },
        { id: 'english', name: language === 'kk' ? 'Ағылшын тілі' : 'Английский язык', icon: '🇬🇧' },
        { id: 'russian', name: language === 'kk' ? 'Орыс тілі' : 'Русский язык', icon: '📝' },
        { id: 'biology', name: language === 'kk' ? 'Биология' : 'Биология', icon: '🌿' },
        { id: 'history', name: language === 'kk' ? 'Тарих' : 'История', icon: '🏛️' },
        { id: 'cs', name: language === 'kk' ? 'Информатика' : 'Информатика', icon: '💻' },
        { id: 'chemistry', name: language === 'kk' ? 'Химия' : 'Химия', icon: '🧪' }
    ]

    useEffect(() => {
        fetchLessons()
    }, [subject, grade, searchQuery, language])

    async function fetchLessons() {
        try {
            setLoading(true)
            const params = {}
            if (subject !== 'all') {
                const subjectObj = subjects.find(s => s.id === subject)
                if (subjectObj) params.subject = subjectObj.name
            }
            if (grade !== 'all') params.grade = grade
            if (searchQuery) params.search = searchQuery

            const data = await lessonsAPI.getAll(params)
            setLessons(data)
        } catch (err) {
            console.error('Failed to fetch lessons:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{t('library.title')}</h1>
                <p className="page-subtitle">{lessons.length} {t('library.lessonsCount')}</p>
            </div>

            {/* Filters */}
            <div className="library-filters">
                <div className="filter-group">
                    <input
                        type="text"
                        className="input"
                        placeholder={t('common.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ width: '300px' }}
                    />
                </div>

                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    >
                        <option value="all">{t('classes.allSubjects')}</option>
                        {subjects.map(s => (
                            <option key={s.id} value={s.id}>{s.icon} {s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={grade}
                        onChange={(e) => setGrade(e.target.value)}
                    >
                        <option value="all">{t('classes.allClasses')}</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                            <option key={g} value={g}>{g}-{t('library.grade')}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginLeft: 'auto' }}>
                    <Link to="/builder" className="btn btn-primary">+ {t('dashboard.createLesson')}</Link>
                </div>
            </div>

            {/* Lessons Grid */}
            {loading ? (
                <div style={{ padding: '40px', textAlign: 'center' }}>{t('common.loading')}</div>
            ) : (
                <div className="lessons-grid">
                    {lessons.map(lesson => (
                        <LessonCard key={lesson.id} lesson={lesson} onRefresh={fetchLessons} t={t} language={language} />
                    ))}

                    {lessons.length === 0 && (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📚</div>
                            <h3>{t('common.noResults')}</h3>
                            <p style={{ color: 'var(--color-gray-500)' }}>{language === 'kk' ? 'Фильтрлерді өзгертіп көріңіз немесе жаңа сабақ жасаңыз' : 'Попробуйте изменить фильтры или создайте новый урок'}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function LessonCard({ lesson, onRefresh, t, language }) {
    const subjectIcons = {
        'Математика': '📐',
        'Биология': '🌿',
        'Английский язык': '🇬🇧',
        'Ағылшын тілі': '🇬🇧',
        'Русский язык': '📝',
        'Орыс тілі': '📝',
        'Информатика': '💻',
        'История': '🏛️',
        'Тарих': '🏛️',
        'Физика': '⚡',
        'Химия': '🧪',
    }

    const icon = subjectIcons[lesson.subject] || '📚'

    async function handleDelete() {
        if (confirm(t('common.delete') + '?')) {
            try {
                await lessonsAPI.delete(lesson.id)
                onRefresh()
            } catch (err) {
                alert('Ошибка при удалении')
            }
        }
    }

    return (
        <div className="lesson-card">
            <div className="lesson-card-image">
                <span>{icon}</span>
                {lesson.rating >= 4.8 && (
                    <div className="lesson-card-badge">
                        <span className="badge badge-primary">⭐ {language === 'kk' ? 'Топ' : 'Топ'}</span>
                    </div>
                )}
            </div>

            <div className="lesson-card-body">
                <div className="lesson-card-meta">
                    <span className="badge badge-gray">{lesson.subject}</span>
                    <span className="badge badge-gray">{lesson.grade}-{t('library.grade')}</span>
                    <span className="badge badge-gray">{lesson.duration} {t('library.minutes')}</span>
                </div>

                <h3 className="lesson-card-title">{lesson.title}</h3>

                <div className="lesson-card-stats">
                    <span>⭐ {lesson.rating?.toFixed(1) || '0.0'}</span>
                    <span>({lesson.ratings_count || 0})</span>
                    <span>❤️ {lesson.likes || 0}</span>
                </div>

                <div className="lesson-card-actions">
                    <button className="btn btn-primary btn-sm">{t('common.use')}</button>
                    <button className="btn btn-secondary btn-sm" onClick={handleDelete}>🗑️</button>
                </div>
            </div>
        </div>
    )
}

export default Library
