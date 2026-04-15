import { useState } from 'react';
import { useAuth, authFetch } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Key, CheckCircle, AlertCircle, Loader2, UserCircle, ChevronRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function Settings() {
    const { t, language } = useLanguage();
    const { user } = useAuth();

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setMessage(''); setError('');

        if (newPassword !== confirmPassword) {
            setError(language === 'kk' ? 'Құпия сөздер сәйкес келмейді' : 'Пароли не совпадают');
            return;
        }

        setLoading(true);
        try {
            const res = await authFetch(`${API_BASE}/auth/password`, {
                method: 'PUT',
                body: JSON.stringify({ oldPassword, newPassword }),
            });
            const data = await res.json();

            if (res.ok) {
                setMessage(data.message || (language === 'kk' ? 'Құпия сөз жаңартылды!' : 'Пароль обновлён!'));
                setOldPassword(''); setNewPassword(''); setConfirmPassword('');
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
        <div style={{ maxWidth: '680px', margin: '0 auto', padding: 'var(--spacing-6)' }}>

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 800, marginBottom: '6px' }}>
                    {language === 'kk' ? 'Баптаулар' : 'Настройки'}
                </h1>
                <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
                    {language === 'kk' ? 'Аккаунт қауіпсіздігін басқарыңыз' : 'Управление безопасностью аккаунта'}
                </p>
            </div>

            {/* Profile shortcut card */}
            <Link to="/profile" style={{ textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
                <div className="card" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 22px',
                    borderRadius: '14px',
                    border: '1.5px solid var(--color-primary-200)',
                    background: 'linear-gradient(135deg, var(--color-primary-50) 0%, white 100%)',
                    cursor: 'pointer',
                    transition: 'box-shadow 0.2s',
                }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{
                            width: '42px', height: '42px',
                            borderRadius: '12px',
                            background: 'var(--gradient-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <UserCircle size={22} style={{ color: 'white' }} />
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, marginBottom: '2px', color: 'var(--color-gray-900)' }}>
                                {language === 'kk' ? 'Профильге өту' : 'Перейти в профиль'}
                            </div>
                            <div style={{ fontSize: '0.82rem', color: 'var(--color-gray-500)' }}>
                                {language === 'kk'
                                    ? 'Аватар, биография, пәндер, сілтемелер, əріптестер'
                                    : 'Аватар, биография, предметы, ссылки, коллеги'}
                            </div>
                        </div>
                    </div>
                    <ChevronRight size={20} style={{ color: 'var(--color-primary-500)', flexShrink: 0 }} />
                </div>
            </Link>

            {/* Alerts */}
            {message && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px',
                    background: 'var(--color-success-50)',
                    color: 'var(--color-success-700)',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    border: '1px solid var(--color-success-200)',
                }}>
                    <CheckCircle size={18} /> {message}
                </div>
            )}
            {error && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 16px',
                    background: 'var(--color-error-50)',
                    color: 'var(--color-error-700)',
                    borderRadius: '10px',
                    marginBottom: '20px',
                    border: '1px solid var(--color-error-200)',
                }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* Security card */}
            <div className="card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--color-gray-100)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    background: 'var(--color-gray-50)',
                }}>
                    <div style={{
                        width: '38px', height: '38px',
                        borderRadius: '10px',
                        background: 'var(--color-warning-100, #fef3c7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <Shield size={20} style={{ color: '#d97706' }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {language === 'kk' ? 'Құпия сөзді өзгерту' : 'Изменение пароля'}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                            {user?.email}
                        </div>
                    </div>
                </div>

                <form onSubmit={handlePasswordUpdate} style={{ padding: '24px' }}>
                    <div style={{ marginBottom: '18px' }}>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Key size={14} />
                            {language === 'kk' ? 'Ағымдағы құпия сөз' : 'Текущий пароль'}
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={oldPassword}
                            onChange={e => setOldPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '18px' }}>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Key size={14} />
                            {language === 'kk' ? 'Жаңа құпия сөз' : 'Новый пароль'}
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                        <small style={{ color: 'var(--color-gray-400)', marginTop: '4px', display: 'block' }}>
                            {language === 'kk' ? 'Кемінде 8 таңбадан тұруы керек' : 'Минимум 8 символов'}
                        </small>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Key size={14} />
                            {language === 'kk' ? 'Жаңа құпия сөзді қайталаңыз' : 'Повторите новый пароль'}
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}
                            style={{ minWidth: '180px', borderRadius: '10px', fontWeight: 700 }}>
                            {loading
                                ? <Loader2 size={18} className="spin" />
                                : (language === 'kk' ? 'Құпия сөзді жаңарту' : 'Обновить пароль')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Settings;
