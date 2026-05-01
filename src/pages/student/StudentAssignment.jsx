import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, CheckCircle, AlertTriangle, Send } from 'lucide-react';

export default function StudentAssignment() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [assignment, setAssignment] = useState(null);
    const [answerText, setAnswerText] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('studentToken');
        if (!token) {
            navigate('/student/login');
            return;
        }

        fetch(`/api/student-portal/assignments/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setAssignment(data);
                    setAnswerText(data.answer_text || '');
                    if (data.submission_id) {
                        setResult({
                            score: data.score,
                            max_score: data.submitted_max_score || data.max_score,
                            grade_label: data.grade_label,
                            feedback: data.feedback,
                            mistakes: data.mistakes || []
                        });
                    }
                }
                setLoading(false);
            })
            .catch(() => {
                setError('Тапсырманы жүктеу мүмкін болмады');
                setLoading(false);
            });
    }, [id, navigate]);

    const handleSubmit = async () => {
        if (answerText.trim().length < 10) {
            setError('Жауап кемінде 10 таңбадан тұруы керек');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            const token = localStorage.getItem('studentToken');
            const res = await fetch(`/api/student-portal/assignments/${id}/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ answer_text: answerText, language: 'kk' })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Тексеру кезінде қате кетті');
            }
            setResult(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Жүктелуде...
            </div>
        );
    }

    if (error && !assignment) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '20px' }} />
                <h2>Қате кетті</h2>
                <p style={{ color: 'var(--color-gray-400)' }}>{error}</p>
                <button onClick={() => navigate('/student/dashboard')} className="btn btn-primary">Басты бетке қайту</button>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-slate-900)', color: 'white', fontFamily: '"Inter", sans-serif' }}>
            <header style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
                padding: '15px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <button onClick={() => navigate('/student/dashboard')} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowLeft size={18} /> Артқа
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700 }}>
                    <ClipboardCheck size={18} color="#8b5cf6" /> Үй жұмысы
                </div>
            </header>

            <main style={{ padding: '24px 20px', maxWidth: '900px', margin: '0 auto' }}>
                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '24px',
                    padding: '28px',
                    marginBottom: '20px'
                }}>
                    <div style={{ color: 'var(--color-gray-400)', fontSize: '14px', marginBottom: '8px' }}>
                        {assignment.subject || 'Пән көрсетілмеген'} · {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('kk-KZ') : 'Дедлайн жоқ'}
                    </div>
                    <h1 style={{ margin: '0 0 16px', fontSize: '28px' }}>{assignment.title}</h1>
                    <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-gray-300)', lineHeight: 1.7 }}>
                        {assignment.instructions || 'Мұғалім қосымша нұсқаулық қалдырмады.'}
                    </div>
                </div>

                <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '24px',
                    padding: '28px'
                }}>
                    <label style={{ display: 'block', fontWeight: 700, marginBottom: '12px' }}>Жауабыңды жаз</label>
                    <textarea
                        value={answerText}
                        onChange={e => setAnswerText(e.target.value)}
                        placeholder="Мұнда шешіміңді немесе толық жауабыңды жаз..."
                        style={{
                            width: '100%',
                            minHeight: '220px',
                            resize: 'vertical',
                            borderRadius: '18px',
                            border: '1px solid rgba(255,255,255,0.15)',
                            background: 'rgba(0,0,0,0.25)',
                            color: 'white',
                            padding: '16px',
                            fontSize: '16px',
                            lineHeight: 1.6,
                            outline: 'none',
                            boxSizing: 'border-box'
                        }}
                    />

                    {error && (
                        <div style={{ marginTop: '12px', color: '#fca5a5', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            style={{
                                background: submitting ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #10b981, #059669)',
                                border: 'none',
                                color: 'white',
                                padding: '12px 20px',
                                borderRadius: '14px',
                                fontWeight: 800,
                                cursor: submitting ? 'wait' : 'pointer',
                                display: 'flex',
                                gap: '8px',
                                alignItems: 'center',
                                boxShadow: submitting ? 'none' : '0 10px 25px -5px rgba(16,185,129,0.45)'
                            }}
                        >
                            {submitting ? 'AI тексеріп жатыр...' : 'Үй жұмысын тексеру'} <Send size={18} />
                        </button>
                    </div>
                </div>

                {result && (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.16), rgba(59,130,246,0.10))',
                        border: '1px solid rgba(16,185,129,0.28)',
                        borderRadius: '24px',
                        padding: '28px',
                        marginTop: '20px'
                    }}>
                        <h2 style={{ margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <CheckCircle color="#34d399" /> Нәтиже
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '18px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '16px', padding: '14px' }}>
                                <div style={{ color: 'var(--color-gray-400)', fontSize: '13px' }}>Балл</div>
                                <div style={{ fontSize: '24px', fontWeight: 900 }}>{result.score}/{result.max_score}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.22)', borderRadius: '16px', padding: '14px' }}>
                                <div style={{ color: 'var(--color-gray-400)', fontSize: '13px' }}>Баға</div>
                                <div style={{ fontSize: '24px', fontWeight: 900 }}>{result.grade_label}</div>
                            </div>
                        </div>
                        <p style={{ color: 'var(--color-gray-200)', lineHeight: 1.7, marginTop: 0 }}>{result.feedback}</p>
                        {result.mistakes?.length > 0 && (
                            <ul style={{ color: 'var(--color-gray-300)', lineHeight: 1.7, marginBottom: 0 }}>
                                {result.mistakes.map((m, idx) => <li key={idx}>{m}</li>)}
                            </ul>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
