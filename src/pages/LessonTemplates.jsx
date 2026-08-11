/**
 * Lesson Templates — 15 ready-made lesson templates by subject
 * Click a template → navigates to /builder?template=ID with pre-filled form
 * LessonBuilder detects ?template= and auto-fills + can auto-generate with AI
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'
import { 
    BookOpen, Zap, Clock, Users, ChevronRight, 
    Search, Sparkles, Check, Star
} from 'lucide-react'

// ── 15 lesson templates ───────────────────────────────────────
export const LESSON_TEMPLATES = [
    {
        id: 'math-equations',
        subject: 'Математика',
        grade: 8,
        duration: 45,
        title: 'Квадратные уравнения',
        description: 'Решение квадратных уравнений различными методами: дискриминант, разложение на множители',
        objectives: 'Научить решать квадратные уравнения тремя методами',
        color: '#6366f1',
        bg: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
        icon: '∑',
        tags: ['формулы', 'алгебра', 'задачи'],
        popular: true,
    },
    {
        id: 'math-geometry',
        subject: 'Математика',
        grade: 7,
        duration: 45,
        title: 'Теорема Пифагора',
        description: 'Доказательство и применение теоремы Пифагора для решения геометрических задач',
        objectives: 'Знать и применять теорему Пифагора',
        color: '#8b5cf6',
        bg: 'linear-gradient(135deg,#8b5cf6,#a855f7)',
        icon: '△',
        tags: ['геометрия', 'доказательство'],
        popular: false,
    },
    {
        id: 'physics-newton',
        subject: 'Физика',
        grade: 9,
        duration: 45,
        title: 'Законы Ньютона',
        description: 'Три закона Ньютона: формулировка, примеры из жизни, задачи на применение',
        objectives: 'Понять и применить все три закона Ньютона',
        color: '#0ea5e9',
        bg: 'linear-gradient(135deg,#0ea5e9,#06b6d4)',
        icon: 'F',
        tags: ['механика', 'силы', 'движение'],
        popular: true,
    },
    {
        id: 'physics-electricity',
        subject: 'Физика',
        grade: 10,
        duration: 45,
        title: 'Закон Ома для цепи',
        description: 'Электрическое сопротивление, сила тока, напряжение. Последовательное и параллельное соединение',
        objectives: 'Рассчитывать электрические цепи по закону Ома',
        color: '#06b6d4',
        bg: 'linear-gradient(135deg,#06b6d4,#0891b2)',
        icon: 'Ω',
        tags: ['электричество', 'цепи'],
        popular: false,
    },
    {
        id: 'chemistry-periodic',
        subject: 'Химия',
        grade: 8,
        duration: 40,
        title: 'Периодическая система Менделеева',
        description: 'Структура таблицы, периоды и группы, электронная конфигурация, тенденции свойств',
        objectives: 'Ориентироваться в периодической таблице',
        color: '#10b981',
        bg: 'linear-gradient(135deg,#10b981,#059669)',
        icon: 'Fe',
        tags: ['элементы', 'таблица'],
        popular: false,
    },
    {
        id: 'chemistry-reactions',
        subject: 'Химия',
        grade: 9,
        duration: 45,
        title: 'Химические реакции',
        description: 'Типы химических реакций: соединение, разложение, замещение, обмен. Уравнивание',
        objectives: 'Различать и уравнивать химические реакции',
        color: '#34d399',
        bg: 'linear-gradient(135deg,#34d399,#10b981)',
        icon: '⚗',
        tags: ['реакции', 'уравнивание'],
        popular: true,
    },
    {
        id: 'biology-cell',
        subject: 'Биология',
        grade: 7,
        duration: 45,
        title: 'Строение клетки',
        description: 'Органоиды клетки: ядро, митохондрии, рибосомы. Отличия растительной и животной клеток',
        objectives: 'Знать строение и функции органоидов клетки',
        color: '#84cc16',
        bg: 'linear-gradient(135deg,#84cc16,#65a30d)',
        icon: '🔬',
        tags: ['клетка', 'органоиды'],
        popular: false,
    },
    {
        id: 'biology-photosynthesis',
        subject: 'Биология',
        grade: 6,
        duration: 40,
        title: 'Фотосинтез',
        description: 'Процесс фотосинтеза, условия, уравнение реакции, значение для жизни на Земле',
        objectives: 'Объяснить процесс и значение фотосинтеза',
        color: '#4ade80',
        bg: 'linear-gradient(135deg,#4ade80,#22c55e)',
        icon: '🌿',
        tags: ['растения', 'свет'],
        popular: true,
    },
    {
        id: 'history-ancient',
        subject: 'История',
        grade: 5,
        duration: 45,
        title: 'Древние цивилизации',
        description: 'Египет, Месопотамия, Греция, Рим: достижения, культура, государственность',
        objectives: 'Назвать главные достижения древних цивилизаций',
        color: '#f59e0b',
        bg: 'linear-gradient(135deg,#f59e0b,#d97706)',
        icon: '🏛',
        tags: ['древность', 'культура'],
        popular: false,
    },
    {
        id: 'history-kazakhstan',
        subject: 'История',
        grade: 9,
        duration: 45,
        title: 'Независимость Казахстана',
        description: 'Провозглашение независимости 1991 года, первые годы, Конституция 1995 года',
        objectives: 'Знать ключевые события обретения независимости',
        color: '#fbbf24',
        bg: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
        icon: '🇰🇿',
        tags: ['Казахстан', 'независимость'],
        popular: true,
    },
    {
        id: 'informatics-algorithms',
        subject: 'Информатика',
        grade: 8,
        duration: 45,
        title: 'Алгоритмы и блок-схемы',
        description: 'Понятие алгоритма, свойства, блок-схемы: условия, циклы, ветвления',
        objectives: 'Составлять алгоритмы и рисовать блок-схемы',
        color: '#3b82f6',
        bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
        icon: '</>', 
        tags: ['алгоритмы', 'программирование'],
        popular: true,
    },
    {
        id: 'informatics-python',
        subject: 'Информатика',
        grade: 9,
        duration: 45,
        title: 'Основы Python',
        description: 'Переменные, типы данных, ввод/вывод, условные операторы, циклы в Python',
        objectives: 'Написать простые программы на Python',
        color: '#60a5fa',
        bg: 'linear-gradient(135deg,#60a5fa,#3b82f6)',
        icon: '🐍',
        tags: ['Python', 'код', 'переменные'],
        popular: false,
    },
    {
        id: 'kazakh-literature',
        subject: 'Казахский язык',
        grade: 6,
        duration: 40,
        title: 'Абай Құнанбаев',
        description: 'Өмірі мен шығармашылығы. "Қара сөздер" мен өлеңдерінің мазмұны',
        objectives: 'Абайдың шығармашылық жолын білу',
        color: '#ec4899',
        bg: 'linear-gradient(135deg,#ec4899,#db2777)',
        icon: '📖',
        tags: ['Абай', 'әдебиет', 'поэзия'],
        popular: false,
    },
    {
        id: 'russian-grammar',
        subject: 'Русский язык',
        grade: 7,
        duration: 45,
        title: 'Причастие и деепричастие',
        description: 'Образование, правописание, причастный и деепричастный обороты, запятые',
        objectives: 'Правильно образовывать и использовать причастия',
        color: '#f43f5e',
        bg: 'linear-gradient(135deg,#f43f5e,#e11d48)',
        icon: 'Я',
        tags: ['грамматика', 'причастие'],
        popular: false,
    },
    {
        id: 'english-tenses',
        subject: 'Английский язык',
        grade: 8,
        duration: 45,
        title: 'Past Simple vs Present Perfect',
        description: 'Разница между Past Simple и Present Perfect: правила использования, маркеры времени',
        objectives: 'Правильно выбирать между Past Simple и Present Perfect',
        color: '#a855f7',
        bg: 'linear-gradient(135deg,#a855f7,#9333ea)',
        icon: 'En',
        tags: ['времена', 'грамматика', 'глагол'],
        popular: true,
    },
]

const SUBJECT_FILTER = ['Все', 'Математика', 'Физика', 'Химия', 'Биология', 'История', 'Информатика', 'Казахский язык', 'Русский язык', 'Английский язык']

export default function LessonTemplates() {
    const { language } = useLanguage()
    const navigate = useNavigate()
    const L = (ru, kk) => language === 'kk' ? kk : ru

    const [search, setSearch] = useState('')
    const [subjectFilter, setSubjectFilter] = useState('Все')
    const [hoveredId, setHoveredId] = useState(null)

    const filtered = LESSON_TEMPLATES.filter(t => {
        const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase())
            || t.subject.toLowerCase().includes(search.toLowerCase())
            || t.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
        const matchSubject = subjectFilter === 'Все' || t.subject === subjectFilter
        return matchSearch && matchSubject
    })

    const popular = filtered.filter(t => t.popular)
    const rest = filtered.filter(t => !t.popular)

    const useTemplate = (template) => {
        const params = new URLSearchParams({
            template: template.id,
            title: template.title,
            subject: template.subject,
            grade: String(template.grade),
            duration: String(template.duration),
            description: template.description,
        })
        navigate(`/builder?${params.toString()}`)
    }

    return (
        <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>

            {/* ── Header ── */}
            <div style={{ marginBottom: '28px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 900, color: 'var(--color-gray-900)' }}>
                            {L('Шаблоны уроков', 'Сабақ үлгілері')}
                        </h1>
                        <p style={{ margin: 0, color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>
                            {L('15 готовых шаблонов — выберите и запустите AI-генерацию', '15 дайын үлгі — таңдап AI-генерацияны іске қосыңыз')}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── How it works banner ── */}
            <div style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #c7d2fe', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <Sparkles size={20} color="#6366f1" style={{ flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#4338ca', fontWeight: 600, flex: 1 }}>
                    {L('Выберите шаблон → AI автоматически создаст структурированные слайды, квиз и домашнее задание', 'Үлгіні таңдаңыз → AI автоматты түрде слайдтар, квиз және үй тапсырмасын жасайды')}
                </p>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                        { icon: <Zap size={14} />, text: L('30 сек', '30 сек') },
                        { icon: <Check size={14} />, text: L('Готовые слайды', 'Дайын слайдтар') },
                        { icon: <Star size={14} />, text: L('Квиз + ДЗ', 'Квиз + ҮТ') },
                    ].map((b, i) => (
                        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'white', border: '1px solid #c7d2fe', borderRadius: '20px', padding: '4px 12px', fontSize: '0.78rem', fontWeight: 700, color: '#4338ca' }}>
                            {b.icon} {b.text}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── Filters ── */}
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '24px', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '200px', maxWidth: '300px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-gray-400)' }} />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={L('Поиск шаблонов...', 'Үлгілерді іздеу...')}
                        style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid var(--color-gray-200)', borderRadius: '10px', fontSize: '0.875rem', outline: 'none', background: 'white', boxSizing: 'border-box', color: 'var(--color-gray-900)' }}
                        onFocus={e => e.target.style.borderColor = '#6366f1'}
                        onBlur={e => e.target.style.borderColor = 'var(--color-gray-200)'}
                    />
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {SUBJECT_FILTER.map(s => (
                        <button key={s} onClick={() => setSubjectFilter(s)} style={{
                            padding: '6px 14px', border: `1px solid ${subjectFilter === s ? '#6366f1' : 'var(--color-gray-200)'}`,
                            borderRadius: '20px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                            background: subjectFilter === s ? '#6366f1' : 'white',
                            color: subjectFilter === s ? 'white' : 'var(--color-gray-600)',
                            transition: 'all 0.15s', whiteSpace: 'nowrap'
                        }}>
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Popular section ── */}
            {popular.length > 0 && !search && (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                        <Star size={16} color="#f59e0b" fill="#f59e0b" />
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-gray-800)' }}>
                            {L('Популярные', 'Танымал')}
                        </h2>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px', marginBottom: '32px' }}>
                        {popular.map(t => <TemplateCard key={t.id} template={t} onUse={useTemplate} language={language} hovered={hoveredId === t.id} setHovered={setHoveredId} />)}
                    </div>
                </>
            )}

            {/* ── All / filtered ── */}
            {(search ? filtered : rest).length > 0 && (
                <>
                    {!search && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <BookOpen size={16} color="var(--color-gray-500)" />
                            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--color-gray-800)' }}>
                                {L('Все шаблоны', 'Барлық үлгілер')}
                            </h2>
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                        {(search ? filtered : rest).map(t => <TemplateCard key={t.id} template={t} onUse={useTemplate} language={language} hovered={hoveredId === t.id} setHovered={setHoveredId} />)}
                    </div>
                </>
            )}

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-gray-400)' }}>
                    <BookOpen size={48} color="#d1d5db" style={{ marginBottom: '12px' }} />
                    <h3 style={{ margin: '0 0 8px', color: 'var(--color-gray-600)' }}>{L('Ничего не найдено', 'Ештеңе табылмады')}</h3>
                    <button onClick={() => { setSearch(''); setSubjectFilter('Все') }} style={{ marginTop: '12px', padding: '8px 20px', background: 'var(--color-primary-600)', color: 'white', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 }}>
                        {L('Сбросить фильтры', 'Сүзгілерді тазалау')}
                    </button>
                </div>
            )}
        </div>
    )
}

