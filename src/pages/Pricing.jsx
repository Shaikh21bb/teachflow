import { useState } from 'react';
import {
    Check, X, Zap, Users, Building2, GraduationCap,
    Coins, Play, ShoppingBag, BookOpen, Layers,
    Send, BarChart2, Crown, Star, ArrowRight,
    Clock, Image, MessageSquare, Globe
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api';

// ── Token badge ───────────────────────────────────────────────
function TokenBadge({ count }) {
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            background: 'linear-gradient(135deg,#f59e0b,#f97316)',
            color: 'white', borderRadius: 20, padding: '2px 10px',
            fontSize: '0.75rem', fontWeight: 800
        }}>
            <Coins size={11} /> {count} токенов
        </span>
    )
}

// ── Feature row ───────────────────────────────────────────────
function Feature({ text, yes = true, highlight = false }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '5px 0' }}>
            <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                background: yes ? (highlight ? 'rgba(255,255,255,0.2)' : '#dcfce7') : 'transparent',
                border: yes ? 'none' : '1px solid #e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {yes
                    ? <Check size={11} color={highlight ? 'white' : '#16a34a'} strokeWidth={3} />
                    : <X size={10} color="#d1d5db" strokeWidth={2.5} />
                }
            </div>
            <span style={{
                fontSize: '0.875rem', lineHeight: 1.5,
                color: yes
                    ? (highlight ? 'rgba(255,255,255,0.9)' : '#374151')
                    : '#9ca3af',
                textDecoration: yes ? 'none' : 'none'
            }}>
                {text}
            </span>
        </div>
    )
}

