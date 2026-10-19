import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import AccessLayout, { PasswordField } from "../components/AccessLayout";
import { teacherReturnPath } from "../lib/navigation";
export default function Login() {
  const { language } = useLanguage(),
    kk = language === "kk";
  const { login } = useAuth(),
    navigate = useNavigate(),
    [params] = useSearchParams();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await login(email.trim(), password);
      if (result.success)
        navigate(teacherReturnPath(params.get("next")), { replace: true });
      else setError(result.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessLayout title={kk ? "Мұғалімге кіру" : "Вход для учителя"} roles>
      <form className="brand-form" onSubmit={submit}>
        <label className="brand-field" htmlFor="teacher-email">
          Email
          <input
            id="teacher-email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={200}
          />
        </label>
        <PasswordField
          id="teacher-password"
          label={kk ? "Құпиясөз" : "Пароль"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link className="access-link" to="/forgot-password">
          {kk ? "Құпиясөзді ұмыттыңыз ба?" : "Забыли пароль?"}
        </Link>
        {error && (
          <p className="brand-message error" role="alert">
            {error}
          </p>
        )}
        <button className="brand-button primary" disabled={busy}>
          {busy ? (kk ? "Кіру…" : "Входим…") : kk ? "Кіру" : "Войти"}
          <ArrowRight size={17} />
        </button>
      </form>
      <div className="access-links">
        <Link className="access-link" to="/register">
          {kk ? "Аккаунт ашу" : "Создать аккаунт"}
        </Link>
        <Link className="access-link" to="/">
          {kk ? "Басты бет" : "На главную"}
        </Link>
      </div>
    </AccessLayout>
  );
}
