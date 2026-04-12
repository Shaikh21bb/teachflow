import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { quizzesAPI } from '../api'
import {
    ArrowLeft, Users, Trophy, TrendingDown, Target,
    CheckCircle, XCircle, Clock, Download, BarChart2, Loader
} from 'lucide-react'

export default function QuizReport() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        if (id) loadReport()
    }, [id])

    async function loadReport() {
        try {
            setLoading(true)
            const data = await quizzesAPI.getReport(id)
            setReport(data)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }

    function exportCSV() {
        if (!report) return
        const rows = [
            ['Имя', 'Балл', 'Из', 'Процент', 'Дата'],
            ...report.attempts.map(a => [
                a.student_name,
                a.score,
                a.max_score,
                a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) + '%' : '0%',
                new Date(a.taken_at).toLocaleString('ru')
            ])
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `отчёт_${report.quiz.title}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 80 }}>
            <Loader size={36} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-500)' }} />
            <p style={{ color: 'var(--color-gray-500)', marginTop: 16 }}>Загрузка отчёта...</p>
        </div>
    )

    if (error) return (
        <div style={{ textAlign: 'center', padding: 80 }}>
            <XCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
            <h3 style={{ color: '#ef4444' }}>Ошибка: {error}</h3>
            <button className="btn btn-secondary" onClick={() => navigate('/quizzes')} style={{ marginTop: 16 }}>
                <ArrowLeft size={16} /> Назад
            </button>
        </div>
    )

    if (!report) return null

    const { quiz, stats, question_stats, attempts } = report

    // Score distribution buckets: 0-20, 21-40, 41-60, 61-80, 81-100
    const buckets = [0, 0, 0, 0, 0]
    attempts.forEach(a => {
        const pct = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0
        const idx = Math.min(4, Math.floor(pct / 20))
        buckets[idx]++
    })
    const maxBucket = Math.max(...buckets, 1)

    const statCards = [
        { label: 'Попыток', value: stats.total, icon: <Users size={22} />, color: '#6366f1' },
        { label: 'Средний балл', value: stats.avgScore + '%', icon: <Target size={22} />, color: '#3b82f6' },
        { label: 'Лучший результат', value: stats.maxScore + '%', icon: <Trophy size={22} />, color: '#22c55e' },
        { label: 'Худший результат', value: stats.minScore + '%', icon: <TrendingDown size={22} />, color: '#ef4444' },
        { label: 'Сдали (≥60%)', value: stats.passCount, icon: <CheckCircle size={22} />, color: '#f59e0b' },
    ]

    return (
        <div style={{ maxWidth: 1050, margin: '0 auto', padding: '0 16px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
                <div>
                    <button onClick={() => navigate('/quizzes')} className="btn btn-ghost" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px' }}>
                        <ArrowLeft size={16} /> Назад к тестам
                    </button>
                    <h1 style={{ margin: '0 0 6px', fontWeight: 800, fontSize: '1.75rem', color: 'var(--color-gray-900)' }}>
                        {quiz.title}
                    </h1>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {quiz.subject && <span className="badge badge-primary">{quiz.subject}</span>}
                        {quiz.grade && <span className="badge badge-gray">{quiz.grade} класс</span>}
                        <span className="badge badge-gray">{quiz.questions?.length || 0} вопросов</span>
                    </div>
                </div>
                <button className="btn btn-secondary" onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 8 }} disabled={attempts.length === 0}>
                    <Download size={16} /> Скачать CSV
                </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 28 }}>
                {statCards.map(s => (
                    <div key={s.label} className="stat-card" style={{ padding: '16px 18px' }}>
                        <div style={{ color: s.color, marginBottom: 8 }}>{s.icon}</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-gray-900)' }}>{s.value}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-gray-500)', marginTop: 2 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
                {/* Score distribution chart */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: '1rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart2 size={18} style={{ color: '#6366f1' }} /> Распределение баллов
                    </h3>
                    {attempts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 30 }}>Нет данных</div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 140, justifyContent: 'center' }}>
                            {['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'].map((label, i) => {
                                const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981']
                                const h = Math.max(8, Math.round((buckets[i] / maxBucket) * 120))
                                return (
                                    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>{buckets[i]}</div>
                                        <div style={{ width: '100%', height: h, background: colors[i], borderRadius: '6px 6px 0 0', transition: 'height 0.4s ease', minHeight: 8 }} />
                                        <div style={{ fontSize: '0.68rem', color: 'var(--color-gray-500)', textAlign: 'center' }}>{label}</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Hardest questions */}
                <div className="card" style={{ padding: 24 }}>
                    <h3 style={{ margin: '0 0 16px', fontWeight: 700, fontSize: '1rem', color: 'var(--color-gray-900)' }}>
                        🔥 Сложность вопросов
                    </h3>
                    {question_stats.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: 30 }}>Нет данных</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 200, overflowY: 'auto' }}>
                            {[...question_stats].sort((a, b) => a.correct_rate - b.correct_rate).map((qs, i) => (
                                <div key={i}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-700)', flex: 1, marginRight: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {qs.question}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: qs.correct_rate >= 60 ? '#22c55e' : qs.correct_rate >= 40 ? '#f59e0b' : '#ef4444', flexShrink: 0 }}>
                                            {qs.correct_rate}%
                                        </span>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--color-gray-200)', borderRadius: 999 }}>
                                        <div style={{
                                            height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
                                            width: qs.correct_rate + '%',
                                            background: qs.correct_rate >= 60 ? '#22c55e' : qs.correct_rate >= 40 ? '#f59e0b' : '#ef4444'
                                        }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Attempts table */}
            <div className="card" style={{ padding: 24 }}>
                <h3 style={{ margin: '0 0 20px', fontWeight: 700, fontSize: '1rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Users size={18} style={{ color: '#6366f1' }} /> Все результаты ({attempts.length})
                </h3>
                {attempts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-gray-400)' }}>
                        <Users size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
                        <p>Ещё никто не прошёл этот тест</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-gray-200)' }}>
                                    {['#', 'Имя ученика', 'Балл', 'Процент', 'Оценка', 'Дата'].map(h => (
                                        <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {attempts.map((a, i) => {
                                    const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0
                                    const grade = pct >= 85 ? { label: '5', color: '#22c55e' } : pct >= 70 ? { label: '4', color: '#3b82f6' } : pct >= 60 ? { label: '3', color: '#f59e0b' } : { label: '2', color: '#ef4444' }
                                    return (
                                        <tr key={a.id} style={{ borderBottom: '1px solid var(--color-gray-100)', transition: 'background 0.15s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                                            onMouseLeave={e => e.currentTarget.style.background = ''}>
                                            <td style={{ padding: '12px', color: 'var(--color-gray-400)', fontSize: '0.85rem' }}>{i + 1}</td>
                                            <td style={{ padding: '12px', fontWeight: 600, color: 'var(--color-gray-900)' }}>{a.student_name}</td>
                                            <td style={{ padding: '12px', color: 'var(--color-gray-700)' }}>{a.score} / {a.max_score}</td>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 60, height: 6, background: 'var(--color-gray-200)', borderRadius: 999 }}>
                                                        <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: grade.color }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: grade.color }}>{pct}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: grade.color }}>{grade.label}</span>
                                            </td>
                                            <td style={{ padding: '12px', color: 'var(--color-gray-500)', fontSize: '0.8rem' }}>
                                                {new Date(a.taken_at).toLocaleString('ru', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
