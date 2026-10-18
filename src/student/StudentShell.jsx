import { useCallback, useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import {
  Gamepad2,
  LogOut,
  RefreshCw,
  Map,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { studentAPI } from "./api";
import "./student.css";

export default function StudentShell() {
  const generation = useRef(0);
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  const { language, toggleLanguage } = useLanguage();
  const kk = language === "kk",
    navigate = useNavigate(),
    location = useLocation();
  const reload = useCallback(async () => {
    const version = ++generation.current;
    setError("");
    try {
      const result = await studentAPI("/student-quests");
      if (version !== generation.current) return;
      setData(result);
      return result;
    } catch (e) {
      if (version === generation.current) setError(e.message);
    }
  }, []);
  useEffect(() => {
    if (localStorage.getItem("studentToken")) reload();
    const expired = () => {
      navigate(`/student/login?next=${encodeURIComponent(location.pathname)}`, {
        replace: true,
      });
    };
    window.addEventListener("student:expired", expired);
    return () => {
      generation.current++;
      window.removeEventListener("student:expired", expired);
    };
  }, [reload, navigate, location.pathname]);
  if (!localStorage.getItem("studentToken"))
    return (
      <Navigate
        to={`/student/login?next=${encodeURIComponent(location.pathname)}`}
        replace
      />
    );
  return (
    <div className="student-app">
      <header className="student-top">
        <Link className="student-brand" to="/student/dashboard">
          <img src="/logo.jpg" alt="" />
          URPAQ <span>PLAY</span>
        </Link>
        <div className="student-top-actions">
          <button className="s-button" onClick={toggleLanguage}>
            {kk ? "RU" : "ҚАЗ"}
          </button>
          <button
            className="s-icon"
            title={kk ? "Шығу" : "Выйти"}
            aria-label={kk ? "Шығу" : "Выйти"}
            onClick={() => {
              localStorage.removeItem("studentToken");
              navigate("/student/login");
            }}
          >
            <LogOut size={19} />
          </button>
        </div>
      </header>
      <nav
        className="student-nav"
        aria-label={kk ? "Оқушы мәзірі" : "Меню ученика"}
      >
        <Link
          to="/student/dashboard"
          aria-current={
            location.pathname === "/student/dashboard" ? "page" : undefined
          }
        >
          <Map size={18} />
          {kk ? "Менің жолым" : "Мой путь"}
        </Link>
        <Link
          to="/student/class"
          aria-current={
            location.pathname === "/student/class" ? "page" : undefined
          }
        >
          <BookOpen size={18} />
          {kk ? "Тапсырмалар" : "Задания"}
        </Link>
        <Link to="/play">
          <Gamepad2 size={18} />
          {kk ? "Арена" : "Арена"}
        </Link>
        <Link
          to="/student/history"
          aria-current={
            location.pathname === "/student/history" ? "page" : undefined
          }
        >
          <BarChart3 size={18} />
          {kk ? "Нәтижелер" : "Результаты"}
        </Link>
      </nav>
      <main className="student-main">
        {error ? (
          <div className="s-state" role="alert">
            <p>{error}</p>
            <button className="s-button" onClick={reload}>
              <RefreshCw size={16} />
              {kk ? "Қайталау" : "Повторить"}
            </button>
          </div>
        ) : !data ? (
          <div className="s-state" role="status">
            {kk ? "Жүктелуде…" : "Загрузка…"}
          </div>
        ) : (
          <Outlet context={{ ...data, reload }} />
        )}
      </main>
    </div>
  );
}
