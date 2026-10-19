import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Users,
  ClipboardCheck,
  FileQuestion,
  Gamepad2,
  Map,
  GraduationCap,
  School,
  Trophy,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import BrandMark from "../components/BrandMark";
import QuestMap from "../student/QuestMap";

const teacherTools = [
  [
    "/my-lessons",
    BookOpen,
    "Уроки",
    "Сабақтар",
    "Планы и материалы",
    "Жоспарлар мен материалдар",
  ],
  [
    "/classes",
    Users,
    "Классы",
    "Сыныптар",
    "Ученики и приглашения",
    "Оқушылар мен шақырулар",
  ],
  [
    "/assignments",
    ClipboardCheck,
    "Задания",
    "Тапсырмалар",
    "Работы и проверка",
    "Жұмыстар мен тексеру",
  ],
  [
    "/quizzes",
    FileQuestion,
    "Викторины",
    "Викториналар",
    "Вопросы и результаты",
    "Сұрақтар мен нәтижелер",
  ],
  [
    "/games",
    Gamepad2,
    "Игровая арена",
    "Ойын аренасы",
    "Командные викторины",
    "Командалық викториналар",
  ],
  [
    "/quests",
    Map,
    "Квесты класса",
    "Сынып квесттері",
    "Маршруты и прогресс",
    "Бағыттар мен ілгерілеу",
  ],
];
const studentTools = [
  [
    "/student/dashboard",
    Map,
    "Квесты",
    "Квесттер",
    "Математика, логика и наука",
    "Математика, логика және ғылым",
  ],
  [
    "/student/class",
    ClipboardCheck,
    "Задания класса",
    "Сынып тапсырмалары",
    "Домашние работы и тесты",
    "Үй жұмыстары мен тесттер",
  ],
  [
    "/play",
    Gamepad2,
    "Игровая арена",
    "Ойын аренасы",
    "Матч по коду учителя",
    "Мұғалім коды бойынша матч",
  ],
  [
    "/student/history",
    Trophy,
    "Мои результаты",
    "Менің нәтижелерім",
    "Пройденные этапы и викторины",
    "Өткен кезеңдер мен викториналар",
  ],
];
export default function Landing() {
  const { language, toggleLanguage } = useLanguage(),
    kk = language === "kk";
  const { isAuthenticated } = useAuth();
  const [role, setRole] = useState(() =>
    localStorage.getItem("urpaq_entry_role") === "student"
      ? "student"
      : "teacher",
  );
  const selectRole = (next) => {
    setRole(next);
    localStorage.setItem("urpaq_entry_role", next);
  };
  const student = role === "student";
  return (
    <div className="brand-start">
      <header className="brand-public-header">
        <BrandMark />
        <div className="start-header-actions">
          <Link className="access-link" to="/student/login">
            {kk ? "Оқушыларға" : "Школьникам"}
          </Link>
          <button
            className="brand-button"
            onClick={toggleLanguage}
            aria-label={kk ? "Орыс тіліне ауысу" : "Переключить на казахский"}
          >
            {kk ? "RU" : "ҚАЗ"}
          </button>
          <Link
            className="brand-button"
            to={isAuthenticated ? "/dashboard" : "/login"}
          >
            {isAuthenticated
              ? kk
                ? "Кабинет"
                : "Кабинет"
              : kk
                ? "Кіру"
                : "Войти"}
          </Link>
        </div>
      </header>
      <main className="start-main">
        <div className="start-heading">
          <div>
            <p className="brand-eyebrow">
              {kk ? "Білім беру кеңістігі" : "Учебное пространство"}
            </p>
            <h1>URPAQ</h1>
            <p>
              {kk
                ? "Мұғалімге сабақ. Оқушыға жаңа қадам."
                : "Учителю для урока. Ученику для нового шага."}
            </p>
          </div>
          <div
            className="start-role"
            role="group"
            aria-label={kk ? "Кабинетті таңдау" : "Выбор кабинета"}
          >
            <button
              aria-pressed={!student}
              onClick={() => selectRole("teacher")}
            >
              <School size={18} />
              {kk ? "Мұғалім" : "Учитель"}
            </button>
            <button
              aria-pressed={student}
              onClick={() => selectRole("student")}
            >
              <GraduationCap size={18} />
              {kk ? "Оқушы" : "Ученик"}
            </button>
          </div>
        </div>
        <section
          className="start-workspace"
          aria-labelledby="start-workspace-title"
        >
          <div className="start-section-title">
            <h2 id="start-workspace-title">
              {student
                ? kk
                  ? "Менің оқуым"
                  : "Моя учёба"
                : kk
                  ? "Мұғалімнің жұмыс кеңістігі"
                  : "Рабочее пространство учителя"}
            </h2>
            <Link
              className="brand-button primary"
              to={student ? "/student/dashboard" : "/dashboard"}
            >
              {kk ? "Кабинетке өту" : "Открыть кабинет"}
              <ArrowRight size={17} />
            </Link>
          </div>
          <div className="start-tools">
            {(student ? studentTools : teacherTools).map(
              ([path, Icon, ru, kz, detailRu, detailKk]) => (
                <Link key={path} to={path} className="start-tool">
                  <Icon size={25} />
                  <div>
                    <h3>{kk ? kz : ru}</h3>
                    <span>{kk ? detailKk : detailRu}</span>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ),
            )}
          </div>
          <div className="start-secondary-actions">
            <Link to={student ? "/student/register" : "/register"}>
              {student
                ? kk
                  ? "Оқушы аккаунтын ашу"
                  : "Создать аккаунт школьника"
                : kk
                  ? "Мұғалім аккаунтын ашу"
                  : "Создать аккаунт учителя"}
              <ArrowRight size={14} />
            </Link>
            {!student && (
              <Link to="/student/login">
                {kk ? "Мен оқушымын" : "Я школьник"}
              </Link>
            )}
          </div>
        </section>
        <section className="start-play" aria-labelledby="start-play-title">
          <div className="start-section-title">
            <div>
              <p className="brand-eyebrow">URPAQ PLAY</p>
              <h2 id="start-play-title">
                {kk ? "Келесі кезең сені күтеді" : "Следующий этап ждёт тебя"}
              </h2>
            </div>
            <Link className="access-link" to="/student/dashboard">
              {kk ? "Квесттерге өту" : "К квестам"}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="start-world">
            <QuestMap
              progress={1}
              label={kk ? "Квесттер әлемі" : "Мир квестов"}
            />
          </div>
        </section>
      </main>
      <footer className="start-footer">
        <span>
          URPAQ · {kk ? "Қазақша және орысша" : "На русском и казахском"}
        </span>
        <Link to="/play">
          {kk ? "Ойынға кодпен кіру" : "Войти в игру по коду"}
        </Link>
      </footer>
    </div>
  );
}
