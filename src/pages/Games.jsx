import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Gamepad2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Library,
  Play,
  Loader2,
  RefreshCw,
  Users,
  Clock,
  X,
} from "lucide-react";
import { quizzesAPI } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { gamesAPI, text } from "../games/api";
import PixelArena from "../games/PixelArena";
import "../games/games.css";

export default function Games() {
  const requestKey = useRef(crypto.randomUUID());
  const { language } = useLanguage(),
    { user } = useAuth();
  const t = text(language),
    navigate = useNavigate();
  const [rooms, setRooms] = useState([]),
    [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [creating, setCreating] = useState(false),
    [source, setSource] = useState("demo");
  const [quizId, setQuizId] = useState(""),
    [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false),
    [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState(""),
    [count, setCount] = useState(8),
    [grade, setGrade] = useState("7");
  const [questions, setQuestions] = useState([]);
  async function load() {
    setLoading(true);
    setError("");
    try {
      const [r, q] = await Promise.all([gamesAPI.list(), quizzesAPI.getAll()]);
      setRooms(r);
      setQuizzes(q);
      setQuizId(String(q[0]?.id || ""));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const result = await quizzesAPI.aiGenerate({
        topic: topic.trim(),
        grade,
        question_count: Number(count),
        language,
      });
      setQuestions(result.questions);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }
  function editQuestion(index, field, value, option) {
    setQuestions((list) =>
      list.map((q, i) =>
        i !== index
          ? q
          : {
              ...q,
              [field]:
                option === undefined
                  ? value
                  : q.options.map((s, j) => (j === option ? value : s)),
            },
      ),
    );
  }
  async function create(e) {
    e.preventDefault();
    if (busy || generating) return;
    setBusy(true);
    setError("");
    try {
      let id = Number(quizId);
      if (source === "ai") {
        if (questions.length < 2)
          throw new Error(
            t("Сначала создайте вопросы", "Алдымен сұрақтарды жасаңыз"),
          );
        const saved = await quizzesAPI.create({
          title: topic.trim(),
          grade,
          questions,
        });
        id = saved.id;
        setQuizId(String(id));
        setQuizzes((list) => [saved, ...list]);
        setSource("quiz");
      }
      const room = await gamesAPI.create({
        requestKey: requestKey.current,
        demo: source === "demo",
        quizId: id,
        roundSeconds: Number(seconds),
        language,
      });
      navigate(`/games/host/${room.code}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const status = {
    lobby: t("Сбор участников", "Қатысушылар жиналуда"),
    running: t("Идёт матч", "Матч жүріп жатыр"),
    paused: t("Пауза", "Үзіліс"),
    finished: t("Завершён", "Аяқталды"),
  };
  return (
    <div className="games-workspace">
      <div className="games-heading">
        <div>
          <h1 className="page-title">{t("Игры", "Ойындар")}</h1>
          <p className="page-subtitle">
            {t("Игровые занятия", "Ойын сабақтары")}
          </p>
        </div>
        <Link className="btn btn-secondary" to="/play">
          <Gamepad2 size={17} />
          {t("Войти по коду", "Кодпен кіру")}
        </Link>
      </div>
      {error && (
        <div className="arena-alert" role="alert">
          {error}
          <button
            type="button"
            className="arena-icon"
            title={t("Закрыть", "Жабу")}
            onClick={() => setError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {creating ? (
        <section className="game-create">
          <button
            type="button"
            className="arena-text-button"
            onClick={() => setCreating(false)}
          >
            <ArrowLeft size={17} />
            {t("Все игры", "Барлық ойындар")}
          </button>
          <h2>{t("Новый матч", "Жаңа матч")}</h2>
          <form onSubmit={create}>
            <fieldset className="game-source">
              <legend>{t("Вопросы", "Сұрақтар")}</legend>
              {[
                ["demo", Play, t("Готовая викторина", "Дайын викторина")],
                ["quiz", Library, t("Мои тесты", "Менің тесттерім")],
                ["ai", Sparkles, t("AI по теме", "Тақырып бойынша AI")],
              ].map(([key, Icon, label]) => (
                <button
                  type="button"
                  key={key}
                  aria-pressed={source === key}
                  disabled={busy || generating}
                  onClick={() => setSource(key)}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </fieldset>
            {source === "demo" && (
              <div className="game-demo-summary">
                <Gamepad2 size={24} />
                <div>
                  <strong>
                    {t("Математическая дуэль", "Математикалық дуэль")}
                  </strong>
                  <span>
                    {t(
                      "10 вопросов · Без AI-кредитов",
                      "10 сұрақ · AI кредитсіз",
                    )}
                  </span>
                </div>
              </div>
            )}
            {source === "quiz" && (
              <label className="arena-label">
                {t("Тест", "Тест")}
                <select
                  value={quizId}
                  required
                  onChange={(e) => setQuizId(e.target.value)}
                >
                  <option value="">
                    {t("Выберите тест", "Тестті таңдаңыз")}
                  </option>
                  {quizzes.map((q) => (
                    <option key={q.id} value={q.id}>
                      {q.title} ({q.questions?.length || 0})
                    </option>
                  ))}
                </select>
                {quizzes.length === 0 && (
                  <Link to="/quizzes">
                    {t("Создать тест", "Тест жасау")}
                    <ArrowRight size={15} />
                  </Link>
                )}
              </label>
            )}
            {source === "ai" && (
              <div className="game-ai-fields">
                <label className="arena-label wide">
                  {t("Тема", "Тақырып")}
                  <input
                    value={topic}
                    maxLength={120}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t("Например, дроби", "Мысалы, бөлшектер")}
                  />
                </label>
                <label className="arena-label">
                  {t("Класс", "Сынып")}
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                  >
                    {Array.from({ length: 11 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="arena-label">
                  {t("Количество вопросов", "Сұрақ саны")}
                  <input
                    type="number"
                    min="2"
                    max="20"
                    value={count}
                    onChange={(e) => setCount(e.target.value)}
                  />
                </label>
                <button
                  type="button"
                  className="arena-button secondary"
                  disabled={
                    generating ||
                    busy ||
                    topic.trim().length < 3 ||
                    Number(count) < 2 ||
                    Number(count) > 20
                  }
                  onClick={generate}
                >
                  {generating ? (
                    <Loader2 className="arena-spin" size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}{" "}
                  {t("Создать вопросы", "Сұрақтарды жасау")} ·{" "}
                  {user?.creditCosts?.quiz_generation ?? 2} {t("кр.", "кр.")}
                </button>
              </div>
            )}
            {source === "ai" && questions.length > 0 && (
              <div className="game-question-editor">
                <h3>
                  {t("Проверка вопросов", "Сұрақтарды тексеру")}{" "}
                  <span>{questions.length}</span>
                </h3>
                {questions.map((q, i) => (
                  <fieldset key={i}>
                    <legend>
                      {t("Вопрос", "Сұрақ")} {i + 1}
                    </legend>
                    <textarea
                      aria-label={`${t("Вопрос", "Сұрақ")} ${i + 1}`}
                      required
                      maxLength={700}
                      value={q.question}
                      onChange={(e) =>
                        editQuestion(i, "question", e.target.value)
                      }
                    />
                    <div className="game-editor-options">
                      {q.options.map((option, j) => (
                        <label key={j}>
                          <input
                            type="radio"
                            name={`correct-${i}`}
                            aria-label={`${t("Правильный ответ", "Дұрыс жауап")} ${i + 1} ${"ABCD"[j]}`}
                            checked={q.correct === "ABCD"[j]}
                            onChange={() =>
                              editQuestion(i, "correct", "ABCD"[j])
                            }
                          />
                          <input
                            aria-label={`${i + 1} ${"ABCD"[j]}`}
                            required
                            maxLength={300}
                            value={option}
                            onChange={(e) =>
                              editQuestion(i, "options", e.target.value, j)
                            }
                          />
                        </label>
                      ))}
                    </div>
                  </fieldset>
                ))}
              </div>
            )}
            <div className="game-form-footer">
              <label className="arena-label">
                {t("Секунд на вопрос", "Бір сұраққа секунд")}
                <select
                  value={seconds}
                  onChange={(e) => setSeconds(e.target.value)}
                >
                  {[15, 20, 30, 45, 60, 90, 120].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className="arena-button"
                disabled={
                  busy ||
                  generating ||
                  loading ||
                  (source === "quiz" && !quizId) ||
                  (source === "ai" && !questions.length)
                }
              >
                {busy ? (
                  <Loader2 size={18} className="arena-spin" />
                ) : (
                  <Plus size={18} />
                )}{" "}
                {t("Создать комнату", "Бөлме жасау")}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <div className="game-catalog">
            <article className="game-catalog-item">
              <div className="game-cover">
                <PixelArena motion={false} />
                <span className="game-cover-tag">BILIM ARENA</span>
              </div>
              <div className="game-catalog-body">
                <div>
                  <span className="game-category">
                    {t("Командная викторина", "Командалық викторина")}
                  </span>
                  <h2>{t("Арена знаний", "Білім аренасы")}</h2>
                  <div className="game-meta">
                    <span>
                      <Users size={15} />
                      2–40
                    </span>
                    <span>
                      <Clock size={15} />
                      {t("15–120 сек / вопрос", "15–120 сек / сұрақ")}
                    </span>
                  </div>
                </div>
                <button
                  className="arena-button"
                  onClick={() => setCreating(true)}
                  disabled={loading}
                >
                  <Plus size={18} />
                  {t("Создать матч", "Матч жасау")}
                </button>
              </div>
            </article>
          </div>
          <section className="game-history">
            <div className="games-heading">
              <h2>{t("Мои матчи", "Менің матчтарым")}</h2>
              <button
                className="arena-icon"
                onClick={load}
                disabled={loading}
                title={t("Обновить", "Жаңарту")}
              >
                <RefreshCw size={18} className={loading ? "arena-spin" : ""} />
              </button>
            </div>
            {loading ? (
              <div className="game-empty" role="status">
                <Loader2 size={22} className="arena-spin" />
              </div>
            ) : rooms.length === 0 ? (
              <div className="game-empty">
                <Gamepad2 size={30} />
                <p>{t("Матчей пока нет", "Матчтар әлі жоқ")}</p>
              </div>
            ) : (
              <div className="game-room-list">
                {rooms.map((room) => (
                  <Link key={room.code} to={`/games/host/${room.code}`}>
                    <div>
                      <strong>{room.title}</strong>
                      <span>
                        {room.code} · {room.player_count}{" "}
                        {t("участников", "қатысушы")}
                      </span>
                    </div>
                    <span className={`game-status ${room.status}`}>
                      {status[room.status]}
                    </span>
                    <ArrowRight size={17} />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
