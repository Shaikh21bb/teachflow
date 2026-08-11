import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { quizzesAPI } from '../api'
import {
    ArrowLeft, Users, Trophy, TrendingDown, Target,
    CheckCircle, XCircle, Download, BarChart2, Loader,
    FileSpreadsheet, Sparkles
} from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'
import { useReactToPrint } from 'react-to-print'
import PrintTemplate from '../components/PrintTemplate'

export default function QuizReport() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { language } = useLanguage()
    
    const [report, setReport] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showAnswersInPrint, setShowAnswersInPrint] = useState(true)

    // ── Print ref ────────────────────────────────────────────
    const printRef = useRef(null)
    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: report?.quiz?.title || 'Квиз',
    })

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
            [
                language === 'kk' ? 'Оқушы аты' : 'Имя', 
                language === 'kk' ? 'Ұпай' : 'Балл', 
                language === 'kk' ? 'Жалпы ұпай' : 'Из', 
                language === 'kk' ? 'Пайыз' : 'Процент', 
                language === 'kk' ? 'Күні' : 'Дата'
            ],
            ...report.attempts.map(a => [
                a.student_name,
                a.score,
                a.max_score,
                a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) + '%' : '0%',
                new Date(a.taken_at).toLocaleString('ru')
            ])
        ]
        const csv = rows.map(r => r.join(',')).join('\n')
        // Add BOM for Excel UTF-8 support
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${language === 'kk' ? 'есеп' : 'отчет'}_${report.quiz.title}.csv`
        a.click()
        URL.revokeObjectURL(url)
    }

    if (loading) return (
        <div style={{ textAlign: 'center', padding: '100px 20px' }}>
            <Loader size={40} style={{ animation: 'spin 1s linear infinite', color: 'var(--color-primary-500)', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--color-gray-500)', fontSize: '1.1rem', fontWeight: 500 }}>
                {language === 'kk' ? 'Есеп жүктелуде...' : 'Загрузка отчёта...'}
            </p>
        </div>
    )

    if (error) return (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <XCircle size={64} color="#ef4444" style={{ margin: '0 auto 16px' }} />
            <h3 style={{ color: '#ef4444', fontSize: '1.4rem', marginBottom: '8px' }}>
                {language === 'kk' ? 'Қате шықты' : 'Произошла ошибка'}
            </h3>
            <p style={{ color: 'var(--color-gray-600)', marginBottom: '24px' }}>{error}</p>
            <button className="btn btn-secondary" onClick={() => navigate('/quizzes')} style={{ padding: '10px 20px', fontSize: '1rem' }}>
                <ArrowLeft size={18} /> {language === 'kk' ? 'Тесттерге қайту' : 'Назад к тестам'}
            </button>
        </div>
    )

    if (!report) return null

    const { quiz, stats, question_stats, attempts } = report

    // ── Active tab ────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('overview') // overview | leaderboard | questions

    // Score distribution buckets: 0-20, 21-40, 41-60, 61-80, 81-100
    const buckets = [0, 0, 0, 0, 0]
    attempts.forEach(a => {
        const pct = a.max_score > 0 ? (a.score / a.max_score) * 100 : 0
        const idx = Math.min(4, Math.floor(pct / 20))
        buckets[idx]++
    })
    const maxBucket = Math.max(...buckets, 1)

    const statCards = [
        { label: language === 'kk' ? 'Барлығы тапсырды' : 'Всего попыток', value: stats.total, icon: <Users size={24} />, color: '#6366f1', bg: '#eff6ff' },
        { label: language === 'kk' ? 'Орташа пайыз' : 'Средний балл', value: stats.avgScore + '%', icon: <Target size={24} />, color: '#3b82f6', bg: '#e0f2fe' },
        { label: language === 'kk' ? 'Ең жоғары' : 'Лучший результат', value: stats.maxScore + '%', icon: <Trophy size={24} />, color: '#10b981', bg: '#dcfce7' },
        { label: language === 'kk' ? 'Ең төменгі' : 'Худший результат', value: stats.minScore + '%', icon: <TrendingDown size={24} />, color: '#f43f5e', bg: '#ffe4e6' },
        { label: language === 'kk' ? 'Өтті (≥60%)' : 'Сдали (≥60%)', value: stats.passCount, icon: <CheckCircle size={24} />, color: '#f59e0b', bg: '#fef3c7' },
    ]

    return (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px', animation: 'fadeIn 0.3s ease-out' }}>
            {/* Hidden print template */}
            <PrintTemplate
                ref={printRef}
                type="quiz"
                data={{ ...quiz, questions: quiz.questions }}
                attempts={attempts}
                showAnswers={showAnswersInPrint}
                language={language}
            />

            {/* ── Header ── */}
            <div style={{ 
                display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'space-between', alignItems: 'flex-start', 
                background: 'linear-gradient(135deg, white 0%, var(--color-gray-50) 100%)', 
                padding: '24px', borderRadius: '20px', border: '1px solid var(--color-gray-200)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '32px'
            }}>
                <div>
                    <button onClick={() => navigate('/quizzes')} className="btn btn-ghost" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'white', border: '1px solid var(--color-gray-200)' }}>
                        <ArrowLeft size={16} /> {language === 'kk' ? 'Тесттерге қайту' : 'Назад к тестам'}
                    </button>
                    <h1 style={{ margin: '0 0 12px', fontWeight: 800, fontSize: '1.8rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={24} style={{ color: 'var(--color-primary-500)' }} /> {quiz.title}
                    </h1>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {quiz.subject && <span className="badge" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', padding: '6px 12px', borderRadius: '12px' }}>{quiz.subject}</span>}
                        {quiz.grade && <span className="badge" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', padding: '6px 12px', borderRadius: '12px' }}>{quiz.grade} {language === 'kk' ? 'сынып' : 'класс'}</span>}
                        <span className="badge" style={{ background: 'var(--color-gray-100)', color: 'var(--color-gray-700)', padding: '6px 12px', borderRadius: '12px' }}>{quiz.questions?.length || 0} {language === 'kk' ? 'сұрақ' : 'вопросов'}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* PDF with answers toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--color-gray-600)', cursor: 'pointer', userSelect: 'none' }}>
                        <input
                            type="checkbox"
                            checked={showAnswersInPrint}
                            onChange={e => setShowAnswersInPrint(e.target.checked)}
                            style={{ cursor: 'pointer' }}
                        />
                        {language === 'kk' ? 'Жауаптармен' : 'С ответами'}
                    </label>
                    <button
                        onClick={handlePrint}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: '14px', fontSize: '0.9rem', fontWeight: 600 }}
                    >
                        <Download size={16} /> {language === 'kk' ? 'PDF' : 'PDF'}
                    </button>
                    <button 
                        className="btn btn-primary" 
                        onClick={exportCSV} 
                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 600, boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)' }} 
                        disabled={attempts.length === 0}
                    >
                        <FileSpreadsheet size={18} /> {language === 'kk' ? 'Жүктеу (Excel)' : 'Excel'}
                    </button>
                </div>
            </div>

            {/* ── KPI Stat Cards ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
                {statCards.map(s => (
                    <div key={s.label} className="card" style={{ padding: '20px', border: '1px solid var(--color-gray-100)', borderRadius: '16px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: -15, right: -15, width: 80, height: 80, borderRadius: '50%', background: s.bg, opacity: 0.5, zIndex: 0 }}></div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', zIndex: 1 }}>
                            <div style={{ width: 44, height: 44, borderRadius: '12px', background: s.bg, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {s.icon}
                            </div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', fontWeight: 600, lineHeight: 1.2 }}>
                                {s.label}
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-gray-900)', zIndex: 1 }}>
                            {s.value}
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Tab bar ── */}
            <div style={{ display: 'flex', background: 'var(--color-gray-100)', borderRadius: 12, padding: 4, marginBottom: 24, width: 'fit-content', gap: 2 }}>
                {[
                    { id: 'overview', label: language === 'kk' ? 'Шолу' : 'Обзор' },
                    { id: 'leaderboard', label: language === 'kk' ? 'Рейтинг' : 'Рейтинг' },
                    { id: 'questions', label: language === 'kk' ? 'Сұрақтар' : 'Вопросы' },
                ].map(t => (
                    <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                        padding: '8px 18px', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
                        background: activeTab === t.id ? 'white' : 'transparent',
                        color: activeTab === t.id ? 'var(--color-primary-600)' : 'var(--color-gray-600)',
                        boxShadow: activeTab === t.id ? 'var(--shadow-sm)' : 'none', transition: 'all 0.2s'
                    }}>{t.label}</button>
                ))}
            </div>

            {/* ── Charts Row (overview + questions tabs) ── */}
            {activeTab !== 'leaderboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24, marginBottom: 32 }}>
                
                {/* Chart 1: Score distribution */}
                <div className="card" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--color-gray-100)' }}>
                    <h3 style={{ margin: '0 0 24px', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: 'var(--color-primary-50)', padding: '8px', borderRadius: '10px', color: 'var(--color-primary-600)' }}>
                            <BarChart2 size={20} />
                        </div>
                        {language === 'kk' ? 'Балдардың таралуы' : 'Распределение баллов'}
                    </h3>
                    
                    {attempts.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: '40px 20px', background: 'var(--color-gray-50)', borderRadius: '16px' }}>
                            {language === 'kk' ? 'Әлі мәлімет жоқ' : 'Нет данных'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 180, justifyContent: 'space-around', padding: '0 10px' }}>
                            {['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'].map((label, i) => {
                                const colors = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981']
                                const h = Math.max(10, Math.round((buckets[i] / maxBucket) * 150))
                                return (
                                    <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1, position: 'relative' }}>
                                        <div style={{ fontSize: '1rem', fontWeight: 800, color: buckets[i] > 0 ? 'var(--color-gray-800)' : 'var(--color-gray-300)' }}>
                                            {buckets[i]}
                                        </div>
                                        <div style={{ width: '100%', maxWidth: '60px', height: h, background: buckets[i] > 0 ? colors[i] : 'var(--color-gray-100)', borderRadius: '8px 8px 0 0', transition: 'height 0.5s cubic-bezier(0.4, 0, 0.2, 1)', minHeight: 10, boxShadow: buckets[i] > 0 ? `0 4px 10px ${colors[i]}30` : 'none' }} />
                                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-gray-500)', textAlign: 'center', marginTop: '4px' }}>
                                            {label}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Chart 2: Hardest questions */}
                <div className="card" style={{ padding: '24px', borderRadius: '20px', border: '1px solid var(--color-gray-100)' }}>
                    <h3 style={{ margin: '0 0 24px', fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: '#fff1f2', padding: '8px', borderRadius: '10px', color: '#f43f5e' }}>
                            <TrendingDown size={20} />
                        </div>
                        {language === 'kk' ? 'Сұрақтардың дұрыс жауап берілуі' : 'Успешность по вопросам'}
                    </h3>
                    
                    {question_stats.length === 0 ? (
                        <div style={{ textAlign: 'center', color: 'var(--color-gray-400)', padding: '40px 20px', background: 'var(--color-gray-50)', borderRadius: '16px' }}>
                            {language === 'kk' ? 'Әлі мәлімет жоқ' : 'Нет данных'}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 220, overflowY: 'auto', paddingRight: '8px' }}>
                            {[...question_stats].sort((a, b) => a.correct_rate - b.correct_rate).map((qs, i) => {
                                const isDanger = qs.correct_rate < 40;
                                const isWarning = qs.correct_rate >= 40 && qs.correct_rate < 70;
                                const barColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';
                                const bgLight = isDanger ? '#fef2f2' : isWarning ? '#fffbeb' : '#ecfdf5';

                                return (
                                    <div key={i} style={{ background: 'white', padding: '10px 14px', border: `1px solid var(--color-gray-100)`, borderRadius: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', color: 'var(--color-gray-800)', flex: 1, marginRight: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontWeight: 500, lineHeight: 1.4 }}>
                                                {qs.question}
                                            </span>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: barColor, flexShrink: 0, background: bgLight, padding: '4px 8px', borderRadius: '8px' }}>
                                                {qs.correct_rate}%
                                            </span>
                                        </div>
                                        <div style={{ height: 8, background: 'var(--color-gray-100)', borderRadius: 999, overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%', borderRadius: 999, transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
                                                width: qs.correct_rate + '%',
                                                background: barColor
                                            }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
            )} {/* end activeTab !== leaderboard */}

            {/* ── Leaderboard tab ── */}
            {activeTab === 'leaderboard' && (
                <div className="card" style={{ padding: 0, borderRadius: 20, border: '1px solid var(--color-gray-100)', overflow: 'hidden', marginBottom: 32 }}>
                    <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--color-gray-100)', background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)' }}>
                        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.15rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            🏆 {language === 'kk' ? 'Рейтинг кестесі' : 'Таблица лидеров'}
                        </h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        {attempts.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-gray-400)' }}>
                                {language === 'kk' ? 'Нәтижелер жоқ' : 'Нет результатов'}
                            </div>
                        ) : [...attempts]
                            .sort((a, b) => {
                                const pa = a.max_score > 0 ? a.score / a.max_score : 0
                                const pb = b.max_score > 0 ? b.score / b.max_score : 0
                                return pb !== pa ? pb - pa : (a.time_spent || 99999) - (b.time_spent || 99999)
                            })
                            .map((a, rank) => {
                                const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0
                                const medal = rank === 0 ? { bg: '#fbbf24', color: '#92400e', icon: '🥇' } : rank === 1 ? { bg: '#d1d5db', color: '#374151', icon: '🥈' } : rank === 2 ? { bg: '#fb923c', color: '#7c2d12', icon: '🥉' } : null
                                return (
                                    <div key={a.id || rank} style={{
                                        display: 'flex', alignItems: 'center', gap: 16, padding: '14px 24px',
                                        borderBottom: '1px solid var(--color-gray-100)',
                                        background: rank < 3 ? `${['#fef9c3','#f9fafb','#fff7ed'][rank]}` : 'white',
                                        transition: 'background 0.15s'
                                    }}>
                                        {/* Rank */}
                                        <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: rank < 3 ? '1.1rem' : '0.9rem', background: medal ? medal.bg : 'var(--color-gray-100)', color: medal ? medal.color : 'var(--color-gray-500)' }}>
                                            {medal ? medal.icon : rank + 1}
                                        </div>
                                        {/* Avatar */}
                                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                                            {(a.student_name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        {/* Name */}
                                        <div style={{ flex: 1, fontWeight: rank < 3 ? 800 : 600, fontSize: '0.95rem', color: 'var(--color-gray-900)' }}>
                                            {a.student_name}
                                        </div>
                                        {/* Score bar */}
                                        <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                                            <div style={{ flex: 1, height: 8, background: 'var(--color-gray-100)', borderRadius: 4, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : '#f59e0b', borderRadius: 4, transition: 'width 0.5s ease' }} />
                                            </div>
                                            <span style={{ fontWeight: 800, fontSize: '1rem', color: pct >= 80 ? '#059669' : pct >= 60 ? '#1d4ed8' : '#d97706', minWidth: 44, textAlign: 'right' }}>{pct}%</span>
                                        </div>
                                        {/* Time */}
                                        {a.time_spent > 0 && (
                                            <span style={{ fontSize: '0.78rem', color: 'var(--color-gray-400)', flexShrink: 0 }}>
                                                {Math.floor(a.time_spent / 60)}:{(a.time_spent % 60).toString().padStart(2, '0')}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                    </div>
                </div>
            )}

            {/* ── Table: All Attempts ── */}
            <div className="card" style={{ padding: '0', borderRadius: '20px', border: '1px solid var(--color-gray-100)', overflow: 'hidden' }}>
                <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid var(--color-gray-100)', background: 'var(--color-gray-50)' }}>
                    <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.2rem', color: 'var(--color-gray-900)', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Users size={20} style={{ color: 'var(--color-primary-500)' }} /> 
                        {language === 'kk' ? 'Барлық нәтижелер' : 'Все результаты'} 
                        <span style={{ background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', padding: '2px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 800 }}>
                            {attempts.length}
                        </span>
                    </h3>
                </div>

                {attempts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-gray-400)' }}>
                        <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p style={{ fontSize: '1.1rem', fontWeight: 500 }}>
                            {language === 'kk' ? 'Бұл тестті әлі ешкім тапсырған жоқ.' : 'Ещё никто не прошёл этот тест.'}
                        </p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
                            <thead>
                                <tr style={{ background: 'white' }}>
                                    {[
                                        '#', 
                                        language === 'kk' ? 'Оқушы аты' : 'Имя ученика', 
                                        language === 'kk' ? 'Ұпай' : 'Балл', 
                                        language === 'kk' ? 'Нәтиже (Пайыз)' : 'Процент', 
                                        language === 'kk' ? 'Баға' : 'Оценка', 
                                        language === 'kk' ? 'Уақыты' : 'Дата'
                                    ].map((h, i) => (
                                        <th key={i} style={{ padding: '16px 24px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-500)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--color-gray-200)' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {attempts.map((a, i) => {
                                    const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0
                                    const grade = pct >= 85 ? { label: '5', color: '#10b981', bg: '#dcfce7' } : 
                                                  pct >= 70 ? { label: '4', color: '#3b82f6', bg: '#e0f2fe' } : 
                                                  pct >= 50 ? { label: '3', color: '#f59e0b', bg: '#fef3c7' } : 
                                                  { label: '2', color: '#ef4444', bg: '#fee2e2' }
                                    
                                    return (
                                        <tr key={a.id} style={{ borderBottom: '1px solid var(--color-gray-100)', transition: 'background 0.2s', background: 'white' }}
                                            onMouseEnter={e => e.currentTarget.style.background = 'var(--color-gray-50)'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                                            <td style={{ padding: '16px 24px', color: 'var(--color-gray-400)', fontSize: '0.85rem', fontWeight: 600 }}>{i + 1}</td>
                                            <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-gray-900)', fontSize: '0.95rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 800 }}>
                                                        {a.student_name.charAt(0).toUpperCase()}
                                                    </div>
                                                    {a.student_name}
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px', color: 'var(--color-gray-600)', fontWeight: 600 }}>
                                                {a.score} <span style={{ color: 'var(--color-gray-400)', fontSize: '0.8rem' }}>/ {a.max_score}</span>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div style={{ width: 80, height: 8, background: 'var(--color-gray-100)', borderRadius: 999, overflow: 'hidden' }}>
                                                        <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: grade.color }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.9rem', fontWeight: 800, color: grade.color }}>{pct}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '16px 24px' }}>
                                                <span style={{ fontWeight: 800, fontSize: '1rem', color: grade.color, background: grade.bg, padding: '6px 12px', borderRadius: '8px' }}>
                                                    {grade.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '16px 24px', color: 'var(--color-gray-500)', fontSize: '0.85rem', fontWeight: 500 }}>
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
