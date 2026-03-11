import { Link } from 'react-router-dom'
import { useLanguage } from '../contexts/LanguageContext'

function Landing() {
    const { t, language, toggleLanguage } = useLanguage()

    return (
        <>
            <div className="landing-wrapper">
                {/* Header */}
                <header className="header glass-header">
                    <div className="container header-inner">
                        <div className="logo">
                            <div className="logo-icon-ai">AI</div>
                            <span className="logo-text">yraq.ai</span>
                        </div>

                        <nav className="nav">
                            <a href="#features" className="nav-link">{t('landing.features.badge')}</a>
                            <a href="#how-it-works" className="nav-link">{language === 'kk' ? 'Қалай жұмыс істейді' : 'Как это работает'}</a>
                            <a href="#pricing" className="nav-link">{t('landing.pricing.title')}</a>
                        </nav>

                        <div className="header-actions">
                            <button
                                onClick={toggleLanguage}
                                className="btn btn-ghost"
                                style={{ marginRight: '10px' }}
                            >
                                {language === 'kk' ? '🇰🇿' : '🇷🇺'}
                            </button>
                            <Link to="/login" className="btn btn-ghost">{language === 'kk' ? 'Кіру' : 'Вход'}</Link>
                            <Link to="/register" className="btn btn-primary btn-glow">{language === 'kk' ? 'Тіркелу' : 'Регистрация'}</Link>
                        </div>
                    </div>
                </header>

                {/* Hero Section */}
                <section className="hero-ai">
                    <div className="container hero-inner-ai">
                        <div className="hero-content">
                            <div className="hero-badge-ai">
                                <span className="pulse-dot"></span>
                                {t('landing.hero.badge')}
                            </div>
                            <h1 className="hero-title-ai">
                                {t('landing.hero.title')} <br />
                                <span className="gradient-text-ai">{t('landing.hero.titleBold')}</span>
                            </h1>
                            <p className="hero-subtitle-ai">
                                {t('landing.hero.subtitle')}
                            </p>

                            <div className="hero-actions">
                                <Link to="/dashboard" className="btn btn-lg btn-primary btn-glow">
                                    {t('landing.hero.cta')}
                                </Link>
                                <a href="#demo" className="btn btn-lg btn-glass">
                                    {t('landing.hero.demo')}
                                </a>
                            </div>

                            <div className="hero-stats-ai">
                                <div className="stat-item-ai">
                                    <span className="stat-value">5000+</span>
                                    <span className="stat-label">{t('landing.hero.stats.teachers')}</span>
                                </div>
                                <div className="stat-separator"></div>
                                <div className="stat-item-ai">
                                    <span className="stat-value">150K+</span>
                                    <span className="stat-label">{t('landing.hero.stats.students')}</span>
                                </div>
                                <div className="stat-separator"></div>
                                <div className="stat-item-ai">
                                    <span className="stat-value">98%</span>
                                    <span className="stat-label">{t('landing.hero.stats.satisfaction')}</span>
                                </div>
                            </div>
                        </div>

                        <div className="hero-visual">
                            <div className="glass-card-float card-1">
                                <div className="float-icon">🤖</div>
                                <div className="float-content">
                                    <div className="float-title">AI</div>
                                    <div className="float-text">100%</div>
                                </div>
                            </div>
                            <div className="glass-card-float card-2">
                                <div className="float-icon">📊</div>
                                <div className="float-content">
                                    <div className="float-title">Stats</div>
                                    <div className="float-text">📈</div>
                                </div>
                            </div>
                            <div className="hero-circle-bg"></div>
                        </div>
                    </div>
                </section>

                {/* Trusted By */}
                <section className="trusted-section">
                    <div className="container">
                        <p className="trusted-title">{language === 'kk' ? 'Қазақстандағы үздік мектептер сенім артады' : 'Лучшие школы Казахстана доверяют нам'}</p>
                        <div className="trusted-logos">
                            <span className="trusted-logo">NIS</span>
                            <span className="trusted-logo">BIL</span>
                            <span className="trusted-logo">Quantum</span>
                            <span className="trusted-logo">Haileybury</span>
                            <span className="trusted-logo">Spectrum</span>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="features-ai section">
                    <div className="container">
                        <div className="section-header-ai">
                            <span className="section-badge-ai">{t('landing.features.badge')}</span>
                            <h2 className="section-title-ai">{t('landing.features.title')}</h2>
                            <p className="section-subtitle-ai">
                                {t('landing.features.subtitle')}
                            </p>
                        </div>

                        <div className="features-grid-ai">
                            <div className="feature-card-ai">
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon-ai">📚</span>
                                </div>
                                <h3 className="feature-title-ai">{t('landing.features.aiBuilder.title')}</h3>
                                <p className="feature-desc-ai">
                                    {t('landing.features.aiBuilder.desc')}
                                </p>
                            </div>

                            <div className="feature-card-ai">
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon-ai">📝</span>
                                </div>
                                <h3 className="feature-title-ai">{t('landing.features.autoGrading.title')}</h3>
                                <p className="feature-desc-ai">
                                    {t('landing.features.autoGrading.desc')}
                                </p>
                            </div>

                            <div className="feature-card-ai">
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon-ai">📊</span>
                                </div>
                                <h3 className="feature-title-ai">{t('landing.features.analytics.title')}</h3>
                                <p className="feature-desc-ai">
                                    {t('landing.features.analytics.desc')}
                                </p>
                            </div>

                            <div className="feature-card-ai">
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon-ai">🤝</span>
                                </div>
                                <h3 className="feature-title-ai">{language === 'kk' ? 'Ата-аналармен Байланыс' : 'Связь с родителями'}</h3>
                                <p className="feature-desc-ai">
                                    {language === 'kk'
                                        ? 'Автоматты хабарламалар мен есептерді ата-аналарға жіберіңіз. Кері байланысты жақсартыңыз.'
                                        : 'Отправляйте автоматические уведомления и отчеты родителям. Улучшайте обратную связь.'}
                                </p>
                            </div>

                            <div className="feature-card-ai">
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon-ai">📂</span>
                                </div>
                                <h3 className="feature-title-ai">{t('nav.library')}</h3>
                                <p className="feature-desc-ai">
                                    {language === 'kk'
                                        ? 'Мыңдаған дайын материалдар мен басқа мұғалімдердің үздік тәжірибелеріне қол жеткізіңіз.'
                                        : 'Получите доступ к тысячам готовых материалов и лучшим практикам других учителей.'}
                                </p>
                            </div>

                            <div className="feature-card-ai">
                                <div className="feature-icon-wrapper">
                                    <span className="feature-icon-ai">🏆</span>
                                </div>
                                <h3 className="feature-title-ai">{language === 'kk' ? 'Геймификация' : 'Геймификация'}</h3>
                                <p className="feature-desc-ai">
                                    {language === 'kk'
                                        ? 'Оқу процесін қызықты ойынға айналдырыңыз. Оқушылар ұпай жинап, мотивация алады.'
                                        : 'Превратите процесс обучения в увлекательную игру. Ученики зарабатывают баллы и получают мотивацию.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* How It Works */}
                <section id="how-it-works" className="how-section-ai section">
                    <div className="container">
                        <div className="section-header-ai">
                            <span className="section-badge-ai">{language === 'kk' ? 'Қалай жұмыс істейді' : 'Как это работает'}</span>
                            <h2 className="section-title-ai">{language === 'kk' ? 'Бәрі өте қарапайым' : 'Всё очень просто'}</h2>
                        </div>

                        <div className="steps-ai">
                            <div className="step-card-ai">
                                <div className="step-number-ai">01</div>
                                <h3>{language === 'kk' ? 'Тіркеліңіз' : 'Зарегистрируйтесь'}</h3>
                                <p>{language === 'kk' ? 'Платформада аккаунт ашып, сыныптарыңызды қосыңыз.' : 'Создайте аккаунт на платформе и добавьте свои классы.'}</p>
                            </div>
                            <div className="step-arrow">→</div>
                            <div className="step-card-ai">
                                <div className="step-number-ai">02</div>
                                <h3>{language === 'kk' ? 'Сабақ құрыңыз' : 'Создайте урок'}</h3>
                                <p>{language === 'kk' ? 'AI көмегімен сабақ жоспарын және материалдарды дайындаңыз.' : 'Подготовьте план урока и материалы с помощью AI.'}</p>
                            </div>
                            <div className="step-arrow">→</div>
                            <div className="step-card-ai">
                                <div className="step-number-ai">03</div>
                                <h3>{language === 'kk' ? 'Нәтиже көріңіз' : 'Смотрите результат'}</h3>
                                <p>{language === 'kk' ? 'Оқушылардың белсенділігі мен үлгерімінің өсуін бақылаңыз.' : 'Наблюдайте за ростом активности и успеваемости учеников.'}</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section id="pricing" className="pricing-section-ai section">
                    <div className="container">
                        <div className="section-header-ai">
                            <h2 className="section-title-ai">{t('landing.pricing.title')}</h2>
                            <p className="section-subtitle-ai">{t('landing.pricing.subtitle')}</p>
                        </div>

                        <div className="pricing-grid">
                            <div className="pricing-card-ai">
                                <div className="pricing-header-ai">
                                    <h3>{t('landing.pricing.free.name')}</h3>
                                    <div className="price-ai">0 ₸<span>/{t('common.month').toLowerCase()}</span></div>
                                    <p>{t('landing.pricing.free.desc')}</p>
                                </div>
                                <ul className="pricing-features-ai">
                                    <li>✅ 5 {language === 'kk' ? 'сабақ жоспары/ай' : 'планов уроков/мес'}</li>
                                    <li>✅ 1 {language === 'kk' ? 'сынып' : 'класс'}</li>
                                    <li>✅ {language === 'kk' ? 'Базалық аналитика' : 'Базовая аналитика'}</li>
                                </ul>
                                <button className="btn btn-outline-ai">{t('common.create')}</button>
                            </div>

                            <div className="pricing-card-ai featured">
                                <div className="best-value">{t('landing.pricing.pro.popular')}</div>
                                <div className="pricing-header-ai">
                                    <h3>{t('landing.pricing.pro.name')}</h3>
                                    <div className="price-ai">5,980 ₸<span>/{t('common.month').toLowerCase()}</span></div>
                                    <p>{t('landing.pricing.pro.desc')}</p>
                                </div>
                                <ul className="pricing-features-ai">
                                    <li>✅ {language === 'kk' ? 'Шексіз сабақ жоспарлары' : 'Безлимитные планы уроков'}</li>
                                    <li>✅ {language === 'kk' ? 'AI Көмекші (GPT-4)' : 'AI Помощник (GPT-4)'}</li>
                                    <li>✅ {language === 'kk' ? '10 сыныпқа дейін' : 'До 10 классов'}</li>
                                    <li>✅ {language === 'kk' ? 'Толық аналитика' : 'Полная аналитика'}</li>
                                    <li>✅ {language === 'kk' ? 'Экспорт PDF/Word' : 'Экспорт в PDF/Word'}</li>
                                </ul>
                                <button className="btn btn-primary btn-glow">{t('common.add')}</button>
                            </div>

                            <div className="pricing-card-ai">
                                <div className="pricing-header-ai">
                                    <h3>{t('landing.pricing.school.name')}</h3>
                                    <div className="price-ai">{language === 'kk' ? 'Келісімді' : 'Договорная'}</div>
                                    <p>{t('landing.pricing.school.desc')}</p>
                                </div>
                                <ul className="pricing-features-ai">
                                    <li>✅ {language === 'kk' ? 'Барлық мұғалімдерге доступ' : 'Доступ для всех учителей'}</li>
                                    <li>✅ {language === 'kk' ? 'Әкімшілік панель' : 'Панель администратора'}</li>
                                    <li>✅ {language === 'kk' ? 'Мектеп аналитикасы' : 'Аналитика школы'}</li>
                                    <li>✅ {language === 'kk' ? 'API интеграциялар' : 'API интеграции'}</li>
                                </ul>
                                <a
                                    href="https://wa.me/77771225784?text=Платформа%20туралы%20толық%20ақпарат%20алғым%20келеді"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-outline-ai"
                                    style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}
                                >
                                    WhatsApp: +7 777 122 5784
                                </a>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="cta-section-ai">
                    <div className="container cta-inner-ai">
                        <h2 className="cta-title-ai">{language === 'kk' ? 'Болашақ бүгін басталады' : 'Будущее начинается сегодня'}</h2>
                        <p className="cta-desc-ai">{language === 'kk' ? '5000-нан астам мұғалім yraq.ai көмегімен жұмысын жеңілдетті. Сіз де қосылыңыз!' : 'Более 5000 учителей упростили свою работу с yraq.ai. Присоединяйтесь и вы!'}</p>
                        <div className="cta-buttons">
                            <Link to="/register" className="btn btn-lg btn-white">{t('landing.hero.cta')}</Link>
                            <button className="btn btn-lg btn-transparent">{language === 'kk' ? 'Толығырақ' : 'Подробнее'}</button>
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="footer-ai">
                    <div className="container">
                        <div className="footer-content">
                            <div className="footer-brand">
                                <div className="logo white">
                                    <div className="logo-icon-ai text-white">AI</div>
                                    <span>yraq.ai</span>
                                </div>
                                <p>{language === 'kk' ? 'Қазақстандық мұғалімдерге арналған инновациялық платформа.' : 'Инновационная платформа для казахстанских учителей.'}</p>
                            </div>
                            <div className="footer-links-col">
                                <h4>{language === 'kk' ? 'Өнім' : 'Продукт'}</h4>
                                <a href="#">{t('landing.features.badge')}</a>
                                <a href="#">{t('landing.pricing.title')}</a>
                                <a href="#">{language === 'kk' ? 'Жаңартулар' : 'Обновления'}</a>
                            </div>
                            <div className="footer-links-col">
                                <h4>{language === 'kk' ? 'Компания' : 'Компания'}</h4>
                                <a href="#">{language === 'kk' ? 'Біз туралы' : 'О нас'}</a>
                                <a href="#">{language === 'kk' ? 'Блог' : 'Блог'}</a>
                                <a href="#">{language === 'kk' ? 'Карьера' : 'Карьера'}</a>
                            </div>
                            <div className="footer-links-col">
                                <h4>{t('nav.help')}</h4>
                                <a href="#">{language === 'kk' ? 'Қолдау орталығы' : 'Центр поддержки'}</a>
                                <a href="https://wa.me/77771225784">+7 777 122 5784</a>
                                <a href="#">{language === 'kk' ? 'Құпиялылық' : 'Конфиденциальность'}</a>
                            </div>
                        </div>
                        <div className="footer-bottom">
                            <p>&copy; 2026 yraq.ai. {language === 'kk' ? 'Барлық құқықтар қорғалған' : 'Все права защищены'} (All rights reserved).</p>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    )
}

export default Landing
