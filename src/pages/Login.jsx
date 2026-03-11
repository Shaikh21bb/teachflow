import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'

function Login() {
    const { t, language } = useLanguage()
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        const result = await login(email, password)

        if (result.success) {
            navigate('/dashboard')
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
                        yraq.ai
                    </h1>
                    <p style={{ color: 'var(--color-gray-500)' }}>
                        {language === 'kk' ? 'Жүйеге кіру' : 'Вход в систему'}
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

                {/* Login Form */}
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: 'var(--spacing-4)' }}>
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

                    <div style={{ marginBottom: 'var(--spacing-6)' }}>
                        <label className="label">
                            {language === 'kk' ? 'Құпия сөз' : 'Пароль'}
                        </label>
                        <input
                            type="password"
                            className="input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ width: '100%', marginBottom: 'var(--spacing-4)' }}
                        disabled={loading}
                    >
                        {loading ? (language === 'kk' ? 'Күте тұрыңыз...' : 'Загрузка...') : (language === 'kk' ? 'Кіру' : 'Войти')}
                    </button>

                    <div style={{ textAlign: 'center' }}>
                        <Link to="/forgot-password" style={{
                            color: 'var(--color-primary-600)',
                            fontSize: 'var(--font-size-sm)',
                            textDecoration: 'none'
                        }}>
                            {language === 'kk' ? 'Құпия сөзді ұмыттыңыз ба?' : 'Забыли пароль?'}
                        </Link>
                    </div>
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

                {/* Register Link */}
                <div style={{ textAlign: 'center' }}>
                    <p style={{ color: 'var(--color-gray-600)', fontSize: 'var(--font-size-sm)' }}>
                        {language === 'kk' ? 'Аккаунтыңыз жоқ па?' : 'Нет аккаунта?'}{' '}
                        <Link to="/register" style={{
                            color: 'var(--color-primary-600)',
                            textDecoration: 'none',
                            fontWeight: 600
                        }}>
                            {language === 'kk' ? 'Тіркелу' : 'Зарегистрироваться'}
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

export default Login
