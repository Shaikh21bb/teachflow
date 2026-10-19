import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { API_BASE, readResponse } from "../lib/http";
import AccessLayout, { PasswordField } from "../components/AccessLayout";
export default function ResetPassword() {
  const { language } = useLanguage(),
    kk = language === "kk",
    [params] = useSearchParams(),
    token = params.get("token");
  const [password, setPassword] = useState(""),
    [confirm, setConfirm] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (password !== confirm) {
      setError(kk ? "Құпиясөздер сәйкес емес." : "Пароли не совпадают.");
      return;
    }
    setBusy(true);
    try {
      const data = await readResponse(
        await fetch(`${API_BASE}/auth/reset-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
          signal: AbortSignal.timeout(20000),
        }),
      );
      setMessage(data.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessLayout title={kk ? "Жаңа құпиясөз" : "Новый пароль"}>
      {!token ? (
        <>
          <p className="brand-message error" role="alert">
            {kk
              ? "Сілтеме жарамсыз немесе толық емес."
              : "Ссылка недействительна или скопирована не полностью."}
          </p>
          <div className="access-links">
            <Link className="access-link" to="/forgot-password">
              {kk ? "Жаңа сілтеме сұрау" : "Запросить новую ссылку"}
            </Link>
          </div>
        </>
      ) : message ? (
        <p className="brand-message" role="status">
          {message}
        </p>
      ) : (
        <form className="brand-form" onSubmit={submit}>
          <PasswordField
            id="new-password"
            label={kk ? "Жаңа құпиясөз" : "Новый пароль"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            newPassword
          />
          <PasswordField
            id="confirm-password"
            label={kk ? "Құпиясөзді қайталау" : "Повторите пароль"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            newPassword
          />
          {error && (
            <p className="brand-message error" role="alert">
              {error}
            </p>
          )}
          <button className="brand-button primary" disabled={busy}>
            {busy
              ? kk
                ? "Сақталуда…"
                : "Сохраняем…"
              : kk
                ? "Құпиясөзді сақтау"
                : "Сохранить пароль"}
          </button>
        </form>
      )}
      <div className="access-links">
        <Link className="access-link" to="/login">
          {kk ? "Кіру бетіне" : "Вернуться ко входу"}
        </Link>
      </div>
    </AccessLayout>
  );
}
