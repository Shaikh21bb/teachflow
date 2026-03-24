import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

function Register() {
    const { t, language } = useLanguage()
    const { register } = useAuth()
    const navigate = useNavigate()
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [agreedToTerms, setAgreedToTerms] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    function handleChange(e) {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        // Validation
        if (!formData.name || !formData.email || !formData.password) {
            setError(language === 'kk' ? 'Барлық өрістерді толтырыңыз' : 'Заполните все поля')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            setError(language === 'kk' ? 'Құпия сөздер сәйкес келмейді' : 'Пароли не совпадают')
            return
        }

        if (formData.password.length < 8) {
            setError(language === 'kk' ? 'Құпия сөз кем дегенде 8 таңбадан тұруы керек' : 'Пароль должен быть минимум 8 символов')
            return
        }

        if (!agreedToTerms) {
            setError(language === 'kk' ? 'Шарттарды қабылдауыңыз керек' : 'Вы должны согласиться с условиями')
            return
        }

        setLoading(true)

        const result = await register(formData.name, formData.email, formData.password)

        if (result.success) {
            // Redirect to login
            navigate('/login', { state: { message: result.message } })
        } else {
            setError(result.error)
            setLoading(false)
        }
    }

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
                maxWidth: '440px',
                boxShadow: 'var(--shadow-2xl)'
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-8)' }}>
                    <h1 style={{
                        fontSize: 'var(--font-size-3xl)',
                        fontWeight: 800,
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        marginBottom: 'var(--spacing-2)'
                    }}>
                        Urpaq.ai
                    </h1>
                    <p style={{ color: 'var(--color-gray-500)' }}>
                        {language === 'kk' ? 'Жаңа аккаунт жасау' : 'Создать новый аккаунт'}
                    </p>
                </div>

                {/* Error message */}
                {error && (
                    <div style={{
                        padding: 'var(--spacing-4)',
                        background: 'var(--color-error-50)',
                        border: '1px solid var(--color-error-200)',
                        borderRadius: 'var(--radius-lg)',
                        color: 'var(--color-error-700)',
                        marginBottom: 'var(--spacing-6)',
                        fontSize: 'var(--font-size-sm)'
                    }}>
                        {error}
                    </div>
                )}

                {/* Register Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                        <label className="label">
                            {language === 'kk' ? 'Толық аты-жөніңіз' : 'Полное имя'}
                        </label>
                        <input
                            type="text"
                            name="name"
                            className="input"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={language === 'kk' ? 'Мысалы: Әлия Омарова' : 'Например: Анна Иванова'}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                        <label className="label">Email</label>
                        <input
                            type="email"
                            name="email"
                            className="input"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="your@email.com"
                            required
                        />
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                        <label className="label">
                            {language === 'kk' ? 'Құпия сөз' : 'Пароль'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                className="input"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-gray-500)',
                                    fontSize: '1.2rem',
                                    padding: '0'
                                }}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                )}
                            </button>
                        </div>
                        <p style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-gray-500)',
                            marginTop: 'var(--spacing-2)'
                        }}>
                            {language === 'kk' ? 'Кем дегенде 8 таңба' : 'Минимум 8 символов'}
                        </p>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
                        <label className="label">
                            {language === 'kk' ? 'Құпия сөзді растау' : 'Подтвердите пароль'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                className="input"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="••••••••"
                                required
                                style={{ paddingRight: '40px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: 'var(--color-gray-500)',
                                    fontSize: '1.2rem',
                                    padding: '0'
                                }}
                            >
                                {showConfirmPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div style={{ marginBottom: 'var(--spacing-6)' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--spacing-2)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={agreedToTerms}
                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                style={{ marginTop: '2px' }}
                            />
                            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-gray-600)' }}>
                                {language === 'kk'
                                    ? 'Мен қызмет көрсету шарттарымен және құпиялылық саясатымен келісемін'
                                    : 'Я согласен с условиями использования и политикой конфиденциальности'}
                            </span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: 'var(--spacing-4)' }}
                        disabled={loading}
                    >
                        {loading
                            ? (language === 'kk' ? 'Күте тұрыңыз...' : 'Загрузка...')
                            : (language === 'kk' ? 'Тіркелу' : 'Зарегистрироваться')}
                    </button>
                </form>

                {/* Divider */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    margin: 'var(--spacing-6) 0',
                    gap: 'var(--spacing-4)'
                }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }}></div>
                    <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--font-size-sm)' }}>
                        {language === 'kk' ? 'немесе' : 'или'}
                    </span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--color-gray-200)' }}></div>
                </div>

                {/* Login Link */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-sm)' }}>
                        {language === 'kk' ? 'Аккаунтыңыз бар ма?' : 'Уже есть аккаунт?'}{' '}
                        <Link to="/login" style={{
                            color: 'var(--color-primary-600)',
                            textDecoration: 'none',
                            fontWeight: 600
                        }}>
                            {language === 'kk' ? 'Кіру' : 'Войти'}
                        </Link>
                    </p>
                </div>

                {/* Back to home */}
                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-6)' }}>
                    <Link to="/" style={{
                        color: 'var(--color-gray-500)',
                        fontSize: 'var(--font-size-sm)',
                        textDecoration: 'none'
                    }}>
                        ← {language === 'kk' ? 'Басты бетке оралу' : 'Вернуться на главную'}
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default Register
