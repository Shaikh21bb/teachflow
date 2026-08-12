import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react'

export default function Login() {
    const { language } = useLanguage()
    const { login } = useAuth()
    const navigate = useNavigate()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

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
            fontFamily: "'Inter', -apple-system, sans-serif",
        }}>
            <style>{`
                @keyframes fadeIn { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
                @keyframes spin   { to { transform:rotate(360deg); } }
                .auth-field {
                    width:100%; padding:12px 14px 12px 42px;
                    background:#1a1d2e; border:1.5px solid #2a2d3e;
                    border-radius:10px; color:#e2e8f0; font-size:0.95rem;
                    outline:none; transition:border-color 0.15s,box-shadow 0.15s;
                    box-sizing:border-box; font-family:inherit;
                    -webkit-text-fill-color:#e2e8f0;
                }
                .auth-field::placeholder { color:#4a5568; }
                .auth-field:focus { border-color:#6366f1; box-shadow:0 0 0 3px rgba(99,102,241,0.18); }
                .auth-field:-webkit-autofill,
                .auth-field:-webkit-autofill:focus {
                    -webkit-box-shadow:0 0 0 100px #1a1d2e inset;
                    -webkit-text-fill-color:#e2e8f0;
                    caret-color:#e2e8f0;
                }
            `}</style>

            {/* ── Left panel — branding ── */}
            <div style={{
                width: '45%', flexShrink: 0,
                background: 'linear-gradient(160deg, #0a0c17 0%, #12152a 50%, #0d1020 100%)',
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                padding: '60px 56px', position: 'relative', overflow: 'hidden',
            }}
                className="hide-on-mobile"
            >
                {/* Subtle accent blob */}
                <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'rgba(99,102,241,0.07)', filter: 'blur(90px)', top: '-80px', left: '-80px', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', background: 'rgba(139,92,246,0.05)', filter: 'blur(70px)', bottom: '40px', right: '-40px', pointerEvents: 'none' }} />

                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 56 }}>
                    <img src="/logo.jpg" alt="Urpaq.ai" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
                    <span style={{ fontWeight: 800, fontSize: '1.25rem', color: 'white', letterSpacing: '-0.3px' }}>Urpaq.ai</span>
                </div>

                <h1 style={{ color: 'white', fontSize: '2.4rem', fontWeight: 800, lineHeight: 1.2, margin: '0 0 20px', letterSpacing: '-0.5px' }}>
                    {L('Платформа для', 'Мұғалімдер үшін')}<br />
                    <span style={{ background: 'linear-gradient(135deg,#818cf8,#c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {L('учителей нового\nпоколения', 'жаңа буын платформасы')}
                    </span>
                </h1>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '1rem', lineHeight: 1.7, margin: 0, maxWidth: 320 }}>
                    {L('Создавайте уроки с AI, управляйте классами и анализируйте успеваемость в одном месте.', 'AI көмегімен сабақ жасаңыз, сыныптарды басқарыңыз және үлгерімді талдаңыз.')}
                </p>

                {/* Stats row */}
                <div style={{ display: 'flex', gap: 32, marginTop: 48 }}>
                    {[
                        { v: '10K+', l: L('Учителей', 'Мұғалім') },
                        { v: '50K+', l: L('Уроков', 'Сабақ') },
                        { v: '4.9', l: L('Рейтинг', 'Рейтинг') },
                    ].map(s => (
                        <div key={s.v}>
                            <div style={{ color: 'white', fontWeight: 800, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>{s.v}</div>
                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.78rem', marginTop: 2 }}>{s.l}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right panel — form ── */}
            <div style={{
                flex: 1,
                background: '#0d0f1e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '40px 24px',
            }}>
                <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.35s ease' }}>

                    {/* Mobile logo */}
                    <div style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 36 }} className="show-on-mobile">
                        <img src="/logo.jpg" alt="Urpaq.ai" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover' }} />
                        <span style={{ fontWeight: 800, color: 'white', fontSize: '1.1rem' }}>Urpaq.ai</span>
                    </div>

                    <h2 style={{ color: 'white', fontWeight: 800, fontSize: '1.7rem', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
                        {L('Вход в систему', 'Жүйеге кіру')}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 32px', fontSize: '0.9rem' }}>
                        {L('Рады видеть вас снова', 'Сізді қайта көргенімізге қуаныштымыз')}
                    </p>

                    {/* Error */}
                    {error && (
                        <div style={{ padding: '11px 14px', marginBottom: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#fca5a5', fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {/* Email */}
                        <div>
                            <label style={{ display: 'block', color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 7 }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#4a5568', pointerEvents: 'none' }} />
                                <input type="email" className="auth-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                                <label style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {L('Пароль', 'Құпия сөз')}
                                </label>
                                <Link to="/forgot-password" style={{ color: '#818cf8', fontSize: '0.8rem', textDecoration: 'none' }}>
                                    {L('Забыли?', 'Ұмыттыңыз ба?')}
                                </Link>
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#4a5568', pointerEvents: 'none' }} />
                                <input type={showPassword ? 'text' : 'password'} className="auth-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required style={{ paddingRight: 42 }} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#4a5568', display: 'flex', alignItems: 'center', padding: 0 }}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} style={{
                            marginTop: 6, width: '100%', padding: '13px',
                            background: loading ? '#3f3f6b' : 'linear-gradient(135deg,#6366f1,#7c3aed)',
                            color: 'white', border: 'none', borderRadius: 10,
                            fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                            transition: 'opacity 0.15s', fontFamily: 'inherit',
                            boxShadow: loading ? 'none' : '0 4px 16px rgba(99,102,241,0.3)',
                        }}>
                            {loading ? (
                                <><div style={{ width: 17, height: 17, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} /> {L('Вход...', 'Кіру...')}</>
                            ) : (
                                <>{L('Войти', 'Кіру')} <ArrowRight size={17} /></>
                            )}
                        </button>
                    </form>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem' }}>{L('или', 'немесе')}</span>
                        <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.07)' }} />
                    </div>

                    <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.875rem', margin: '0 0 16px' }}>
                        {L('Нет аккаунта?', 'Аккаунтыңыз жоқ па?')}{' '}
                        <Link to="/register" style={{ color: '#818cf8', fontWeight: 700, textDecoration: 'none' }}>
                            {L('Зарегистрироваться', 'Тіркелу')}
                        </Link>
                    </p>

                    <div style={{ textAlign: 'center' }}>
                        <Link to="/" style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textDecoration: 'none' }}>
                            ← {L('На главную', 'Басты бет')}
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}
