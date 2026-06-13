import { Link, useLocation } from 'react-router-dom'
import { BookOpen, FileQuestion, ClipboardList, Library } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

export default function MaterialsTabs() {
    const { pathname } = useLocation()
    const { t, language } = useLanguage()

    const tabs = [
        { path: '/my-lessons', icon: <BookOpen size={18} />, label: t('nav.myLessons') || 'Мои уроки' },
        { path: '/quizzes', icon: <FileQuestion size={18} />, label: t('nav.quizzes') || 'Тесты' },
        { path: '/assignments', icon: <ClipboardList size={18} />, label: t('nav.assignments') || 'Задания' },
        { path: '/open-lessons', icon: <Library size={18} />, label: t('nav.openLessons') || 'База знаний' }
    ]

    return (
        <div style={{
            display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '16px', marginBottom: '24px',
            borderBottom: '1px solid var(--color-gray-200)', WebkitOverflowScrolling: 'touch'
        }}>
            {tabs.map(tab => {
                const isActive = pathname === tab.path || (pathname === '/' && tab.path === '/my-lessons')
                return (
                    <Link
                        key={tab.path}
                        to={tab.path}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '8px',
                            padding: '10px 20px', borderRadius: '12px',
                            textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
                            whiteSpace: 'nowrap', transition: 'all 0.2s',
                            background: isActive ? 'var(--color-primary-50)' : 'transparent',
                            color: isActive ? 'var(--color-primary-600)' : 'var(--color-gray-500)',
                            border: isActive ? '1px solid var(--color-primary-200)' : '1px solid transparent'
                        }}
                        onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--color-gray-50)' }}
                        onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                    >
                        {tab.icon}
                        {tab.label}
                    </Link>
                )
            })}
        </div>
    )
}
