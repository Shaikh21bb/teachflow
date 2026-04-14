import { useState, useEffect } from 'react';
import { useAuth, authFetch } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { User, Key, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function Settings() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    
    const [activeTab, setActiveTab] = useState('profile');
    
    // Profile form
    const [name, setName] = useState(user?.name || '');
    const [subjects, setSubjects] = useState(user?.subjects || []);
    
    // Password form
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setSubjects(user.subjects || []);
        }
    }, [user]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const res = await authFetch(`${API_BASE}/auth/profile`, {
                method: 'PUT',
                body: JSON.stringify({ name, subjects }),
            });
            const data = await res.json();
            
            if (res.ok) {
                setMessage(language === 'kk' ? 'Профиль жаңартылды' : 'Профиль успешно обновлен');
            } else {
                setError(data.error || (language === 'kk' ? 'Қате шықты' : 'Произошла ошибка'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        
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
                setMessage(data.message);
                setOldPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setError(data.error || (language === 'kk' ? 'Қате шықты' : 'Произошла ошибка'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const subjectOptions = [
        'Математика', 'Физика', 'Химия', 'Биология', 
        'Информатика', 'История', 'География', 'Русский язык', 
        'Казахский язык', 'Английский язык', 'Литература'
    ];

    const handleSubjectToggle = (subject) => {
        setSubjects(prev => 
            prev.includes(subject) 
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: 'var(--spacing-6)' }}>
            <div style={{ marginBottom: 'var(--spacing-8)' }}>
                <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--spacing-2)' }}>
                    {language === 'kk' ? 'Настройкалар' : 'Настройки'}
                </h1>
                <p style={{ color: 'var(--color-gray-500)' }}>
                    {language === 'kk' ? 'Жеке ақпарат пен қауіпсіздікті басқару' : 'Управление профилем и безопасностью аккаунта'}
                </p>
            </div>

            {/* Tabs */}
            <div style={{ 
                display: 'flex', 
                gap: '1px', 
                background: 'var(--color-gray-200)',
                padding: '4px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 'var(--spacing-6)'
            }}>
                <button
                    onClick={() => { setActiveTab('profile'); setMessage(''); setError(''); }}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: 'none',
                        background: activeTab === 'profile' ? 'white' : 'transparent',
                        borderRadius: 'var(--radius-md)',
                        color: activeTab === 'profile' ? 'var(--color-gray-900)' : 'var(--color-gray-600)',
                        fontWeight: activeTab === 'profile' ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'profile' ? 'var(--shadow-sm)' : 'none'
                    }}
                >
                    <User size={18} />
                    {language === 'kk' ? 'Профиль' : 'Профиль'}
                </button>
                <button
                    onClick={() => { setActiveTab('security'); setMessage(''); setError(''); }}
                    style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        padding: '12px',
                        border: 'none',
                        background: activeTab === 'security' ? 'white' : 'transparent',
                        borderRadius: 'var(--radius-md)',
                        color: activeTab === 'security' ? 'var(--color-gray-900)' : 'var(--color-gray-600)',
                        fontWeight: activeTab === 'security' ? 600 : 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: activeTab === 'security' ? 'var(--shadow-sm)' : 'none'
                    }}
                >
                    <Key size={18} />
                    {language === 'kk' ? 'Қауіпсіздік' : 'Безопасность'}
                </button>
            </div>

            {/* Alerts */}
            {message && (
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px', background: 'var(--color-success-50)', 
                    color: 'var(--color-success-700)', borderRadius: 'var(--radius-md)', 
                    marginBottom: 'var(--spacing-6)' 
                }}>
                    <CheckCircle size={18} /> {message}
                </div>
            )}
            
            {error && (
                <div style={{ 
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '12px', background: 'var(--color-error-50)', 
                    color: 'var(--color-error-700)', borderRadius: 'var(--radius-md)', 
                    marginBottom: 'var(--spacing-6)' 
                }}>
                    <AlertCircle size={18} /> {error}
                </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <form className="card" onSubmit={handleProfileUpdate} style={{ padding: 'var(--spacing-6)' }}>
                    <div style={{ marginBottom: 'var(--spacing-5)' }}>
                        <label className="label">Email</label>
                        <input className="input" value={user?.email || ''} disabled style={{ background: 'var(--color-gray-50)', color: 'var(--color-gray-500)' }} />
                        <small style={{ color: 'var(--color-gray-400)', marginTop: '4px', display: 'block' }}>
                            {language === 'kk' ? 'Электрондық поштаны өзгерту мүмкін емес' : 'Email нельзя изменить'}
                        </small>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-5)' }}>
                        <label className="label">{language === 'kk' ? 'Аты-жөні' : 'Имя'}</label>
                        <input 
                            className="input" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            required 
                            minLength={2}
                        />
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-6)' }}>
                        <label className="label">{language === 'kk' ? 'Пәндер' : 'Предметы'}</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {subjectOptions.map(sub => (
                                <button
                                    key={sub}
                                    type="button"
                                    onClick={() => handleSubjectToggle(sub)}
                                    style={{
                                        padding: '6px 12px',
                                        borderRadius: '20px',
                                        border: `1px solid ${subjects.includes(sub) ? 'var(--color-primary-500)' : 'var(--color-gray-200)'}`,
                                        background: subjects.includes(sub) ? 'var(--color-primary-50)' : 'white',
                                        color: subjects.includes(sub) ? 'var(--color-primary-700)' : 'var(--color-gray-600)',
                                        fontSize: 'var(--font-size-sm)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {sub}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={18} className="spin" /> : (language === 'kk' ? 'Сақтау' : 'Сохранить изменения')}
                        </button>
                    </div>
                </form>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <form className="card" onSubmit={handlePasswordUpdate} style={{ padding: 'var(--spacing-6)' }}>
                    <div style={{ marginBottom: 'var(--spacing-5)' }}>
                        <label className="label">{language === 'kk' ? 'Ағымдағы құпия сөз' : 'Текущий пароль'}</label>
                        <input 
                            type="password" 
                            className="input" 
                            value={oldPassword} 
                            onChange={e => setOldPassword(e.target.value)} 
                            required 
                        />
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-5)' }}>
                        <label className="label">{language === 'kk' ? 'Жаңа құпия сөз' : 'Новый пароль'}</label>
                        <input 
                            type="password" 
                            className="input" 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            required 
                            minLength={8}
                        />
                        <small style={{ color: 'var(--color-gray-400)', marginTop: '4px', display: 'block' }}>
                            {language === 'kk' ? 'Кемінде 8 таңбадан тұруы керек' : 'Минимум 8 символов, буквы и цифры'}
                        </small>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-6)' }}>
                        <label className="label">{language === 'kk' ? 'Жаңа құпия сөзді қайталаңыз' : 'Повторите новый пароль'}</label>
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
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? <Loader2 size={18} className="spin" /> : (language === 'kk' ? 'Құпия сөзді жаңарту' : 'Обновить пароль')}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default Settings;
