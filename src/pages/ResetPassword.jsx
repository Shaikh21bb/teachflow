import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function ResetPassword() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!token) {
            setError(language === 'kk' ? 'Жарамсыз сілтеме (Токен жоқ)' : 'Недействительная ссылка (Отсутствует токен)');
        }
    }, [token, language]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        
        if (password !== confirmPassword) {
            setError(language === 'kk' ? 'Құпия сөздер сәйкес келмейді' : 'Пароли не совпадают');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });
            const data = await res.json();

            if (res.ok) {
                setMessage(data.message);
                setTimeout(() => navigate('/login'), 3000);
            } else {
                setError(data.error || (language === 'kk' ? 'Қате шықты' : 'Произошла ошибка'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#060912', padding: '24px' }}>
                <div style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', borderRadius: '20px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
                    <AlertCircle size={48} color="var(--color-error-500)" style={{ marginBottom: '16px' }} />
                    <h2 style={{ marginBottom: '8px' }}>{error}</h2>
                    <p style={{ color: 'var(--color-gray-500)', marginBottom: '24px' }}>
                        {language === 'kk' ? 'Сілтеме қате болуы мүмкін. Қайта сұрап көріңіз.' : 'Возможно, ссылка скопирована не полностью. Попробуйте запросить сброс заново.'}
                    </p>
                    <Link to="/forgot-password" className="btn btn-primary" style={{ display: 'inline-block' }}>
                        {language === 'kk' ? 'Жаңа сілтеме сұрау' : 'Запросить новую ссылку'}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#060912',
            padding: 'var(--spacing-6)'
        }}>
            <div style={{
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-2xl)',
                padding: 'var(--spacing-10)',
                width: '100%',
                maxWidth: '440px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6)'
            }}>
                <style>{`
                    .auth-dark-form .input { background: rgba(255,255,255,0.05) !important; border-color: rgba(255,255,255,0.12) !important; color: white !important; -webkit-text-fill-color: white !important; }
                    .auth-dark-form .input::placeholder { color: rgba(255,255,255,0.3) !important; }
                    .auth-dark-form .input:focus { border-color: #6366f1 !important; background: rgba(99,102,241,0.08) !important; }
                    .auth-dark-form .input:-webkit-autofill, .auth-dark-form .input:-webkit-autofill:focus { -webkit-box-shadow: 0 0 0 100px #10123a inset !important; -webkit-text-fill-color: white !important; }
                    .auth-dark-form .label { color: rgba(255,255,255,0.75) !important; }
                `}</style>
                <div className="auth-dark-form">
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
                    <h1 style={{
                        fontSize: 'var(--font-size-2xl)',
                        fontWeight: 800,
                        color: 'var(--color-gray-900)',
                        marginBottom: 'var(--spacing-2)'
                    }}>
                        {language === 'kk' ? 'Жаңа құпия сөз' : 'Новый пароль'}
                    </h1>
                </div>

                {message && (
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px', background: 'var(--color-success-50)', 
                        color: 'var(--color-success-700)', borderRadius: 'var(--radius-md)', 
                        marginBottom: 'var(--spacing-6)' 
                    }}>
                        <CheckCircle size={18} style={{ flexShrink: 0 }} /> 
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>
                            {message}. {language === 'kk' ? 'Кіру бетіне бағытталуда...' : 'Перенаправление на страницу входа...'}
                        </span>
                    </div>
                )}
                
                {error && (
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px', background: 'var(--color-error-50)', 
                        color: 'var(--color-error-700)', borderRadius: 'var(--radius-md)', 
                        marginBottom: 'var(--spacing-6)' 
                    }}>
                        <AlertCircle size={18} style={{ flexShrink: 0 }} />
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{error}</span>
                    </div>
                )}

                {!message && (
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: 'var(--spacing-5)' }}>
                            <label className="label">{language === 'kk' ? 'Жаңа құпия сөз' : 'Новый пароль'}</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <label className="label">{language === 'kk' ? 'Құпия сөзді қайталаңыз' : 'Повторите пароль'}</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                className="input"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input 
                                    type="checkbox" 
                                    checked={showPassword} 
                                    onChange={() => setShowPassword(!showPassword)}
                                    style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary-600)' }}
                                />
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                                    {language === 'kk' ? 'Құпия сөзді көрсету' : 'Показать пароль'}
                                </span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', marginBottom: 'var(--spacing-4)' }}
                            disabled={loading}
                        >
                            {loading ? <Loader2 size={18} className="spin" /> : (language === 'kk' ? 'Сақтау' : 'Сохранить')}
                        </button>
                    </form>
                )}
                </div>{/* end auth-dark-form */}
            </div>
        </div>
    );
}

export default ResetPassword;
