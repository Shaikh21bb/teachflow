import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Plus,
  CalendarDays,
  ClipboardCheck,
  Users,
  BookOpen,
  Gamepad2,
  Map,
  RefreshCw,
  FileQuestion,
} from "lucide-react";
import { dashboardAPI, assignmentsAPI, scheduleAPI } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";

export default function Dashboard() {
  const { language } = useLanguage(),
    kk = language === "kk",
    { user } = useAuth();
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
      if (version === generation.current)
        setData({
          stats,
          schedule: schedule.lessons || [],
          assignments,
          notifications,
        });
    } catch (e) {
      if (version === generation.current) setError(e.message);
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
    [BookOpen, "/my-lessons", "Мои уроки", "Менің сабақтарым"],
    [Users, "/classes", "Мои классы", "Менің сыныптарым"],
    [ClipboardCheck, "/assignments", "Проверка работ", "Жұмыстарды тексеру"],
    [FileQuestion, "/quizzes", "Викторины", "Викториналар"],
    [Gamepad2, "/games", "Игровая арена", "Ойын аренасы"],
    [Map, "/quests", "Квесты класса", "Сынып квесттері"],
  ];
  const counts = [
    [CalendarDays, "lessonsToday", "Уроков сегодня", "Бүгінгі сабақтар"],
    [
      ClipboardCheck,
      "pendingReviews",
      "Работ на проверке",
      "Тексерілетін жұмыстар",
    ],
    [Users, "totalStudents", "Учеников", "Оқушылар"],
    [BookOpen, "totalLessons", "Сохранённых уроков", "Сақталған сабақтар"],
  ];
  const pending = (data?.assignments || []).filter(
    (a) => Number(a.pending_count) > 0,
  );
  const date = new Intl.DateTimeFormat(kk ? "kk-KZ" : "ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Almaty",
  }).format(new Date());
  return (
    <div className="teacher-home">
      <header className="teacher-home-heading">
        <div>
          <p className="brand-eyebrow">{date}</p>
          <h1 className="page-title">
            {kk ? "Сабаққа дайынбыз ба?" : "Готовимся к уроку?"}
          </h1>
          <p className="page-subtitle">{user?.name}</p>
        </div>
        <div className="teacher-home-actions">
          <button
            className="btn btn-secondary"
            onClick={load}
            disabled={busy}
            title={kk ? "Жаңарту" : "Обновить"}
            aria-label={kk ? "Жаңарту" : "Обновить"}
          >
            <RefreshCw size={17} />
          </button>
          <Link className="btn btn-primary" to="/builder">
            <Plus size={18} />
            {kk ? "Жаңа сабақ" : "Новый урок"}
          </Link>
        </div>
      </header>
      {error && (
        <p className="brand-message error" role="alert">
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
        {counts.map(([Icon, key, ru, kz]) => (
          <div key={key}>
            <Icon size={20} />
            <strong>{data ? data.stats[key] : "—"}</strong>
            <span>{kk ? kz : ru}</span>
          </div>
        ))}
      </section>
      <nav
        className="teacher-tools"
        aria-label={kk ? "Жұмыс құралдары" : "Рабочие инструменты"}
      >
        {tools.map(([Icon, path, ru, kz]) => (
          <Link to={path} key={path}>
            <Icon size={19} />
            <span>{kk ? kz : ru}</span>
            <ArrowRight size={15} />
          </Link>
        ))}
      </nav>
      <div className="teacher-home-columns">
        <section>
          <div className="teacher-section-heading">
            <h2>{kk ? "Бүгінгі кесте" : "Сегодня в расписании"}</h2>
            <Link to="/schedule">
              {kk ? "Апта" : "Вся неделя"}
              <ArrowRight size={15} />
            </Link>
          </div>
          {!data ? (
            <p className="teacher-empty">
              {error
                ? kk
                  ? "Деректер қолжетімсіз"
                  : "Данные недоступны"
                : kk
                  ? "Жүктелуде…"
                  : "Загрузка…"}
            </p>
          ) : data.schedule.length ? (
            <div className="teacher-list">
              {data.schedule.map((item) => (
                <Link
                  key={item.id}
                  to={
                    item.lesson_id
                      ? `/builder?edit=${item.lesson_id}`
                      : "/schedule"
                  }
                >
                  <time>{item.start_time}</time>
                  <div>
                    <h3>{item.title}</h3>
                    <p>
                      {[item.class_name, item.subject]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="teacher-empty">
              <CalendarDays size={26} />
              <p>
                {kk ? "Бүгінге сабақ жоспарланбаған" : "На сегодня уроков нет"}
              </p>
              <Link className="btn btn-secondary" to="/schedule">
                <Plus size={16} />
                {kk ? "Кестеге қосу" : "Добавить в расписание"}
              </Link>
            </div>
          )}
        </section>
        <section>
          <div className="teacher-section-heading">
            <h2>{kk ? "Тексеруді күтуде" : "Ожидают проверки"}</h2>
            <Link to="/assignments">
              {kk ? "Барлығы" : "Все работы"}
              <ArrowRight size={15} />
            </Link>
          </div>
          {!data ? (
            <p className="teacher-empty">
              {error
                ? kk
                  ? "Деректер қолжетімсіз"
                  : "Данные недоступны"
                : kk
                  ? "Жүктелуде…"
                  : "Загрузка…"}
            </p>
          ) : pending.length ? (
            <div className="teacher-list">
              {pending.slice(0, 5).map((task) => (
                <Link key={task.id} to="/assignments">
                  <ClipboardCheck size={20} />
                  <div>
                    <h3>{task.title}</h3>
                    <p>
                      {task.class_name} · {task.pending_count}{" "}
                      {kk ? "жұмыс" : "работ"}
                    </p>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          ) : (
            <div className="teacher-empty">
              <ClipboardCheck size={26} />
              <p>
                {kk
                  ? "Тексерілетін жұмыстар жоқ"
                  : "Нет работ, ожидающих проверки"}
              </p>
              <Link className="btn btn-secondary" to="/assignments">
                {kk ? "Тапсырмаларға өту" : "К заданиям"}
              </Link>
            </div>
          )}
        </section>
      </div>
      {data?.notifications.length > 0 && (
        <section className="teacher-activity">
          <div className="teacher-section-heading">
            <h2>{kk ? "Соңғы оқиғалар" : "Последние события"}</h2>
          </div>
          {data.notifications.slice(0, 4).map((item) => (
            <p key={item.id}>{item.text}</p>
          ))}
        </section>
      )}
    </div>
  );
}
