import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  BookOpen,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  FileQuestion,
  Gamepad2,
  LayoutTemplate,
  Library,
  Map,
  Plus,
  Presentation,
  RefreshCw,
  Sparkles,
  Users,
  WandSparkles,
  Zap,
} from "lucide-react";
import { dashboardAPI, assignmentsAPI, scheduleAPI } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { language } = useLanguage();
  const kk = language === "kk";
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const version = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const [stats, schedule, assignments, notifications] = await Promise.all([
        dashboardAPI.getStats(),
        scheduleAPI.getToday(),
        assignmentsAPI.getAll(),
        dashboardAPI.getNotifications(),
      ]);
      if (version === generation.current) {
        setData({
          stats,
          schedule: schedule.lessons || [],
          assignments,
          notifications,
        });
      }
    } catch (loadError) {
      if (version === generation.current) setError(loadError.message);
    } finally {
      if (version === generation.current) setBusy(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    return () => {
      generation.current++;
    };
  }, [load]);

  const tools = [
    {
      icon: WandSparkles,
      path: "/builder",
      tone: "blue",
      title: kk ? "Сабақ жоспары" : "План урока",
      text: kk ? "ҚМЖ-ны AI көмегімен дайындау" : "Собрать КСП вместе с AI",
      badge: "AI",
    },
    {
      icon: Presentation,
      path: "/open-lessons",
      tone: "violet",
      title: kk ? "Ашық сабақ" : "Открытый урок",
      text: kk ? "Сценарий және интерактив" : "Сценарий и интерактив",
      badge: kk ? "2 кредит" : "2 кредита",
    },
    {
      icon: FileQuestion,
      path: "/quizzes",
      tone: "amber",
      title: kk ? "Тест құрастыру" : "Создать тест",
      text: kk ? "Сұрақтар, жауаптар және QR" : "Вопросы, ответы и QR",
    },
    {
      icon: ClipboardCheck,
      path: "/assignments",
      tone: "coral",
      title: kk ? "Жұмысты тексеру" : "Проверить работы",
      text: kk ? "AI бағалау және кері байланыс" : "AI-оценка и обратная связь",
    },
    {
      icon: Gamepad2,
      path: "/games",
      tone: "green",
      title: kk ? "Ойындар" : "Игры",
      text: kk ? "Сыныппен жарыс және арена" : "Арена и командные форматы",
    },
    {
      icon: LayoutTemplate,
      path: "/templates",
      tone: "cyan",
      title: kk ? "Дайын үлгілер" : "Готовые шаблоны",
      text: kk ? "Сабаққа бірден қолдану" : "Быстрый старт для урока",
    },
    {
      icon: Library,
      path: "/marketplace",
      tone: "pink",
      title: kk ? "Материалдар" : "Материалы",
      text: kk ? "Әріптестердің дайын жұмыстары" : "Работы сообщества учителей",
    },
    {
      icon: Bot,
      path: "/alfarabi-bot",
      tone: "indigo",
      title: kk ? "Әл-Фараби AI" : "Аль-Фараби AI",
      text: kk ? "Мұғалімнің ақылды көмекшісі" : "Умный помощник учителя",
      badge: kk ? "Онлайн" : "Онлайн",
    },
  ];

  const counts = [
    {
      icon: CalendarDays,
      key: "lessonsToday",
      ru: "Уроков сегодня",
      kz: "Бүгінгі сабақтар",
      tone: "blue",
    },
    {
      icon: ClipboardCheck,
      key: "pendingReviews",
      ru: "Работ на проверке",
      kz: "Тексерілетін жұмыстар",
      tone: "coral",
    },
    {
      icon: Users,
      key: "totalStudents",
      ru: "Учеников",
      kz: "Оқушылар",
      tone: "green",
    },
    {
      icon: BookOpen,
      key: "totalLessons",
      ru: "Сохранённых уроков",
      kz: "Сақталған сабақтар",
      tone: "violet",
    },
  ];

  const pending = (data?.assignments || []).filter(
    (assignment) => Number(assignment.pending_count) > 0,
  );
  const date = new Intl.DateTimeFormat(kk ? "kk-KZ" : "ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Almaty",
  }).format(new Date());

  return (
    <div className="teacher-home">
      <section className="teacher-command glass-surface">
        <div className="teacher-command-orb teacher-command-orb-one" />
        <div className="teacher-command-orb teacher-command-orb-two" />
        <div className="teacher-command-copy">
          <div className="teacher-command-meta">
            <span className="teacher-live-badge">
              <Sparkles size={14} />
              {kk ? "Мұғалім кабинеті" : "Кабинет учителя"}
            </span>
            <span>{date}</span>
          </div>
          <h1>
            {kk ? "Бүгінгі сабақты бірге құрайық" : "Соберём сегодняшний урок"}
          </h1>
          <p>
            {kk
              ? `${user?.name || "Мұғалім"}, жоспар, материалдар, тапсырмалар мен сынып белсенділігі бір кеңістікте.`
              : `${user?.name || "Учитель"}, планы, материалы, задания и активность класса теперь в одном пространстве.`}
          </p>
          <div className="teacher-command-actions">
            <Link className="btn btn-primary teacher-primary-action" to="/builder">
              <Plus size={18} />
              {kk ? "Жаңа сабақ" : "Новый урок"}
            </Link>
            <Link className="btn teacher-glass-action" to="/alfarabi-bot">
              <Bot size={18} />
              {kk ? "AI-дан сұрау" : "Спросить AI"}
            </Link>
            <button
              className="teacher-refresh"
              onClick={load}
              disabled={busy}
              title={kk ? "Жаңарту" : "Обновить"}
              aria-label={kk ? "Жаңарту" : "Обновить"}
            >
              <RefreshCw size={18} className={busy ? "is-spinning" : ""} />
            </button>
          </div>
        </div>
        <div className="teacher-command-preview" aria-hidden="true">
          <div className="teacher-preview-topline">
            <span />
            <span />
            <span />
          </div>
          <div className="teacher-preview-card is-featured">
            <Zap size={18} />
            <div>
              <strong>{kk ? "AI дайын" : "AI готов"}</strong>
              <span>{kk ? "Сабақ құруға" : "к созданию урока"}</span>
            </div>
          </div>
          <div className="teacher-preview-grid">
            <div className="teacher-preview-card"><BookOpen size={18} /><b>{data?.stats?.totalLessons ?? "—"}</b></div>
            <div className="teacher-preview-card"><Users size={18} /><b>{data?.stats?.totalStudents ?? "—"}</b></div>
          </div>
        </div>
      </section>

      {error && (
        <p className="brand-message error teacher-error" role="alert">
          {error}
        </p>
      )}
      {busy && !data && (
        <p className="teacher-home-loading" role="status">
          {kk ? "Жүктелуде…" : "Загрузка…"}
        </p>
      )}

      <section
        className="teacher-overview"
        aria-label={kk ? "Сыныптың қысқаша есебі" : "Сводка по работе"}
      >
        {counts.map(({ icon: Icon, key, ru, kz, tone }) => (
          <div className={`glass-surface tone-${tone}`} key={key}>
            <span className="teacher-stat-icon"><Icon size={20} /></span>
            <strong>{data ? data.stats[key] : "—"}</strong>
            <span>{kk ? kz : ru}</span>
          </div>
        ))}
      </section>

      <section className="teacher-tools-section">
        <div className="teacher-section-heading teacher-section-heading-large">
          <div>
            <span className="teacher-kicker">{kk ? "БІР БАСУМЕН" : "В ОДИН КЛИК"}</span>
            <h2>{kk ? "Сабаққа дайындық" : "Подготовка к уроку"}</h2>
            <p>{kk ? "Күнделікті құралдар бір жерде" : "Ежедневные инструменты в одном месте"}</p>
          </div>
          <Link to="/my-lessons">
            {kk ? "Менің сабақтарым" : "Мои уроки"}
            <ArrowRight size={15} />
          </Link>
        </div>
        <nav
          className="teacher-tools"
          aria-label={kk ? "Жұмыс құралдары" : "Рабочие инструменты"}
        >
          {tools.map(({ icon: Icon, path, tone, title, text, badge }) => (
            <Link className={`glass-surface tone-${tone}`} to={path} key={path}>
              <span className="teacher-tool-icon"><Icon size={21} /></span>
              <span className="teacher-tool-copy">
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              {badge && <em>{badge}</em>}
              <ChevronRight className="teacher-tool-arrow" size={18} />
            </Link>
          ))}
        </nav>
      </section>

      <div className="teacher-home-columns">
        <section className="glass-surface teacher-feed-panel">
          <div className="teacher-section-heading">
            <div>
              <span className="teacher-kicker">{kk ? "БҮГІН" : "СЕГОДНЯ"}</span>
              <h2>{kk ? "Сабақ кестесі" : "Расписание уроков"}</h2>
            </div>
            <Link to="/schedule">
              {kk ? "Апта" : "Вся неделя"}
              <ArrowRight size={15} />
            </Link>
          </div>
          {!data ? (
            <p className="teacher-empty">
              {error
                ? kk ? "Деректер қолжетімсіз" : "Данные недоступны"
                : kk ? "Жүктелуде…" : "Загрузка…"}
            </p>
          ) : data.schedule.length ? (
            <div className="teacher-list">
              {data.schedule.map((item) => (
                <Link
                  key={item.id}
                  to={item.lesson_id ? `/builder?edit=${item.lesson_id}` : "/schedule"}
                >
                  <time>{item.start_time}</time>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{[item.class_name, item.subject].filter(Boolean).join(" · ")}</p>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="teacher-empty teacher-empty-card">
              <span><CalendarDays size={24} /></span>
              <div>
                <h3>{kk ? "Күн әзірге бос" : "День пока свободен"}</h3>
                <p>{kk ? "Бүгінге сабақ жоспарланбаған" : "На сегодня уроков нет"}</p>
              </div>
              <Link className="btn teacher-glass-action" to="/schedule">
                <Plus size={16} />
                {kk ? "Кестеге қосу" : "Добавить"}
              </Link>
            </div>
          )}
        </section>

        <section className="glass-surface teacher-feed-panel">
          <div className="teacher-section-heading">
            <div>
              <span className="teacher-kicker">{kk ? "НАЗАР АУДАРУ" : "ТРЕБУЕТ ВНИМАНИЯ"}</span>
              <h2>{kk ? "Тексеруді күтуде" : "Ожидают проверки"}</h2>
            </div>
            <Link to="/assignments">
              {kk ? "Барлығы" : "Все работы"}
              <ArrowRight size={15} />
            </Link>
          </div>
          {!data ? (
            <p className="teacher-empty">
              {error
                ? kk ? "Деректер қолжетімсіз" : "Данные недоступны"
                : kk ? "Жүктелуде…" : "Загрузка…"}
            </p>
          ) : pending.length ? (
            <div className="teacher-list">
              {pending.slice(0, 5).map((task) => (
                <Link key={task.id} to="/assignments">
                  <span className="teacher-list-icon"><ClipboardCheck size={18} /></span>
                  <div>
                    <h3>{task.title}</h3>
                    <p>{task.class_name} · {task.pending_count} {kk ? "жұмыс" : "работ"}</p>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="teacher-empty teacher-empty-card">
              <span><ClipboardCheck size={24} /></span>
              <div>
                <h3>{kk ? "Барлығы тексерілді" : "Всё проверено"}</h3>
                <p>{kk ? "Күтудегі жұмыстар жоқ" : "Нет работ в ожидании"}</p>
              </div>
              <Link className="btn teacher-glass-action" to="/assignments">
                {kk ? "Тапсырмалар" : "К заданиям"}
              </Link>
            </div>
          )}
        </section>
      </div>

      {data?.notifications.length > 0 && (
        <section className="teacher-activity glass-surface">
          <div className="teacher-section-heading">
            <div>
              <span className="teacher-kicker">{kk ? "БЕЛСЕНДІЛІК" : "АКТИВНОСТЬ"}</span>
              <h2>{kk ? "Соңғы оқиғалар" : "Последние события"}</h2>
            </div>
            <Link to="/reports"><Map size={15} />{kk ? "Есеп" : "Отчёт"}</Link>
          </div>
          <div className="teacher-activity-list">
            {data.notifications.slice(0, 4).map((item) => (
              <p key={item.id}><span />{item.text}</p>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
