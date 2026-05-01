import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Star, ArrowRight, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function StudentResults() {
    const location = useLocation();
    const navigate = useNavigate();
    const { result, quiz } = location.state || {};

    if (!result || !quiz) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <h2>Нәтижелер табылмады</h2>
                <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary" style={{ marginTop: '20px' }}>Басты бетке қайту</button>
            </div>
        );
    }

    const { score, max_score, xpGained, newLevel, correctAnswers } = result;
    const percent = max_score > 0 ? Math.round((score / max_score) * 100) : 0;
    
    let message = "Тамаша!";
    let color = "#10b981"; // green
    if (percent < 50) {
        message = "Көбірек дайындалу керек";
        color = "#ef4444"; // red
    } else if (percent < 80) {
        message = "Жақсы нәтиже";
        color = "#f59e0b"; // yellow
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', fontFamily: '"Inter", sans-serif', padding: '40px 20px' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button onClick={() => navigate('/student/dashboard')} style={{ background: 'transparent', border: 'none', color: 'var(--color-gray-400)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '30px' }}>
                    <ArrowLeft size={18} /> Басты бетке
                </button>

                <div style={{
                    background: 'rgba(255,255,255,0.05)', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)',
                    padding: '40px', textAlign: 'center', marginBottom: '40px', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
                        background: `linear-gradient(90deg, transparent, ${color}, transparent)`
                    }}></div>
                    
                    <h1 style={{ fontSize: '32px', fontWeight: 800, margin: '0 0 10px 0', color: color }}>{message}</h1>
                    <p style={{ color: 'var(--color-gray-400)', fontSize: '18px', margin: '0 0 30px 0' }}>{quiz.title}</p>

                    <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', flexWrap: 'wrap' }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.3)', borderRadius: '24px', padding: '30px',
                            minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
                        }}>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Нәтиже</div>
                            <div style={{ fontSize: '48px', fontWeight: 800, color: 'white' }}>{score}<span style={{ color: 'var(--color-gray-500)', fontSize: '24px' }}>/{max_score}</span></div>
                            <div style={{ fontSize: '18px', color: color, fontWeight: 600 }}>{percent}%</div>
                        </div>

                        <div style={{
                            background: 'rgba(0,0,0,0.3)', borderRadius: '24px', padding: '30px',
                            minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px'
                        }}>
                            <div style={{ color: 'var(--color-gray-400)', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Алынған XP</div>
                            <div style={{ width: '60px', height: '60px', borderRadius: '16px', background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                <Star size={32} />
                            </div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: '#fbbf24' }}>+{xpGained}</div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gap: '15px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: 600, margin: '0 0 10px 0' }}>Жауаптарың:</h3>
                    
                    {quiz.questions.map((q, idx) => {
                        const isCorrect = quiz.answers[idx] === correctAnswers[idx];
                        
                        return (
                            <div key={idx} style={{
                                background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '20px',
                                border: `1px solid ${isCorrect ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                display: 'flex', flexDirection: 'column', gap: '15px'
                            }}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '50%', background: isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: isCorrect ? '#34d399' : '#f87171', flexShrink: 0, marginTop: '2px'
                                    }}>
                                        {isCorrect ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '16px', lineHeight: '1.5', marginBottom: '10px' }}>
                                            {idx + 1}. {q.question}
                                        </div>
                                        
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                                            {!isCorrect && quiz.answers[idx] && (
                                                <div style={{ color: '#f87171', display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontWeight: 600 }}>Сенің жауабың:</span> {quiz.answers[idx]}
                                                </div>
                                            )}
                                            {!isCorrect && !quiz.answers[idx] && (
                                                <div style={{ color: '#f87171', display: 'flex', gap: '8px' }}>
                                                    <span style={{ fontWeight: 600 }}>Жауап берілмеген</span>
                                                </div>
                                            )}
                                            <div style={{ color: '#34d399', display: 'flex', gap: '8px' }}>
                                                <span style={{ fontWeight: 600 }}>Дұрыс жауап:</span> {correctAnswers[idx]}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
