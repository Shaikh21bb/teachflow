import { useLanguage } from '../contexts/LanguageContext'

function Reports() {
    const { t, language } = useLanguage()

    const classStats = [
        { class: '5А', subject: 'Математика', avgGrade: 4.3, completion: 87, students: 28 },
        { class: '7Б', subject: 'Физика', avgGrade: 4.1, completion: 82, students: 26 },
        { class: '6А', subject: language === 'kk' ? 'Ағылшын тілі' : 'Английский', avgGrade: 4.5, completion: 91, students: 25 },
        { class: '9В', subject: 'Алгебра', avgGrade: 3.9, completion: 78, students: 24 },
    ]

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 className="page-title">{t('reports.title')}</h1>
                    <p className="page-subtitle">{t('reports.subtitle')}</p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-2)' }}>
                    <select className="filter-select">
                        <option>{t('reports.thisWeek')}</option>
                        <option>{t('reports.thisMonth')}</option>
                        <option>{t('reports.thisTerm')}</option>
                        <option>{t('reports.thisYear')}</option>
                    </select>
                    <button className="btn btn-secondary">📥 {t('common.export')}</button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="stats-grid" style={{ marginBottom: 'var(--spacing-8)' }}>
                <div className="stat-card">
                    <div className="stat-icon blue">👥</div>
                    <div className="stat-info">
                        <h3>103</h3>
                        <p>{t('dashboard.totalStudents')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon green">⭐</div>
                    <div className="stat-info">
                        <h3>4.2</h3>
                        <p>{t('classes.avgGrade')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon purple">📊</div>
                    <div className="stat-info">
                        <h3>85%</h3>
                        <p>{t('classes.performance')}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon orange">✅</div>
                    <div className="stat-info">
                        <h3>234</h3>
                        <p>{t('reports.completedTasks')}</p>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-6)', marginBottom: 'var(--spacing-8)' }}>
                <div className="chart-card">
                    <h3>📈 {t('reports.performanceDynamics')}</h3>
                    <div className="chart-placeholder">
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                gap: '16px',
                                height: '200px',
                                marginBottom: '16px'
                            }}>
                                {[65, 72, 68, 78, 82, 85, 87].map((value, i) => (
                                    <div
                                        key={i}
                                        style={{
                                            width: '40px',
                                            height: `${value * 2}px`,
                                            background: `linear-gradient(180deg, var(--color-primary-500) 0%, var(--color-secondary-500) 100%)`,
                                            borderRadius: '8px 8px 0 0',
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            justifyContent: 'center',
                                            paddingTop: '8px',
                                            color: 'white',
                                            fontSize: '12px',
                                            fontWeight: 600
                                        }}
                                    >
                                        {value}%
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', color: 'var(--color-gray-500)', fontSize: '12px' }}>
                                {[
                                    language === 'kk' ? 'Дс' : 'Пн',
                                    language === 'kk' ? 'Сс' : 'Вт',
                                    language === 'kk' ? 'Ср' : 'Ср',
                                    language === 'kk' ? 'Бс' : 'Чт',
                                    language === 'kk' ? 'Жм' : 'Пт',
                                    language === 'kk' ? 'Сб' : 'Сб',
                                    language === 'kk' ? 'Жс' : 'Вс'
                                ].map((day, i) => (
                                    <span key={i}>{day}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="chart-card">
                    <h3>🎯 {t('reports.gradeDistribution')}</h3>
                    <div style={{ padding: 'var(--spacing-6)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
                            {[
                                { grade: language === 'kk' ? '5 (Өте жақсы)' : '5 (Отлично)', percent: 35, color: 'var(--color-success-500)' },
                                { grade: language === 'kk' ? '4 (Жақсы)' : '4 (Хорошо)', percent: 40, color: 'var(--color-primary-500)' },
                                { grade: language === 'kk' ? '3 (Орташа)' : '3 (Удовл.)', percent: 20, color: 'var(--color-warning-500)' },
                                { grade: language === 'kk' ? '2 (Нашар)' : '2 (Неуд.)', percent: 5, color: 'var(--color-error-500)' },
                            ].map((item, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '14px' }}>
                                        <span>{item.grade}</span>
                                        <span style={{ fontWeight: 600 }}>{item.percent}%</span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '12px',
                                        background: 'var(--color-gray-100)',
                                        borderRadius: '6px',
                                        overflow: 'hidden'
                                    }}>
                                        <div style={{
                                            width: `${item.percent}%`,
                                            height: '100%',
                                            background: item.color,
                                            borderRadius: '6px'
                                        }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Class Performance Table */}
            <div className="chart-card">
                <h3 style={{ marginBottom: 'var(--spacing-6)' }}>📋 {t('reports.classPerformance')}</h3>

                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-gray-200)' }}>
                            <th style={{ textAlign: 'left', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{language === 'kk' ? 'Сынып' : 'Класс'}</th>
                            <th style={{ textAlign: 'left', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{language === 'kk' ? 'Пән' : 'Предмет'}</th>
                            <th style={{ textAlign: 'center', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{language === 'kk' ? 'Оқушылар' : 'Учеников'}</th>
                            <th style={{ textAlign: 'center', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{t('classes.avgGrade')}</th>
                            <th style={{ textAlign: 'left', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}>{t('classes.performance')}</th>
                            <th style={{ textAlign: 'right', padding: 'var(--spacing-3) var(--spacing-4)', fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-500)', fontWeight: 500 }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {classStats.map((cls, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid var(--color-gray-100)' }}>
                                <td style={{ padding: 'var(--spacing-4)', fontWeight: 600 }}>{cls.class}</td>
                                <td style={{ padding: 'var(--spacing-4)' }}>{cls.subject}</td>
                                <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>{cls.students}</td>
                                <td style={{ padding: 'var(--spacing-4)', textAlign: 'center' }}>
                                    <span style={{
                                        fontWeight: 600,
                                        color: cls.avgGrade >= 4.5 ? 'var(--color-success-500)' :
                                            cls.avgGrade >= 4.0 ? 'var(--color-primary-600)' :
                                                'var(--color-warning-500)'
                                    }}>
                                        {cls.avgGrade}
                                    </span>
                                </td>
                                <td style={{ padding: 'var(--spacing-4)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-3)' }}>
                                        <div style={{
                                            width: '120px',
                                            height: '8px',
                                            background: 'var(--color-gray-200)',
                                            borderRadius: '4px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${cls.completion}%`,
                                                height: '100%',
                                                background: cls.completion >= 85 ? 'var(--color-success-500)' :
                                                    cls.completion >= 70 ? 'var(--color-primary-500)' :
                                                        'var(--color-warning-500)',
                                                borderRadius: '4px'
                                            }}></div>
                                        </div>
                                        <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>{cls.completion}%</span>
                                    </div>
                                </td>
                                <td style={{ padding: 'var(--spacing-4)', textAlign: 'right' }}>
                                    <button className="btn btn-ghost btn-sm">{language === 'kk' ? 'Толығырақ' : 'Подробнее'} →</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Reports
