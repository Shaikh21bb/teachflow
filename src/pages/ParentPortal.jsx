/**
 * ParentPortal — public page at /parent/:token
 * No login required. Shows student progress to parents.
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { API_BASE } from '../api'
import {
    Star, TrendingUp, BookOpen, Clock, CheckCircle,
    AlertCircle, Award, BarChart2, User, School, Loader2
} from 'lucide-react'

function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = Date.now() - new Date(dateStr).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'Сегодня'
    if (days === 1) return 'Вчера'
    if (days < 7) return `${days} дн. назад`
    return new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

function StatCard({ icon, value, label, color, bg }) {
    return (
        <div style={{
            background: 'white', borderRadius: '16px', padding: '20px',
            border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            display: 'flex', alignItems: 'center', gap: '14px', flex: 1
        }}>
            <div style={{ width: 48, height: 48, borderRadius: '14px', background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '3px', fontWeight: 500 }}>{label}</div>
            </div>
        </div>
    )
}

// Mini bar chart — pure SVG, no library
function WeekChart({ data = [] }) {
    const max = Math.max(...data, 1)
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    return (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '80px', padding: '4px 0' }}>
            {data.map((val, i) => {
                const h = Math.max(4, (val / max) * 72)
                return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        {val > 0 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#6366f1' }}>{val}%</span>}
                        <div style={{
                            width: '100%', height: `${h}px`,
                            background: val >= 80 ? '#10b981' : val >= 60 ? '#6366f1' : val > 0 ? '#f59e0b' : '#e2e8f0',
                            borderRadius: '4px 4px 0 0', transition: 'height 0.4s ease'
                        }} />
                        <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 500 }}>{days[i]}</span>
                    </div>
                )
            })}
        </div>
    )
}

export default function ParentPortal() {
    const { token } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        fetch(`${API_BASE}/parent/${token}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error)
                else setData(d)
            })
            .catch(() => setError('Ошибка загрузки. Проверьте ссылку.'))
            .finally(() => setLoading(false))
    }, [token])

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
            <div style={{ textAlign: 'center' }}>
                <Loader2 size={40} color="#6366f1" style={{ animation: 'spin 1s linear infinite', marginBottom: 16 }} />
                <p style={{ color: '#64748b' }}>Загрузка данных...</p>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )

    if (error) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
            <div style={{ textAlign: 'center', maxWidth: 400 }}>
                <AlertCircle size={56} color="#ef4444" style={{ marginBottom: 16 }} />
                <h2 style={{ margin: '0 0 8px', color: '#0f172a' }}>Ссылка недействительна</h2>
                <p style={{ color: '#64748b', lineHeight: 1.6 }}>{error}</p>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: 16 }}>
                    Попросите учителя отправить актуальную ссылку.
                </p>
            </div>
        </div>
    )

    const { student, stats, weeklyPerformance, quizAttempts, submissions } = data
    const gradeColor = student.avg_grade >= 4.5 ? '#10b981' : student.avg_grade >= 4 ? '#3b82f6' : student.avg_grade >= 3 ? '#f59e0b' : '#ef4444'

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'Inter', sans-serif" }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            {/* ── Header ── */}
            <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '28px 20px 32px' }}>
                <div style={{ maxWidth: 720, margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', opacity: 0.85 }}>
                        <img src="/logo.jpg" alt="Urpaq.ai" style={{ width: 28, height: 28, borderRadius: 7, objectFit: 'cover' }} />
                        <span style={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>Urpaq.ai — Портал для родителей</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        {/* Student avatar */}
                        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '1.5rem', flexShrink: 0 }}>
                            {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 style={{ margin: '0 0 5px', color: 'white', fontSize: '1.5rem', fontWeight: 900 }}>{student.name}</h1>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                {student.class_name && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                                        <School size={13} /> {student.class_name}
                                    </span>
                                )}
                                {student.subject && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                                        <BookOpen size={13} /> {student.subject}
                                    </span>
                                )}
                                {student.teacher_name && (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' }}>
                                        <User size={13} /> Учитель: {student.teacher_name}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 16px 48px' }}>

                {/* ── Stats row ── */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    <StatCard
                        icon={<Star size={22} />}
                        value={student.avg_grade > 0 ? student.avg_grade.toFixed(1) : '—'}
                        label="Средний балл"
                        color={gradeColor} bg={gradeColor + '18'}
                    />
                    <StatCard
                        icon={<TrendingUp size={22} />}
                        value={`${stats.avgScore}%`}
                        label="Средний % за тесты"
                        color="#6366f1" bg="#ede9fe"
                    />
                    <StatCard
                        icon={<BookOpen size={22} />}
                        value={stats.totalAttempts}
                        label="Тестов пройдено"
                        color="#3b82f6" bg="#dbeafe"
                    />
                    <StatCard
                        icon={<Award size={22} />}
                        value={`${stats.bestScore}%`}
                        label="Лучший результат"
                        color="#f59e0b" bg="#fef3c7"
                    />
                </div>

                {/* ── XP / Level ── */}
                {student.xp > 0 && (
                    <div style={{ background: 'white', borderRadius: '16px', padding: '16px 20px', marginBottom: '20px', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Award size={22} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>Уровень {student.level}</span>
                                <span style={{ fontSize: '0.8rem', color: '#6366f1', fontWeight: 700 }}>{student.xp} XP</span>
                            </div>
                            <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (student.xp % 500) / 5)}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 4 }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
                                {500 - (student.xp % 500)} XP до следующего уровня
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Weekly chart ── */}
                <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                    <h3 style={{ margin: '0 0 16px', fontWeight: 800, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BarChart2 size={18} color="#6366f1" /> Результаты за неделю
                    </h3>
                    <WeekChart data={weeklyPerformance} />
                    <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.72rem', color: '#94a3b8' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#10b981', display: 'inline-block' }} /> ≥80%</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#6366f1', display: 'inline-block' }} /> 60–79%</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }} /> &lt;60%</span>
                    </div>
                </div>

                {/* ── Recent quiz attempts ── */}
                {quizAttempts.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', marginBottom: '20px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <h3 style={{ margin: '0 0 14px', fontWeight: 800, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CheckCircle size={18} color="#10b981" /> Последние тесты
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {quizAttempts.map((a, i) => {
                                const pct = a.max_score > 0 ? Math.round((a.score / a.max_score) * 100) : 0
                                const color = pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : '#f59e0b'
                                return (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {a.quiz_title}
                                            </p>
                                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                                {timeAgo(a.taken_at)}
                                                {a.time_spent > 0 && ` · ${Math.round(a.time_spent / 60)} мин`}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                            <div style={{ width: 64, height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3 }} />
                                            </div>
                                            <span style={{ fontWeight: 800, fontSize: '0.9rem', color, minWidth: 36, textAlign: 'right' }}>{pct}%</span>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* ── Assignment submissions ── */}
                {submissions.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                        <h3 style={{ margin: '0 0 14px', fontWeight: 800, fontSize: '1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <BookOpen size={18} color="#6366f1" /> Домашние задания
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {submissions.map((s, i) => {
                                const pct = s.max_score > 0 ? Math.round((s.score / s.max_score) * 100) : null
                                const color = !pct ? '#6366f1' : pct >= 80 ? '#10b981' : pct >= 60 ? '#3b82f6' : '#f59e0b'
                                return (
                                    <div key={i} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a' }}>{s.assignment_title}</p>
                                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{timeAgo(s.submitted_at)}</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                                                {pct !== null && <span style={{ fontWeight: 800, color, fontSize: '0.9rem' }}>{pct}%</span>}
                                                {s.grade_label && <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>Оценка: {s.grade_label}</span>}
                                            </div>
                                        </div>
                                        {s.feedback && (
                                            <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', lineHeight: 1.5 }}>
                                                💬 {s.feedback}
                                            </p>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Empty state */}
                {quizAttempts.length === 0 && submissions.length === 0 && (
                    <div style={{ background: 'white', borderRadius: '16px', padding: '40px 20px', textAlign: 'center', border: '1px solid #f1f5f9' }}>
                        <BookOpen size={44} color="#d1d5db" style={{ marginBottom: 12 }} />
                        <p style={{ fontWeight: 600, color: '#64748b', margin: '0 0 4px' }}>Пока нет результатов</p>
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', margin: 0 }}>Данные появятся после прохождения тестов и сдачи заданий</p>
                    </div>
                )}

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: 32, fontSize: '0.78rem', color: '#94a3b8' }}>
                    <img src="/logo.jpg" alt="Urpaq.ai" style={{ width: 20, height: 20, borderRadius: 5, verticalAlign: 'middle', marginRight: 6 }} />
                    Данные предоставлены платформой <strong style={{ color: '#6366f1' }}>Urpaq.ai</strong>
                </div>
            </div>
        </div>
    )
}
