import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import AccessLayout, { PasswordField } from "../components/AccessLayout";

const subjects = [
  ["primary", "Начальные классы", "Бастауыш сынып"],
  ["math", "Математика", "Математика"],
  ["physics", "Физика", "Физика"],
  ["chemistry", "Химия", "Химия"],
  ["biology", "Биология", "Биология"],
  ["history", "История", "Тарих"],
  ["geography", "География", "География"],
  ["informatics", "Информатика", "Информатика"],
  ["kazakh", "Казахский язык", "Қазақ тілі"],
  ["russian", "Русский язык", "Орыс тілі"],
  ["english", "Английский язык", "Ағылшын тілі"],
  ["literature", "Литература", "Әдебиет"],
  ["music", "Музыка", "Музыка"],
  ["art", "ИЗО", "Бейнелеу өнері"],
  ["pe", "Физкультура", "Дене тәрбиесі"],
  ["technology", "Технология", "Технология"],
  ["social", "Познание мира", "Дүниетану"],
];
export default function Register() {
  const { language } = useLanguage(),
    kk = language === "kk",
    { register } = useAuth(),
    navigate = useNavigate();
  const [step, setStep] = useState(1),
    [form, setForm] = useState({
      name: "",
      email: "",
      password: "",
      confirm: "",
    }),
    [agreed, setAgreed] = useState(false),
    [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const update = (field) => (e) =>
    setForm((old) => ({ ...old, [field]: e.target.value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (step === 1) {
      if (form.password !== form.confirm) {
        setError(kk ? "Құпиясөздер сәйкес емес." : "Пароли не совпадают.");
        return;
      }
      setStep(2);
      return;
    }
    if (!selected.length) {
      setError(
        kk ? "Кемінде бір пәнді таңдаңыз." : "Выберите хотя бы один предмет.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await register(
        form.name.trim(),
        form.email.trim(),
        form.password,
        selected,
      );
      if (result.success) navigate("/dashboard", { replace: true });
      else setError(result.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AccessLayout title={kk ? "Мұғалім аккаунты" : "Аккаунт учителя"} roles>
      <form className="brand-form" onSubmit={submit}>
        {step === 1 ? (
          <>
            <label className="brand-field" htmlFor="teacher-name">
              {kk ? "Аты-жөніңіз" : "Ваше имя"}
              <input
                id="teacher-name"
                autoComplete="name"
                value={form.name}
                onChange={update("name")}
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            <label className="brand-field" htmlFor="register-email">
              Email
              <input
                id="register-email"
                type="email"
                autoComplete="username"
                autoCapitalize="none"
                value={form.email}
                onChange={update("email")}
                maxLength={200}
                required
              />
            </label>
            <PasswordField
              id="register-password"
              label={kk ? "Құпиясөз" : "Пароль"}
              value={form.password}
              onChange={update("password")}
              newPassword
            />
            <PasswordField
              id="register-confirm"
              label={kk ? "Құпиясөзді қайталау" : "Повторите пароль"}
              value={form.confirm}
              onChange={update("confirm")}
              newPassword
            />
            <label className="brand-consent">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                required
              />
              <span>
                {kk
                  ? "Мен қызмет көрсету шарттарымен және құпиялылық саясатымен келісемін"
                  : "Я согласен с условиями использования и политикой конфиденциальности"}
              </span>
            </label>
          </>
        ) : (
          <>
            <div className="brand-form-heading">
              <button
                type="button"
                className="brand-icon"
                title={kk ? "Артқа" : "Назад"}
                aria-label={kk ? "Артқа" : "Назад"}
                disabled={busy}
                onClick={() => {
                  setStep(1);
                  setError("");
                }}
              >
                <ArrowLeft size={18} />
              </button>
              <h2>{kk ? "Сіздің пәндеріңіз" : "Ваши предметы"}</h2>
            </div>
            <fieldset className="brand-subjects">
              <legend>{kk ? "1 немесе 2 пән" : "Один или два предмета"}</legend>
              {subjects.map(([id, ru, kz]) => (
                <label key={id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(id)}
                    disabled={
                      busy || (!selected.includes(id) && selected.length === 2)
                    }
                    onChange={() =>
                      setSelected((old) =>
                        old.includes(id)
                          ? old.filter((s) => s !== id)
                          : [...old, id],
                      )
                    }
                  />
                  {kk ? kz : ru}
                </label>
              ))}
            </fieldset>
          </>
        )}
        {error && (
          <p className="brand-message error" role="alert">
            {error}
          </p>
        )}
        <button className="brand-button primary" disabled={busy}>
          {busy
            ? kk
              ? "Тіркелуде…"
              : "Создаём аккаунт…"
            : step === 1
              ? kk
                ? "Жалғастыру"
                : "Продолжить"
              : kk
                ? "Аккаунт ашу"
                : "Создать аккаунт"}
          <ArrowRight size={17} />
        </button>
      </form>
      <p className="access-note">
        {kk
          ? "Жаңа мұғалімге 5 бастапқы AI-кредит."
          : "Новому учителю: 5 стартовых AI-кредитов."}
      </p>
      <div className="access-links">
        <Link className="access-link" to="/login">
          {kk ? "Аккаунтым бар" : "Уже есть аккаунт"}
        </Link>
      </div>
    </AccessLayout>
  );
}