export default function Pricing() {
    const { language } = useLanguage();
    const { user } = useAuth();
    const [billing, setBilling] = useState('monthly');
    const [loading, setLoading] = useState(null);
    const L = (ru, kk) => language === 'kk' ? kk : ru;

    const plans = [
        {
            id: 'free',
            icon: <GraduationCap size={22} />,
            iconColor: '#6366f1',
            name: L('Бесплатно', 'Тегін'),
            tagline: L('Начните прямо сейчас', 'Қазір бастаңыз'),
            price: { monthly: 0, yearly: 0 },
            tokens: 200,
            highlight: false,
            cta: L('Начать бесплатно', 'Тегін бастау'),
            features: [
                { text: L('100 AI-кредитов в месяц', 'Айына 100 AI-кредит'), yes: true },
                { text: L('Генерация уроков и слайдов', 'Сабақ және слайд жасау'), yes: true },
                { text: L('Публикация уроков — бесплатно', 'Сабақ жариялау — тегін'), yes: true },
                { text: L('Маркетплейс: покупка уроков', 'Маркетплейс: сабақ сатып алу'), yes: true },
                { text: L('200 токенов при регистрации', 'Тіркелгенде 200 токен'), yes: true },
                { text: L('Реклама → токены (50/день)', 'Жарнама → токендер (50/күн)'), yes: true },
                { text: L('Telegram Hub', 'Telegram Hub'), yes: false },
                { text: L('Авто-фото в слайдах', 'Слайдтарда авто-фото'), yes: false },
            ]
        },
        {
            id: 'pro',
            icon: <Zap size={22} />,
            iconColor: '#6366f1',
            name: L('Учитель', 'Мұғалім'),
            tagline: L('Для активных педагогов', 'Белсенді педагогтар үшін'),
            price: { monthly: 3990, yearly: 2990 },
            tokens: 500,
            highlight: true,
            badge: L('Популярный', 'Танымал'),
            cta: L('Выбрать план', 'Жоспар таңдау'),
            features: [
                { text: L('200 AI-кредитов в месяц', 'Айына 200 AI-кредит'), yes: true },
                { text: L('Генерация уроков, слайдов, 3D-примеров', 'Сабақ, слайд, 3D-мысалдар'), yes: true },
                { text: L('Авто-фото в слайдах (Unsplash)', 'Слайдтарда авто-фото'), yes: true },
                { text: L('Краткосрочный план урока (AI)', 'AI арқылы қысқа мерзімді жоспар'), yes: true },
                { text: L('Telegram Hub (1 класс)', 'Telegram Hub (1 сынып)'), yes: true },
                { text: L('Маркетплейс: продажа своих уроков', 'Сабақтарды сату'), yes: true },
                { text: L('500 токенов ежемесячно', 'Айына 500 токен'), yes: true },
                { text: L('Аналитика и отчёты', 'Аналитика және есептер'), yes: true },
            ]
        },
        {
            id: 'premium',
            icon: <Crown size={22} />,
            iconColor: '#f59e0b',
            name: L('Премиум', 'Премиум'),
            tagline: L('Всё без ограничений', 'Шексіз мүмкіндіктер'),
            price: { monthly: 7990, yearly: 5990 },
            tokens: 2000,
            highlight: false,
            badge: L('Лучший выбор', 'Ең жақсы'),
            badgeGold: true,
            cta: L('Выбрать Премиум', 'Премиум таңдау'),
            features: [
                { text: L('Безлимитные AI-кредиты', 'Шексіз AI-кредиттер'), yes: true },
                { text: L('Полная генерация уроков + слайды + фото', 'Толық сабақ генерациясы'), yes: true },
                { text: L('Авто-фото (Unsplash) + визуальные материалы', 'Авто-фото + визуалды материалдар'), yes: true },
                { text: L('Telegram Hub — все классы', 'Telegram Hub — барлық сыныптар'), yes: true },
                { text: L('Маркетплейс: продажа без лимитов', 'Сатуда шектеу жоқ'), yes: true },
                { text: L('2000 токенов ежемесячно', 'Айына 2000 токен'), yes: true },
                { text: L('Приоритетная поддержка', 'Басымдықты қолдау'), yes: true },
                { text: L('Live-уроки без ограничений', 'Live-сабақтар шексіз'), yes: true },
            ]
        },
        {
            id: 'school',
            icon: <Building2 size={22} />,
            iconColor: '#8b5cf6',
            name: L('Школа', 'Мектеп'),
            tagline: L('Для всей школы', 'Бүкіл мектеп үшін'),
            price: { monthly: 29990, yearly: 22990 },
            tokens: 10000,
            highlight: false,
            contactOnly: true,
            cta: L('Связаться с нами', 'Байланысу'),
            features: [
                { text: L('До 50 учителей', '50 мұғалімге дейін'), yes: true },
                { text: L('Безлимитные AI-кредиты', 'Шексіз AI-кредиттер'), yes: true },
                { text: L('Все функции Премиум', 'Барлық Премиум функциялар'), yes: true },
                { text: L('Общая библиотека уроков', 'Жалпы сабақ кітапханасы'), yes: true },
                { text: L('Панель администратора', 'Әкімші панелі'), yes: true },
                { text: L('10 000 токенов в месяц', 'Айына 10 000 токен'), yes: true },
                { text: L('Персональный менеджер', 'Жеке менеджер'), yes: true },
                { text: L('Брендинг и настройка', 'Брендинг және баптаулар'), yes: true },
            ]
        }
    ];

    const handleSubscribe = async (plan) => {
        if (plan.id === 'free') return;
        if (plan.contactOnly) { window.open('https://wa.me/77771225784', '_blank'); return; }
        setLoading(plan.id);
        try {
            const res = await fetch(`${API_BASE}/kaspi/create-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` },
                body: JSON.stringify({ planId: plan.id, billingCycle: billing })
            });
            const data = await res.json();
            if (data.success && data.paymentUrl) window.location.href = data.paymentUrl;
            else alert(data.error || 'Ошибка');
        } catch { alert('Ошибка соединения'); }
        setLoading(null);
    };

    return (
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '40px 20px 80px', fontFamily: 'inherit' }}>
            <style>{`
                @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
                .plan-card { transition: transform 0.2s, box-shadow 0.2s; }
                .plan-card:hover { transform: translateY(-4px); box-shadow: 0 16px 40px rgba(0,0,0,0.12) !important; }
            `}</style>

            {/* ── Header ── */}
            <div style={{ textAlign: 'center', marginBottom: 48 }}>
                <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.6rem)', fontWeight: 900, color: 'var(--color-gray-900)', margin: '0 0 10px', letterSpacing: '-0.5px' }}>
                    {L('Тарифы', 'Тарифтер')}
                </h1>
                <p style={{ color: 'var(--color-gray-500)', fontSize: '1rem', maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.6 }}>
                    {L('Публикация уроков — всегда бесплатно. Токены — ваша внутренняя валюта.', 'Сабақ жариялау — әрдайым тегін. Токендер — сіздің ішкі валютаңыз.')}
                </p>

                {/* Billing toggle */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--color-gray-100)', borderRadius: 40, padding: '4px' }}>
                    {[
                        { v: 'monthly', l: L('Месяц', 'Ай') },
                        { v: 'yearly', l: L('Год −25%', 'Жыл −25%') }
                    ].map(o => (
                        <button key={o.v} onClick={() => setBilling(o.v)} style={{
                            padding: '8px 20px', borderRadius: 36, border: 'none', cursor: 'pointer',
                            fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.15s',
                            background: billing === o.v ? 'white' : 'transparent',
                            color: billing === o.v ? 'var(--color-gray-900)' : 'var(--color-gray-500)',
                            boxShadow: billing === o.v ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                        }}>{o.l}</button>
                    ))}
                </div>
            </div>

            {/* ── Plans grid ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(255px, 1fr))', gap: 20, marginBottom: 56, alignItems: 'start' }}>
                {plans.map((plan, idx) => {
                    const price = billing === 'yearly' ? plan.price.yearly : plan.price.monthly;
                    const isCurrent = user?.plan === plan.id;
                    const isHighlight = plan.highlight;
                    const isGold = plan.badgeGold;

                    return (
                        <div key={plan.id} className="plan-card" style={{
                            background: isHighlight
                                ? 'linear-gradient(150deg,#4f46e5 0%,#7c3aed 100%)'
                                : 'var(--color-white,white)',
                            borderRadius: 20,
                            padding: '28px 24px',
                            border: isHighlight ? 'none' : isGold ? '2px solid #f59e0b' : '1px solid var(--color-gray-100)',
                            boxShadow: isHighlight ? '0 12px 40px rgba(79,70,229,0.3)' : '0 2px 12px rgba(0,0,0,0.05)',
                            display: 'flex', flexDirection: 'column', gap: 0,
                            position: 'relative', overflow: 'hidden',
                            animation: `fadeUp 0.4s ease ${idx * 0.07}s both`
                        }}>
                            {/* Badge */}
                            {plan.badge && (
                                <div style={{
                                    position: 'absolute', top: 16, right: 16,
                                    background: isGold ? 'linear-gradient(135deg,#f59e0b,#f97316)' : 'rgba(255,255,255,0.2)',
                                    color: 'white', padding: '3px 10px', borderRadius: 20,
                                    fontSize: '0.72rem', fontWeight: 800
                                }}>{plan.badge}</div>
                            )}
                            {isCurrent && (
                                <div style={{ position: 'absolute', top: 16, right: 16, background: '#dcfce7', color: '#15803d', padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 800 }}>
                                    {L('Ваш план', 'Сіздің жоспарыңыз')}
                                </div>
                            )}

                            {/* Icon + name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                                <div style={{ width: 40, height: 40, borderRadius: 12, background: isHighlight ? 'rgba(255,255,255,0.15)' : plan.iconColor + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isHighlight ? 'white' : plan.iconColor }}>
                                    {plan.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '1rem', color: isHighlight ? 'white' : 'var(--color-gray-900)' }}>{plan.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: isHighlight ? 'rgba(255,255,255,0.65)' : 'var(--color-gray-400)' }}>{plan.tagline}</div>
                                </div>
                            </div>

                            {/* Price */}
                            <div style={{ marginBottom: 20 }}>
                                {price === 0 ? (
                                    <div style={{ fontSize: '2rem', fontWeight: 900, color: isHighlight ? 'white' : 'var(--color-gray-900)' }}>
                                        {L('Бесплатно', 'Тегін')}
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
                                        <span style={{ fontSize: '2rem', fontWeight: 900, color: isHighlight ? 'white' : 'var(--color-gray-900)', lineHeight: 1 }}>
                                            {price.toLocaleString('ru-RU')}
                                        </span>
                                        <span style={{ fontSize: '0.875rem', color: isHighlight ? 'rgba(255,255,255,0.6)' : 'var(--color-gray-400)', marginBottom: 4 }}>
                                            ₸/{L('мес', 'ай')}
                                        </span>
                                    </div>
                                )}
                                {billing === 'yearly' && price > 0 && (
                                    <div style={{ fontSize: '0.75rem', color: isHighlight ? 'rgba(255,255,255,0.55)' : 'var(--color-gray-400)', marginTop: 3 }}>
                                        {L(`= ${(price * 12).toLocaleString('ru-RU')} ₸ в год`, `= жылына ${(price * 12).toLocaleString('ru-RU')} ₸`)}
                                    </div>
                                )}
                                <div style={{ marginTop: 8 }}>
                                    <TokenBadge count={plan.tokens.toLocaleString('ru-RU')} />
                                </div>
                            </div>

                            {/* Features */}
                            <div style={{ flex: 1, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 0 }}>
                                {plan.features.map((f, i) => (
                                    <Feature key={i} text={f.text} yes={f.yes} highlight={isHighlight} />
                                ))}
                            </div>

                            {/* CTA */}
                            <button
                                onClick={() => handleSubscribe(plan)}
                                disabled={loading === plan.id || isCurrent}
                                style={{
                                    width: '100%', padding: '12px 0',
                                    borderRadius: 12, border: 'none', cursor: isCurrent ? 'default' : 'pointer',
                                    fontWeight: 700, fontSize: '0.9rem',
                                    background: isCurrent ? 'rgba(255,255,255,0.15)'
                                        : isHighlight ? 'white'
                                        : isGold ? 'linear-gradient(135deg,#f59e0b,#f97316)'
                                        : plan.id === 'school' ? '#111827'
                                        : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                                    color: isCurrent ? (isHighlight ? 'white' : 'var(--color-gray-500)')
                                        : isHighlight ? '#4f46e5'
                                        : 'white',
                                    boxShadow: isCurrent ? 'none'
                                        : isHighlight ? 'none'
                                        : '0 4px 12px rgba(79,70,229,0.25)',
                                    transition: 'opacity 0.15s',
                                    opacity: loading === plan.id ? 0.7 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7
                                }}
                            >
                                {loading === plan.id ? L('Загрузка...', 'Жүктелуде...')
                                    : isCurrent ? L('Ваш текущий план', 'Ағымдағы жоспар')
                                    : <>{plan.cta} <ArrowRight size={15} /></>}
                            </button>
                        </div>
                    )
                })}
            </div>

            {/* ── Token system block ── */}
            <div style={{ borderRadius: 20, border: '1px solid var(--color-gray-100)', background: 'var(--color-white,white)', padding: '32px 28px', marginBottom: 40 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#f59e0b,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Coins size={20} color="white" />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--color-gray-900)' }}>
                            {L('Система токенов', 'Токен жүйесі')}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                            {L('1 токен = 1 тенге', '1 токен = 1 теңге')}
                        </div>
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    {[
                        { icon: <Play size={16} color="#6366f1" />, bg: '#eff6ff', title: L('Реклама', 'Жарнама'), desc: L('10 рекламных видео = 50 токенов/день', '10 жарнама видео = 50 токен/күн') },
                        { icon: <ShoppingBag size={16} color="#10b981" />, bg: '#f0fdf4', title: L('Маркетплейс', 'Маркетплейс'), desc: L('Продавайте уроки за токены — цену ставите вы', 'Сабақтарыңызды токенге сатыңыз') },
                        { icon: <BookOpen size={16} color="#f59e0b" />, bg: '#fffbeb', title: L('Покупка уроков', 'Сабақ сатып алу'), desc: L('Приобретайте уроки коллег за токены', 'Əріптестердің сабақтарын токенге алыңыз') },
                        { icon: <Layers size={16} color="#8b5cf6" />, bg: '#f5f3ff', title: L('3D-материалы', 'Ресурстар'), desc: L('Презентации, краткосрочные планы, визуалы', 'Презентациялар, жоспарлар, визуалдар') },
                    ].map((item, i) => (
                        <div key={i} style={{ background: item.bg, borderRadius: 14, padding: '14px 16px', display: 'flex', gap: 12 }}>
                            <div style={{ flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-gray-900)', marginBottom: 3 }}>{item.title}</div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--color-gray-500)', lineHeight: 1.5 }}>{item.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── What teachers save ── */}
            <div style={{ borderRadius: 20, background: 'linear-gradient(135deg,#0f172a,#1e1b4b)', padding: '32px 28px', color: 'white' }}>
                <h3 style={{ margin: '0 0 20px', fontWeight: 800, fontSize: '1.1rem' }}>
                    {L('Что даёт Urpaq.ai учителю', 'Urpaq.ai мұғалімге не береді')}
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                    {[
                        { icon: <Clock size={18} />, color: '#a5b4fc', val: L('3 часа', '3 сағат'), desc: L('экономии в неделю', 'апталық үнем') },
                        { icon: <Zap size={18} />, color: '#fde68a', val: L('30 сек', '30 сек'), desc: L('на генерацию урока с AI', 'AI арқылы сабақ жасауға') },
                        { icon: <MessageSquare size={18} />, color: '#6ee7b7', val: L('Свой', 'Өз'), desc: L('мессенджер для учеников', 'оқушыларға мессенджер') },
                        { icon: <Globe size={18} />, color: '#c4b5fd', val: L('Экосистема', 'Экожүйе'), desc: L('учителей Казахстана', 'Қазақстан мұғалімдері') },
                    ].map((s, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.06)', borderRadius: 12 }}>
                            <div style={{ color: s.color }}>{s.icon}</div>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: '1rem', color: s.color }}>{s.val}</div>
                                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>{s.desc}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
