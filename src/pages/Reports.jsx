import { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext'
import { reportsAPI } from '../api'
import { 
    Loader, Search, Download, Sparkles, TrendingUp, Info, Users, Star, 
    Target, ClipboardList, BookOpen, Eye, Heart, Award, BarChart2,
    Calendar, ChevronRight, Flame
} from 'lucide-react'

function Reports() {
    const { t, language } = useLanguage()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [period, setPeriod] = useState('week') // week | month
    const [topTab, setTopTab] = useState('views') // views | likes
    
    const demoData = {
        totalStudents: 24, avgGrade: 4.6, performance: 88, completedTasks: 42, totalLessons: 18,
        charts: {
            performance: [65, 72, 78, 85, 82, 88, 92],
            gradeDist: { '5': 45, '4': 35, '3': 15, '2': 5 }
        },
        activity: {
            period,
            days: Array.from({ length: period === 'month' ? 30 : 7 }, (_, i) => ({
                date: new Date(Date.now() - (period === 'month' ? 29 - i : 6 - i) * 86400000).toISOString().split('T')[0],
                count: Math.floor(Math.random() * 4)
            }))
        },
        topLessons: {
            byViews: [
                { id: 1, title: 'Квадратные уравнения', subject: 'Математика', grade: 8, views_count: 142, likes: 34 },
                { id: 2, title: 'Закон Ньютона', subject: 'Физика', grade: 9, views_count: 98, likes: 21 },
                { id: 3, title: 'Фотосинтез', subject: 'Биология', grade: 7, views_count: 87, likes: 19 },
                { id: 4, title: 'Алгебра — основы', subject: 'Математика', grade: 6, views_count: 76, likes: 15 },
                { id: 5, title: 'История Казахстана', subject: 'История', grade: 10, views_count: 65, likes: 12 },
            ],
            byLikes: [
                { id: 1, title: 'Квадратные уравнения', subject: 'Математика', grade: 8, views_count: 142, likes: 34 },
                { id: 2, title: 'Закон Ньютона', subject: 'Физика', grade: 9, views_count: 98, likes: 21 },
                { id: 3, title: 'Фотосинтез', subject: 'Биология', grade: 7, views_count: 87, likes: 19 },
            ]
        },
        classStats: [
            { id: 1, class: '10 "А"', subject: 'Математика', students: 12, avgGrade: 4.7, completion: 92, topStudents: [{ name: 'Айгерим С.', grade: 5.0, xp: 520 }, { name: 'Данияр К.', grade: 4.9, xp: 480 }], gradeDistribution: { excellent: 7, good: 4, satisfactory: 1, poor: 0 } },
            { id: 2, class: '11 "Б"', subject: 'Физика', students: 8, avgGrade: 4.5, completion: 85, topStudents: [{ name: 'Нурлан А.', grade: 4.9, xp: 390 }], gradeDistribution: { excellent: 4, good: 3, satisfactory: 1, poor: 0 } },
            { id: 3, class: '9 "В"', subject: 'Геометрия', students: 4, avgGrade: 4.2, completion: 78, topStudents: [], gradeDistribution: { excellent: 2, good: 1, satisfactory: 1, poor: 0 } },
        ]
    }

    const [isDemo, setIsDemo] = useState(false)

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true)
            try {
                const res = await reportsAPI.getDashboard(period)
                setData(res)
                if (!res || res.totalStudents === 0) setIsDemo(true)
            } catch (err) {
                console.error(err)
                setIsDemo(true)
            } finally {
                setLoading(false)
            }
        }
        fetchReports()
    }, [period])

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '120px 20px', color: 'var(--color-gray-500)' }}>
                <Loader size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: 16, color: 'var(--color-primary-500)' }} />
                <p style={{ fontWeight: 500, fontSize: '15px' }}>
                    {language === 'kk' ? 'Есептер мен аналитика жүктелуде...' : 'Загрузка отчётов и аналитики...'}
                </p>
            </div>
        )
    }

    const activeData = isDemo ? demoData : (data || { totalStudents: 0, avgGrade: 0, performance: 0, completedTasks: 0 })

    const gradeDist = [
        { 
            grade: language === 'kk' ? '5 (Өте жақсы)' : '5 (Отлично)', 
            percent: activeData.charts?.gradeDist?.['5'] || 0, 
            color: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
            icon: <div style={{width: 12, height: 12, borderRadius: '50%', background: '#10b981'}} />
        },
        { 
            grade: language === 'kk' ? '4 (Жақсы)' : '4 (Хорошо)', 
            percent: activeData.charts?.gradeDist?.['4'] || 0, 
            color: 'linear-gradient(90deg, #3b82f6 0%, #1d4ed8 100%)',
            icon: <div style={{width: 12, height: 12, borderRadius: '50%', background: '#3b82f6'}} />
        },
        { 
            grade: language === 'kk' ? '3 (Орташа)' : '3 (Удовл.)', 
            percent: activeData.charts?.gradeDist?.['3'] || 0, 
            color: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
            icon: <div style={{width: 12, height: 12, borderRadius: '50%', background: '#f59e0b'}} />
        },
        { 
            grade: language === 'kk' ? '2 (Нашар)' : '2 (Неуд.)', 
            percent: activeData.charts?.gradeDist?.['2'] || 0, 
            color: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
            icon: <div style={{width: 12, height: 12, borderRadius: '50%', background: '#ef4444'}} />
        },
    ]

    // SVG Line chart config
    const chartValues = activeData.charts?.performance || [0, 0, 0, 0, 0, 0, 0]
    const svgWidth = 600
    const svgHeight = 200
    const paddingX = 45
    const paddingY = 25

    const chartPoints = chartValues.map((val, i) => {
        const x = paddingX + (i * (svgWidth - 2 * paddingX) / (chartValues.length - 1))
        const y = svgHeight - paddingY - (val / 100) * (svgHeight - 2 * paddingY)
        return { x, y, val }
    })

    const linePath = chartPoints.length > 0 
        ? `M ${chartPoints[0].x} ${chartPoints[0].y} ` + chartPoints.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
        : ''
    const areaPath = chartPoints.length > 0
        ? `${linePath} L ${chartPoints[chartPoints.length - 1].x} ${svgHeight - paddingY} L ${chartPoints[0].x} ${svgHeight - paddingY} Z`
        : ''

    const filteredClassStats = (activeData.classStats || []).filter(cls => {
        const term = searchTerm.toLowerCase()
        return cls.class.toLowerCase().includes(term) || cls.subject.toLowerCase().includes(term)
    })

    const getClassBadgeStyle = (className) => {
        if (className.includes('10')) {
            return { background: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe' }
        } else if (className.includes('11')) {
            return { background: '#f5f3ff', color: '#5b21b6', border: '1px solid #ddd6fe' }
        } else {
            return { background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }
        }
    }

    const handleExportCSV = () => {
        const headers = language === 'kk' 
            ? 'Сынып,Пән,Оқушылар саны,Орташа баға,Үлгерім (%)\n'
            : 'Класс,Предмет,Количество учеников,Средняя оценка,Успеваемость (%)\n'
        
        const rows = (activeData.classStats || []).map(cls => 
            `"${cls.class}","${cls.subject}",${cls.students},${cls.avgGrade},${cls.completion}`
        ).join('\n')
        
        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `teachflow_report_${isDemo ? 'demo' : 'real'}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes slideDown {
                    from { opacity: 0; transform: translateY(-16px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hover-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08) !important;
                    border-color: rgba(99, 102, 241, 0.2) !important;
                }
                .dot-group:hover circle {
                    r: 7 !important;
                }
                .dot-group:hover text {
                    opacity: 1 !important;
                    font-weight: 800 !important;
                }
            `}</style>

            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-0.025em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {t('reports.title')} <Sparkles style={{ color: 'var(--color-primary-500)' }} size={24} />
                    </h1>
                    <p className="page-subtitle" style={{ fontSize: '15px', color: 'var(--color-gray-500)' }}>
                        {t('reports.subtitle')}
                    </p>
                </div>
                {/* Manual Demo Toggle */}
                {data && data.totalStudents > 0 && (
                    <button
                        onClick={() => setIsDemo(!isDemo)}
                        style={{
                            background: isDemo ? 'var(--gradient-primary)' : 'white',
                            color: isDemo ? 'white' : 'var(--color-gray-700)',
                            border: '1px solid ' + (isDemo ? 'transparent' : 'var(--color-gray-200)'),
                            padding: '10px 18px',
                            borderRadius: '12px',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: 'var(--shadow-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Sparkles size={16} />
                        {isDemo 
                            ? (language === 'kk' ? 'Шынайы деректерді көру' : 'Показать реальные данные')
                            : (language === 'kk' ? 'Демо режимін қосу' : 'Включить демо-режим')}
                    </button>
                )}
            </div>

            {/* Demo Banner */}
            {isDemo && (
                <div style={{
                    background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                    border: '1px solid rgba(99, 102, 241, 0.15)',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    marginBottom: '28px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    animation: 'slideDown 0.4s ease-out'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Info size={28} color="var(--color-primary-500)" />
                        <div>
                            <h4 style={{ margin: 0, fontWeight: 700, color: 'var(--color-primary-600)', fontSize: '15px' }}>
                                {language === 'kk' ? 'Көрнекілік режимі белсенді (Демо деректер)' : 'Режим демонстрации активен (Демо-данные)'}
                            </h4>
                            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--color-gray-600)', lineHeight: '1.4' }}>
                                {language === 'kk' 
                                    ? 'Мұғалім кабинетінде деректер әлі жоқ болғандықтан, беттің дизайнын көрсету мақсатында демо деректер қосылды.'
                                    : 'Поскольку в кабинете учителя пока нет данных, мы загрузили демонстрационные показатели для примера.'}
                            </p>
                        </div>
                    </div>
                    {data && data.totalStudents > 0 && (
                        <button 
                            onClick={() => setIsDemo(false)}
                            style={{
                                background: 'white',
                                border: '1px solid var(--color-gray-200)',
                                padding: '8px 16px',
                                borderRadius: '10px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: 'var(--shadow-sm)'
                            }}
                        >
                            {language === 'kk' ? 'Шынайы деректер' : 'Реальные данные'}
                        </button>
                    )}
                </div>
            )}

            {/* Overview Stats */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '20px',
                marginBottom: '28px'
            }}>
                {[
                    {
                        title: t('dashboard.totalStudents'),
                        value: activeData.totalStudents || 0,
                        icon: <Users size={28} color="#3b82f6" />,
                        bgLight: '#eff6ff',
                        desc: language === 'kk' ? 'Тіркелген оқушы' : 'Зарегистрировано'
                    },
                    {
                        title: t('classes.avgGrade'),
                        value: activeData.avgGrade || 0,
                        icon: <Star size={28} color="#eab308" />,
                        bgLight: '#fffbeb',
                        desc: language === 'kk' ? 'Орташа баға' : 'Средний балл'
                    },
                    {
                        title: t('classes.performance'),
                        value: `${activeData.performance || 0}%`,
                        icon: <TrendingUp size={28} color="#10b981" />,
                        bgLight: '#ecfdf5',
                        desc: language === 'kk' ? 'Үлгерім пайызы' : 'Успеваемость'
                    },
                    {
                        title: language === 'kk' ? 'Орындалған тапсырмалар' : 'Выполненных заданий',
                        value: activeData.completedTasks || 0,
                        icon: <Target size={28} color="#8b5cf6" />,
                        bgLight: '#f5f3ff',
                        desc: language === 'kk' ? 'Барлық жұмыстар' : 'Всего работ'
                    },
                    {
                        title: language === 'kk' ? 'Сабақтар' : 'Уроков создано',
                        value: activeData.totalLessons || 0,
                        icon: <BookOpen size={28} color="#06b6d4" />,
                        bgLight: '#ecfeff',
                        desc: language === 'kk' ? 'Барлық сабақтар' : 'В библиотеке'
                    }
                ].map((card, idx) => (
                    <div 
                        key={idx} 
                        className="hover-card"
                        style={{
                            background: 'white',
                            borderRadius: '18px',
                            padding: '24px',
                            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
                            border: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '20px',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            cursor: 'default'
                        }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '16px',
                            background: card.bgLight,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            flexShrink: 0
                        }}>
                            {card.icon}
                        </div>
                        <div>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 500 }}>
                                {card.title}
                            </p>
                            <h3 style={{ margin: '4px 0', fontSize: '28px', fontWeight: 800, color: 'var(--color-gray-900)', letterSpacing: '-0.02em' }}>
                                {card.value}
                            </h3>
                            <span style={{ fontSize: '11px', color: 'var(--color-gray-400)', fontWeight: 500 }}>
                                {card.desc}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '24px', marginBottom: '28px' }}>
                
                {/* Performance Dynamics Trend Line */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
                    border: '1px solid #f1f5f9'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <TrendingUp size={20} color="var(--color-primary-500)" /> {t('reports.performanceDynamics')}
                        </h3>
                        <span style={{ 
                            fontSize: '12px', 
                            background: 'var(--color-primary-50)', 
                            color: 'var(--color-primary-700)', 
                            padding: '4px 12px', 
                            borderRadius: '20px', 
                            fontWeight: 600 
                        }}>
                            {language === 'kk' ? 'Апталық тренд' : 'Недельный тренд'}
                        </span>
                    </div>

                    <div style={{ position: 'relative', width: '100%' }}>
                        <svg width="100%" height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity="0.0" />
                                </linearGradient>
                                <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="var(--color-primary-500)" />
                                    <stop offset="100%" stopColor="var(--color-secondary-500)" />
                                </linearGradient>
                            </defs>
                            
                            {/* Horizontal gridlines */}
                            {[25, 50, 75, 100].map((level) => {
                                const y = svgHeight - paddingY - (level / 100) * (svgHeight - 2 * paddingY)
                                return (
                                    <g key={level}>
                                        <line 
                                            x1={paddingX} 
                                            y1={y} 
                                            x2={svgWidth - paddingX} 
                                            y2={y} 
                                            stroke="#f1f5f9" 
                                            strokeWidth="1.5"
                                        />
                                        <text 
                                            x={paddingX - 10} 
                                            y={y + 4} 
                                            fill="#94a3b8" 
                                            fontSize="10" 
                                            fontWeight="600"
                                            textAnchor="end"
                                        >
                                            {level}%
                                        </text>
                                    </g>
                                )
                            })}

                            {/* Area fill under the path */}
                            {areaPath && (
                                <path d={areaPath} fill="url(#chartGradient)" />
                            )}

                            {/* Line path */}
                            {linePath && (
                                <path 
                                    d={linePath} 
                                    fill="none" 
                                    stroke="url(#lineGrad)" 
                                    strokeWidth="4" 
                                    strokeLinecap="round"
                                    strokeLinejoin="round" 
                                />
                            )}

                            {/* Dots & tooltips */}
                            {chartPoints.map((p, i) => (
                                <g key={i} className="dot-group" style={{ cursor: 'pointer' }}>
                                    <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r="5.5" 
                                        fill="white" 
                                        stroke="var(--color-primary-500)" 
                                        strokeWidth="3.5"
                                        style={{ transition: 'all 0.2s ease' }}
                                    />
                                    {/* Hover overlay */}
                                    <circle 
                                        cx={p.x} 
                                        cy={p.y} 
                                        r="12" 
                                        fill="transparent" 
                                    />
                                    {/* Text values */}
                                    <text
                                        x={p.x}
                                        y={p.y - 12}
                                        fill="var(--color-gray-800)"
                                        fontSize="11"
                                        fontWeight="700"
                                        textAnchor="middle"
                                        style={{ opacity: 0, transition: 'opacity 0.2s', pointerEvents: 'none' }}
                                    >
                                        {p.val}%
                                    </text>
                                </g>
                            ))}
                        </svg>

                        {/* Labels below */}
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            paddingLeft: `${paddingX}px`, 
                            paddingRight: `${paddingX}px`, 
                            marginTop: '12px' 
                        }}>
                            {[
                                language === 'kk' ? 'Дс' : 'Пн',
                                language === 'kk' ? 'Сс' : 'Вт',
                                language === 'kk' ? 'Ср' : 'Ср',
                                language === 'kk' ? 'Бс' : 'Чт',
                                language === 'kk' ? 'Жм' : 'Пт',
                                language === 'kk' ? 'Сб' : 'Сб',
                                language === 'kk' ? 'Жс' : 'Вс'
                            ].map((day, i) => (
                                <span key={i} style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-gray-400)' }}>
                                    {day}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Grade Distribution */}
                <div style={{
                    background: 'white',
                    borderRadius: '20px',
                    padding: '24px',
                    boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
                            <Target size={20} color="var(--color-primary-500)" /> {t('reports.gradeDistribution')}
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {gradeDist.map((item, i) => {
                                const count = Math.round((item.percent / 100) * activeData.totalStudents)
                                return (
                                    <div key={i}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>{item.icon}</span>
                                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--color-gray-700)' }}>
                                                    {item.grade}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ 
                                                    fontSize: '11px', 
                                                    background: 'var(--color-gray-100)', 
                                                    padding: '2px 8px', 
                                                    borderRadius: '12px',
                                                    color: 'var(--color-gray-500)',
                                                    fontWeight: 600
                                                }}>
                                                    {count} {language === 'kk' ? 'оқушы' : 'учеников'}
                                                </span>
                                                <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>
                                                    {item.percent}%
                                                </span>
                                            </div>
                                        </div>
                                        <div style={{
                                            width: '100%',
                                            height: '10px',
                                            background: '#f1f5f9',
                                            borderRadius: '5px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${item.percent}%`,
                                                height: '100%',
                                                background: item.color,
                                                borderRadius: '5px',
                                                transition: 'width 0.8s ease'
                                            }}></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Activity Chart ── */}
            <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9', marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <BarChart2 size={20} color="var(--color-primary-500)" />
                        {language === 'kk' ? 'Белсенділік' : 'Активность создания уроков'}
                    </h3>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        {[{ v: 'week', l: language === 'kk' ? 'Апта' : 'Неделя' }, { v: 'month', l: language === 'kk' ? 'Ай' : 'Месяц' }].map(o => (
                            <button key={o.v} onClick={() => setPeriod(o.v)} style={{ padding: '6px 14px', border: `1px solid ${period === o.v ? '#6366f1' : 'var(--color-gray-200)'}`, borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', background: period === o.v ? '#eff6ff' : 'white', color: period === o.v ? '#4f46e5' : 'var(--color-gray-600)' }}>
                                {o.l}
                            </button>
                        ))}
                    </div>
                </div>
                {(() => {
                    const days = activeData.activity?.days || []
                    const maxCount = Math.max(...days.map(d => d.count), 1)
                    const barWidth = Math.max(8, Math.min(24, Math.floor(600 / days.length) - 4))
                    return (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', overflowX: 'auto', paddingBottom: '28px', position: 'relative' }}>
                            {days.map((d, i) => {
                                const h = Math.max(4, (d.count / maxCount) * 100)
                                const date = new Date(d.date)
                                const label = period === 'week'
                                    ? date.toLocaleDateString(language === 'kk' ? 'kk-KZ' : 'ru-RU', { weekday: 'short' })
                                    : date.getDate() % 5 === 1 ? date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : ''
                                return (
                                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, minWidth: `${barWidth + 4}px` }}>
                                        {d.count > 0 && <span style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', marginBottom: '2px' }}>{d.count}</span>}
                                        <div
                                            title={`${d.date}: ${d.count} ${language === 'kk' ? 'сабақ' : 'урок(ов)'}`}
                                            style={{ width: `${barWidth}px`, height: `${h}%`, background: d.count > 0 ? 'linear-gradient(180deg,#6366f1,#8b5cf6)' : 'var(--color-gray-100)', borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease', cursor: d.count > 0 ? 'pointer' : 'default' }}
                                        />
                                        {label && <span style={{ fontSize: '10px', color: 'var(--color-gray-400)', whiteSpace: 'nowrap', position: 'absolute', bottom: 0 }}>{label}</span>}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })()}
            </div>

            {/* ── Top Lessons + Student Progress ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '28px' }}>

                {/* Top Lessons */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Flame size={18} color="#f97316" /> {language === 'kk' ? 'Топ сабақтар' : 'Топ уроки'}
                        </h3>
                        <div style={{ display: 'flex', gap: '4px' }}>
                            {[{ v: 'views', icon: <Eye size={12} />, l: language === 'kk' ? 'Қаралым' : 'Просмотры' }, { v: 'likes', icon: <Heart size={12} />, l: language === 'kk' ? 'Ұнату' : 'Лайки' }].map(o => (
                                <button key={o.v} onClick={() => setTopTab(o.v)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', border: `1px solid ${topTab === o.v ? '#6366f1' : 'var(--color-gray-200)'}`, borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', background: topTab === o.v ? '#eff6ff' : 'white', color: topTab === o.v ? '#4f46e5' : 'var(--color-gray-500)' }}>
                                    {o.icon} {o.l}
                                </button>
                            ))}
                        </div>
                    </div>
                    {(() => {
                        const list = topTab === 'views' ? activeData.topLessons?.byViews : activeData.topLessons?.byLikes
                        const maxVal = Math.max(...(list || []).map(l => topTab === 'views' ? l.views_count : l.likes), 1)
                        return (list || []).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-gray-400)', fontSize: '14px' }}>
                                <BookOpen size={32} color="#e5e7eb" style={{ marginBottom: '8px' }} />
                                <p style={{ margin: 0 }}>{language === 'kk' ? 'Жарияланған сабақтар жоқ' : 'Нет опубликованных уроков'}</p>
                            </div>
                        ) : list.map((lesson, i) => {
                            const val = topTab === 'views' ? lesson.views_count : lesson.likes
                            const pct = (val / maxVal) * 100
                            return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0', borderBottom: i < list.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                                    <span style={{ width: '22px', height: '22px', borderRadius: '6px', background: i === 0 ? '#fbbf24' : i === 1 ? '#d1d5db' : i === 2 ? '#fb923c' : 'var(--color-gray-100)', color: i < 3 ? 'white' : 'var(--color-gray-400)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-gray-900)' }}>{lesson.title}</p>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1, height: '5px', background: 'var(--color-gray-100)', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: topTab === 'views' ? '#6366f1' : '#ef4444', borderRadius: '3px' }} />
                                            </div>
                                            <span style={{ fontSize: '12px', fontWeight: 700, color: topTab === 'views' ? '#6366f1' : '#ef4444', flexShrink: 0, minWidth: '28px', textAlign: 'right' }}>{val}</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    })()}
                </div>

                {/* Student progress per class */}
                <div style={{ background: 'white', borderRadius: '20px', padding: '24px', boxShadow: '0 4px 18px rgba(0,0,0,0.02)', border: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Award size={18} color="#10b981" /> {language === 'kk' ? 'Сыныптар прогресі' : 'Прогресс по классам'}
                    </h3>
                    {(activeData.classStats || []).length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-gray-400)', fontSize: '14px' }}>
                            <Users size={32} color="#e5e7eb" style={{ marginBottom: '8px' }} />
                            <p style={{ margin: 0 }}>{language === 'kk' ? 'Сыныптар жоқ' : 'Нет классов'}</p>
                        </div>
                    ) : (activeData.classStats || []).map((cls, i) => (
                        <div key={i} style={{ marginBottom: i < activeData.classStats.length - 1 ? '16px' : 0, paddingBottom: i < activeData.classStats.length - 1 ? '16px' : 0, borderBottom: i < activeData.classStats.length - 1 ? '1px solid var(--color-gray-100)' : 'none' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div>
                                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--color-gray-900)' }}>{cls.class}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--color-gray-400)', marginLeft: '8px' }}>{cls.subject} · {cls.students} {language === 'kk' ? 'оқушы' : 'уч.'}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 800, color: cls.avgGrade >= 4.5 ? '#10b981' : cls.avgGrade >= 4.0 ? '#3b82f6' : '#f59e0b' }}>{cls.avgGrade}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--color-gray-400)' }}>avg</span>
                                </div>
                            </div>
                            {/* Progress bar */}
                            <div style={{ height: '8px', background: 'var(--color-gray-100)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' }}>
                                <div style={{ height: '100%', width: `${cls.completion}%`, background: cls.completion >= 85 ? '#10b981' : cls.completion >= 70 ? '#3b82f6' : '#f59e0b', borderRadius: '4px', transition: 'width 0.6s ease' }} />
                            </div>
                            {/* Grade breakdown mini dots */}
                            {cls.gradeDistribution && cls.students > 0 && (
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {[
                                        { key: 'excellent', color: '#10b981', label: '5' },
                                        { key: 'good', color: '#3b82f6', label: '4' },
                                        { key: 'satisfactory', color: '#f59e0b', label: '3' },
                                        { key: 'poor', color: '#ef4444', label: '2' },
                                    ].map(g => cls.gradeDistribution[g.key] > 0 && (
                                        <span key={g.key} style={{ display: 'flex', alignItems: 'center', gap: '3px', background: `${g.color}15`, color: g.color, padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>
                                            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: g.color }} />
                                            {g.label}: {cls.gradeDistribution[g.key]}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Class Performance Table */}
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '28px',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.02)',
                border: '1px solid #f1f5f9'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                    flexWrap: 'wrap',
                    gap: '16px'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-gray-800)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <ClipboardList size={20} color="var(--color-primary-500)" /> {t('reports.classPerformance')}
                    </h3>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Table Search */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '6px 14px',
                            width: '240px'
                        }}>
                            <Search size={16} style={{ color: 'var(--color-gray-400)' }} />
                            <input 
                                type="text"
                                placeholder={language === 'kk' ? 'Сыныпты немесе пәнді іздеу...' : 'Поиск класса или предмета...'}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    outline: 'none',
                                    fontSize: '13px',
                                    width: '100%'
                                }}
                            />
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportCSV}
                            style={{
                                background: 'white',
                                color: 'var(--color-gray-700)',
                                border: '1px solid var(--color-gray-200)',
                                padding: '8px 16px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'white' }}
                        >
                            <Download size={14} />
                            {language === 'kk' ? 'Жүктеу (CSV)' : 'Экспорт (CSV)'}
                        </button>
                    </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #f1f5f9' }}>
                                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 600 }}>{language === 'kk' ? 'Сынып' : 'Класс'}</th>
                                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 600 }}>{language === 'kk' ? 'Пән' : 'Предмет'}</th>
                                <th style={{ textAlign: 'center', padding: '14px 16px', fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 600 }}>{language === 'kk' ? 'Оқушылар' : 'Учеников'}</th>
                                <th style={{ textAlign: 'center', padding: '14px 16px', fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 600 }}>{t('classes.avgGrade')}</th>
                                <th style={{ textAlign: 'left', padding: '14px 16px', fontSize: '13px', color: 'var(--color-gray-500)', fontWeight: 600 }}>{t('classes.performance')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClassStats.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: '14px' }}>
                                        <Info size={24} style={{ display: 'block', margin: '0 auto 8px', color: 'var(--color-gray-300)' }} />
                                        {language === 'kk' ? 'Сыныптар табылмады' : 'Сводка по классам пуста'}
                                    </td>
                                </tr>
                            )}
                            {filteredClassStats.map((cls, i) => {
                                const badge = getClassBadgeStyle(cls.class)
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f8fafc', transition: 'background 0.2s' }} className="table-row-hover">
                                        <td style={{ padding: '16px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                ...badge
                                            }}>
                                                {cls.class}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px', fontWeight: 600, fontSize: '14px', color: '#334155' }}>
                                            {cls.subject}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center', fontWeight: 500, fontSize: '14px', color: '#64748b' }}>
                                            {cls.students}
                                        </td>
                                        <td style={{ padding: '16px', textAlign: 'center' }}>
                                            <span style={{
                                                fontWeight: 700,
                                                fontSize: '15px',
                                                color: cls.avgGrade >= 4.5 ? '#10b981' :
                                                    cls.avgGrade >= 4.0 ? '#3b82f6' : '#f59e0b'
                                            }}>
                                                {cls.avgGrade}
                                            </span>
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '140px',
                                                    height: '8px',
                                                    background: '#f1f5f9',
                                                    borderRadius: '4px',
                                                    overflow: 'hidden',
                                                    flexShrink: 0
                                                }}>
                                                    <div style={{
                                                        width: `${cls.completion}%`,
                                                        height: '100%',
                                                        background: cls.completion >= 85 
                                                            ? 'linear-gradient(90deg, #10b981, #059669)' 
                                                            : cls.completion >= 70 
                                                                ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)' 
                                                                : 'linear-gradient(90deg, #f59e0b, #d97706)',
                                                        borderRadius: '4px'
                                                    }}></div>
                                                </div>
                                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                                                    {cls.completion}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default Reports
