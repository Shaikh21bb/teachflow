import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../../api';

export default function StudentQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Timer interval ref
    const [timerId, setTimerId] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) {
            navigate('/student/login');
            return;
        }

        fetch(`${API_BASE}/student-portal/quizzes/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setQuiz(data);
                    setAnswers(new Array(data.questions.length).fill(null));
                    if (data.time_limit) {
                        setTimeLeft(data.time_limit * 60);
                    }
                }
                setLoading(false);
            })
            .catch(err => {
                setError('Ошибка загрузки теста');
                setLoading(false);
            });
            
        return () => {
            if (timerId) clearInterval(timerId);
        };
    }, [id, navigate]);

    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && !isSubmitting) {
            const tid = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(tid);
                        handleSubmit();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            setTimerId(tid);
            return () => clearInterval(tid);
        }
    }, [timeLeft, isSubmitting]);

    const handleSelectOption = (optionLabel) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = optionLabel;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        if (timerId) clearInterval(timerId);

        const timeSpent = quiz.time_limit ? (quiz.time_limit * 60) - timeLeft : 0;
        
        try {
            const token = localStorage.getItem('studentToken');
            const res = await fetch(`${API_BASE}/student-portal/quizzes/${id}/submit`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ answers, time_spent: timeSpent })
            });
            
            const result = await res.json();
            if (res.ok) {
                // Pass results to next page via state
                navigate('/student/results', { state: { result, quiz: { ...quiz, answers } } });
            } else {
                setError(result.error || 'Ошибка отправки результатов');
                setIsSubmitting(false);
            }
        } catch (err) {
            setError('Ошибка сети');
            setIsSubmitting(false);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Жүктелуде...</div>;
    
    if (error) return (
        <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
            <h2 style={{ marginBottom: '10px' }}>Қате кетті</h2>
            <p style={{ color: 'var(--color-gray-400)' }}>{error}</p>
            <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary" style={{ marginTop: '20px' }}>Басты бетке қайту</button>
        </div>
    );

    if (!quiz) return null;

    const currentQ = quiz.questions[currentQuestionIndex];
    const totalQ = quiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQ) * 100;
    
    const isLastQuestion = currentQuestionIndex === totalQ - 1;
    const allAnswered = answers.every(a => a !== null);

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', fontFamily: '"Inter", sans-serif' }}>
            <header style={{
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10
            }}>
                <button onClick={() => navigate('/student/dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <ArrowLeft size={18} /> Шығу
                </button>
                <div style={{ fontWeight: 600 }}>{quiz.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: timeLeft !== null && timeLeft < 60 ? '#ef4444' : 'var(--color-gray-300)' }}>
                    <Clock size={18} />
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {timeLeft !== null ? formatTime(timeLeft) : 'Шектеусіз'}
                    </span>
                </div>
            </header>

            <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 70px)' }}>
                {/* Progress bar */}
                <div style={{ marginBottom: '30px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'var(--color-gray-400)', marginBottom: '8px' }}>
                        <span>Сұрақ {currentQuestionIndex + 1} / {totalQ}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px', transition: 'width 0.3s ease' }}></div>
                    </div>
                </div>

                {/* Question */}
                <div style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '24px', padding: '30px', flex: 1, display: 'flex', flexDirection: 'column'
                }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, lineHeight: '1.5', marginTop: 0, marginBottom: '30px' }}>
                        {currentQ.question}
                    </h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        {currentQ.options.map((opt, idx) => {
                            // Basic parsing: split by ') ' or '. ' to get the choice label if needed, or just match whole string
                            // If options from DB are "A) Text", "B) Text"
                            const match = opt.match(/^([A-Da-d])[\)\.]?\s*(.*)$/);
                            const label = match ? match[1].toUpperCase() : opt.charAt(0).toUpperCase(); // simplified
                            const content = match ? match[2] : opt;
                            
                            // Let's use the full option string or the label. 
                            // Since our backend logic checks exactly with q.correct, we should store exactly what is needed.
                            // If q.correct is "A", we store "A". We'll assume label is the first letter.
                            const isSelected = answers[currentQuestionIndex] === label;

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectOption(label)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '15px',
                                        width: '100%', padding: '15px 20px', borderRadius: '16px',
                                        background: isSelected ? 'rgba(139, 92, 246, 0.2)' : 'rgba(0,0,0,0.2)',
                                        border: `2px solid ${isSelected ? '#8b5cf6' : 'transparent'}`,
                                        color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s',
                                        fontSize: '16px'
                                    }}
                                >
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '8px',
                                        background: isSelected ? '#8b5cf6' : 'rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 600, flexShrink: 0
                                    }}>
                                        {label}
                                    </div>
                                    <div style={{ flex: 1, lineHeight: '1.4' }}>{content}</div>
                                    {isSelected && <CheckCircle size={20} color="#8b5cf6" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer Controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '30px', paddingBottom: '20px' }}>
                    <button
                        onClick={handlePrev}
                        disabled={currentQuestionIndex === 0}
                        style={{
                            padding: '12px 24px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)',
                            border: 'none', color: currentQuestionIndex === 0 ? 'rgba(255,255,255,0.3)' : 'white', cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, transition: 'all 0.2s'
                        }}
                    >
                        <ArrowLeft size={18} /> Алдыңғы
                    </button>

                    {isLastQuestion ? (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !allAnswered}
                            style={{
                                padding: '12px 30px', borderRadius: '12px', background: allAnswered ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(255,255,255,0.1)',
                                border: 'none', color: allAnswered ? 'white' : 'rgba(255,255,255,0.3)', cursor: allAnswered ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, transition: 'all 0.2s',
                                boxShadow: allAnswered ? '0 10px 25px -5px rgba(16, 185, 129, 0.5)' : 'none'
                            }}
                        >
                            {isSubmitting ? 'Жіберілуде...' : 'Жіберу'} <CheckCircle size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            style={{
                                padding: '12px 24px', borderRadius: '12px', background: 'white',
                                border: 'none', color: 'black', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, transition: 'all 0.2s'
                            }}
                        >
                            Келесі <ArrowRight size={18} />
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
}
