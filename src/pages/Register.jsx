import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

const SUBJECTS = [
    { id: 'primary', ru: 'Бастауыш / Нач. классы', kk: 'Бастауыш сынып' },
    { id: 'math', ru: 'Математика', kk: 'Математика' },
    { id: 'physics', ru: 'Физика', kk: 'Физика' },
    { id: 'chemistry', ru: 'Химия', kk: 'Химия' },
    { id: 'biology', ru: 'Биология', kk: 'Биология' },
    { id: 'history', ru: 'История', kk: 'Тарих' },
    { id: 'geography', ru: 'География', kk: 'География' },
    { id: 'informatics', ru: 'Информатика', kk: 'Информатика' },
    { id: 'kazakh', ru: 'Казахский язык', kk: 'Қазақ тілі' },
    { id: 'russian', ru: 'Русский язык', kk: 'Орыс тілі' },
    { id: 'english', ru: 'Английский язык', kk: 'Ағылшын тілі' },
    { id: 'literature', ru: 'Литература', kk: 'Әдебиет' },
    { id: 'music', ru: 'Музыка', kk: 'Музыка' },
    { id: 'art', ru: 'ИЗО', kk: 'Бейнелеу өнері' },
    { id: 'pe', ru: 'Физкультура', kk: 'Дене тәрбиесі' },
    { id: 'technology', ru: 'Технология', kk: 'Технология' },
    { id: 'social', ru: 'Познание мира', kk: 'Дүниетану' },
]

