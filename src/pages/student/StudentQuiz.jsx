import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ArrowRight, ArrowLeft, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { API_BASE } from '../../api';

export default function StudentQuiz() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);         // total quiz timer
    const [qTimeLeft, setQTimeLeft] = useState(null);       // per-question timer
    const [isSubmitting, setIsSubmitting] = useState(false);
    const totalTimerId = useRef(null);
    const qTimerId = useRef(null);
    const startTime = useRef(Date.now());

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) { navigate('/student/login'); return; }

        fetch(`${API_BASE}/student-portal/quizzes/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) { setError(data.error); }
                else {
                    setQuiz(data);
                    setAnswers(new Array(data.questions.length).fill(null));
                    if (data.time_limit) setTimeLeft(data.time_limit * 60);
                    // per-question timer
                    if (data.question_time) setQTimeLeft(data.question_time);
                }
                setLoading(false);
            })
            .catch(() => { setError('Ошибка загрузки теста'); setLoading(false); });
    }, [id, navigate]);

    // ── Total quiz timer ────────────────────────────────────
    useEffect(() => {
        if (timeLeft !== null && timeLeft > 0 && !isSubmitting) {
            totalTimerId.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { clearInterval(totalTimerId.current); submitQuiz(); return 0; }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(totalTimerId.current);
        }
    }, [timeLeft !== null, isSubmitting]); // eslint-disable-line

    // ── Per-question timer ──────────────────────────────────
    useEffect(() => {
        if (!quiz?.question_time) return;
        clearInterval(qTimerId.current);
        setQTimeLeft(quiz.question_time);
        qTimerId.current = setInterval(() => {
            setQTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(qTimerId.current);
                    // Auto-advance to next question when time runs out
                    setCurrentQuestionIndex(ci => {
                        if (ci < quiz.questions.length - 1) return ci + 1;
                        submitQuiz();
                        return ci;
                    });
                    return quiz.question_time;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(qTimerId.current);
    }, [currentQuestionIndex, quiz?.question_time]); // eslint-disable-line

    const handleSelectOption = (optionLabel) => {
        const newAnswers = [...answers];
        newAnswers[currentQuestionIndex] = optionLabel;
        setAnswers(newAnswers);
    };

    const handleNext = () => {
        if (currentQuestionIndex < quiz.questions.length - 1) setCurrentQuestionIndex(p => p + 1);
    };
    const handlePrev = () => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(p => p - 1);
    };

    const submitQuiz = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        clearInterval(totalTimerId.current);
        clearInterval(qTimerId.current);
        const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
        
        try {
            const token = localStorage.getItem('studentToken');
            // Re-read answers from state via closure won't work in async; use a ref trick
            const currentAnswers = answers;
            const res = await fetch(`${API_BASE}/student-portal/quizzes/${id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ answers: currentAnswers, time_spent: timeSpent })
            });
            const result = await res.json();
            if (res.ok) {
                navigate('/student/results', { state: { result, quiz: { ...quiz, answers: currentAnswers } } });
            } else {
                setError(result.error || 'Ошибка отправки результатов');
                setIsSubmitting(false);
            }
        } catch { setError('Ошибка сети'); setIsSubmitting(false); }
    };

    if (loading) return <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Жүктелуде...</div>;
    if (error) return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <AlertTriangle size={48} color="#ef4444" />
            <h2>Қате кетті</h2>
            <p style={{ color: '#9ca3af' }}>{error}</p>
            <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary">Басты бетке қайту</button>
        </div>
    );
    if (!quiz) return null;

    const currentQ = quiz.questions[currentQuestionIndex];
    const totalQ = quiz.questions.length;
    const progress = ((currentQuestionIndex + 1) / totalQ) * 100;
    const isLastQuestion = currentQuestionIndex === totalQ - 1;
    const allAnswered = answers.every(a => a !== null);
    const formatTime = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;

    // Per-question timer urgency
    const qUrgent = quiz.question_time && qTimeLeft !== null && qTimeLeft <= Math.max(3, quiz.question_time * 0.2);

    return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', fontFamily: '"Inter", sans-serif' }}>
            <header style={{
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, zIndex: 10, gap: '12px'
            }}>
                <button onClick={() => navigate('/student/dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <ArrowLeft size={18} /> Шығу
                </button>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', flex: 1, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quiz.title}</div>
                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                    {/* Per-question timer */}
                    {quiz.question_time && qTimeLeft !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, background: qUrgent ? 'rgba(239,68,68,0.2)' : 'rgba(99,102,241,0.2)', border: `1px solid ${qUrgent ? '#ef4444' : '#6366f1'}`, animation: qUrgent ? 'bellPulse 0.5s ease infinite' : 'none' }}>
                            <Zap size={14} color={qUrgent ? '#ef4444' : '#818cf8'} />
                            <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: qUrgent ? '#ef4444' : '#a5b4fc', minWidth: 28 }}>
                                {qTimeLeft}s
                            </span>
                        </div>
                    )}
                    {/* Total timer */}
                    {timeLeft !== null && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: timeLeft < 60 ? '#ef4444' : '#9ca3af' }}>
                            <Clock size={16} />
                            <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeLeft)}</span>
                        </div>
                    )}
                </div>
            </header>

            <main style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 70px)' }}>
                {/* Progress */}
                <div style={{ marginBottom: '24px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#9ca3af', marginBottom: 8 }}>
                        <span>Сұрақ {currentQuestionIndex + 1} / {totalQ}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg,#6366f1,#8b5cf6)', borderRadius: 3, transition: 'width 0.3s ease' }} />
                    </div>
                    {/* Question dots */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                        {quiz.questions.map((_, i) => (
                            <button key={i} onClick={() => setCurrentQuestionIndex(i)} style={{
                                width: 24, height: 24, borderRadius: '50%', border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700,
                                background: i === currentQuestionIndex ? '#6366f1' : answers[i] !== null ? '#10b981' : 'rgba(255,255,255,0.15)',
                                color: 'white', transition: 'all 0.15s'
                            }}>{i + 1}</button>
                        ))}
                    </div>
                </div>

                {/* Question card */}
                <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: 28, flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, lineHeight: 1.5, marginTop: 0, marginBottom: 24 }}>
                        {currentQ.question}
                    </h2>

                    {/* Options — support multiple types */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {(currentQ.type === 'true_false' ? [
                            { label: 'T', display: 'True / Иä' },
                            { label: 'F', display: 'False / Жоқ' }
                        ] : (currentQ.options || []).map((opt, idx) => {
                            const match = opt.match(/^([A-Da-d])[\)\.]?\s*(.*)$/);
                            return { label: match ? match[1].toUpperCase() : ['A','B','C','D'][idx], display: match ? match[2] : opt };
                        })).map(({ label, display }) => {
                            const isSelected = answers[currentQuestionIndex] === label;
                            return (
                                <button key={label} onClick={() => handleSelectOption(label)} style={{
                                    display: 'flex', alignItems: 'center', gap: 14,
                                    width: '100%', padding: '14px 18px', borderRadius: 14,
                                    background: isSelected ? 'rgba(99,102,241,0.25)' : 'rgba(0,0,0,0.25)',
                                    border: `2px solid ${isSelected ? '#6366f1' : 'transparent'}`,
                                    color: 'white', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', fontSize: '15px'
                                }}>
                                    <div style={{
                                        width: 32, height: 32, borderRadius: 8,
                                        background: isSelected ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700, flexShrink: 0
                                    }}>{label}</div>
                                    <div style={{ flex: 1, lineHeight: 1.4 }}>{display}</div>
                                    {isSelected && <CheckCircle size={18} color="#a5b4fc" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, paddingBottom: 20 }}>
                    <button onClick={handlePrev} disabled={currentQuestionIndex === 0} style={{
                        padding: '11px 22px', borderRadius: 11, background: 'rgba(255,255,255,0.1)',
                        border: 'none', color: currentQuestionIndex === 0 ? 'rgba(255,255,255,0.25)' : 'white',
                        cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600
                    }}>
                        <ArrowLeft size={17} /> Алдыңғы
                    </button>

                    {isLastQuestion ? (
                        <button onClick={submitQuiz} disabled={isSubmitting} style={{
                            padding: '11px 28px', borderRadius: 11, background: allAnswered ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(255,255,255,0.15)',
                            border: 'none', color: 'white', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 7, fontWeight: 700,
                            boxShadow: allAnswered ? '0 8px 20px rgba(16,185,129,0.4)' : 'none'
                        }}>
                            {isSubmitting ? 'Жіберілуде...' : 'Жіберу'} <CheckCircle size={17} />
                        </button>
                    ) : (
                        <button onClick={handleNext} style={{
                            padding: '11px 22px', borderRadius: 11, background: 'white',
                            border: 'none', color: 'black', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontWeight: 600
                        }}>
                            Келесі <ArrowRight size={17} />
                        </button>
                    )}
                </div>
            </main>
            <style>{`@keyframes bellPulse { 0%,100%{opacity:1} 50%{opacity:0.6} }`}</style>
        </div>
    );
}
