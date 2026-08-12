import { useState } from 'react';
import { Check, X, Zap, Building2, GraduationCap, Coins, Crown, ArrowRight } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api';

export default function Pricing() {
    const { language } = useLanguage();
    const { user } = useAuth();
    const [billing, setBilling] = useState('monthly');
    const [loading, setLoading] = useState(null);
    const L = (ru, kk) => language === 'kk' ? kk : ru;

    const plans = [
        {
            id: 'free',
            icon: <GraduationCap size={20} />,
            name: L('Бесплатно', 'Тегін'),
            sub: L('Начните без карты', 'Картасыз бастаңыз'),
            price: { monthly: 0, yearly: 0 },
            tokens: '200',
            credits: '100',
            features: [
                '100 AI-кредитов в месяц',
                'Генерация уроков и слайдов',
                'Публикация уроков — бесплатно',
                'Маркетплейс — покупка уроков',
                '200 стартовых токенов',
                'Реклама → до 50 токенов/день',
            ],
            locked: ['Telegram Hub', 'Авто-фото в слайдах'],
        },
        {
            id: 'pro',
            icon: <Zap size={20} />,
            name: L('Учитель', 'Мұғалім'),
            sub: L('Самый популярный', 'Ең танымал'),
            price: { monthly: 3990, yearly: 2990 },
            tokens: '500',
            credits: '200',
            highlight: true,
            features: [
                '200 AI-кредитов в месяц',
                'Уроки, слайды, краткосрочный план',
                'Авто-фото в слайдах',
                'Telegram Hub — 1 класс',
                'Продажа своих уроков',
                '500 токенов ежемесячно',
                'Аналитика и отчёты',
            ],
            locked: [],
        },
        {
            id: 'premium',
            icon: <Crown size={20} />,
            name: L('Премиум', 'Премиум'),
            sub: L('Всё включено', 'Барлығы кіреді'),
            price: { monthly: 7990, yearly: 5990 },
            tokens: '2 000',
            credits: '∞',
            features: [
                'Безлимитные AI-кредиты',
                'Уроки + слайды + 3D-примеры',
                'Авто-фото и визуальные материалы',
                'Telegram Hub — все классы',
                'Продажа уроков без ограничений',
                '2 000 токенов ежемесячно',
                'Live-уроки без лимитов',
                'Приоритетная поддержка',
            ],
            locked: [],
            gold: true,
        },
        {
            id: 'school',
            icon: <Building2 size={20} />,
            name: L('Школа', 'Мектеп'),
            sub: L('Для всей школы', 'Бүкіл мектеп'),
            price: { monthly: 29990, yearly: 22990 },
            tokens: '10 000',
            credits: '∞',
            contactOnly: true,
            features: [
                'До 50 учителей в одном аккаунте',
                'Безлимитные AI-кредиты',
                'Все функции Премиум',
                'Общая библиотека уроков',
                'Панель администратора',
                '10 000 токенов в месяц',
                'Персональный менеджер',
            ],
            locked: [],
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
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '36px 20px 80px' }}>
            <style>{`
                .plan-hover { transition: box-shadow 0.18s, transform 0.18s; }
                .plan-hover:hover { box-shadow: 0 12px 32px rgba(0,0,0,0.1) !important; transform: translateY(-3px); }
            `}</style>

            {/* ── Header ── */}
            <div style={{ marginBottom: 40 }}>
                <h1 style={{ fontSize: 'clamp(1.6rem,3.5vw,2.2rem)', fontWeight: 900, color: 'var(--color-gray-900)', margin: '0 0 8px', letterSpacing: '-0.4px' }}>
                    {L('Выберите план', 'Жоспар таңдаңыз')}
                </h1>
                <p style={{ color: 'var(--color-gray-500)', fontSize: '0.95rem', margin: '0 0 24px', maxWidth: 460, lineHeight: 1.6 }}>
                    {L(
                        'Публикация уроков бесплатна для всех. Токены — внутренняя валюта платформы для покупки уроков коллег.',
                        'Сабақ жариялау барлығына тегін. Токендер — платформаның ішкі валютасы.'
                    )}
                </p>

                {/* Billing toggle */}
                <div style={{ display: 'inline-flex', background: '#f4f4f5', borderRadius: 10, padding: 3, gap: 2 }}>
                    {[
                        { v: 'monthly', l: L('Помесячно', 'Ай сайын') },
                        { v: 'yearly', l: L('Годовой  −25%', 'Жылдық  −25%') }
                    ].map(o => (
                        <button key={o.v} onClick={() => setBilling(o.v)} style={{
                            padding: '7px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                            fontWeight: 600, fontSize: '0.84rem',
                            background: billing === o.v ? 'white' : 'transparent',
                            color: billing === o.v ? '#111827' : '#9ca3af',
                            boxShadow: billing === o.v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                            transition: 'all 0.12s'
                        }}>{o.l}</button>
                    ))}
                </div>
            </div>

            {/* ── Plans ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
                {plans.map(plan => {
                    const price = billing === 'yearly' ? plan.price.yearly : plan.price.monthly;
                    const isCurrent = user?.plan === plan.id;

                    return (
                        <div key={plan.id} className="plan-hover" style={{
                            background: plan.highlight ? '#18181b' : 'white',
                            border: plan.gold ? '2px solid #f59e0b'
                                : plan.highlight ? 'none'
                                : '1px solid #e5e7eb',
                            borderRadius: 16,
                            padding: '24px 22px',
                            display: 'flex', flexDirection: 'column',
                            position: 'relative',
                            boxShadow: plan.highlight ? '0 8px 28px rgba(0,0,0,0.2)' : '0 1px 6px rgba(0,0,0,0.04)',
                        }}>
                            {/* Tag */}
                            {plan.gold && (
                                <div style={{ position: 'absolute', top: -12, left: 22, background: '#f59e0b', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '3px 12px', borderRadius: 20 }}>
                                    {L('Лучший выбор', 'Ең жақсы таңдау')}
                                </div>
                            )}
                            {plan.highlight && (
                                <div style={{ position: 'absolute', top: -12, left: 22, background: '#6366f1', color: 'white', fontSize: '0.7rem', fontWeight: 800, padding: '3px 12px', borderRadius: 20 }}>
                                    {L('Популярный', 'Танымал')}
                                </div>
                            )}
                            {isCurrent && (
                                <div style={{ position: 'absolute', top: -12, right: 22, background: '#dcfce7', color: '#15803d', fontSize: '0.7rem', fontWeight: 800, padding: '3px 12px', borderRadius: 20 }}>
                                    {L('Ваш план', 'Сіздің жоспарыңыз')}
                                </div>
                            )}

                            {/* Icon + name */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
                                <div style={{
                                    width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: plan.gold ? '#fef3c7' : plan.highlight ? 'rgba(255,255,255,0.1)' : '#f4f4f5',
                                    color: plan.gold ? '#f59e0b' : plan.highlight ? 'white' : '#6366f1'
                                }}>
                                    {plan.icon}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: plan.highlight ? 'white' : '#111827' }}>{plan.name}</div>
                                    <div style={{ fontSize: '0.72rem', color: plan.highlight ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>{plan.sub}</div>
                                </div>
                            </div>

                            {/* Price */}
                            <div style={{ marginBottom: 20 }}>
                                {price === 0 ? (
                                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: plan.highlight ? 'white' : '#111827' }}>
                                        {L('Бесплатно', 'Тегін')}
                                    </span>
                                ) : (
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                        <span style={{ fontSize: '1.8rem', fontWeight: 900, color: plan.highlight ? 'white' : '#111827', lineHeight: 1 }}>
                                            {price.toLocaleString('ru-RU')}
                                        </span>
                                        <span style={{ fontSize: '0.8rem', color: plan.highlight ? 'rgba(255,255,255,0.45)' : '#9ca3af' }}>
                                            ₸/{L('мес', 'ай')}
                                        </span>
                                    </div>
                                )}
                                {/* Tokens */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 7 }}>
                                    <Coins size={13} color="#f59e0b" />
                                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#6b7280' }}>
                                        {plan.tokens} {L('токенов', 'токен')}
                                        {plan.id !== 'free' && ` / ${L('мес', 'ай')}`}
                                    </span>
                                </div>
                            </div>

                            {/* Divider */}
                            <div style={{ height: 1, background: plan.highlight ? 'rgba(255,255,255,0.08)' : '#f3f4f6', marginBottom: 16 }} />

                            {/* Features */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                                {plan.features.map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                        <Check size={14} color={plan.highlight ? '#a5b4fc' : '#6366f1'} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 2 }} />
                                        <span style={{ fontSize: '0.83rem', color: plan.highlight ? 'rgba(255,255,255,0.8)' : '#374151', lineHeight: 1.45 }}>{f}</span>
                                    </div>
                                ))}
                                {plan.locked.map((f, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                                        <X size={13} color="#d1d5db" strokeWidth={2} style={{ flexShrink: 0, marginTop: 2 }} />
                                        <span style={{ fontSize: '0.83rem', color: '#c4c4c4', lineHeight: 1.45 }}>{f}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA */}
                            <button onClick={() => handleSubscribe(plan)} disabled={isCurrent || loading === plan.id}
                                style={{
                                    width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                                    cursor: isCurrent ? 'default' : 'pointer',
                                    fontWeight: 700, fontSize: '0.875rem',
                                    background: isCurrent ? (plan.highlight ? 'rgba(255,255,255,0.1)' : '#f4f4f5')
                                        : plan.gold ? '#f59e0b'
                                        : plan.highlight ? 'white'
                                        : plan.id === 'school' ? '#18181b'
                                        : '#6366f1',
                                    color: isCurrent ? (plan.highlight ? 'rgba(255,255,255,0.4)' : '#9ca3af')
                                        : plan.gold ? 'white'
                                        : plan.highlight ? '#4f46e5'
                                        : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    opacity: loading === plan.id ? 0.6 : 1,
                                    transition: 'opacity 0.15s'
                                }}>
                                {loading === plan.id ? '...'
                                    : isCurrent ? L('Текущий план', 'Ағымдағы жоспар')
                                    : plan.id === 'free' ? L('Это ваш план', 'Бұл сіздің жоспарыңыз')
                                    : <>{plan.cta || plan.name} <ArrowRight size={14} /></>}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ── Token section ── */}
            <div style={{ borderRadius: 16, border: '1px solid #e5e7eb', padding: '28px 24px', background: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <Coins size={20} color="#f59e0b" />
                    <div>
                        <div style={{ fontWeight: 800, color: '#111827', fontSize: '1rem' }}>
                            {L('Токены — внутренняя валюта', 'Токендер — ішкі валюта')}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>
                            {L('1 токен = 1 тенге', '1 токен = 1 теңге')}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {[
                        {
                            title: L('Бесплатное пополнение', 'Тегін толтыру'),
                            desc: L('Смотрите 10 видео в день и получайте 50 токенов. Каждый день.', 'Күніне 10 бейне қараңыз — 50 токен алыңыз.'),
                            color: '#6366f1', bg: '#f5f3ff'
                        },
                        {
                            title: L('Покупайте уроки', 'Сабақ сатып алыңыз'),
                            desc: L('Уроки, презентации, планы — приобретайте за токены у коллег.', 'Сабақтар мен презентацияларды əріптестерден токенге алыңыз.'),
                            color: '#f59e0b', bg: '#fffbeb'
                        },
                        {
                            title: L('Продавайте свои', 'Өзіңіздікін сатыңыз'),
                            desc: L('Публикация бесплатна. Цену устанавливаете вы сами. Комиссии нет.', 'Жариялау тегін. Бағаны өзіңіз белгілейсіз. Комиссия жоқ.'),
                            color: '#10b981', bg: '#f0fdf4'
                        },
                    ].map((item, i) => (
                        <div key={i} style={{ background: item.bg, borderRadius: 12, padding: '16px 18px', borderLeft: `3px solid ${item.color}` }}>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 5 }}>{item.title}</div>
                            <div style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.55 }}>{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
