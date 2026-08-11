import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function ForgotPassword() {
    const { t, language } = useLanguage();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const res = await fetch(`${API_BASE}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (res.ok) {
                setMessage(data.message);
            } else {
                setError(data.error || (language === 'kk' ? 'Қате шықты' : 'Произошла ошибка'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

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
                        marginBottom: 'var(--spacing-2)'
                    }}>
                        {language === 'kk' ? 'Құпия сөзді қалпына келтіру' : 'Восстановление пароля'}
                    </h1>
                    <p style={{ fontSize: 'var(--font-size-sm)' }}>
                        {language === 'kk' ? 'Аккаунтыңыздың электрондық поштасын енгізіңіз' : 'Введите email вашего аккаунта'}
                    </p>
                </div>

                {message && (
                    <div style={{ 
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '12px', background: 'var(--color-success-50)', 
                        color: 'var(--color-success-700)', borderRadius: 'var(--radius-md)', 
                        marginBottom: 'var(--spacing-6)' 
                    }}>
                        <CheckCircle size={18} style={{ flexShrink: 0 }} /> 
                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{message}</span>
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

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 'var(--spacing-6)' }}>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            className="input"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: 'var(--spacing-4)' }}
                        disabled={loading || !!message} // Disable after successful send
                    >
                        {loading ? <Loader2 size={18} className="spin" /> : (language === 'kk' ? 'Сілтеме жіберу' : 'Отправить ссылку')}
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-6)' }}>
                    <Link to="/login" style={{
                        color: 'rgba(255,255,255,0.4)',
                        fontSize: 'var(--font-size-sm)',
                        textDecoration: 'none'
                    }}>
                        ← {language === 'kk' ? 'Кіру бетіне оралу' : 'Вернуться на страницу входа'}
                    </Link>
                </div>
                </div>{/* end auth-dark-form */}
            </div>
        </div>
    );
}

export default ForgotPassword;
