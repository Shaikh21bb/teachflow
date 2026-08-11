import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useLanguage } from '../contexts/LanguageContext'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Sparkles } from 'lucide-react'

// ── Animated background orbs ──────────────────────────────────
function Orb({ style }) {
    return (
        <div style={{
            position: 'absolute',
            borderRadius: '50%',
            filter: 'blur(80px)',
            pointerEvents: 'none',
            ...style
        }} />
    )
}

// ── Floating particles ────────────────────────────────────────
function Particles() {
    const particles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 3 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 4 + 4,
        opacity: Math.random() * 0.4 + 0.1,
    }))
    return (
        <>
            {particles.map(p => (
                <div key={p.id} style={{
                    position: 'absolute',
                    left: p.left, top: p.top,
                    width: p.size, height: p.size,
                    borderRadius: '50%',
                    background: 'rgba(165,180,252,0.6)',
                    opacity: p.opacity,
                    animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
                    pointerEvents: 'none',
                }} />
            ))}
        </>
    )
}

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
    const [focused, setFocused] = useState(null) // 'email' | 'password'

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
            background: '#060912',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', 'Outfit', sans-serif",
            padding: '24px 16px',
        }}>
            <style>{`
                @keyframes particleFloat {
                    from { transform: translateY(0px) translateX(0px); opacity: 0.1; }
                    to   { transform: translateY(-20px) translateX(8px); opacity: 0.5; }
                }
                @keyframes orbPulse {
                    0%, 100% { transform: scale(1) translate(-50%, -50%); }
                    50%       { transform: scale(1.08) translate(-50%, -50%); }
                }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .login-input {
                    width: 100%;
                    padding: 14px 16px 14px 44px;
                    background: rgba(255,255,255,0.05);
                    border: 1.5px solid rgba(255,255,255,0.1);
                    border-radius: 14px;
                    color: white;
                    font-size: 0.95rem;
                    outline: none;
                    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
                    box-sizing: border-box;
                    font-family: inherit;
                    -webkit-text-fill-color: white;
                }
                .login-input::placeholder { color: rgba(255,255,255,0.3); }
                .login-input:focus {
                    border-color: #6366f1;
                    background: rgba(99,102,241,0.08);
                    box-shadow: 0 0 0 4px rgba(99,102,241,0.15);
                }
                .login-input:-webkit-autofill,
                .login-input:-webkit-autofill:hover,
                .login-input:-webkit-autofill:focus {
                    -webkit-box-shadow: 0 0 0 100px #10123a inset;
                    -webkit-text-fill-color: white;
                    caret-color: white;
                }
                .login-btn {
                    width: 100%;
                    padding: 15px;
                    background: linear-gradient(135deg, #6366f1, #8b5cf6);
                    color: white;
                    border: none;
                    border-radius: 14px;
                    font-size: 1rem;
                    font-weight: 700;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-family: inherit;
                    letter-spacing: 0.2px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 8px 24px rgba(99,102,241,0.35);
                }
                .login-btn:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 12px 32px rgba(99,102,241,0.5);
                }
                .login-btn:active { transform: translateY(0); }
                .login-btn:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
            `}</style>

            {/* ── Background orbs ── */}
            <Orb style={{ width: 600, height: 600, left: '-10%', top: '-15%', background: 'rgba(99,102,241,0.18)', animation: 'orbPulse 7s ease-in-out infinite' }} />
            <Orb style={{ width: 500, height: 500, right: '-8%', bottom: '-10%', background: 'rgba(139,92,246,0.15)', animation: 'orbPulse 9s ease-in-out 2s infinite' }} />
            <Orb style={{ width: 300, height: 300, left: '40%', top: '10%', background: 'rgba(236,72,153,0.08)', animation: 'orbPulse 11s ease-in-out 4s infinite' }} />

            {/* ── Particles ── */}
            <Particles />

            {/* ── Subtle grid overlay ── */}
            <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                backgroundSize: '60px 60px',
            }} />

            {/* ── Card ── */}
            <div style={{
                width: '100%', maxWidth: '420px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '24px',
                padding: '40px 36px',
                boxShadow: '0 32px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                position: 'relative',
                animation: 'fadeUp 0.5s ease-out',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                        <div style={{
                            width: '44px', height: '44px', borderRadius: '12px', overflow: 'hidden',
                            boxShadow: '0 4px 16px rgba(99,102,241,0.4)'
                        }}>
                            <img src="/logo.jpg" alt="Urpaq.ai" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{
                            fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.5px',
                            background: 'linear-gradient(135deg,#a5b4fc,#e879f9,#f0abfc)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>Urpaq.ai</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Sparkles size={14} color="#a5b4fc" />
                        <span style={{ fontSize: '0.78rem', color: 'rgba(165,180,252,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                            {L('Суперсила для учителей', 'Мұғалімдер үшін суперкүш')}
                        </span>
                        <Sparkles size={14} color="#a5b4fc" />
                    </div>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'white' }}>
                        {L('Добро пожаловать', 'Қош келдіңіз')}
                    </h2>
                </div>

                {/* Error */}
                {error && (
                    <div style={{
                        padding: '12px 16px', marginBottom: '20px',
                        background: 'rgba(239,68,68,0.12)',
                        border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: '12px',
                        color: '#fca5a5', fontSize: '0.875rem', lineHeight: 1.5,
                        animation: 'fadeUp 0.3s ease'
                    }}>
                        {error}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Email */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600 }}>
                            Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#818cf8' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }} />
                            <input
                                type="email"
                                className="login-input"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                required
                                onFocus={() => setFocused('email')}
                                onBlur={() => setFocused(null)}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <label style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', fontWeight: 600 }}>
                                {L('Пароль', 'Құпия сөз')}
                            </label>
                            <Link to="/forgot-password" style={{ color: '#818cf8', fontSize: '0.8rem', textDecoration: 'none', fontWeight: 500 }}>
                                {L('Забыли?', 'Ұмыттыңыз ба?')}
                            </Link>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#818cf8' : 'rgba(255,255,255,0.3)', transition: 'color 0.2s' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="login-input"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{ paddingRight: '44px' }}
                                onFocus={() => setFocused('password')}
                                onBlur={() => setFocused(null)}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: 0, display: 'flex', alignItems: 'center' }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Submit */}
                    <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '8px' }}>
                        {loading ? (
                            <>
                                <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
                                {L('Вход...', 'Кіру...')}
                            </>
                        ) : (
                            <>
                                {L('Войти', 'Кіру')}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0' }}>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem' }}>{L('или', 'немесе')}</span>
                    <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
                </div>

                {/* Register */}
                <p style={{ textAlign: 'center', margin: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.875rem' }}>
                    {L('Нет аккаунта?', 'Аккаунтыңыз жоқ па?')}{' '}
                    <Link to="/register" style={{ color: '#a5b4fc', fontWeight: 700, textDecoration: 'none' }}>
                        {L('Зарегистрироваться', 'Тіркелу')}
                    </Link>
                </p>

                {/* Back */}
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <Link to="/" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.8rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        ← {L('Вернуться на главную', 'Басты бетке оралу')}
                    </Link>
                </div>

                {/* Inner glow */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: '24px', background: 'radial-gradient(circle at 50% 0%, rgba(99,102,241,0.08), transparent 60%)', pointerEvents: 'none' }} />
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
