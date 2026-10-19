import { useState } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";
import { API_BASE, readResponse } from "../lib/http";
import AccessLayout from "../components/AccessLayout";
export default function ForgotPassword() {
  const { language } = useLanguage(),
    kk = language === "kk";
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const email = new FormData(event.currentTarget).get("email");
    setBusy(true);
    setError("");
    try {
      const result = await readResponse(
        await fetch(`${API_BASE}/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
          signal: AbortSignal.timeout(20000),
        }),
      );
      setMessage(result.message);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessLayout
      title={kk ? "Құпиясөзді қалпына келтіру" : "Восстановление пароля"}
    >
      <form className="brand-form" onSubmit={submit}>
        <label className="brand-field" htmlFor="recovery-email">
          Email
          <input
            id="recovery-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={200}
          />
        </label>
        {message && (
          <p className="brand-message" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="brand-message error" role="alert">
            {error}
          </p>
        )}
        <button className="brand-button primary" disabled={busy || !!message}>
          {busy
            ? kk
              ? "Жіберілуде…"
              : "Отправляем…"
            : kk
              ? "Сілтеме жіберу"
              : "Отправить ссылку"}
        </button>
      </form>
      <div className="access-links">
        <Link className="access-link" to="/login">
          {kk ? "Кіру бетіне" : "Вернуться ко входу"}
        </Link>
      </div>
    </AccessLayout>
  );
}