// ── TemplateCard ──────────────────────────────────────────────
function TemplateCard({ template: t, onUse, language, hovered, setHovered }) {
    const L = (ru, kk) => language === 'kk' ? kk : ru
    return (
        <div
            onMouseEnter={() => setHovered(t.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
                background: 'var(--color-white, white)', borderRadius: '16px',
                border: `1.5px solid ${hovered ? t.color + '50' : 'var(--color-gray-100)'}`,
                overflow: 'hidden', transition: 'all 0.2s',
                transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
                boxShadow: hovered ? `0 8px 24px ${t.color}20` : 'none',
                display: 'flex', flexDirection: 'column'
            }}
        >
            {/* Color header strip */}
            <div style={{
                background: t.bg, padding: '20px 18px 16px', position: 'relative', overflow: 'hidden'
            }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900, color: 'white', letterSpacing: '-1px', flexShrink: 0 }}>
                        {t.icon}
                    </div>
                    {t.popular && (
                        <span style={{ background: 'rgba(255,255,255,0.25)', color: 'white', padding: '3px 8px', borderRadius: '20px', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <Star size={10} fill="white" /> {L('Популярный', 'Танымал')}
                        </span>
                    )}
                </div>
                <h3 style={{ margin: '10px 0 4px', color: 'white', fontWeight: 800, fontSize: '1rem', lineHeight: 1.3 }}>
                    {t.title}
                </h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>{t.subject}</span>
                    <span style={{ background: 'rgba(255,255,255,0.2)', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 600 }}>{t.grade} {L('класс', 'сынып')}</span>
                    <span style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={10} /> {t.duration} {L('мин', 'мин')}
                    </span>
                </div>
            </div>

            {/* Body */}
            <div style={{ padding: '14px 18px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--color-gray-500)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {t.description}
                </p>
                {/* Tags */}
                <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {t.tags.map(tag => (
                        <span key={tag} style={{ background: `${t.color}12`, color: t.color, padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 600 }}>
                            #{tag}
                        </span>
                    ))}
                </div>
                {/* Use button */}
                <button
                    onClick={() => onUse(t)}
                    style={{
                        marginTop: 'auto', width: '100%', padding: '10px',
                        background: hovered ? t.bg : `${t.color}12`,
                        color: hovered ? 'white' : t.color,
                        border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.875rem',
                        cursor: 'pointer', transition: 'all 0.2s',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        boxShadow: hovered ? `0 4px 12px ${t.color}40` : 'none'
                    }}
                >
                    <Sparkles size={15} />
                    {L('Использовать шаблон', 'Үлгіні қолдану')}
                    <ChevronRight size={15} />
                </button>
            </div>
        </div>
    )
}
