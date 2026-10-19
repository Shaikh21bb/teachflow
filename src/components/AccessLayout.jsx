import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import BrandMark from "./BrandMark";

export default function AccessLayout({ title, children, roles = false }) {
  const { language, toggleLanguage } = useLanguage(),
    kk = language === "kk";
  return (
    <div className="brand-access">
      <header className="brand-public-header">
        <BrandMark />
        <button
          className="brand-button"
          onClick={toggleLanguage}
          aria-label={kk ? "Орыс тіліне ауысу" : "Переключить на казахский"}
        >
          {kk ? "RU" : "ҚАЗ"}
        </button>
      </header>
      <main className="access-main">
        <p className="brand-eyebrow">
          {kk ? "Мұғалім кабинеті" : "Кабинет учителя"}
        </p>
        <h1>{title}</h1>
        {roles && (
          <nav
            className="access-roles"
            aria-label={kk ? "Аккаунт түрі" : "Тип аккаунта"}
          >
            <span aria-current="page">{kk ? "Мұғалім" : "Учитель"}</span>
            <Link
              to="/student/login"
              aria-label={
                kk
                  ? "Мен оқушымын: ойындар мен тапсырмалар"
                  : "Я школьник: игры и задания"
              }
            >
              {kk ? "Оқушы" : "Ученик"}
            </Link>
          </nav>
        )}
        {children}
      </main>
      <footer className="access-footer">
        <Link to="/">URPAQ</Link>
        <span>{kk ? "Қазақша · Русский" : "Русский · Қазақша"}</span>
      </footer>
    </div>
  );
}

export function PasswordField({
  label,
  id,
  value,
  onChange,
  newPassword = false,
}) {
  const [visible, setVisible] = useState(false);
  const { language } = useLanguage(),
    kk = language === "kk";
  const action = visible
    ? kk
      ? "Құпиясөзді жасыру"
      : "Скрыть пароль"
    : kk
      ? "Құпиясөзді көрсету"
      : "Показать пароль";
  return (
    <label className="brand-field" htmlFor={id}>
      {label}
      <span className="brand-password">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          required
          minLength={newPassword ? 8 : undefined}
          maxLength={128}
          autoComplete={newPassword ? "new-password" : "current-password"}
        />
        <button
          className="brand-icon"
          type="button"
          title={action}
          aria-label={action}
          onClick={() => setVisible(!visible)}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
    </label>
  );
}