function Register() {
    const { t, language } = useLanguage()
    const { register } = useAuth()
    const navigate = useNavigate()

    const [step, setStep] = useState(1) // 1 = credentials, 2 = subjects
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [selectedSubjects, setSelectedSubjects] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    function handleChange(e) {
        setFormData({ ...formData, [e.target.name]: e.target.value })
    }

    function toggleSubject(id) {
        setSelectedSubjects(prev => {
            if (prev.includes(id)) return prev.filter(s => s !== id)
            if (prev.length >= 2) return prev // max 2
            return [...prev, id]
        })
    }

    function handleStep1() {
        setError('')
        if (!formData.name || !formData.email || !formData.password) {
            setError(language === 'kk' ? 'Барлық өрістерді толтырыңыз' : 'Заполните все поля')
            return
        }
        if (formData.password !== formData.confirmPassword) {
            setError(language === 'kk' ? 'Құпия сөздер сәйкес келмейді' : 'Пароли не совпадают')
            return
        }
        if (formData.password.length < 8) {
            setError(language === 'kk' ? 'Кем дегенде 8 таңба' : 'Минимум 8 символов')
            return
        }
        if (!agreedToTerms) {
            setError(language === 'kk' ? 'Шарттарды қабылдауыңыз керек' : 'Согласитесь с условиями')
            return
        }
        setStep(2)
    }

    async function handleSubmit() {
        setError('')
        if (selectedSubjects.length === 0) {
            setError(language === 'kk' ? 'Кем дегенде бір пән таңдаңыз' : 'Выберите хотя бы один предмет')
            return
        }
        setLoading(true)
        const result = await register(formData.name, formData.email, formData.password, selectedSubjects)
        if (result.success) {
            navigate('/login', { state: { message: result.message } })
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

    const eyeOpen = (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        </svg>
    )
    const eyeClosed = (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        </svg>
    )

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#060912',
            padding: 'var(--spacing-6)',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter','Outfit',sans-serif",
        }}>
            {/* Background orbs */}
            <div style={{ position: 'absolute', width: 600, height: 600, left: '-10%', top: '-15%', borderRadius: '50%', background: 'rgba(99,102,241,0.18)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', width: 500, height: 500, right: '-8%', bottom: '-10%', borderRadius: '50%', background: 'rgba(139,92,246,0.15)', filter: 'blur(80px)', pointerEvents: 'none' }} />
            <div style={{
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 'var(--radius-2xl)',
                padding: 'var(--spacing-10)',
                width: '100%',
                maxWidth: step === 2 ? '600px' : '440px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                transition: 'max-width 0.3s ease',
                position: 'relative',
            }}>
                {/* Force dark inputs regardless of theme */}
                <style>{`
                    .auth-dark-form .input, .auth-dark-form .filter-select {
                        background: rgba(255,255,255,0.05) !important;
                        border-color: rgba(255,255,255,0.12) !important;
                        color: white !important;
                        -webkit-text-fill-color: white !important;
                    }
                    .auth-dark-form .input::placeholder { color: rgba(255,255,255,0.3) !important; }
                    .auth-dark-form .input:focus {
                        border-color: #6366f1 !important;
                        background: rgba(99,102,241,0.08) !important;
                        box-shadow: 0 0 0 4px rgba(99,102,241,0.15) !important;
                    }
                    .auth-dark-form .input:-webkit-autofill,
                    .auth-dark-form .input:-webkit-autofill:hover,
                    .auth-dark-form .input:-webkit-autofill:focus {
                        -webkit-box-shadow: 0 0 0 100px #10123a inset !important;
                        -webkit-text-fill-color: white !important;
                        caret-color: white !important;
                    }
                    .auth-dark-form .label { color: rgba(255,255,255,0.75) !important; }
                    .auth-dark-form .label + * input, .auth-dark-form select { color: white; }
                    .auth-dark-form textarea.input { color: white !important; }
                `}</style>
                <div className="auth-dark-form">
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: 'var(--spacing-1)' }}>
                        <img src="/logo.jpg" alt="Urpaq Logo" style={{ width: '40px', height: '40px', borderRadius: '10px', objectFit: 'cover' }} />
                        <h1 style={{
                            fontSize: 'var(--font-size-3xl)',
                            fontWeight: 900,
                            background: 'linear-gradient(135deg,#a5b4fc,#e879f9,#f0abfc)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            margin: 0
                        }}>Urpaq.ai</h1>
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-sm)' }}>
                        {language === 'kk' ? 'Жаңа аккаунт жасау' : 'Создать новый аккаунт'}
                    </p>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--spacing-8)', justifyContent: 'center' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: s <= step ? 'var(--gradient-primary)' : 'var(--color-gray-200)',
                                color: s <= step ? 'white' : 'rgba(255,255,255,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.85rem',
                                transition: 'all 0.3s ease'
                            }}>{s}</div>
                            {s < 2 && <div style={{
                                width: '48px', height: '2px',
                                background: step > s ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                transition: 'background 0.3s ease'
                            }} />}
                        </div>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 'var(--radius-lg)',
                        color: '#fca5a5',
                        marginBottom: 'var(--spacing-4)',
                        fontSize: 'var(--font-size-sm)'
                    }}>{error}</div>
                )}

                {/* STEP 1: Credentials */}
                {step === 1 && (
                    <>
                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Толық аты-жөніңіз' : 'Полное имя'}</label>
                            <input type="text" name="name" className="input" value={formData.name}
                                onChange={handleChange}
                                placeholder={language === 'kk' ? 'Мысалы: Омарова Айгерім' : 'Например: Иванова Анна'} />
                        </div>
                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">Email</label>
                            <input type="email" name="email" className="input" value={formData.email}
                                onChange={handleChange} placeholder="your@email.com" />
                        </div>
                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Құпия сөз' : 'Пароль'}</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showPassword ? 'text' : 'password'} name="password" className="input"
                                    value={formData.password} onChange={handleChange}
                                    placeholder="••••••••" style={{ paddingRight: '40px' }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                                    {showPassword ? eyeOpen : eyeClosed}
                                </button>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                                {language === 'kk' ? 'Кем дегенде 8 таңба' : 'Минимум 8 символов'}
                            </p>
                        </div>
                        <div style={{ marginBottom: 'var(--spacing-4)' }}>
                            <label className="label">{language === 'kk' ? 'Құпия сөзді растау' : 'Подтвердите пароль'}</label>
                            <div style={{ position: 'relative' }}>
                                <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" className="input"
                                    value={formData.confirmPassword} onChange={handleChange}
                                    placeholder="••••••••" style={{ paddingRight: '40px' }} />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0 }}>
                                    {showConfirmPassword ? eyeOpen : eyeClosed}
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={agreedToTerms}
                                    onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: '2px' }} />
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'rgba(255,255,255,0.6)' }}>
                                    {language === 'kk'
                                        ? 'Мен қызмет көрсету шарттарымен және құпиялылық саясатымен келісемін'
                                        : 'Я согласен с условиями использования и политикой конфиденциальности'}
                                </span>
                            </label>
                        </div>
                        <button className="btn btn-primary" onClick={handleStep1}
                            style={{ width: '100%', marginBottom: 'var(--spacing-4)' }}>
                            {language === 'kk' ? 'Келесі →' : 'Далее →'}
                        </button>
                    </>
                )}

                {/* STEP 2: Subject selection */}
                {step === 2 && (
                    <>
                        <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '8px', color: 'white' }}>
                                {language === 'kk' ? 'Пәндерді таңдаңыз' : 'Выберите предметы'}
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 'var(--font-size-sm)' }}>
                                {language === 'kk'
                                    ? 'Негізгі 2 пәніңізді таңдаңыз'
                                    : 'Выберите до 2 предметов, которые вы преподаёте'}
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '8px',
                            marginBottom: 'var(--spacing-6)'
                        }}>
                            {SUBJECTS.map(subj => {
                                const isSelected = selectedSubjects.includes(subj.id)
                                const isDisabled = !isSelected && selectedSubjects.length >= 2
                                return (
                                    <button
                                        key={subj.id}
                                        type="button"
                                        onClick={() => toggleSubject(subj.id)}
                                        disabled={isDisabled}
                                        style={{
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: isSelected
                                                ? '1.5px solid #6366f1'
                                                : '1.5px solid rgba(255,255,255,0.12)',
                                            background: isSelected
                                                ? 'rgba(99,102,241,0.2)'
                                                : isDisabled
                                                    ? 'rgba(255,255,255,0.02)'
                                                    : 'rgba(255,255,255,0.05)',
                                            cursor: isDisabled ? 'not-allowed' : 'pointer',
                                            opacity: isDisabled ? 0.4 : 1,
                                            transition: 'all 0.15s',
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '0.82rem',
                                            fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? '#a5b4fc' : 'rgba(255,255,255,0.75)',
                                            textAlign: 'left',
                                            lineHeight: 1.3,
                                        }}>
                                            {language === 'kk' ? subj.kk : subj.ru}
                                        </span>
                                        {isSelected && (
                                            <div style={{
                                                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                                                background: '#6366f1',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: '10px', fontWeight: 800
                                            }}>✓</div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {selectedSubjects.length > 0 && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'rgba(99,102,241,0.15)',
                                border: '1px solid rgba(99,102,241,0.3)',
                                borderRadius: '10px',
                                marginBottom: 'var(--spacing-4)',
                                fontSize: 'var(--font-size-sm)',
                                color: '#a5b4fc',
                                fontWeight: 600,
                                display: 'flex', alignItems: 'center', gap: 8
                            }}>
                                <span>{language === 'kk' ? 'Таңдалды' : 'Выбрано'}: {selectedSubjects.length} / 2</span>
                                {selectedSubjects.length === 2 && (
                                    <span style={{ color: '#4ade80', fontSize: '0.8rem' }}>
                                        — {language === 'kk' ? 'максимум' : 'максимум достигнут'}
                                    </span>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button className="btn btn-secondary" onClick={() => { setStep(1); setError('') }}
                                style={{ flex: 1 }}>
                                ← {language === 'kk' ? 'Артқа' : 'Назад'}
                            </button>
                            <button className="btn btn-primary" onClick={handleSubmit}
                                disabled={loading} style={{ flex: 2 }}>
                                {loading
                                    ? (language === 'kk' ? 'Күте тұрыңыз...' : 'Регистрация...')
                                    : (language === 'kk' ? 'Тіркелу' : 'Зарегистрироваться')}
                            </button>
                        </div>
                    </>
                )}

                {/* Divider shown only on step 1 */}
                {step === 1 && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--spacing-4) 0', gap: 'var(--spacing-3)' }}>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'var(--font-size-sm)' }}>
                                {language === 'kk' ? 'немесе' : 'или'}
                            </span>
                            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 'var(--font-size-sm)' }}>
                                {language === 'kk' ? 'Аккаунтыңыз бар ма?' : 'Уже есть аккаунт?'}{' '}
                                <Link to="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 600 }}>
                                    {language === 'kk' ? 'Кіру' : 'Войти'}
                                </Link>
                            </p>
                        </div>
                    </>
                )}

                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-4)' }}>
                    <Link to="/" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 'var(--font-size-sm)', textDecoration: 'none' }}>
                        ← {language === 'kk' ? 'Басты бетке оралу' : 'Вернуться на главную'}
                    </Link>
                </div>
                </div> {/* end auth-dark-form */}
            </div>
        </div>
    )
}

export default Register
