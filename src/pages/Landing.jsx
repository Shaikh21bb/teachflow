import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  BrainCircuit, 
  BarChart3, 
  Users, 
  BookOpen, 
  Sparkles, 
  CheckCircle2,
  ArrowRight,
  Globe2,
  FileText,
  Zap,
  Play,
  Layers,
  Star,
  ClipboardCheck,
  MessageSquareText
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
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", damping: 12, stiffness: 100 } },
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

export default function Landing() {
    const { t, language, toggleLanguage } = useLanguage();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [billingCycle, setBillingCycle] = useState('monthly');
    const { scrollY } = useScroll();
    
    // Parallax effects
    const y1 = useTransform(scrollY, [0, 1000], [0, 200]);
    const y2 = useTransform(scrollY, [0, 1000], [0, -100]);
    
    // Manage mouse movement for Bento cards glow
    useEffect(() => {
        const handleMouseMove = (e) => {
            document.querySelectorAll('.premium-bento-card').forEach(card => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                card.style.setProperty('--mouse-x', `${x}px`);
                card.style.setProperty('--mouse-y', `${y}px`);
            });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div className="v3-landing-wrapper">
            <div className="v3-grid-bg" />
            <div className="v3-bg-glow" />

            {/* Header */}
            <header className="v2-header" style={{ background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(12px)', borderBottomColor: 'rgba(0,0,0,0.05)' }}>
                <div className="v2-header-inner">
                    <div className="logo white">
                        <img src="/logo.jpg" alt="Urpaq Logo" className="logo-icon-ai text-white" style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
                        <span className="font-outfit" style={{ fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.5px', color: '#0f172a' }}>Urpaq.ai</span>
                    </div>

                    {/* Desktop Nav */}
                    <div className="v2-desktop-nav">
                        <button
                            onClick={toggleLanguage}
                            className="secondary-btn"
                            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        >
                            <Globe2 size={16} />
                            {language === 'kk' ? 'ҚАЗ/РУС' : 'РУС/ҚАЗ'}
                        </button>
                        <Link to="/login" style={{ color: '#475569', fontWeight: 600, transition: 'color 0.2s', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = '#0f172a'} onMouseLeave={e => e.target.style.color = '#475569'}>
                            {language === 'kk' ? 'Кіру' : 'Вход'}
                        </Link>
                        <Link to="/register" className="premium-btn" style={{ padding: '10px 24px', fontSize: '0.9rem' }}>
                            <span>{language === 'kk' ? 'Тіркелу' : 'Регистрация'}</span>
                        </Link>
                    </div>

                    {/* Mobile Hamburger */}
                    <button className="v2-hamburger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Menu">
                        <span className={`v2-hamburger-line ${mobileMenuOpen ? 'open' : ''}`} style={{ background: '#0f172a' }} />
                        <span className={`v2-hamburger-line ${mobileMenuOpen ? 'open' : ''}`} style={{ background: '#0f172a' }} />
                        <span className={`v2-hamburger-line ${mobileMenuOpen ? 'open' : ''}`} style={{ background: '#0f172a' }} />
                    </button>
                </div>

                {/* Mobile Menu Overlay */}
                {mobileMenuOpen && (
                    <motion.div
                        className="v2-mobile-menu"
                        style={{ background: 'rgba(255, 255, 255, 0.95)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                    >
                        <button onClick={toggleLanguage} className="v2-mobile-menu-item" style={{ color: '#0f172a' }}>
                            <Globe2 size={18} /> {language === 'kk' ? 'Орыс тіліне ауысу' : 'Ауысу Қазақ тіліне'}
                        </button>
                        <Link to="/login" className="v2-mobile-menu-item" style={{ color: '#0f172a' }} onClick={() => setMobileMenuOpen(false)}>
                            {language === 'kk' ? 'Кіру' : 'Вход'}
                        </Link>
                        <Link to="/register" className="premium-btn" style={{ width: '100%', marginTop: '1rem', padding: '12px' }} onClick={() => setMobileMenuOpen(false)}>
                            <span>{language === 'kk' ? 'Тіркелу' : 'Регистрация'}</span>
                        </Link>
                    </motion.div>
                )}
            </header>

            {/* Hero Section */}
            <section className="v2-hero" style={{ paddingTop: '160px', paddingBottom: '60px' }}>
                <div className="container" style={{ position: 'relative', zIndex: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
                    
                    <motion.div 
                        initial="hidden" animate="show" variants={staggeredContainer}
                        className="hero-content" style={{ maxWidth: '600px' }}
                    >
                        <motion.div variants={fadeUpObj} className="v2-hero-badge" style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)', color: '#8b5cf6' }}>
                            <Sparkles size={16} />
                            Urpaq.ai 2.0 {language === 'kk' ? 'шықты' : 'уже здесь'}
                        </motion.div>
                        
                        <motion.h1 variants={fadeUpObj} className="v2-hero-title font-outfit" style={{ fontSize: 'clamp(3rem, 5vw, 4.5rem)', lineHeight: 1.1, letterSpacing: '-1px' }}>
                            <span style={{ color: '#0f172a' }}>
                                {language === 'kk' ? 'Мұғалімдерге арналған' : 'Революция подготовки к'}<br/>
                            </span> 
                            <span className="text-glow" style={{ background: 'linear-gradient(to right, #8b5cf6, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                <TypewriterText text={language === 'kk' ? 'инновациялық жүйе' : 'вашим урокам'} delayOffset={0.6} />
                            </span>
                        </motion.h1>
                        
                        <motion.p variants={fadeUpObj} className="v2-hero-subtitle" style={{ fontSize: '1.25rem', color: '#64748b', marginTop: '1.5rem', marginBottom: '2.5rem' }}>
                           {language === 'kk' 
                            ? 'Сабақ жоспарларын жасаңыз, үй тапсырмасын тексеріңіз және ата-аналармен 10 есе жылдам байланысыңыз. ИИ сіз үшін барлық жұмысты жасайды.'
                            : 'Создавайте идеальные планы уроков за секунды, генерируйте PDF-материалы и распределяйте классы на команды. Искусственный интеллект экономит 15 часов вашей работы в неделю.'}
                        </motion.p>
                        
                        <motion.div variants={fadeUpObj} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            <Link to="/register" className="premium-btn">
                                <span>{language === 'kk' ? 'Тегін бастау' : 'Начать бесплатно'} <ArrowRight size={20} /></span>
                            </Link>
                            <a href="#how-it-works" className="secondary-btn">
                                <Play size={20} /> {language === 'kk' ? 'Қалай жұмыс істейді?' : 'Как это работает?'}
                            </a>
                        </motion.div>
                    </motion.div>

                    {/* V4 Floating Cinematic UI Demo */}
                    <div className="hero-widgets-container" style={{ display: window.innerWidth > 968 ? 'flex' : 'none' }}>
                        <motion.div style={{ y: y1 }} className="floating-widget main">
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.06)', paddingBottom: '12px' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    <BookOpen size={20} color="white" />
                                </div>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                                        {language === 'kk' ? 'Химиядан ашық сабақ' : 'Открытый урок по Химии'}
                                    </h4>
                                    <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                                        {language === 'kk' ? 'Жасалған' : 'Сгенерирован'}
                                    </span>
                                </div>
                            </div>
                            <div className="skeleton-line" />
                            <div className="skeleton-line" style={{ width: '80%' }} />
                            <div className="skeleton-line" style={{ width: '90%' }} />
                            <div className="skeleton-line" style={{ width: '60%' }} />
                            <button style={{ width: '100%', marginTop: '16px', background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#0f172a', fontWeight: 600, padding: '8px', borderRadius: '8px', display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                <FileText size={16} /> {language === 'kk' ? 'PDF жүктеу' : 'Скачать PDF'}
                            </button>
                        </motion.div>

                        <motion.div 
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.5, duration: 1 }}
                            className="floating-widget left"
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>
                                    {language === 'kk' ? 'ИИ генерациясы' : 'Генерация ИИ'}
                                </span>
                                <Sparkles size={16} color="#8b5cf6" />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#0f172a', margin: 0, fontStyle: 'italic', lineHeight: 1.5 }}>
                                {language === 'kk' 
                                    ? '"8 сыныпқа арналған Квадрат теңдеулер тақырыбында ойын элементтерімен толық сабақ жоспарын жаса..."'
                                    : '"Создай подробный план урока на тему Квадратные уравнения для 8 класса с игровыми элементами..."'}
                            </p>
                        </motion.div>

                        <motion.div style={{ y: y2 }} className="floating-widget right">
                            <h4 style={{ margin: '0 0 12px', fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={16} color="#3b82f6" /> {language === 'kk' ? 'Командалар (8А)' : 'Команды (8А)'}
                            </h4>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {['Алихан', 'Дана', 'Ерасыл', 'Айнур'].map((n, i) => (
                                    <span key={i} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600 }}>{n}</span>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Social Trust Marquee */}
            <section className="v3-marquee-container">
                <div className="v3-marquee-content">
                    {[...Array(2)].map((_, i) => (
                        <div key={i} style={{ display: 'flex', gap: '4rem' }}>
                            <div className="v3-marquee-item"><CheckCircle2 size={24} color="#8b5cf6" /> {language === 'kk' ? 'Бізге 5000+ мұғалім сенеді' : 'Нам доверяют 5000+ учителей'}</div>
                            <div className="v3-marquee-item"><Users size={24} color="#3b82f6" /> {language === 'kk' ? '150K+ белсенді оқушы' : '150K+ активных учеников'}</div>

                            <div className="v3-marquee-item"><Zap size={24} color="#10b981" /> {language === 'kk' ? 'NIS және БИЛ үшін мінсіз' : 'Идеально для NIS и БИЛ'}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* How it Works Timeline */}
            <section id="how-it-works" style={{ padding: '100px 0', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="container">
                    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
                        <h2 className="font-outfit" style={{ fontSize: '3rem', color: '#0f172a', marginBottom: '1rem' }}>
                            {language === 'kk' ? 'Бұл қалай жұмыс істейді?' : 'Как это работает?'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '1.1rem' }}>
                            {language === 'kk' ? 'Сабаққа дайындалудың 3 қарапайым қадамы' : '3 простых шага до идеального плана урока'}
                        </p>
                    </div>

                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div className="timeline-step">
                            <div className="timeline-icon"><BrainCircuit size={20} /></div>
                            <h3 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                                {language === 'kk' ? '1. Нейрожеліге тақырып беріңіз' : '1. Задайте нейросети тему'}
                            </h3>
                            <p style={{ color: '#475569', lineHeight: 1.6 }}>
                                {language === 'kk' 
                                    ? 'Жай ғана тақырыпты енгізіп, сынып пен пәнді таңдаңыз. ИИ сіздің қажеттіліктеріңізді бірден түсініп, мектеп бағдарламасына сәйкес материалдарды (теория, тапсырмалар, ойындар) жинайды.'
                                    : 'Просто введите тему, выберите класс и предмет. ИИ мгновенно поймет ваши нужды и соберет материалы (теорию, задачи, игровые элементы), соответствующие школьной программе.'}
                            </p>
                        </div>
                        <div className="timeline-step">
                            <div className="timeline-icon"><Layers size={20} /></div>
                            <h3 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                                {language === 'kk' ? '2. Сыныпты командаларға бөліңіз' : '2. Распределите классы на команды'}
                            </h3>
                            <p style={{ color: '#475569', lineHeight: 1.6 }}>
                                {language === 'kk' 
                                    ? 'Оқушыларды қосып, оларды бір басу арқылы топтарға бөліңіз. Жобамен жұмыс істеу үшін әр командаға өзінің қайталанбас тапсырмасын беріңіз.' 
                                    : 'Добавьте учеников и разделите их на команды одним кликом. Задайте каждой команде свое уникальное задание для работы над проектом.'}
                            </p>
                        </div>
                        <div className="timeline-step">
                            <div className="timeline-icon"><FileText size={20} /></div>
                            <h3 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem', fontFamily: 'Outfit, sans-serif' }}>
                                {language === 'kk' ? '3. Таза PDF жүктеп алыңыз' : '3. Скачайте чистый PDF'}
                            </h3>
                            <p style={{ color: '#475569', lineHeight: 1.6 }}>
                                {language === 'kk' 
                                    ? 'Сабақ жоспары әдемі безендірілген. «PDF жүктеу» түймесін басып, құжатты басып шығарыңыз және сабаққа толықтай дайын болып барыңыз!' 
                                    : 'План урока красиво сверстан. Нажмите кнопку «Скачать PDF», распечатайте документ и идите на урок полностью подготовленными!'}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Premium Bento Features */}
            <section id="features" style={{ padding: '80px 0' }}>
                <div className="container">
                    <motion.div 
                        initial="hidden" whileInView="show" viewport={{ once: true, margin: "-100px" }} variants={fadeUpObj}
                        style={{ textAlign: 'center', marginBottom: '4rem' }}
                    >
                        <h2 className="font-outfit" style={{ fontSize: '3rem', color: '#0f172a', marginBottom: '1rem' }}>
                            {language === 'kk' ? 'Платформа мүмкіндіктері' : 'Возможности платформы'}
                        </h2>
                    </motion.div>

                    <div className="features-grid" style={{ display: 'grid', gap: '24px' }}>
                        
                        <div className="premium-bento-card bento-wide">
                            <div style={{ background: 'rgba(139, 92, 246, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <BrainCircuit size={32} color="#8b5cf6" />
                            </div>
                            <h3 className="font-outfit" style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '16px' }}>
                                {language === 'kk' ? 'AI Сабақ конструкторы' : 'AI Конструктор уроков'}
                            </h3>
                            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '80%' }}>
                                {language === 'kk' 
                                    ? 'Сабақ жоспарларын жазуға кететін сағаттарды ұмытыңыз. Біздің ИИ таймингті, сабақтың мақсаты мен кезеңдерін ескере отырып кәсіби жоспарлар жасайды.' 
                                    : 'Забудьте о часах написания поурочных планов. Наш ИИ генерирует профессиональные планы, учитывая тайминг, цели и этапы урока.'}
                            </p>
                        </div>

                        <div className="premium-bento-card">
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <BarChart3 size={32} color="#3b82f6" />
                            </div>
                            <h3 className="font-outfit" style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '16px' }}>
                                {language === 'kk' ? 'Сыныптар мен Командалар' : 'Классы и Команды'}
                            </h3>
                            <p style={{ color: '#475569', lineHeight: 1.6 }}>
                                {language === 'kk' 
                                    ? 'Сыныптар ашыңыз, оқушылар тізімін қосыңыз және оларды интерактивті жарыстар үшін лезде топтарға бөліңіз.' 
                                    : 'Заводите классы, добавляйте списки учеников и мгновенно делите их на группы для интерактивов и соревнований.'}
                            </p>
                        </div>

                        <div className="premium-bento-card">
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <FileText size={32} color="#10b981" />
                            </div>
                            <h3 className="font-outfit" style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '16px' }}>
                                {language === 'kk' ? 'PDF форматына экспорттау' : 'Экспорт в PDF'}
                            </h3>
                            <p style={{ color: '#475569', lineHeight: 1.6 }}>
                                {language === 'kk' 
                                    ? 'Дайындалған материалдар 1 басу арқылы PDF форматында жүктеледі. Артық түймелерсіз, мәзірсіз және су белгілерісіз.' 
                                    : 'Подготовленные материалы в 1 клик скачиваются в формате PDF. Без лишних кнопок, меню и водяных знаков.'}
                            </p>
                        </div>

                        <div className="premium-bento-card bento-wide auto-check-card">
                            <div className="auto-check-content">
                                <div>
                                    <div style={{ background: 'rgba(236, 72, 153, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                        <ClipboardCheck size={32} color="#ec4899" />
                                    </div>
                                    <h3 className="font-outfit" style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '16px' }}>
                                        {language === 'kk' ? 'Автоматты Тексеру Жүйесі' : 'Система автоматической проверки'}
                                    </h3>
                                    <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '620px' }}>
                                        {language === 'kk' 
                                            ? 'Үй жұмысы мен тесттер қолмен тексерілмейді. AI қателерді дәл анықтайды, бағаны қояды және әр оқушыға жеке кері байланыс береді.' 
                                            : 'Домашние задания и тесты больше не нужно проверять вручную. AI точно находит ошибки, выставляет оценку и дает каждому ученику персональную обратную связь.'}
                                    </p>
                                </div>

                                <div className="auto-check-preview" aria-hidden="true">
                                    <div className="auto-check-preview-header">
                                        <span>{language === 'kk' ? 'Алгебра, 8А' : 'Алгебра, 8А'}</span>
                                        <strong>92%</strong>
                                    </div>
                                    <div className="auto-check-answer">
                                        <div>
                                            <span className="answer-label">{language === 'kk' ? 'Қате табылды' : 'Найдена ошибка'}</span>
                                            <p>x² - 5x + 6 = 0 → x = 2, 4</p>
                                        </div>
                                        <span className="answer-status">-1</span>
                                    </div>
                                    <div className="auto-check-feedback">
                                        <MessageSquareText size={18} />
                                        <p>
                                            {language === 'kk'
                                                ? 'Жақсы жұмыс. Екінші түбірді қайта тексер: 4 емес, 3 болуы керек.'
                                                : 'Хорошая работа. Перепроверь второй корень: он должен быть 3, а не 4.'}
                                        </p>
                                    </div>
                                    <div className="auto-check-metrics">
                                        <span>{language === 'kk' ? 'Баға: 5-' : 'Оценка: 5-'}</span>
                                        <span>{language === 'kk' ? '3 сек' : '3 сек'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="premium-bento-card bento-wide">
                            <div style={{ background: 'rgba(245, 158, 11, 0.1)', width: '60px', height: '60px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                                <BookOpen size={32} color="#f59e0b" />
                            </div>
                            <h3 className="font-outfit" style={{ fontSize: '2rem', color: '#0f172a', marginBottom: '16px' }}>
                                {language === 'kk' ? 'Бұлтты білім базасы' : 'Облачная база знаний'}
                            </h3>
                            <p style={{ color: '#475569', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: '80%' }}>
                                {language === 'kk' 
                                    ? 'Өз сабақтарыңызды сақтаңыз, PDF, бейне, YouTube роликтерін тіркеңіз. Барлығы әрқашан қол астында және кез келген құрылғыдан қолжетімді.' 
                                    : 'Храните свои уроки, прикрепляйте PDF, видео, YouTube-ролики. Всё всегда под рукой и доступно с любого устройства.'}
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* Pricing Section Premium */}
            <section id="pricing" style={{ padding: '100px 0', position: 'relative' }}>
                <div className="container" style={{ position: 'relative', zIndex: 10 }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 className="font-outfit" style={{ fontSize: '3rem', color: '#0f172a', marginBottom: '1.5rem' }}>
                            {language === 'kk' ? 'Өз уақытыңызға инвестиция жасаңыз' : 'Инвестируйте в своё время'}
                        </h2>
                        <div className="pricing-switcher">
                            <button className={billingCycle === 'monthly' ? 'active' : ''} onClick={() => setBillingCycle('monthly')}>
                                {language === 'kk' ? 'Ай сайын' : 'Ежемесячно'}
                            </button>
                            <button className={billingCycle === 'annually' ? 'active' : ''} onClick={() => setBillingCycle('annually')}>
                                {language === 'kk' ? 'Жыл сайын (-20%)' : 'Ежегодно (-20%)'}
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem', alignItems: 'stretch', maxWidth: '1200px', margin: '0 auto' }}>
                        
                        {/* Free Tier */}
                        <div className="pricing-card-premium" style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 className="font-outfit" style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem' }}>
                                {language === 'kk' ? 'Старт' : 'Старт'}
                            </h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem' }}>
                                0 ₸<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/{language === 'kk' ? 'ай' : 'мес'}</span>
                            </div>
                            <p style={{ color: '#475569', marginBottom: '2rem', minHeight: '48px' }}>
                                {language === 'kk' ? 'Тегін, мәңгіге.' : 'Бесплатно, навсегда.'}
                            </p>
                            
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? '3 AI-генерация айына' : '3 AI-генерации в месяц'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? '5 сабақ жасауға болады' : '5 уроков'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? '1 оқу сыныбы' : '1 учебный класс'}</li>
                            </ul>
                            
                            <Link to="/register" className="secondary-btn" style={{ width: '100%', marginTop: 'auto' }}>
                                {language === 'kk' ? 'Қазір бастау' : 'Начать сейчас'}
                            </Link>
                        </div>

                        {/* Pro Tier */}
                        <div className="pricing-card-premium featured" style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', padding: '6px 24px', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4)', whiteSpace: 'nowrap' }}>
                                {language === 'kk' ? 'Ең танымал' : 'Топ выбор'}
                            </div>
                            <h3 className="font-outfit" style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem' }}>
                                {language === 'kk' ? 'Мұғалім' : 'Учитель'}
                            </h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem' }}>
                                {billingCycle === 'monthly' ? '3990 ₸' : '2990 ₸'}<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/{language === 'kk' ? 'ай' : 'мес'}</span>
                            </div>
                            <p style={{ color: '#8b5cf6', marginBottom: '2rem', minHeight: '48px' }}>
                                {language === 'kk' ? 'Белсенді педагогтар үшін.' : 'Для активных педагогов.'}
                            </p>
                            
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', gap: '12px', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#8b5cf6" style={{ flexShrink: 0 }} /> {language === 'kk' ? '60 AI-генерация айына' : '60 AI-генераций в месяц'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#8b5cf6" style={{ flexShrink: 0 }} /> {language === 'kk' ? 'Шексіз сабақтар' : 'Безлимитные уроки'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#0f172a', fontWeight: 600, fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#8b5cf6" style={{ flexShrink: 0 }} /> {language === 'kk' ? 'AI-тест генераторы' : 'AI-генератор тестов'}</li>
                            </ul>
                            
                            <Link to="/register" className="premium-btn" style={{ width: '100%', marginTop: 'auto' }}><span>{language === 'kk' ? 'Pro таңдау →' : 'Выбрать →'}</span></Link>
                        </div>

                        {/* Team Tier */}
                        <div className="pricing-card-premium" style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 className="font-outfit" style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem' }}>
                                {language === 'kk' ? 'Команда' : 'Команда'}
                            </h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem' }}>
                                {billingCycle === 'monthly' ? '12900 ₸' : '9900 ₸'}<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/{language === 'kk' ? 'ай' : 'мес'}</span>
                            </div>
                            <p style={{ color: '#475569', marginBottom: '2rem', minHeight: '48px' }}>
                                {language === 'kk' ? 'Оқу орталықтары үшін.' : 'Для учебных центров.'}
                            </p>
                            
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? '300 AI-генерация айына' : '300 AI-генераций в месяц'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? '5 мұғалім аккаунты' : '5 аккаунтов учителей'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? 'Ортақ кітапхана' : 'Общая библиотека'}</li>
                            </ul>
                            
                            <Link to="/register" className="secondary-btn" style={{ width: '100%', marginTop: 'auto', background: '#f8fafc' }}>
                                {language === 'kk' ? 'Таңдау →' : 'Выбрать →'}
                            </Link>
                        </div>
                        
                        {/* School Tier */}
                        <div className="pricing-card-premium" style={{ display: 'flex', flexDirection: 'column' }}>
                            <h3 className="font-outfit" style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '1rem' }}>
                                {language === 'kk' ? 'Мектеп' : 'Школа'}
                            </h3>
                            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', fontFamily: 'Outfit, sans-serif', marginBottom: '0.5rem' }}>
                                {billingCycle === 'monthly' ? '39900 ₸' : '29900 ₸'}<span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 500 }}>/{language === 'kk' ? 'ай' : 'мес'}</span>
                            </div>
                            <p style={{ color: '#475569', marginBottom: '2rem', minHeight: '48px' }}>
                                {language === 'kk' ? 'Толық мектептер үшін.' : 'Для полноценных школ.'}
                            </p>
                            
                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? '1,500 AI-генерация айына' : '1,500 AI-генераций в месяц'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? '30 мұғалімге дейін' : 'До 30 учителей'}</li>
                                <li style={{ display: 'flex', gap: '12px', color: '#475569', fontSize: '0.9rem' }}><CheckCircle2 size={18} color="#64748b" style={{ flexShrink: 0 }} /> {language === 'kk' ? 'Толық Admin-панель' : 'Полная Админ-панель'}</li>
                            </ul>
                            
                            <a href="https://wa.me/77771225784" target="_blank" rel="noreferrer" className="secondary-btn" style={{ width: '100%', marginTop: 'auto', background: '#f8fafc' }}>
                                {language === 'kk' ? 'Бізбен хабарласу' : 'Связаться с нами'}
                            </a>
                        </div>

                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer style={{ padding: '60px 0', borderTop: '1px solid rgba(0,0,0,0.05)', background: '#ffffff' }}>
                <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                    <div className="logo">
                        <img src="/logo.jpg" alt="Urpaq Logo" className="logo-icon-ai text-white" style={{ width: '40px', height: '40px', borderRadius: '12px', objectFit: 'cover' }} />
                        <span className="font-outfit" style={{ fontWeight: 800, fontSize: '1.5rem', color: '#0f172a' }}>Urpaq.ai</span>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                        &copy; 2026 Urpaq.ai. {language === 'kk' ? 'Сабақтарыңызда сиқыр жасаңыз.' : 'Творите магию на уроках.'}
                    </p>
                </div>
            </footer>
        </div>
    );
}
