import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Award, ArrowRight } from 'lucide-react';

export default function StudentLogin() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/student/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Ошибка входа');
                setLoading(false);
                return;
            }

            localStorage.setItem('studentToken', data.token);
            navigate('/student/dashboard');
        } catch (err) {
            setError('Ошибка сети');
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--color-slate-900)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', fontFamily: '"Inter", sans-serif'
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(10px)',
                borderRadius: '24px',
                padding: '40px', width: '100%', maxWidth: '400px',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 15px', color: 'white'
                    }}>
                        <Lock size={32} />
                    </div>
                    <h2 style={{ color: 'white', fontSize: '24px', fontWeight: 700, margin: '0 0 5px 0' }}>Қайта оралуыңмен!</h2>
                    <p style={{ color: 'var(--color-gray-400)', margin: 0 }}>Порталға кіру үшін мәліметтерді енгіз</p>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.2)', color: '#f87171', padding: '10px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', textAlign: 'center' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div>
                        <label style={{ display: 'block', color: 'var(--color-gray-300)', fontSize: '14px', marginBottom: '5px' }}>Лақап атың (Username)</label>
                        <input
                            type="text"
                            required
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            placeholder="ahmet123"
                            style={{
                                width: '100%', padding: '12px 15px', borderRadius: '12px',
                                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', outline: 'none'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', color: 'var(--color-gray-300)', fontSize: '14px', marginBottom: '5px' }}>Жасырын сөз (Пароль)</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                                width: '100%', padding: '12px 15px', borderRadius: '12px',
                                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white', outline: 'none'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px', borderRadius: '12px',
                            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                            color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            marginTop: '10px', fontSize: '16px', transition: 'all 0.2s', opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Күте тұрыңыз...' : 'Кіру'} <ArrowRight size={18} />
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--color-gray-400)', fontSize: '14px' }}>
                    Аккаунтың жоқ па?{' '}
                    <Link to="/student/register" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 600 }}>Тіркелу</Link>
                </div>
            </div>
        </div>
    );
}
