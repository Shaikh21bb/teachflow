import React, { useState } from 'react';
import { 
    Check, ArrowRight, MessageCircle, 
    Zap, Users, Building2, GraduationCap,
    Sparkles, TrendingUp, Star
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE } from '../api';

const Pricing = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState('monthly');
    const [loading, setLoading] = useState(null);

    const L = (kk, ru) => language === 'kk' ? kk : ru;

    const plans = [
        {
            id: 'free',
            icon: <GraduationCap size={24} />,
            iconBg: '#f0f9ff',
            iconColor: '#0284c7',
            name: L('Старт', 'Старт'),
            tagline: L('Тегін, мәңгіге', 'Бесплатно, навсегда'),
            price: { monthly: 0, yearly: 0 },
            priceLabel: L('тегін', 'бесплатно'),
            highlight: false,
            cta: L('Қазір бастау', 'Начать сейчас'),
            ctaStyle: 'outline',
            features: [
                { text: L('3 AI-генерация айына', '3 AI-генерации в месяц'), available: true },
                { text: L('5 сабақ жасауға болады', '5 уроков'), available: true },
                { text: L('1 оқу сыныбы', '1 учебный класс'), available: true },
                { text: L('Базалық конструктор', 'Базовый конструктор'), available: true },
                { text: L('PDF экспорт', 'Экспорт в PDF'), available: true },
                { text: L('AI-тест генераторы', 'AI-генератор тестов'), available: false },
                { text: L('Аналитика', 'Аналитика'), available: false },
            ]
        },
        {
            id: 'pro',
            icon: <Zap size={24} />,
            iconBg: '#eff6ff',
            iconColor: '#2563eb',
            name: L('Мұғалім', 'Учитель'),
            tagline: L('Белсенді педагогтар үшін', 'Для активных педагогов'),
            price: { monthly: 3990, yearly: 2990 },
            popular: true,
            highlight: true,
            cta: L('Pro таңдау →', 'Выбрать →'),
            ctaStyle: 'gradient',
            badge: L('Ең танымал 🔥', 'Топ выбор 🔥'),
            features: [
                { text: L('60 AI-генерация айына', '60 AI-генераций в месяц'), available: true },
                { text: L('Шексіз сабақтар', 'Безлимитные уроки'), available: true },
                { text: L('5 оқу сыныбы', '5 учебных классов'), available: true },
                { text: L('AI-тест генераторы', 'AI-генератор тестов'), available: true },
                { text: L('Толық аналитика', 'Полная аналитика'), available: true },
                { text: L('Telegram интеграциясы', 'Интеграция с Telegram'), available: true },
                { text: L('Қолдау (24 сағат)', 'Поддержка (24ч)'), available: true },
            ],
            savings: L('Жылдық: 11,880 ₸ үнемдейсіз', 'Годовая: экономия 11,880 ₸')
        },
        {
            id: 'team',
            icon: <Users size={24} />,
            iconBg: '#f5f3ff',
            iconColor: '#7c3aed',
            name: L('Команда', 'Команда'),
            tagline: L('Оқу орталықтары үшін', 'Для учебных центров'),
            price: { monthly: 12900, yearly: 9900 },
            highlight: false,
            cta: L('Команда таңдау →', 'Выбрать Команда →'),
            ctaStyle: 'dark',
            features: [
                { text: L('300 AI-генерация айына', '300 AI-генераций в месяц'), available: true },
                { text: L('5 мұғалім аккаунты', '5 аккаунтов учителей'), available: true },
                { text: L('30 оқу сыныбына дейін', 'До 30 учебных классов'), available: true },
                { text: L('Ортақ кітапхана', 'Общая библиотека'), available: true },
                { text: L('Басқару панелі (базалық)', 'Панель управления (базовая)'), available: true },
                { text: L('Командалық аналитика', 'Командная аналитика'), available: true },
                { text: L('Басымдықты қолдау (4 сағат)', 'Приоритетная поддержка (4ч)'), available: true },
            ],
            savings: L('Жылдық: 35,400 ₸ үнемдейсіз', 'Годовая: экономия 35,400 ₸'),
            tag: L('🆕 Жаңа', '🆕 Новинка')
        },
        {
            id: 'school',
            icon: <Building2 size={24} />,
            iconBg: '#fff7ed',
            iconColor: '#c2410c',
            name: L('Мектеп', 'Школа'),
            tagline: L('Толық мектептер үшін', 'Для полноценных школ'),
            price: { monthly: 39900, yearly: 29900 },
            highlight: false,
            cta: L('Бізбен хабарласу →', 'Связаться с нами →'),
            ctaStyle: 'dark',
            contactOnly: true,
            features: [
                { text: L('1,500 AI-генерация айына', '1,500 AI-генераций в месяц'), available: true },
                { text: L('30 мұғалімге дейін', 'До 30 учителей'), available: true },
                { text: L('Шексіз сыныптар', 'Безлимитные классы'), available: true },
                { text: L('Брендинг порталы', 'Брендирование портала'), available: true },
                { text: L('Толық Admin-панель', 'Полная Админ-панель'), available: true },
                { text: L('Жеке менеджер', 'Персональный менеджер'), available: true },
                { text: L('API қол жеткізу', 'API-доступ'), available: true },
            ],
            savings: L('Жылдық: 119,600 ₸ үнемдейсіз', 'Годовая: экономия 119,600 ₸')
        }
    ];

    const handleSubscribe = async (plan) => {
        if (plan.id === 'free') return;
        if (plan.contactOnly) {
            window.open('https://wa.me/77771225784', '_blank');
            return;
        }

        setLoading(plan.id);
        try {
            const response = await fetch(`${API_BASE}/kaspi/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ planId: plan.id, billingCycle })
            });

            const data = await response.json();
            if (data.success && data.paymentUrl) {
                window.location.href = data.paymentUrl;
            } else {
                alert(data.error || L('Қате шықты', 'Ошибка при создании заказа'));
            }
        } catch (error) {
            console.error('Subscription error:', error);
            alert(L('Төлемді бастау мүмкін болмады', 'Не удалось инициализировать оплату'));
        } finally {
            setLoading(null);
        }
    };

    const yearSavingsPercent = 25;

    return (
        <div style={{ 
            maxWidth: '1280px', 
            margin: '0 auto', 
            padding: '60px 24px 80px',
            fontFamily: 'inherit'
        }}>
            <style>{`
                @keyframes priceFadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .plan-card {
                    animation: priceFadeUp 0.5s ease-out forwards;
                    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
                }
                .plan-card:hover {
                    transform: translateY(-8px) !important;
                }
                .cta-gradient {
                    background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                    color: white;
                    border: none;
                }
                .cta-gradient:hover {
                    opacity: 0.9;
                    box-shadow: 0 8px 24px rgba(37, 99, 235, 0.35);
                }
                .cta-outline {
                    background: transparent;
                    color: #374151;
                    border: 1.5px solid #e5e7eb;
                }
                .cta-outline:hover { background: #f9fafb; }
                .cta-dark {
                    background: #111827;
                    color: white;
                    border: none;
                }
                .cta-dark:hover { background: #1f2937; }
                .feature-check { color: #16a34a; }
                .feature-x { color: #d1d5db; }
                .toggle-track {
                    width: 52px; height: 28px;
                    border-radius: 14px;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    border: none;
                    position: relative;
                    cursor: pointer;
                    transition: all 0.2s;
                    padding: 3px;
                    display: flex;
                    align-items: center;
                }
                .toggle-thumb {
                    width: 22px; height: 22px;
                    border-radius: 50%;
                    background: white;
                    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 4px rgba(0,0,0,0.2);
                }
            `}</style>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
                <div style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: '#eff6ff', color: '#2563eb',
                    padding: '6px 16px', borderRadius: '20px',
                    fontSize: '13px', fontWeight: 700,
                    marginBottom: '20px'
                }}>
                    <Sparkles size={14} />
                    {L('TeachFlow — Мұғалімдер үшін', 'TeachFlow — Для учителей')}
                </div>
                <h1 style={{ 
                    fontSize: 'clamp(32px, 5vw, 52px)', 
                    fontWeight: 900, 
                    letterSpacing: '-0.03em',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #7c3aed 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    marginBottom: '16px',
                    lineHeight: 1.15
                }}>
                    {L('Тарифтік жоспарлар', 'Тарифные планы')}
                </h1>
                <p style={{ 
                    fontSize: '18px', color: '#6b7280', 
                    maxWidth: '520px', margin: '0 auto', lineHeight: 1.6
                }}>
                    {L(
                        'Платформада жұмыс жасаңыз және нәтижені көріңіз. Бірінші клиенттен бастап маржа жоғары.',
                        'Работайте на платформе и видьте результат. Высокая маржа с первого клиента.'
                    )}
                </p>

                {/* Billing Toggle */}
                <div style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '16px',
                    background: '#f9fafb', border: '1px solid #e5e7eb',
                    borderRadius: '16px', padding: '10px 20px',
                    marginTop: '36px'
                }}>
                    <span style={{ 
                        fontSize: '14px', fontWeight: billingCycle === 'monthly' ? 700 : 500,
                        color: billingCycle === 'monthly' ? '#111827' : '#9ca3af',
                        transition: 'all 0.2s'
                    }}>
                        {L('Айына', 'В месяц')}
                    </span>
                    <button 
                        className="toggle-track"
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                    >
                        <div 
                            className="toggle-thumb"
                            style={{ transform: billingCycle === 'yearly' ? 'translateX(24px)' : 'translateX(0)' }}
                        />
                    </button>
                    <span style={{ 
                        fontSize: '14px', fontWeight: billingCycle === 'yearly' ? 700 : 500,
                        color: billingCycle === 'yearly' ? '#111827' : '#9ca3af',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        transition: 'all 0.2s'
                    }}>
                        {L('Жылына', 'В год')}
                        <span style={{
                            background: 'linear-gradient(135deg, #16a34a, #15803d)',
                            color: 'white',
                            fontSize: '11px', fontWeight: 800,
                            padding: '2px 10px', borderRadius: '10px',
                            letterSpacing: '0.02em'
                        }}>
                            -{yearSavingsPercent}%
                        </span>
                    </span>
                </div>
            </div>

            {/* Plans Grid */}
            <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                gap: '24px',
                marginBottom: '64px',
                alignItems: 'start'
            }}>
                {plans.map((plan, idx) => {
                    const price = billingCycle === 'yearly' ? plan.price.yearly : plan.price.monthly;
                    const isCurrentPlan = user?.plan === plan.id;

                    return (
                        <div
                            key={plan.id}
                            className="plan-card"
                            style={{
                                background: plan.highlight 
                                    ? 'linear-gradient(145deg, #1e40af 0%, #5b21b6 100%)'
                                    : 'white',
                                borderRadius: '24px',
                                padding: '32px',
                                boxShadow: plan.highlight 
                                    ? '0 20px 60px rgba(37, 99, 235, 0.3)' 
                                    : '0 4px 20px rgba(0,0,0,0.05)',
                                border: plan.highlight 
                                    ? 'none'
                                    : '1px solid #f1f5f9',
                                display: 'flex',
                                flexDirection: 'column',
                                position: 'relative',
                                overflow: 'hidden',
                                animationDelay: `${idx * 0.08}s`
                            }}
                        >
                            {/* Popular Badge */}
                            {plan.badge && (
                                <div style={{
                                    position: 'absolute',
                                    top: '20px', right: '20px',
                                    background: 'rgba(255,255,255,0.2)',
                                    backdropFilter: 'blur(8px)',
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px', fontWeight: 700
                                }}>
                                    {plan.badge}
                                </div>
                            )}

                            {plan.tag && !plan.highlight && (
                                <div style={{
                                    position: 'absolute',
                                    top: '20px', right: '20px',
                                    background: '#f5f3ff',
                                    color: '#7c3aed',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '12px', fontWeight: 700
                                }}>
                                    {plan.tag}
                                </div>
                            )}

                            {/* Icon */}
                            <div style={{
                                width: '48px', height: '48px',
                                borderRadius: '14px',
                                background: plan.highlight ? 'rgba(255,255,255,0.2)' : plan.iconBg,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: plan.highlight ? 'white' : plan.iconColor,
                                marginBottom: '20px'
                            }}>
                                {plan.icon}
                            </div>

                            {/* Name & Tagline */}
                            <h3 style={{ 
                                fontSize: '22px', fontWeight: 800,
                                color: plan.highlight ? 'white' : '#111827',
                                margin: '0 0 6px 0'
                            }}>
                                {plan.name}
                            </h3>
                            <p style={{ 
                                fontSize: '13px',
                                color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#6b7280',
                                margin: '0 0 28px 0'
                            }}>
                                {plan.tagline}
                            </p>

                            {/* Price */}
                            <div style={{ marginBottom: '28px' }}>
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                                    {price === 0 ? (
                                        <span style={{ 
                                            fontSize: '40px', fontWeight: 900,
                                            color: plan.highlight ? 'white' : '#111827',
                                            letterSpacing: '-0.03em'
                                        }}>
                                            {L('Тегін', 'Бесплатно')}
                                        </span>
                                    ) : (
                                        <>
                                            <span style={{ 
                                                fontSize: '40px', fontWeight: 900,
                                                color: plan.highlight ? 'white' : '#111827',
                                                letterSpacing: '-0.03em'
                                            }}>
                                                {price.toLocaleString()} ₸
                                            </span>
                                            <span style={{ 
                                                fontSize: '14px',
                                                color: plan.highlight ? 'rgba(255,255,255,0.7)' : '#9ca3af'
                                            }}>
                                                /{L('ай', 'мес')}
                                            </span>
                                        </>
                                    )}
                                </div>
                                {billingCycle === 'yearly' && plan.savings && price > 0 && (
                                    <div style={{ 
                                        marginTop: '8px',
                                        fontSize: '12px',
                                        color: plan.highlight ? 'rgba(255,255,255,0.6)' : '#16a34a',
                                        fontWeight: 600
                                    }}>
                                        💰 {plan.savings}
                                    </div>
                                )}
                                {billingCycle === 'monthly' && price > 0 && (
                                    <div style={{ 
                                        marginTop: '8px',
                                        fontSize: '12px',
                                        color: plan.highlight ? 'rgba(255,255,255,0.55)' : '#9ca3af'
                                    }}>
                                        {L('Жылдыққа ауысып үнемдеңіз', 'Перейдите на годовой и сэкономьте')}
                                    </div>
                                )}
                            </div>

                            {/* Divider */}
                            <div style={{ 
                                height: '1px', 
                                background: plan.highlight ? 'rgba(255,255,255,0.15)' : '#f1f5f9',
                                marginBottom: '24px'
                            }} />

                            {/* Features */}
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px 0', flex: 1 }}>
                                {plan.features.map((feature, i) => (
                                    <li key={i} style={{ 
                                        display: 'flex', alignItems: 'flex-start', gap: '10px',
                                        marginBottom: '12px',
                                        opacity: feature.available ? 1 : 0.45
                                    }}>
                                        <div style={{
                                            width: '18px', height: '18px',
                                            borderRadius: '50%',
                                            background: feature.available 
                                                ? (plan.highlight ? 'rgba(255,255,255,0.25)' : '#dcfce7')
                                                : '#f3f4f6',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            flexShrink: 0,
                                            marginTop: '2px'
                                        }}>
                                            <Check 
                                                size={11} 
                                                strokeWidth={3}
                                                color={feature.available 
                                                    ? (plan.highlight ? 'white' : '#16a34a')
                                                    : '#9ca3af'
                                                }
                                            />
                                        </div>
                                        <span style={{ 
                                            fontSize: '14px', lineHeight: '1.5',
                                            color: plan.highlight 
                                                ? (feature.available ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)')
                                                : (feature.available ? '#374151' : '#9ca3af'),
                                            textDecoration: feature.available ? 'none' : 'line-through'
                                        }}>
                                            {feature.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            {/* CTA Button */}
                            <button
                                disabled={loading === plan.id || isCurrentPlan}
                                onClick={() => handleSubscribe(plan)}
                                className={`cta-${plan.ctaStyle}`}
                                style={{
                                    width: '100%',
                                    padding: '14px 20px',
                                    borderRadius: '14px',
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    cursor: (loading === plan.id || isCurrentPlan) ? 'not-allowed' : 'pointer',
                                    opacity: (loading === plan.id || isCurrentPlan) ? 0.6 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s',
                                    ...(plan.highlight ? {
                                        background: 'white',
                                        color: '#1e40af',
                                        border: 'none',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
                                    } : {})
                                }}
                            >
                                {loading === plan.id ? (
                                    <span>{L('Жүктелуде...', 'Загрузка...')}</span>
                                ) : isCurrentPlan ? (
                                    <span>✓ {L('Ағымдағы жоспар', 'Текущий план')}</span>
                                ) : (
                                    <span>{plan.cta}</span>
                                )}
                            </button>

                            {plan.id === 'pro' && (
                                <div style={{ 
                                    marginTop: '12px', textAlign: 'center',
                                    fontSize: '12px',
                                    color: 'rgba(255,255,255,0.55)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                                }}>
                                    <img src="/kaspi-logo.png" alt="Kaspi" style={{ width: '14px', height: '14px', borderRadius: '3px' }} />
                                    <span style={{ color: plan.highlight ? 'rgba(255,255,255,0.55)' : '#9ca3af' }}>
                                        {L('Kaspi.kz арқылы төлеу', 'Оплата через Kaspi.kz')}
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ROI / Value Banner */}
            <div style={{ 
                background: 'linear-gradient(135deg, #eff6ff 0%, #f5f3ff 100%)',
                borderRadius: '24px', padding: '40px',
                marginBottom: '48px',
                border: '1px solid #ddd6fe'
            }}>
                <h3 style={{ 
                    textAlign: 'center', fontSize: '22px', fontWeight: 800,
                    color: '#1e1b4b', marginBottom: '32px'
                }}>
                    {L('Неге TeachFlow-ға ақша жұмсау тиімді?', 'Почему TeachFlow окупается?')}
                </h3>
                <div style={{ 
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '24px'
                }}>
                    {[
                        {
                            icon: '⏱️',
                            value: L('3 сағат/апта', '3 часа/неделю'),
                            label: L('үнемделетін уақыт', 'экономия времени'),
                            sub: L('Сабақ жоспарлауда', 'При планировании уроков')
                        },
                        {
                            icon: '🤖',
                            value: L('60 AI-генерация', '60 AI-генераций'),
                            label: L('"Мұғалім" тарифінде', 'в тарифе "Учитель"'),
                            sub: L('Айына 3,990 ₸ = 66 ₸/генерация', '3,990 ₸/мес = 66 ₸/генерация')
                        },
                        {
                            icon: '📈',
                            value: L('1 платеж = жеткілікті', '1 платёж = достаточно'),
                            label: L('шығынды жабу үшін', 'для покрытия расходов'),
                            sub: L('Сервер: 3,200 ₸/ай', 'Сервер: 3,200 ₸/мес')
                        },
                        {
                            icon: '🎯',
                            value: '94%',
                            label: L('маржа', 'маржа'),
                            sub: L('Мұғалім тарифінде', 'В тарифе Учитель')
                        }
                    ].map((item, i) => (
                        <div key={i} style={{ 
                            textAlign: 'center',
                            background: 'white', borderRadius: '16px', padding: '24px',
                            boxShadow: '0 2px 12px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ fontSize: '28px', marginBottom: '12px' }}>{item.icon}</div>
                            <div style={{ 
                                fontSize: '22px', fontWeight: 900,
                                color: '#1e40af', marginBottom: '4px'
                            }}>
                                {item.value}
                            </div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '4px' }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Contact CTA */}
            <div style={{ 
                background: '#111827',
                borderRadius: '24px', padding: '48px 40px',
                textAlign: 'center',
                position: 'relative', overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
                    background: 'radial-gradient(ellipse at top right, rgba(99,102,241,0.15) 0%, transparent 60%)',
                    pointerEvents: 'none'
                }} />
                <Star size={32} style={{ color: '#fbbf24', marginBottom: '16px' }} />
                <h4 style={{ 
                    fontSize: '26px', fontWeight: 800, color: 'white',
                    marginBottom: '12px'
                }}>
                    {L('Сұрақтар бар ма?', 'Есть вопросы?')}
                </h4>
                <p style={{ 
                    color: '#9ca3af', fontSize: '16px',
                    marginBottom: '28px', maxWidth: '400px', margin: '0 auto 28px'
                }}>
                    {L(
                        'Командамыз мектебіңіз үшін ең тиімді тарифті таңдауға көмектеседі.',
                        'Наша команда поможет выбрать лучший план для вашей школы.'
                    )}
                </p>
                <a 
                    href="https://wa.me/77771225784"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: 'inline-flex', alignItems: 'center', gap: '10px',
                        background: '#25D366',
                        color: 'white', fontWeight: 700, fontSize: '15px',
                        padding: '14px 32px', borderRadius: '14px',
                        textDecoration: 'none',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                    <MessageCircle size={20} />
                    {L('WhatsApp-та хабарласу', 'Написать в WhatsApp')}
                </a>
            </div>
        </div>
    );
};

export default Pricing;
