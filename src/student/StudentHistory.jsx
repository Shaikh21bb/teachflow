import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { ArrowRight, RefreshCw } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { localized, studentAPI } from "./api";
export default function StudentHistory() {
  const { quests } = useOutletContext(),
    { language } = useLanguage(),
    kk = language === "kk";
  const [attempts, setAttempts] = useState(null),
    [error, setError] = useState("");
  async function load() {
    setError("");
    try {
      setAttempts((await studentAPI("/student-quests/history")).attempts);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  return (
    <>
      <h1>{kk ? "Менің нәтижелерім" : "Мои результаты"}</h1>
      <section className="student-class">
        <h2>{kk ? "Квесттер" : "Квесты"}</h2>
        <div className="s-homework-list">
          {quests
            .filter((q) => q.progress > 0)
            .map((q) => (
              <Link key={q.id} to={`/student/quests/${q.id}`}>
                <div>
                  <strong>{localized(q.title, language)}</strong>
                  <span>
                    {q.progress}/{q.steps} ·{" "}
                    {q.progress * 20 + (q.progress === q.steps ? 40 : 0)} XP
                  </span>
                </div>
                <ArrowRight size={17} />
              </Link>
            ))}
        </div>
        {!quests.some((q) => q.progress > 0) && (
          <p className="s-muted">
            {kk ? "Алғашқы квестіңді баста." : "Начни свой первый квест."}
          </p>
        )}
      </section>
      <section className="student-class">
        <h2>{kk ? "Викториналар" : "Викторины"}</h2>
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button className="s-button" onClick={load}>
              <RefreshCw size={16} />
              {kk ? "Қайталау" : "Повторить"}
            </button>
          </div>
        ) : !attempts ? (
          <p role="status">{kk ? "Жүктелуде…" : "Загрузка…"}</p>
        ) : !attempts.length ? (
          <p className="s-muted">
            {kk
              ? "Әзірше аяқталған викторина жоқ."
              : "Пройденных викторин пока нет."}
          </p>
        ) : (
          <div className="s-homework-list">
            {attempts.map((attempt) => (
              <div className="s-history-row" key={attempt.id}>
                <strong>{attempt.title}</strong>
                <span>
                  {attempt.score}/{attempt.max_score}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
