/**
 * AdViewer — shows an ad, counts down, then rewards tokens
 * Supports: video (YouTube embed), banner (image), link (image+link)
 *
 * Props:
 *   onComplete(tokens) — called when ad watched and tokens awarded
 *   onClose() — called when user dismisses without watching
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { adAPI } from '../api'
import { useLanguage } from '../contexts/LanguageContext'
import { Coins, X, ExternalLink, Play, Clock } from 'lucide-react'

export default function AdViewer({ onComplete, onClose }) {
    const { language } = useLanguage()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [ad, setAd] = useState(null)
    const [loading, setLoading] = useState(true)
    const [phase, setPhase] = useState('loading') // loading | watching | done | error | no_ads
    const [countdown, setCountdown] = useState(0)
    const [canSkip, setCanSkip] = useState(false)
    const [earning, setEarning] = useState(false)
    const [earnResult, setEarnResult] = useState(null)
    const timerRef = useRef(null)

    // Load current ad
    useEffect(() => {
        adAPI.getCurrent()
            .then(data => {
                if (!data.ad) {
                    setPhase('no_ads')
                } else {
                    setAd(data.ad)
                    setCountdown(data.ad.duration || 15)
                    setPhase('watching')
                }
            })
            .catch(() => setPhase('error'))
            .finally(() => setLoading(false))
    }, [])

    // Countdown timer
    useEffect(() => {
        if (phase !== 'watching' || countdown <= 0) return
        timerRef.current = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current)
                    setCanSkip(true)
                    return 0
                }
                // Allow skip after 80% watched
                if (prev <= Math.ceil((ad?.duration || 15) * 0.2)) {
                    setCanSkip(true)
                }
                return prev - 1
            })
        }, 1000)
        return () => clearInterval(timerRef.current)
    }, [phase, ad])

    const handleClaim = useCallback(async () => {
        if (!ad || earning) return
        setEarning(true)
        try {
            const result = await adAPI.recordView(ad.id)
            setEarnResult(result)
            setPhase('done')
            onComplete?.(result.earned || ad.tokens_reward || 5, result.balance)
        } catch (err) {
            // DAILY_LIMIT or other error
            setEarnResult({ error: err.message })
            setPhase('done')
        }
        setEarning(false)
    }, [ad, earning, onComplete])

    // Auto-claim when countdown hits 0
    useEffect(() => {
        if (countdown === 0 && phase === 'watching') {
            handleClaim()
        }
    }, [countdown, phase, handleClaim])

    const getYouTubeId = (url) => {
        const m = url?.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([^&\s]+)/)
        return m?.[1]
    }

    if (phase === 'loading') {
        return (
            <div style={overlay}>
                <div style={card}>
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: '#6366f1', animation: 'adSpin 0.7s linear infinite', margin: '0 auto 16px' }} />
                        <p style={{ margin: 0 }}>{L('Загрузка рекламы...', 'Жарнама жүктелуде...')}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (phase === 'no_ads') {
        return (
            <div style={overlay}>
                <div style={card}>
                    <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>
                            <Coins size={48} color="#f59e0b" style={{ display: 'block', margin: '0 auto' }} />
                        </div>
                        <h3 style={{ margin: '0 0 8px', fontWeight: 800 }}>{L('Нет активной рекламы', 'Белсенді жарнама жоқ')}</h3>
                        <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '0.875rem' }}>
                            {L('Администратор ещё не добавил рекламу. Попробуйте позже.', 'Əкімші əлі жарнама қосқан жоқ.')}
                        </p>
                        <button onClick={onClose} style={btnSecondary}>{L('Закрыть', 'Жабу')}</button>
                    </div>
                </div>
            </div>
        )
    }

    if (phase === 'error') {
        return (
            <div style={overlay}>
                <div style={card}>
                    <div style={{ textAlign: 'center', padding: '32px 24px' }}>
                        <h3 style={{ margin: '0 0 8px', color: '#ef4444' }}>{L('Ошибка загрузки', 'Жүктеу қатесі')}</h3>
                        <button onClick={onClose} style={btnSecondary}>{L('Закрыть', 'Жабу')}</button>
                    </div>
                </div>
            </div>
        )
    }

    if (phase === 'done') {
        const success = !earnResult?.error
        return (
            <div style={overlay}>
                <div style={{ ...card, textAlign: 'center', padding: '40px 32px' }}>
                    {success ? (
                        <>
                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', border: '2px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                                <Coins size={36} color="#10b981" />
                            </div>
                            <h2 style={{ margin: '0 0 8px', fontWeight: 900, fontSize: '1.5rem', color: '#111827' }}>
                                +{earnResult?.earned || ad?.tokens_reward} {L('токенов!', 'токен!')}
                            </h2>
                            <p style={{ margin: '0 0 6px', color: '#6b7280', fontSize: '0.9rem' }}>
                                {L('Баланс:', 'Баланс:')} <strong>{(earnResult?.balance || 0).toLocaleString('ru-RU')} {L('токенов', 'токен')}</strong>
                            </p>
                            {earnResult?.remaining_today > 0 && (
                                <p style={{ margin: '0 0 24px', color: '#9ca3af', fontSize: '0.82rem' }}>
                                    {L(`Ещё можно ${earnResult.remaining_today} раз сегодня`, `Бүгін тағы ${earnResult.remaining_today} рет мүмкін`)}
                                </p>
                            )}
                            <button onClick={onClose} style={btnPrimary}>{L('Отлично!', 'Керемет!')}</button>
                        </>
                    ) : (
                        <>
                            <h3 style={{ margin: '0 0 8px', color: '#f59e0b' }}>{L('Лимит исчерпан', 'Шек толды')}</h3>
                            <p style={{ margin: '0 0 20px', color: '#6b7280', fontSize: '0.875rem' }}>
                                {L('Вы уже смотрели 10 реклам сегодня. Завтра снова!', 'Бүгін 10 жарнама қарадыңыз. Ертең қайта!')}
                            </p>
                            <button onClick={onClose} style={btnSecondary}>{L('Закрыть', 'Жабу')}</button>
                        </>
                    )}
                </div>
                <style>{`@keyframes adSpin { to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    // ── WATCHING ──
    const ytId = ad?.type === 'youtube' ? getYouTubeId(ad.url) : null
    const pct = ad ? Math.round(((ad.duration - countdown) / ad.duration) * 100) : 0

    return (
        <div style={overlay}>
            <div style={{ ...card, padding: 0, overflow: 'hidden', maxWidth: ad?.type === 'youtube' || ad?.type === 'video' ? 680 : 460 }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: 'white' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 20, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Coins size={13} color="#f59e0b" />
                            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#92400e' }}>
                                +{ad?.tokens_reward || 5} {L('токенов', 'токен')}
                            </span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{L('Реклама', 'Жарнама')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Countdown */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', color: countdown > 3 ? '#6b7280' : '#ef4444', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                            <Clock size={13} />
                            {countdown > 0 ? `${countdown}s` : '✓'}
                        </div>
                        {/* Skip / claim button */}
                        {canSkip && countdown === 0 ? (
                            <button onClick={handleClaim} disabled={earning} style={{ ...btnPrimary, padding: '6px 14px', fontSize: '0.8rem' }}>
                                {earning ? '...' : L('Получить токены', 'Токен алу')}
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                disabled={!canSkip}
                                style={{ background: 'none', border: 'none', cursor: canSkip ? 'pointer' : 'not-allowed', color: canSkip ? '#9ca3af' : '#d1d5db', display: 'flex', alignItems: 'center', padding: 4 }}
                                title={canSkip ? L('Пропустить', 'Өткізу') : L('Нельзя пропустить', 'Өткізу мүмкін емес')}
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Ad content */}
                {(ad?.type === 'youtube' || ad?.type === 'video') && ytId && (
                    <div style={{ aspectRatio: '16/9', background: '#000' }}>
                        <iframe
                            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&controls=1&rel=0`}
                            style={{ width: '100%', height: '100%', border: 'none' }}
                            allow="autoplay; encrypted-media"
                            allowFullScreen
                        />
                    </div>
                )}

                {ad?.type === 'video' && !ytId && (
                    <video
                        src={ad.url}
                        autoPlay
                        controls
                        style={{ width: '100%', maxHeight: 360, background: '#000' }}
                    />
                )}

                {(ad?.type === 'banner' || ad?.type === 'link') && (
                    <div style={{ position: 'relative' }}>
                        <img
                            src={ad.url}
                            alt={ad.title}
                            style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
                        />
                        {ad.link_url && (
                            <a href={ad.link_url} target="_blank" rel="noopener noreferrer"
                                style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', padding: 16, textDecoration: 'none', background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                                <span style={{ color: 'white', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem' }}>
                                    <ExternalLink size={14} /> {L('Узнать больше', 'Толығырақ білу')}
                                </span>
                            </a>
                        )}
                    </div>
                )}

                {/* Progress bar */}
                <div style={{ padding: '12px 16px', background: 'white' }}>
                    <div style={{ height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                            height: '100%', borderRadius: 3,
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
                            width: `${pct}%`,
                            transition: 'width 0.95s linear'
                        }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: '0.72rem', color: '#9ca3af' }}>
                        <span>{ad?.title}</span>
                        <span>{pct}%</span>
                    </div>
                </div>
            </div>
            <style>{`@keyframes adSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}

// ── Styles ────────────────────────────────────────────────────
const overlay = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
    backdropFilter: 'blur(4px)', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 99999, padding: 16
}
const card = {
    background: 'white', borderRadius: 20, width: '100%', maxWidth: 480,
    boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
    animation: 'adFadeIn 0.3s ease'
}
const btnPrimary = {
    padding: '11px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: 'white', border: 'none', borderRadius: 10,
    fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
}
const btnSecondary = {
    padding: '11px 24px', background: '#f4f4f5', color: '#374151',
    border: 'none', borderRadius: 10, fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer'
}
