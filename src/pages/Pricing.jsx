import React, { useState } from 'react';
import { 
    Check, Zap, Shield, Star, 
    ArrowRight, MessageCircle, AlertCircle,
    Cpu, BookOpen, Users, Globe 
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';

const Pricing = () => {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
    const [loading, setLoading] = useState(false);

    const plans = [
        {
            id: 'free',
            name: { ru: 'Базовый', kk: 'Базалық' },
            price: 0,
            description: { ru: 'Идеально для начала работы', kk: 'Жұмысты бастауға өте ыңғайлы' },
            features: [
                { ru: '5 интерактивных уроков', kk: '5 интерактивті сабақ' },
                { ru: '1 учебный класс', kk: '1 оқу сыныбы' },
                { ru: '10 AI-кредитов в месяц', kk: 'Айына 10 AI-несие' },
                { ru: 'Базовый конструктор', kk: 'Базалық конструктор' },
                { ru: 'Экспорт в PDF', kk: 'PDF форматына экспорттау' }
            ],
            color: 'var(--color-gray-500)',
            cta: { ru: 'Текущий план', kk: 'Ағымдағы жоспар' },
            premium: false
        },
        {
            id: 'pro',
            name: { ru: 'Профи', kk: 'Профи' },
            price: billingCycle === 'monthly' ? 4990 : 3990,
            description: { ru: 'Для активных учителей', kk: 'Белсенді мұғалімдер үшін' },
            features: [
                { ru: 'Безлимитные уроки', kk: 'Шексіз сабақтар' },
                { ru: 'До 10 учебных классов', kk: '10 оқу сыныбына дейін' },
                { ru: '100 AI-кредитов в месяц', kk: 'Айына 100 AI-несие' },
                { ru: 'AI-генератор тестов', kk: 'AI-тест генераторы' },
                { ru: 'Приоритетная поддержка', kk: 'Басымдықты қолдау' },
                { ru: 'Интеграция с Telegram', kk: 'Telegram интеграциясы' }
            ],
            color: 'var(--color-primary-600)',
            cta: { ru: 'Выбрать Pro', kk: 'Pro таңдау' },
            premium: true,
            popular: true
        },
        {
            id: 'school',
            name: { ru: 'Школа', kk: 'Мектеп' },
            price: 29900,
            description: { ru: 'Для образовательных центров', kk: 'Оқу орталықтары үшін' },
            features: [
                { ru: 'Безлимитные классы', kk: 'Шексіз сыныптар' },
                { ru: '500 AI-кредитов в месяц', kk: 'Айына 500 AI-несие' },
                { ru: 'Админ-панель управления', kk: 'Басқару админ-панелі' },
                { ru: 'Общая библиотека материалов', kk: 'Материалдардың ортақ кітапханасы' },
                { ru: 'Индивидуальное обучение', kk: 'Жеке оқыту' },
                { ru: 'Брендирование портала', kk: 'Порталды брендингтеу' }
            ],
            color: 'var(--color-warning-500)',
            cta: { ru: 'Связаться с нами', kk: 'Бізбен хабарласу' },
            premium: true
        }
    ];

    const handleSubscribe = async (planId) => {
        if (planId === 'free') return;
        if (planId === 'school') {
            window.open('https://wa.me/77771225784', '_blank');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/kaspi/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ planId })
            });

            const data = await response.json();
            if (data.success && data.paymentUrl) {
                // In demo/mock mode, we'll open the mock payment page
                // In production, we'd redirect to Kaspi Pay or show a QR code
                window.location.href = data.paymentUrl;
            } else {
                alert(data.error || 'Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Subscription error:', error);
            alert('Не удалось инициализировать оплату');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pricing-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--spacing-8) var(--spacing-4)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-12)' }}>
                <h1 style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 800, marginBottom: 'var(--spacing-4)', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {language === 'kk' ? 'Тарифтік жоспарлар' : 'Тарифные планы'}
                </h1>
                <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-lg)', maxWidth: '600px', margin: '0 auto' }}>
                    {language === 'kk' 
                        ? 'Сабақтарыңызды жаңа деңгейге көтеріңіз. Сізге қолайлы жазылымды таңдаңыз.' 
                        : 'Поднимите ваши уроки на новый уровень. Выберите подходящую подписку.'}
                </p>

                {/* Billing Toggle */}
                <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    marginTop: 'var(--spacing-8)',
                    gap: 'var(--spacing-4)'
                }}>
                    <span style={{ fontWeight: billingCycle === 'monthly' ? 600 : 400, color: billingCycle === 'monthly' ? 'var(--color-gray-900)' : 'var(--color-gray-500)' }}>
                        {language === 'kk' ? 'Айына' : 'В месяц'}
                    </span>
                    <button 
                        onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                        style={{
                            width: '48px',
                            height: '24px',
                            borderRadius: '12px',
                            background: 'var(--color-primary-500)',
                            border: 'none',
                            position: 'relative',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px'
                        }}
                    >
                        <div style={{
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: 'white',
                            transform: billingCycle === 'yearly' ? 'translateX(24px)' : 'translateX(0)',
                            transition: 'transform 0.2s'
                        }} />
                    </button>
                    <span style={{ fontWeight: billingCycle === 'yearly' ? 600 : 400, color: billingCycle === 'yearly' ? 'var(--color-gray-900)' : 'var(--color-gray-500)' }}>
                        {language === 'kk' ? 'Жылына' : 'В год'}
                        <span style={{ 
                            marginLeft: '8px', 
                            background: 'var(--color-success-100)', 
                            color: 'var(--color-success-700)', 
                            fontSize: '12px', 
                            padding: '2px 8px', 
                            borderRadius: '12px' 
                        }}>
                            -20%
                        </span>
                    </span>
                </div>
            </div>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
                gap: 'var(--spacing-8)',
                marginBottom: 'var(--spacing-16)'
            }}>
                {plans.map((plan) => (
                    <div 
                        key={plan.id}
                        className={`pricing-card ${plan.popular ? 'popular' : ''}`}
                        style={{
                            background: 'white',
                            borderRadius: 'var(--radius-2xl)',
                            padding: 'var(--spacing-8)',
                            boxShadow: plan.popular ? 'var(--shadow-2xl)' : 'var(--shadow-lg)',
                            border: plan.popular ? '2px solid var(--color-primary-500)' : '1px solid var(--color-gray-100)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            transition: 'transform 0.3s ease',
                            cursor: 'default'
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-10px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                    >
                        {plan.popular && (
                            <div style={{
                                position: 'absolute',
                                top: '0',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'var(--gradient-primary)',
                                color: 'white',
                                padding: '4px 16px',
                                borderRadius: '20px',
                                fontSize: '14px',
                                fontWeight: 700,
                                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                            }}>
                                {language === 'kk' ? 'Ең танымал' : 'Самый популярный'}
                            </div>
                        )}

                        <div style={{ marginBottom: 'var(--spacing-6)' }}>
                            <h3 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: 'var(--color-gray-900)' }}>
                                {plan.name[language]}
                            </h3>
                            <p style={{ color: 'var(--color-gray-500)', fontSize: 'var(--font-size-sm)', marginTop: '4px' }}>
                                {plan.description[language]}
                            </p>
                        </div>

                        <div style={{ marginBottom: 'var(--spacing-8)' }}>
                            <span style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 800, color: 'var(--color-gray-900)' }}>
                                {plan.price.toLocaleString()} ₸
                            </span>
                            <span style={{ color: 'var(--color-gray-500)', marginLeft: '4px' }}>
                                /{language === 'kk' ? 'ай' : 'мес'}
                            </span>
                        </div>

                        <div style={{ flex: 1 }}>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                {plan.features.map((feature, idx) => (
                                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 'var(--spacing-4)', color: 'var(--color-gray-600)' }}>
                                        <div style={{ 
                                            width: '20px', 
                                            height: '20px', 
                                            borderRadius: '50%', 
                                            background: 'var(--color-success-100)', 
                                            color: 'var(--color-success-600)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0
                                        }}>
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                        <span style={{ fontSize: 'var(--font-size-sm)' }}>{feature[language]}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <button 
                            disabled={loading || (user?.plan === plan.id)}
                            onClick={() => handleSubscribe(plan.id)}
                            style={{
                                marginTop: 'var(--spacing-8)',
                                width: '100%',
                                padding: '12px',
                                borderRadius: 'var(--radius-xl)',
                                background: user?.plan === plan.id ? 'var(--color-gray-100)' : (plan.popular ? 'var(--gradient-primary)' : 'var(--color-gray-900)'),
                                color: user?.plan === plan.id ? 'var(--color-gray-400)' : 'white',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: 'var(--font-size-md)',
                                cursor: (loading || user?.plan === plan.id) ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading ? (
                                <div className="spinner-sm" />
                            ) : (
                                <>
                                    {user?.plan === plan.id ? (language === 'kk' ? 'Ағымдағы' : 'Текущий') : plan.cta[language]}
                                    {plan.id !== 'free' && user?.plan !== plan.id && <ArrowRight size={18} />}
                                </>
                            )}
                        </button>

                        {plan.id === 'pro' && (
                            <div style={{ 
                                marginTop: 'var(--spacing-4)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: '8px',
                                fontSize: '12px',
                                color: 'var(--color-gray-400)'
                            }}>
                                <img src="/kaspi-logo.png" alt="Kaspi" style={{ width: '16px', height: '16px', borderRadius: '4px' }} />
                                <span>Оплата через Kaspi.kz</span>
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Refund Policy / FAQ Hint */}
            <div style={{ 
                background: 'var(--color-primary-50)', 
                borderRadius: 'var(--radius-2xl)', 
                padding: 'var(--spacing-8)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
            }}>
                <div style={{ 
                    width: '48px', 
                    height: '48px', 
                    borderRadius: '50%', 
                    background: 'var(--color-primary-100)', 
                    color: 'var(--color-primary-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--spacing-4)'
                }}>
                    <MessageCircle size={24} />
                </div>
                <h4 style={{ fontWeight: 700, fontSize: 'var(--font-size-xl)', marginBottom: 'var(--spacing-2)' }}>
                    {language === 'kk' ? 'Сұрақтарыңыз бар ма?' : 'Есть вопросы по тарифам?'}
                </h4>
                <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--spacing-6)', maxWidth: '450px' }}>
                    {language === 'kk' 
                        ? 'Біздің команда сізге мектебіңіз бен оқушыларыңыз үшін ең жақсы таңдау жасауға көмектеседі.' 
                        : 'Наша команда поможет вам сделать лучший выбор для вашей школы и учеников.'}
                </p>
                <a 
                    href="https://wa.me/77771225784" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{ padding: '12px 32px' }}
                >
                    {language === 'kk' ? 'Қолдау қызметіне жазу' : 'Написать в поддержку'}
                </a>
            </div>
        </div>
    );
};

export default Pricing;
