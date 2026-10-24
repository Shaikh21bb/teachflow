import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenCheck,
  Check,
  ClipboardCheck,
  Gamepad2,
  GraduationCap,
  School,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import BrandMark from "../components/BrandMark";
import "../landing.css";

const CONTENT = {
  ru: {
    skip: "Перейти к содержанию",
    nav: [
      ["#workflow", "Как работает"],
      ["#platform", "Платформа"],
      ["#games", "Игры"],
    ],
    students: "Ученикам",
    login: "Войти",
    cabinet: "Кабинет",
    eyebrow: "Рабочее пространство для урока",
    title: "От плана урока до игры — в одном потоке.",
    lead:
      "URPAQ помогает учителю собрать материал, провести занятие, выдать задание и вовлечь класс без переключения между разными сервисами.",
    teacherCta: "Начать как учитель",
    studentCta: "Войти ученику",
    proof: "Планы · задания · игры · квесты",
    productLabel: "Настоящий кабинет URPAQ",
    demoLabel: "демо-данные",
    heroImage: "/landing/teacher-dashboard.jpg",
    heroAlt:
      "Кабинет учителя URPAQ: урок, статистика и основные инструменты",
    workflowEyebrow: "Один урок — весь цикл",
    workflowTitle: "Понятный маршрут вместо набора разрозненных инструментов.",
    workflowLead:
      "Каждый следующий шаг продолжает предыдущий: материал остаётся рядом, а ученику всегда понятно, что делать дальше.",
    steps: [
      ["01", "Соберите урок", "Тема, план, слайды и материалы в одном редакторе."],
      ["02", "Проведите занятие", "Откройте презентацию или запустите интерактив на экране."],
      ["03", "Подключите класс", "Ученики входят в игру или получают задание по понятной ссылке."],
      ["04", "Посмотрите результат", "Работы, ответы и прогресс остаются в кабинете учителя."],
    ],
    platformEyebrow: "Не обещания, а продукт",
    platformTitle: "Посмотрите, как URPAQ выглядит в работе.",
    platformLead:
      "Все кадры ниже сняты в действующей платформе на специально подготовленных демо-данных.",
    showcases: [
      {
        kicker: "Подготовка",
        title: "Урок собирается в логичной последовательности.",
        text: "Заполните основу, добавьте слайды и материалы, затем проверьте результат перед публикацией.",
        points: ["Редактор урока", "Слайды и файлы", "Черновик и публикация"],
        image: "/landing/lesson-builder.jpg",
        alt: "Редактор урока URPAQ с этапами информации, материалов и превью",
      },
      {
        kicker: "Проведение",
        title: "Игра становится частью урока, а не отдельным аттракционом.",
        text: "Выберите формат под задачу класса: командная арена, совместный сад знаний или словарный спринт.",
        points: ["Три игровых режима", "Подключение по коду", "Готовые и свои вопросы"],
        image: "/landing/games-catalog.jpg",
        alt: "Каталог игровых режимов URPAQ для проведения занятия",
        id: "games",
      },
      {
        kicker: "Ученик",
        title: "Следующий шаг виден сразу.",
        text: "Ученик видит задания, арену, результаты и маршрут квестов в спокойном, понятном интерфейсе.",
        points: ["Личный маршрут", "XP и прогресс", "Задания класса"],
        image: "/landing/student-dashboard.jpg",
        alt: "Кабинет ученика URPAQ с картой квестов и прогрессом",
      },
    ],
    routesEyebrow: "Два маршрута",
    routesTitle: "Одна платформа для учителя и ученика.",
    teacher: {
      tab: "Учитель",
      title: "Рабочее пространство учителя",
      text: "Создавайте уроки, управляйте классами, запускайте игры и проверяйте задания.",
      items: ["Уроки и материалы", "Классы и задания", "Игры и квесты"],
      action: "Открыть кабинет",
    },
    student: {
      tab: "Ученик",
      title: "Моя учёба",
      text: "Получайте задания, проходите квесты, подключайтесь к играм и следите за результатами.",
      items: ["Мой путь", "Задания класса", "Игровая арена"],
      action: "Перейти к учёбе",
    },
    finalEyebrow: "Можно начать сейчас",
    finalTitle: "Пусть технология остаётся в фоне, а урок — в центре.",
    finalText:
      "Откройте кабинет учителя или подключитесь как ученик — основные сценарии уже собраны в URPAQ.",
    finalPrimary: "Создать аккаунт учителя",
    finalSecondary: "Войти по коду игры",
    footer: "Образовательная платформа на русском и казахском",
  },
  kk: {
    skip: "Негізгі мазмұнға өту",
    nav: [
      ["#workflow", "Қалай жұмыс істейді"],
      ["#platform", "Платформа"],
      ["#games", "Ойындар"],
    ],
    students: "Оқушыларға",
    login: "Кіру",
    cabinet: "Кабинет",
    eyebrow: "Сабаққа арналған жұмыс кеңістігі",
    title: "Сабақ жоспарынан ойынға дейін — бір ағында.",
    lead:
      "URPAQ мұғалімге материал дайындауға, сабақ өткізуге, тапсырма беруге және сыныпты әртүрлі сервистерге бөлмей-ақ қызықтыруға көмектеседі.",
    teacherCta: "Мұғалім ретінде бастау",
    studentCta: "Оқушы ретінде кіру",
    proof: "Жоспарлар · тапсырмалар · ойындар · квесттер",
    productLabel: "URPAQ-тың нақты кабинеті",
    demoLabel: "демо-деректер",
    heroImage: "/landing/teacher-dashboard-kk.jpg",
    heroAlt:
      "URPAQ мұғалім кабинеті: сабақ, статистика және негізгі құралдар",
    workflowEyebrow: "Бір сабақ — толық цикл",
    workflowTitle: "Бөлек құралдардың орнына түсінікті бағыт.",
    workflowLead:
      "Әр қадам алдыңғысын жалғастырады: материалдар бір жерде қалады, ал оқушы әрі қарай не істеу керегін көреді.",
    steps: [
      ["01", "Сабақты жинаңыз", "Тақырып, жоспар, слайдтар мен материалдар бір редакторда."],
      ["02", "Сабақты өткізіңіз", "Презентацияны ашыңыз немесе экранда интерактивті іске қосыңыз."],
      ["03", "Сыныпты қосыңыз", "Оқушылар ойынға кіреді немесе түсінікті сілтемемен тапсырма алады."],
      ["04", "Нәтижені қараңыз", "Жұмыстар, жауаптар және ілгерілеу мұғалім кабинетінде сақталады."],
    ],
    platformEyebrow: "Уәде емес, өнім",
    platformTitle: "URPAQ жұмыс кезінде қалай көрінетінін қараңыз.",
    platformLead:
      "Төмендегі барлық кадрлар жұмыс істейтін платформадан арнайы дайындалған демо-мәліметтермен түсірілді.",
    showcases: [
      {
        kicker: "Дайындық",
        title: "Сабақтарыңыз бір жұмыс кеңістігінде.",
        text: "Сабақтарды іздеңіз, сүзгілеңіз, өңдеңіз және жариялауға дайындаңыз — бәрі бір бетте.",
        points: ["Сабақтар тізімі", "Жоба және жариялау", "Өңдеу және басқару"],
        image: "/landing/my-lessons-kk.jpg",
        alt: "Сабақтар тізімі, сүзгілер және басқару құралдары бар URPAQ мұғалім кабинеті",
      },
      {
        kicker: "Өткізу",
        title: "Ойын сабақтың бір бөлігіне айналады.",
        text: "Сынып мақсатына сай форматты таңдаңыз: командалық арена, білім бағы немесе сөздік спринт.",
        points: ["Үш ойын режимі", "Кодпен қосылу", "Дайын және өз сұрақтарыңыз"],
        image: "/landing/games-catalog-kk.jpg",
        alt: "Сабақ өткізуге арналған URPAQ ойын режимдерінің каталогы",
        id: "games",
      },
      {
        kicker: "Оқушы",
        title: "Келесі қадам бірден көрінеді.",
        text: "Оқушы тапсырмаларды, аренаны, нәтижелерді және квест бағытын тыныш әрі түсінікті интерфейсте көреді.",
        points: ["Жеке бағыт", "XP және ілгерілеу", "Сынып тапсырмалары"],
        image: "/landing/student-dashboard-kk.jpg",
        alt: "Квесттер картасы мен ілгерілеуі бар URPAQ оқушы кабинеті",
      },
    ],
    routesEyebrow: "Екі бағыт",
    routesTitle: "Мұғалім мен оқушыға арналған бір платформа.",
    teacher: {
      tab: "Мұғалім",
      title: "Мұғалімнің жұмыс кеңістігі",
      text: "Сабақ жасаңыз, сыныптарды басқарыңыз, ойындар өткізіңіз және тапсырмаларды тексеріңіз.",
      items: ["Сабақтар мен материалдар", "Сыныптар мен тапсырмалар", "Ойындар мен квесттер"],
      action: "Кабинетті ашу",
    },
    student: {
      tab: "Оқушы",
      title: "Менің оқуым",
      text: "Тапсырма алыңыз, квесттерден өтіңіз, ойындарға қосылыңыз және нәтижелерді бақылаңыз.",
      items: ["Менің жолым", "Сынып тапсырмалары", "Ойын аренасы"],
      action: "Оқуға өту",
    },
    finalEyebrow: "Қазір бастауға болады",
    finalTitle: "Технология фонда, ал сабақ орталықта болсын.",
    finalText:
      "Мұғалім кабинетін ашыңыз немесе оқушы ретінде қосылыңыз — негізгі сценарийлер URPAQ-та дайын.",
    finalPrimary: "Мұғалім аккаунтын ашу",
    finalSecondary: "Ойынға кодпен кіру",
    footer: "Қазақ және орыс тіліндегі білім беру платформасы",
  },
};

