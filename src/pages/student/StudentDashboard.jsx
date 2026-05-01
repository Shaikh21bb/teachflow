import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogOut, Trophy, Star, Target, CheckCircle, Clock, ClipboardCheck } from 'lucide-react';

export default function StudentDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) {
            navigate('/student/login');
            return;
        }

        fetch('/api/student-portal/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                    localStorage.removeItem('studentToken');
                    navigate('/student/login');
                } else {
                    setData(data);
                }
                setLoading(false);
            })
            .catch(err => {
                setError('Ошибка загрузки данных');
                setLoading(false);
            });
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem('studentToken');
        navigate('/student/login');
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                Жүктелуде...
            </div>
        );
    }

    if (error || !data) return null;

    const { student, upcomingQuizzes, homeworkAssignments = [], recentAttempts } = data;

    // Calc XP progress for next level
    const xpForThisLevel = (student.level - 1) * 100;
    const xpForNextLevel = student.level * 100;
    const currentXpInLevel = student.xp - xpForThisLevel;
    const progressPercent = Math.min(100, Math.max(0, (currentXpInLevel / 100) * 100));

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-slate-900)',
            color: 'white',
            fontFamily: '"Inter", sans-serif'
        }}>
            {/* Header */}
            <header style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '15px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        background: student.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '18px'
                    }}>
                        {student.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, fontSize: '16px' }}>{student.name}</div>
                        <div style={{ color: 'var(--color-gray-400)', fontSize: '12px' }}>@{student.username}</div>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        background: 'transparent', border: 'none', color: 'var(--color-gray-400)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '14px'
                    }}
                >
                    <LogOut size={16} /> <span className="hide-on-mobile">Шығу</span>
                </button>
            </header>

            <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Stats Grid */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1))',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px'
                    }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Star size={24} color="white" />
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: '14px', marginBottom: '5px' }}>Қазіргі деңгей</div>
                            <div style={{ fontSize: '24px', fontWeight: 700 }}>Level {student.level}</div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${progressPercent}%`, height: '100%', background: '#6366f1', borderRadius: '3px' }}></div>
                            </div>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: '12px', marginTop: '5px', textAlign: 'right' }}>
                                Осы деңгейде: {currentXpInLevel}/100 XP
                            </div>
                        </div>
                    </div>

                    <div style={{
                        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(244, 63, 94, 0.1))',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        borderRadius: '20px', padding: '20px', display: 'flex', alignItems: 'center', gap: '15px'
                    }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#ec4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Trophy size={24} color="white" />
                        </div>
                        <div>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: '14px', marginBottom: '5px' }}>Сыныптағы рейтинг</div>
                            <div style={{ fontSize: '24px', fontWeight: 700 }}>#{student.rank} орын</div>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: '12px', marginTop: '5px' }}>
                                Барлығы: {student.xp} XP
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                    {/* Homework Assignments */}
                    <div style={{
                        background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '25px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
                            <ClipboardCheck size={20} color="#8b5cf6" /> Үй жұмыстары
                        </h3>

                        {homeworkAssignments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-gray-500)' }}>
                                Үй жұмысы жоқ
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {homeworkAssignments.map(item => {
                                    const submitted = Boolean(item.submission_id);
                                    return (
                                        <div key={item.id} style={{
                                            background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '15px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{item.title}</div>
                                                <div style={{ color: 'var(--color-gray-400)', fontSize: '13px', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                                                    <span>Пән: {item.subject || 'Көрсетілмеген'}</span>
                                                    <span><Clock size={14} style={{ verticalAlign: '-2px' }} /> {item.due_date ? new Date(item.due_date).toLocaleDateString('kk-KZ') : 'Дедлайн жоқ'}</span>
                                                    {submitted && <span style={{ color: '#34d399' }}>Баға: {item.grade_label} · {item.score}/{item.submitted_max_score || item.max_score}</span>}
                                                </div>
                                            </div>
                                            <Link to={`/student/assignment/${item.id}`} style={{
                                                background: submitted ? 'rgba(255,255,255,0.12)' : 'white',
                                                color: submitted ? 'white' : 'black',
                                                padding: '8px 16px',
                                                borderRadius: '10px',
                                                textDecoration: 'none',
                                                fontWeight: 600,
                                                fontSize: '14px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {submitted ? 'Нәтиже' : 'Тапсыру'}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Upcoming Quizzes */}
                    <div style={{
                        background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '25px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
                            <Target size={20} color="#f59e0b" /> Берілген тапсырмалар
                        </h3>
                        
                        {upcomingQuizzes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-gray-500)' }}>
                                Жаңа тапсырмалар жоқ
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {upcomingQuizzes.map(quiz => (
                                    <div key={quiz.assignment_id} style={{
                                        background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '15px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{quiz.title}</div>
                                            <div style={{ color: 'var(--color-gray-400)', fontSize: '13px', display: 'flex', gap: '15px' }}>
                                                <span>Пән: {quiz.subject || 'Көрсетілмеген'}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {quiz.time_limit ? `${quiz.time_limit} мин` : 'Шектеусіз'}</span>
                                            </div>
                                        </div>
                                        <Link to={`/student/quiz/${quiz.quiz_id}`} style={{
                                            background: 'white', color: 'black', padding: '8px 16px', borderRadius: '10px',
                                            textDecoration: 'none', fontWeight: 600, fontSize: '14px', transition: 'transform 0.2s'
                                        }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                            Бастау
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Results */}
                    <div style={{
                        background: 'rgba(255,255,255,0.05)', borderRadius: '24px', padding: '25px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', margin: '0 0 20px 0' }}>
                            <CheckCircle size={20} color="#10b981" /> Соңғы нәтижелер
                        </h3>
                        
                        {recentAttempts.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--color-gray-500)' }}>
                                Әлі ешқандай тест тапсырмадың
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                {recentAttempts.map(attempt => {
                                    const percent = attempt.max_score ? Math.round((attempt.score / attempt.max_score) * 100) : 0;
                                    const isGood = percent >= 70;
                                    
                                    return (
                                        <div key={attempt.id} style={{
                                            background: 'rgba(0,0,0,0.2)', borderRadius: '16px', padding: '15px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '4px' }}>{attempt.title}</div>
                                                <div style={{ color: 'var(--color-gray-400)', fontSize: '13px' }}>
                                                    {new Date(attempt.taken_at).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div style={{
                                                background: isGood ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                color: isGood ? '#34d399' : '#f87171',
                                                padding: '6px 12px', borderRadius: '8px', fontWeight: 700, fontSize: '15px'
                                            }}>
                                                {attempt.score}/{attempt.max_score} ({percent}%)
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
