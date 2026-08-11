/**
 * InstallPrompt — PWA install banner
 * Shows a bottom banner when the browser fires 'beforeinstallprompt'
 * Dismissed state persisted in localStorage
 */
import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export default function InstallPrompt() {
    const { language } = useLanguage()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [show, setShow] = useState(false)

    useEffect(() => {
        // Check if already installed (display-mode: standalone)
        if (window.matchMedia('(display-mode: standalone)').matches) return
        // Check if dismissed
        if (localStorage.getItem('pwa_install_dismissed')) return

        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
            setShow(true)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])

    const handleInstall = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setShow(false)
            setDeferredPrompt(null)
        }
    }

    const handleDismiss = () => {
        setShow(false)
        localStorage.setItem('pwa_install_dismissed', '1')
    }

    if (!show) return null

    return (
        <div style={{
            position: 'fixed', bottom: 'calc(70px + env(safe-area-inset-bottom, 0px))',
            left: '50%', transform: 'translateX(-50%)',
            width: 'calc(100% - 32px)', maxWidth: '420px',
            background: 'white', borderRadius: '20px',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
            border: '1px solid var(--color-gray-100)',
            padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: '14px',
            zIndex: 10000,
            animation: 'slideUpIn 0.4s cubic-bezier(0.16,1,0.3,1)'
        }}>
            <style>{`
                @keyframes slideUpIn {
                    from { opacity: 0; transform: translateX(-50%) translateY(20px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
            `}</style>

            {/* App icon */}
            <img src="/logo.jpg" alt="Urpaq.ai"
                style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', flexShrink: 0 }}
            />

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--color-gray-900)', marginBottom: '2px' }}>
                    {L('Установить Urpaq.ai', 'Urpaq.ai орнату')}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', lineHeight: 1.4 }}>
                    {L('Добавьте на главный экран для быстрого доступа', 'Жылдам кіру үшін бастапқы экранға қосыңыз')}
                </div>
            </div>

            {/* Install button */}
            <button
                onClick={handleInstall}
                style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '8px 14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                    color: 'white', border: 'none', borderRadius: '10px',
                    fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                    whiteSpace: 'nowrap', flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                }}
            >
                <Download size={14} />
                {L('Установить', 'Орнату')}
            </button>

            {/* Dismiss */}
            <button
                onClick={handleDismiss}
                style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-gray-400)', padding: '4px', flexShrink: 0,
                    display: 'flex', alignItems: 'center'
                }}
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    )
}