const routeIcons = [BookOpenCheck, ClipboardCheck, Gamepad2];

function Reveal({ children, className = "", delay = 0, as = "div" }) {
  const Component = as;

  return (
    <Component
      className={`landing-reveal ${className}`.trim()}
      style={{ "--landing-reveal-delay": `${delay}s` }}
    >
      {children}
    </Component>
  );
}

function ProductFrame({ src, alt, eager = false }) {
  return (
    <figure className="landing-product-frame landing-reveal landing-reveal-frame">
      <div className="landing-browser-bar" aria-hidden="true">
        <span />
        <span />
        <span />
        <i>urpaq</i>
      </div>
      <img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        decoding="async"
      />
    </figure>
  );
}

export default function Landing() {
  const { language, toggleLanguage } = useLanguage();
  const { isAuthenticated } = useAuth();
  const [role, setRole] = useState(() =>
    localStorage.getItem("urpaq_entry_role") === "student"
      ? "student"
      : "teacher",
  );
  const pageRef = useRef(null);
  const copy = CONTENT[language === "kk" ? "kk" : "ru"];
  const activeRoute = role === "student" ? copy.student : copy.teacher;
  const ActiveIcon = role === "student" ? GraduationCap : School;

  function selectRole(nextRole) {
    setRole(nextRole);
    localStorage.setItem("urpaq_entry_role", nextRole);
  }

  useEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) return undefined;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return undefined;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) return undefined;

    const updateProgress = () => {
      const distance =
        document.documentElement.scrollHeight - window.innerHeight;
      const value = distance > 0 ? window.scrollY / distance : 0;
      root.style.setProperty(
        "--landing-scroll-progress",
        String(Math.min(1, Math.max(0, value))),
      );
    };

    const revealNodes = [...root.querySelectorAll(".landing-reveal")];
    root.classList.add("is-motion-ready");

    if (!("IntersectionObserver" in window)) {
      revealNodes.forEach((node) => node.classList.add("is-visible"));
      updateProgress();
      window.addEventListener("scroll", updateProgress, { passive: true });
      return () => window.removeEventListener("scroll", updateProgress);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8%" },
    );

    revealNodes.forEach((node) => observer.observe(node));
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", updateProgress);
    };
  }, []);

  return (
    <div className="landing-page" ref={pageRef}>
      <a
        className="landing-skip"
        href="#landing-main"
        onClick={() => {
          window.requestAnimationFrame(() => {
            document.getElementById("landing-main")?.focus();
          });
        }}
      >
        {copy.skip}
      </a>
      <div className="landing-scroll-progress" aria-hidden="true" />

      <header className="landing-header">
        <div className="landing-shell landing-header-inner">
          <BrandMark />
          <nav className="landing-nav" aria-label="Landing navigation">
            {copy.nav.map(([href, label]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="landing-header-actions">
            <Link className="landing-student-link" to="/student/login">
              {copy.students}
            </Link>
            <button
              className="landing-language"
              onClick={toggleLanguage}
              aria-label={
                language === "kk"
                  ? "Орыс тіліне ауысу"
                  : "Переключить на казахский"
              }
            >
              {language === "kk" ? "RU" : "ҚАЗ"}
            </button>
            <Link
              className="landing-login"
              to={isAuthenticated ? "/dashboard" : "/login"}
            >
              {isAuthenticated ? copy.cabinet : copy.login}
            </Link>
          </div>
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <section className="landing-hero landing-shell">
          <div className="landing-hero-copy">
            <Reveal as="p" className="landing-kicker">
              {copy.eyebrow}
            </Reveal>
            <Reveal as="h1" delay={0.08}>
              {copy.title}
            </Reveal>
            <Reveal as="p" className="landing-hero-lead" delay={0.16}>
              {copy.lead}
            </Reveal>
            <Reveal className="landing-hero-actions" delay={0.24}>
              <Link
                className="landing-cta landing-cta-primary"
                to={isAuthenticated ? "/dashboard" : "/register"}
              >
                {isAuthenticated ? copy.cabinet : copy.teacherCta}
                <ArrowRight size={18} />
              </Link>
              <Link className="landing-cta landing-cta-secondary" to="/student/login">
                {copy.studentCta}
              </Link>
            </Reveal>
            <Reveal as="p" className="landing-proof-line" delay={0.34}>
              <span aria-hidden="true" />
              {copy.proof}
            </Reveal>
          </div>

          <div className="landing-hero-visual">
            <ProductFrame
              src={copy.heroImage}
              alt={copy.heroAlt}
              eager
            />
            <div className="landing-product-note">
              <strong>{copy.productLabel}</strong>
              <span>{copy.demoLabel}</span>
            </div>
          </div>
        </section>

        <section className="landing-workflow" id="workflow">
          <div className="landing-shell">
            <Reveal className="landing-section-heading">
              <p className="landing-kicker">{copy.workflowEyebrow}</p>
              <h2>{copy.workflowTitle}</h2>
              <p>{copy.workflowLead}</p>
            </Reveal>
            <div className="landing-steps">
              {copy.steps.map(([number, title, text], index) => (
                <Reveal className="landing-step" delay={index * 0.07} key={number}>
                  <span className="landing-step-number">{number}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-platform landing-shell" id="platform">
          <Reveal className="landing-section-heading landing-section-heading-wide">
            <p className="landing-kicker">{copy.platformEyebrow}</p>
            <h2>{copy.platformTitle}</h2>
            <p>{copy.platformLead}</p>
          </Reveal>

          <div className="landing-showcases">
            {copy.showcases.map((item, index) => (
              <article
                className={`landing-showcase ${index % 2 ? "is-reversed" : ""}`}
                id={item.id}
                key={item.image}
              >
                <Reveal className="landing-showcase-copy">
                  <span className="landing-showcase-index">0{index + 1}</span>
                  <p className="landing-kicker">{item.kicker}</p>
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                  <ul>
                    {item.points.map((point) => (
                      <li key={point}>
                        <Check size={16} aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </Reveal>
                <ProductFrame src={item.image} alt={item.alt} />
              </article>
            ))}
          </div>
        </section>

        <section className="landing-routes" aria-labelledby="landing-routes-title">
          <div className="landing-shell landing-routes-inner">
            <Reveal className="landing-section-heading">
              <p className="landing-kicker">{copy.routesEyebrow}</p>
              <h2 id="landing-routes-title">{copy.routesTitle}</h2>
            </Reveal>

            <Reveal className="landing-route-card">
              <div
                className="landing-role-switch"
                role="group"
                aria-label={language === "kk" ? "Кабинетті таңдау" : "Выбор кабинета"}
              >
                <button
                  aria-pressed={role === "teacher"}
                  onClick={() => selectRole("teacher")}
                >
                  <School size={18} />
                  {copy.teacher.tab}
                </button>
                <button
                  aria-pressed={role === "student"}
                  onClick={() => selectRole("student")}
                >
                  <GraduationCap size={18} />
                  {copy.student.tab}
                </button>
              </div>

              <div className="landing-route-content" aria-live="polite">
                <div className="landing-route-icon" aria-hidden="true">
                  <ActiveIcon size={28} />
                </div>
                <div>
                  <h3>{activeRoute.title}</h3>
                  <p>{activeRoute.text}</p>
                  <div className="landing-route-items">
                    {activeRoute.items.map((item, index) => {
                      const Icon = routeIcons[index];
                      return (
                        <span key={item}>
                          <Icon size={17} />
                          {item}
                        </span>
                      );
                    })}
                  </div>
                  <Link
                    className="landing-cta landing-cta-primary"
                    to={role === "student" ? "/student/dashboard" : "/dashboard"}
                  >
                    {activeRoute.action}
                    <ArrowRight size={18} />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="landing-final landing-shell">
          <Reveal className="landing-final-card">
            <div>
              <p className="landing-kicker">{copy.finalEyebrow}</p>
              <h2>{copy.finalTitle}</h2>
              <p>{copy.finalText}</p>
            </div>
            <div className="landing-final-actions">
              <Link
                className="landing-cta landing-cta-light"
                to={isAuthenticated ? "/dashboard" : "/register"}
              >
                {isAuthenticated ? copy.cabinet : copy.finalPrimary}
                <ArrowRight size={18} />
              </Link>
              <Link className="landing-cta landing-cta-ghost" to="/play">
                {copy.finalSecondary}
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-shell landing-footer-inner">
          <BrandMark />
          <p>{copy.footer}</p>
          <div>
            <Link to="/register">{copy.teacher.tab}</Link>
            <Link to="/student/login">{copy.student.tab}</Link>
            <span>© {new Date().getFullYear()} URPAQ</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
