import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, GraduationCap } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { studentAPI } from "./api";
import QuestMap from "./QuestMap";
import "./student.css";

export default function StudentAuth({ register = false }) {
  const { language, toggleLanguage } = useLanguage();
  const kk = language === "kk",
    navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const body = Object.fromEntries(new FormData(event.currentTarget));
      const data = await studentAPI(
        `/student/${register ? "register" : "login"}`,
        { method: "POST", body: JSON.stringify(body) },
      );
      localStorage.setItem("studentToken", data.token);
      const next = params.get("next");
      navigate(
        /^\/student\/(dashboard|class|history|quests\/[-a-z0-9]+)$/.test(
          next || "",
        )
          ? next
          : "/student/dashboard",
        { replace: true },
      );
    } catch (e) {
      setError(
        e.name === "TimeoutError"
          ? kk
            ? "Сервер жауап бермеді. Қайта көріңіз."
            : "Сервер не ответил. Попробуйте ещё раз."
          : e.message,
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="student-app student-auth">
      <header className="student-top">
        <Link to="/" className="student-brand">
          <img src="/logo.jpg" alt="" />
          URPAQ <span>PLAY</span>
        </Link>
        <button className="s-button" onClick={toggleLanguage}>
          {kk ? "RU" : "ҚАЗ"}
        </button>
      </header>
      <section className="student-auth-content">
        <div className="student-auth-title">
          <GraduationCap size={30} />
          <p>{kk ? "Оқушы кабинеті" : "Кабинет школьника"}</p>
          <h1>
            {register
              ? kk
                ? "Саяхатыңды баста"
                : "Начни своё путешествие"
              : kk
                ? "Қайта оралуыңмен!"
                : "С возвращением!"}
          </h1>
        </div>
        <QuestMap progress={1} label={kk ? "Квест жолы" : "Путь квеста"} />
        <div className="student-role-switch">
          <Link to="/login">{kk ? "Мұғалім" : "Учитель"}</Link>
          <span aria-current="page">{kk ? "Оқушы" : "Ученик"}</span>
        </div>
        <form onSubmit={submit} className="s-form">
          {register && (
            <label>
              {kk ? "Атың немесе лақап атың" : "Имя или ник"}
              <input
                name="name"
                autoComplete="nickname"
                required
                minLength={2}
                maxLength={100}
              />
            </label>
          )}
          <label>
            {kk ? "Логин" : "Логин"}
            <input
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              minLength={register ? 3 : undefined}
              maxLength={register ? 32 : 64}
              pattern={register ? "[a-zA-Z0-9_.-]{3,32}" : undefined}
              title={
                kk
                  ? "Латын әріптері, сандар, _, -, ."
                  : "Латинские буквы, цифры, _, -, ."
              }
            />
          </label>
          <label>
            {kk ? "Құпиясөз" : "Пароль"}
            <span className="s-password">
              <input
                name="password"
                type={visible ? "text" : "password"}
                autoComplete={register ? "new-password" : "current-password"}
                required
                minLength={register ? 8 : undefined}
                maxLength={128}
              />
              <button
                type="button"
                className="s-icon"
                title={kk ? "Құпиясөз" : "Показать пароль"}
                aria-label={kk ? "Құпиясөзді көрсету" : "Показать пароль"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {register && (
            <label>
              {kk ? "Сынып коды (міндетті емес)" : "Код класса (необязательно)"}
              <input
                name="invite_code"
                defaultValue={params.get("class") || ""}
                autoComplete="off"
                maxLength={100}
              />
            </label>
          )}
          {error && (
            <p className="s-error" role="alert">
              {error}
            </p>
          )}
          <button className="s-button s-primary" disabled={busy}>
            {busy
              ? kk
                ? "Күте тұр…"
                : "Подождите…"
              : register
                ? kk
                  ? "Тіркелу"
                  : "Создать аккаунт"
                : kk
                  ? "Кіру"
                  : "Войти"}
            <ArrowRight size={18} />
          </button>
        </form>
        <Link
          className="s-auth-link"
          to={register ? "/student/login" : "/student/register"}
        >
          {register
            ? kk
              ? "Аккаунтым бар"
              : "Уже есть аккаунт"
            : kk
              ? "Жаңа аккаунт ашу"
              : "Создать аккаунт школьника"}
        </Link>
      </section>
    </main>
  );
}
