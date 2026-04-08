import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

const SUBJECTS = [
    { id: 'math', icon: '📐', ru: 'Математика', kk: 'Математика' },
    { id: 'physics', icon: '⚛️', ru: 'Физика', kk: 'Физика' },
    { id: 'chemistry', icon: '🧪', ru: 'Химия', kk: 'Химия' },
    { id: 'biology', icon: '🌿', ru: 'Биология', kk: 'Биология' },
    { id: 'history', icon: '🏛️', ru: 'История', kk: 'Тарих' },
    { id: 'geography', icon: '🌍', ru: 'География', kk: 'География' },
    { id: 'informatics', icon: '💻', ru: 'Информатика', kk: 'Информатика' },
    { id: 'kazakh', icon: '🇰🇿', ru: 'Казахский язык', kk: 'Қазақ тілі' },
    { id: 'russian', icon: '📖', ru: 'Русский язык', kk: 'Орыс тілі' },
    { id: 'english', icon: '🇬🇧', ru: 'Английский язык', kk: 'Ағылшын тілі' },
    { id: 'literature', icon: '📚', ru: 'Литература', kk: 'Әдебиет' },
    { id: 'music', icon: '🎵', ru: 'Музыка', kk: 'Музыка' },
    { id: 'art', icon: '🎨', ru: 'ИЗО', kk: 'Бейнелеу өнері' },
    { id: 'pe', icon: '⚽', ru: 'Физкультура', kk: 'Дене тәрбиесі' },
    { id: 'technology', icon: '🔧', ru: 'Технология', kk: 'Технология' },
    { id: 'social', icon: '🤝', ru: 'Познание мира', kk: 'Дүниетану' },
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
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
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
            background: 'var(--gradient-primary)',
            padding: 'var(--spacing-6)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: 'var(--radius-2xl)',
                padding: 'var(--spacing-10)',
                width: '100%',
                maxWidth: step === 2 ? '600px' : '440px',
                boxShadow: 'var(--shadow-2xl)',
                transition: 'max-width 0.3s ease'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-6)' }}>
                    <h1 style={{
                        fontSize: 'var(--font-size-3xl)',
                        fontWeight: 800,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: 'var(--spacing-1)'
                    }}>Urpaq.ai</h1>
                    <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
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
                                color: s <= step ? 'white' : 'var(--color-gray-500)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 700, fontSize: '0.85rem',
                                transition: 'all 0.3s ease'
                            }}>{s}</div>
                            {s < 2 && <div style={{
                                width: '48px', height: '2px',
                                background: step > s ? 'var(--color-primary-500)' : 'var(--color-gray-200)',
                                transition: 'background 0.3s ease'
                            }} />}
                        </div>
                    ))}
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: 'var(--spacing-3)',
                        background: 'var(--color-error-50)',
                        border: '1px solid var(--color-error-200)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--color-error-700)',
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
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-500)', padding: 0 }}>
                                    {showPassword ? eyeOpen : eyeClosed}
                                </button>
                            </div>
                            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-gray-400)', marginTop: '4px' }}>
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
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-gray-500)', padding: 0 }}>
                                    {showConfirmPassword ? eyeOpen : eyeClosed}
                                </button>
                            </div>
                        </div>
                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={agreedToTerms}
                                    onChange={e => setAgreedToTerms(e.target.checked)} style={{ marginTop: '2px' }} />
                                <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
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
                            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>📚</div>
                            <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: '8px' }}>
                                {language === 'kk' ? 'Пәндерді таңдаңыз' : 'Выберите предметы'}
                            </h2>
                            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)' }}>
                                {language === 'kk'
                                    ? 'Сіз оқытатын пәндерді белгілеңіз (бірнеше таңдауға болады)'
                                    : 'Отметьте предметы, которые вы преподаёте (можно несколько)'}
                            </p>
                        </div>

                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '10px',
                            marginBottom: 'var(--spacing-6)'
                        }}>
                            {SUBJECTS.map(subj => {
                                const isSelected = selectedSubjects.includes(subj.id)
                                return (
                                    <button
                                        key={subj.id}
                                        type="button"
                                        onClick={() => toggleSubject(subj.id)}
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '12px 8px',
                                            borderRadius: '12px',
                                            border: isSelected
                                                ? '2px solid var(--color-primary-500)'
                                                : '2px solid var(--color-gray-200)',
                                            background: isSelected
                                                ? 'var(--color-primary-50)'
                                                : 'white',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                                            boxShadow: isSelected ? '0 4px 12px rgba(99,102,241,0.25)' : 'none'
                                        }}
                                    >
                                        <span style={{ fontSize: '1.5rem' }}>{subj.icon}</span>
                                        <span style={{
                                            fontSize: '0.68rem',
                                            fontWeight: isSelected ? 700 : 500,
                                            color: isSelected ? 'var(--color-primary-700)' : 'var(--color-gray-600)',
                                            textAlign: 'center',
                                            lineHeight: 1.2
                                        }}>
                                            {language === 'kk' ? subj.kk : subj.ru}
                                        </span>
                                        {isSelected && (
                                            <span style={{
                                                width: '18px', height: '18px',
                                                background: 'var(--gradient-primary)',
                                                borderRadius: '50%',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: 'white', fontSize: '10px', fontWeight: 700
                                            }}>✓</span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>

                        {selectedSubjects.length > 0 && (
                            <div style={{
                                padding: '10px 14px',
                                background: 'var(--color-primary-50)',
                                borderRadius: '10px',
                                marginBottom: 'var(--spacing-4)',
                                fontSize: 'var(--font-size-sm)',
                                color: 'var(--color-primary-700)',
                                fontWeight: 500
                            }}>
                                ✅ {language === 'kk' ? 'Таңдалды' : 'Выбрано'}: {selectedSubjects.length}{' '}
                                {language === 'kk' ? 'пән' : selectedSubjects.length === 1 ? 'предмет' : selectedSubjects.length < 5 ? 'предмета' : 'предметов'}
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
                                    ? (language === 'kk' ? 'Күте тұрыңыз...' : 'Загрузка...')
                                    : (language === 'kk' ? '🚀 Тіркелу' : '🚀 Зарегистрироваться')}
                            </button>
                        </div>
                    </>
                )}

                {/* Divider shown only on step 1 */}
                {step === 1 && (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--spacing-4) 0', gap: 'var(--spacing-3)' }}>
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                            <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
                                {language === 'kk' ? 'немесе' : 'или'}
                            </span>
                            <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-sm)' }}>
                                {language === 'kk' ? 'Аккаунтыңыз бар ма?' : 'Уже есть аккаунт?'}{' '}
                                <Link to="/login" style={{ color: 'var(--color-primary-600)', textDecoration: 'none', fontWeight: 600 }}>
                                    {language === 'kk' ? 'Кіру' : 'Войти'}
                                </Link>
                            </p>
                        </div>
                    </>
                )}

                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-4)' }}>
                    <Link to="/" style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)', textDecoration: 'none' }}>
                        ← {language === 'kk' ? 'Басты бетке оралу' : 'Вернуться на главную'}
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Register
