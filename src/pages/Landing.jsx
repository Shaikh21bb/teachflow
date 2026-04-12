import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { motion } from 'framer-motion';
import { 
  BrainCircuit, 
  BarChart3, 
  Users, 
  BookOpen, 
  Sparkles, 
  CheckCircle2,
  ArrowRight,
  Globe2
} from 'lucide-react';

const staggeredContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const fadeUpObj = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 20 } }
};

const TypewriterText = ({ text, delayOffset = 0.5 }) => {
  const characters = Array.from(text);
  
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: delayOffset },
    },
  };

  const child = {
    hidden: { opacity: 0, x: -10, filter: "blur(4px)" },
    show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { type: "spring", damping: 12, stiffness: 100 } },
  };

  return (
    <motion.span style={{ display: "inline-flex", flexWrap: "wrap", justifyContent: "center", wordBreak: "break-word" }} variants={container} initial="hidden" animate="show">
      {characters.map((char, index) => (
        <motion.span variants={child} key={index} style={{ display: 'inline-block', whiteSpace: 'pre' }}>
          {char}
        </motion.span>
      ))}
    </motion.span>
  );
};

function Landing() {
    const { t, language, toggleLanguage } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="v3-landing-wrapper">
            <div className="v3-grid-bg" />
            <div className="v3-bg-glow" />

            {/* Header */}
            <header className="v2-header">
                <div className="v2-header-inner">
                    <div className="logo white">
                        <div className="logo-icon-ai text-white">AI</div>
                        <span className="font-outfit" style={{ fontWeight: 700, fontSize: '1.25rem' }}>Urpaq.ai</span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="v2-desktop-nav">
                        <button
                            onClick={toggleLanguage}
                            className="v2-btn v2-btn-outline"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', border: '1px solid rgba(255,255,255,0.1)' }}
                        >
                            <Globe2 size={14} style={{ marginRight: '6px' }} />
                            {language === 'kk' ? 'ҚАЗ' : 'РУС'}
                        </button>
                        <Link to="/login" className="v2-btn v2-btn-outline" style={{ border: 'none' }}>
                            {language === 'kk' ? 'Кіру' : 'Вход'}
                        </Link>
                        <Link to="/register" className="v2-btn v2-btn-primary">
                            {language === 'kk' ? 'Тіркелу' : 'Регистрация'}
                        </Link>
                    </div>

                    {/* Mobile Hamburger */}
                    <button className="v2-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
                        <span className={`v2-hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
                        <span className={`v2-hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
                        <span className={`v2-hamburger-line ${mobileMenuOpen ? 'open' : ''}`} />
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <motion.div
                        className="v2-mobile-menu"
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <button onClick={toggleLanguage} className="v2-mobile-menu-item">
                            <Globe2 size={18} /> {language === 'kk' ? 'Тілді ауыстыру' : 'Сменить язык'}
                        </button>
                        <Link to="/login" className="v2-mobile-menu-item" onClick={() => setMobileMenuOpen(false)}>
                            {language === 'kk' ? 'Кіру' : 'Вход'}
                        </Link>
                        <Link to="/register" className="v2-btn v2-btn-primary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={() => setMobileMenuOpen(false)}>
                            {language === 'kk' ? 'Тіркелу' : 'Регистрация'}
                        </Link>
                    </motion.div>
                )}
            </header>

            {/* Hero Section */}
            <section className="v2-hero">
                <div className="container" style={{ position: 'relative', zIndex: 10 }}>
                    <motion.div 
                        initial="hidden" 
                        animate="show" 
                        variants={staggeredContainer}
                        className="hero-content"
                    >
                        <motion.div variants={fadeUpObj} className="v2-hero-badge">
                            <Sparkles size={16} />
                            {t('landing.hero.badge')}
                        </motion.div>
                        
                        <motion.h1 variants={fadeUpObj} className="v2-hero-title">
                            <span style={{ color: '#ffffff' }}>
                                {language === 'kk' ? 'Мұғалімдердің жаңа суперкүші' : 'Новая суперсила для учителей'}
                            </span> <br />
                            <span className="v2-gradient-text" style={{ display: 'inline-block' }}>
                                <TypewriterText text={language === 'kk' ? 'жасанды интеллект негізінде' : 'на базе искусственного интеллекта'} delayOffset={0.6} />
                            </span>
                        </motion.h1>
                        
                        <motion.p variants={fadeUpObj} className="v2-hero-subtitle">
                           {t('landing.hero.subtitle')}
                        </motion.p>
                        
                        <motion.div variants={fadeUpObj} style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem' }}>
                            <Link to="/register" className="v2-btn v2-btn-primary" style={{ fontSize: '1.125rem', padding: '1rem 2.5rem' }}>
                                {t('landing.hero.cta')} <ArrowRight size={20} style={{ marginLeft: '8px' }} />
                            </Link>
                        </motion.div>
                    </motion.div>

                    {/* V3 Hero Mockup (Cinematic App Preview) */}
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 1, delay: 0.8, type: "spring", bounce: 0.2 }}
                        className="v3-hero-mockup-wrapper"
                    >
                        <div className="v3-mockup-glow" />
                        <div className="v3-mockup-glass">
                            <div className="v3-mockup-header">
                                <div className="v3-mockup-dot red" />
                                <div className="v3-mockup-dot yellow" />
                                <div className="v3-mockup-dot green" />
                            </div>
                            <div className="v3-mockup-body">
                                <img src="/dashboard-mockup-ru.png" alt="Platform Dashboard" style={{ filter: 'grayscale(10%) contrast(1.1)' }} />
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Infinite Marquee */}
            <section className="v3-marquee-container">
                <div className="v3-marquee-content">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', gap: '3rem' }}>
                            <div className="v3-marquee-item"><CheckCircle2 size={18} color="#8b5cf6" /> Нам доверяют 5000+ учителей</div>
                            <div className="v3-marquee-item"><Users size={18} color="#8b5cf6" /> 150K+ активных учеников</div>
                            <div className="v3-marquee-item"><Globe2 size={18} color="#8b5cf6" /> Инновации в образовании</div>
                            <div className="v3-marquee-item"><BrainCircuit size={18} color="#8b5cf6" /> AI-проверка домашних заданий</div>
                            <div className="v3-marquee-item"><BarChart3 size={18} color="#8b5cf6" /> Мгновенные отчеты для школ</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Stats */}
            <section style={{ padding: '0 2rem 120px', position: 'relative', zIndex: 10 }}>
                <div className="container">
                    <motion.div 
                        initial="hidden"
                        whileInView="show"
                        viewport={{ once: true, margin: "-100px" }}
                        variants={staggeredContainer}
                        style={{ display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap' }}
                    >
                         <motion.div variants={fadeUpObj} style={{ textAlign: 'center', minWidth: '150px' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>5000+</div>
                            <div style={{ color: '#94a3b8' }}>{t('landing.hero.stats.teachers')}</div>
                         </motion.div>
                         <motion.div variants={fadeUpObj} style={{ textAlign: 'center', minWidth: '150px' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>150K+</div>
                            <div style={{ color: '#94a3b8' }}>{t('landing.hero.stats.students')}</div>
                         </motion.div>
                         <motion.div variants={fadeUpObj} style={{ textAlign: 'center', minWidth: '150px' }}>
                            <div style={{ fontSize: '3rem', fontWeight: 800, color: '#fff', fontFamily: 'Outfit, sans-serif' }}>98%</div>
                            <div style={{ color: '#94a3b8' }}>{t('landing.hero.stats.satisfaction')}</div>
                         </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Features Bento Grid */}
            <section id="features" className="v2-section">
                <motion.div 
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeUpObj}
                >
                    <h2 className="v2-section-title font-outfit">{t('landing.features.title')}</h2>
                </motion.div>

                <motion.div 
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggeredContainer}
                    className="v2-bento-grid"
                >
                    {/* Large Card 1 */}
                    <motion.div variants={fadeUpObj} className="v2-bento-card large">
                        <div className="v2-bento-icon"><BrainCircuit size={28} /></div>
                        <h3 className="v2-bento-title font-outfit">{t('landing.features.aiBuilder.title')}</h3>
                        <p className="v2-bento-desc">{t('landing.features.aiBuilder.desc')}</p>
                    </motion.div>

                    {/* Standard Card 1 */}
                    <motion.div variants={fadeUpObj} className="v2-bento-card">
                        <div className="v2-bento-icon"><BarChart3 size={28} /></div>
                        <h3 className="v2-bento-title font-outfit">{t('landing.features.analytics.title')}</h3>
                        <p className="v2-bento-desc">{t('landing.features.analytics.desc')}</p>
                    </motion.div>

                    {/* Standard Card 2 */}
                    <motion.div variants={fadeUpObj} className="v2-bento-card">
                        <div className="v2-bento-icon"><BookOpen size={28} /></div>
                        <h3 className="v2-bento-title font-outfit">{t('nav.library')}</h3>
                        <p className="v2-bento-desc">
                            {language === 'kk'
                                ? 'Мыңдаған дайын материалдар мен басқа мұғалімдердің үздік тәжірибелеріне қол жеткізіңіз.'
                                : 'Получите доступ к тысячам готовых материалов и лучшим практикам других учителей.'}
                        </p>
                    </motion.div>

                    {/* Large Card 2 */}
                    <motion.div variants={fadeUpObj} className="v2-bento-card large">
                        <div className="v2-bento-icon"><Users size={28} /></div>
                        <h3 className="v2-bento-title font-outfit">{language === 'kk' ? 'Ата-аналармен Байланыс' : 'Связь с родителями'}</h3>
                        <p className="v2-bento-desc">
                            {language === 'kk'
                                ? 'Автоматты хабарламалар мен есептерді ата-аналарға жіберіңіз. Кері байланысты жақсартыңыз.'
                                : 'Отправляйте автоматические уведомления и отчеты родителям. Улучшайте обратную связь.'}
                        </p>
                    </motion.div>
                </motion.div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="v2-section">
                <motion.div 
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={fadeUpObj}
                    style={{ textAlign: 'center', marginBottom: '3rem' }}
                >
                    <h2 className="v2-section-title font-outfit" style={{ marginBottom: '1rem' }}>{t('landing.pricing.title')}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '1.125rem' }}>{t('landing.pricing.subtitle')}</p>
                </motion.div>

                <motion.div 
                    initial="hidden"
                    whileInView="show"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggeredContainer}
                    className="v2-pricing-grid"
                >
                    <motion.div variants={fadeUpObj} className="v2-pricing-card">
                        <h3 className="font-outfit" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>{t('landing.pricing.free.name')}</h3>
                        <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif', color: '#fff' }}>
                            {t('landing.pricing.free.price')}
                        </div>
                        <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '2rem' }}>
                            {t('landing.pricing.free.credits')}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#cbd5e1' }}>
                            {t('landing.pricing.free.features', { returnObjects: true }).map((f, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle2 size={20} color="#8b5cf6" /> {f}</li>
                            ))}
                        </ul>
                        <Link to="/register" className="v2-btn v2-btn-outline" style={{ display: 'block', textAlign: 'center', width: '100%' }}>{language === 'kk' ? 'Таңдау' : 'Выбрать'}</Link>
                    </motion.div>

                    {/* Pro */}
                    <motion.div variants={fadeUpObj} className="v2-pricing-card featured" style={{ position: 'relative' }}>
                        <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: '#8b5cf6', color: '#fff', padding: '6px 20px', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 600 }}>{t('landing.pricing.pro.popular')}</div>
                        <h3 className="font-outfit" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>{t('landing.pricing.pro.name')}</h3>
                        <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', color: '#fff', fontFamily: 'Outfit, sans-serif' }}>
                            {t('landing.pricing.pro.price')}
                        </div>
                        <div style={{ color: '#a78bfa', fontWeight: 600, marginBottom: '2rem' }}>
                            {t('landing.pricing.pro.credits')}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#cbd5e1' }}>
                            {t('landing.pricing.pro.features', { returnObjects: true }).map((f, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle2 size={20} color="#a78bfa" /> {f}</li>
                            ))}
                        </ul>
                        <Link to="/register" className="v2-btn v2-btn-primary" style={{ display: 'block', textAlign: 'center', width: '100%' }}>{language === 'kk' ? 'Таңдау' : 'Выбрать'}</Link>
                    </motion.div>

                    {/* Max */}
                    <motion.div variants={fadeUpObj} className="v2-pricing-card">
                        <h3 className="font-outfit" style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#fff' }}>{t('landing.pricing.school.name')}</h3>
                        <div style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif', color: '#fff' }}>
                            {t('landing.pricing.school.price')}
                        </div>
                        <div style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: '2rem' }}>
                            {t('landing.pricing.school.credits')}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, marginBottom: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem', color: '#cbd5e1' }}>
                            {t('landing.pricing.school.features', { returnObjects: true }).map((f, i) => (
                                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><CheckCircle2 size={20} color="#8b5cf6" /> {f}</li>
                            ))}
                        </ul>
                        <Link to="/register" className="v2-btn v2-btn-outline" style={{ display: 'block', textAlign: 'center', width: '100%' }}>{language === 'kk' ? 'Таңдау' : 'Выбрать'}</Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="v2-footer">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="logo white">
                        <div className="logo-icon-ai text-white">AI</div>
                        <span className="font-outfit" style={{ fontWeight: 700, fontSize: '1.25rem' }}>Urpaq.ai</span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                        &copy; 2026 Urpaq.ai. {language === 'kk' ? 'Барлық құқықтар қорғалған' : 'Все права защищены'}.
                    </p>
                </div>
            </footer>
        </div>
    );
}

export default Landing;
