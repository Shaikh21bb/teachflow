import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Check,
  RotateCcw,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { localized, studentAPI } from "./api";
import QuestMap from "./QuestMap";

export default function StudentQuest() {
  const { id } = useParams(),
    { reload } = useOutletContext();
  const { language } = useLanguage(),
    kk = language === "kk";
  const [data, setData] = useState(null),
    [answer, setAnswer] = useState(""),
    [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const generation = useRef(0);
  async function load(step) {
    const version = ++generation.current;
    setError("");
    setData(null);
    setResult(null);
    try {
      const next = await studentAPI(
        `/student-quests/${id}${step === undefined ? "" : `?step=${step}`}`,
      );
      if (version !== generation.current) return;
      setData(next);
      setAnswer(next.step.type === "order" ? [0, 1, 2, 3] : "");
    } catch (e) {
      if (version === generation.current) setError(e.message);
    }
  }
  useEffect(() => {
    load();
    return () => {
      generation.current++;
    };
  }, [id]);
  async function check(event) {
    event.preventDefault();
    if (busy) return;
    const version = generation.current;
    setBusy(true);
    setError("");
    try {
      const response = await studentAPI(`/student-quests/${id}/check`, {
        method: "POST",
        body: JSON.stringify({ stepIndex: data.stepIndex, answer }),
      });
      if (version !== generation.current) return;
      setResult(response);
      setData((prev) => ({ ...prev, progress: response.progress }));
      if (response.earned) await reload();
    } catch (e) {
      if (version === generation.current) setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function move(index, delta) {
    setResult(null);
    setAnswer((old) => {
      const next = [...old];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      return next;
    });
  }
  const done = data?.progress === data?.quest.steps;
  const practice = data && data.stepIndex < data.progress && !result;
  return (
    <div className="student-quest-page">
      <Link className="s-text-link" to="/student/dashboard">
        <ArrowLeft size={17} />
        {kk ? "Квесттерге" : "К квестам"}
      </Link>
      {error && (
        <div className="s-error" role="alert">
          {error}
          {!data && (
            <button className="s-button" onClick={() => load()}>
              <RefreshCw size={16} />
              {kk ? "Қайталау" : "Повторить"}
            </button>
          )}
        </div>
      )}
      {!data ? (
        !error && <p role="status">{kk ? "Жүктелуде…" : "Загрузка…"}</p>
      ) : (
        <>
          <div className="s-section-heading">
            <div>
              <p className="s-kicker">
                {done
                  ? kk
                    ? "Бағыт аяқталды"
                    : "Маршрут пройден"
                  : kk
                    ? "Сенің миссияң"
                    : "Твоя миссия"}
              </p>
              <h1>{localized(data.quest.title, language)}</h1>
            </div>
            <span className="s-xp">
              {data.progress}/{data.quest.steps}
            </span>
          </div>
          <QuestMap
            track={data.quest.track}
            progress={data.progress}
            label={
              kk
                ? `Кезең: ${data.progress}`
                : `Пройдено этапов: ${data.progress}`
            }
          />
          <nav className="s-step-nav" aria-label={kk ? "Кезеңдер" : "Этапы"}>
            {Array.from({ length: data.quest.steps }, (_, index) => (
              <button
                key={index}
                className={index === data.stepIndex ? "active" : ""}
                aria-current={index === data.stepIndex ? "step" : undefined}
                disabled={busy || index > data.progress}
                onClick={() => load(index)}
              >
                {index < data.progress ? <Check size={16} /> : index + 1}
                <span>
                  {kk ? "Кезең" : "Этап"} {index + 1}
                </span>
              </button>
            ))}
          </nav>
          <section className="s-challenge">
            <div className="s-section-heading">
              <span className="s-kicker">
                {practice
                  ? kk
                    ? "Жаттығу · 0 XP"
                    : "Тренировка · 0 XP"
                  : kk
                    ? "Тапсырма"
                    : "Задание"}{" "}
                {data.stepIndex + 1}
              </span>
              <span className="s-muted">
                {data.step.type === "order"
                  ? kk
                    ? "Реттілік"
                    : "Последовательность"
                  : data.step.type === "number"
                    ? kk
                      ? "Сандық жауап"
                      : "Числовой ответ"
                    : kk
                      ? "Бір жауап"
                      : "Один ответ"}
              </span>
            </div>
            <h2>{localized(data.step.question, language)}</h2>
            <form onSubmit={check}>
              {data.step.type === "number" && (
                <label className="s-numeric-label" htmlFor="quest-answer">
                  {kk ? "Жауабың" : "Твой ответ"}
                  <input
                    id="quest-answer"
                    inputMode="decimal"
                    autoComplete="off"
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      setResult(null);
                    }}
                    maxLength={18}
                    required
                    disabled={busy || result?.correct}
                  />
                </label>
              )}
              {data.step.type === "choice" && (
                <fieldset
                  className="s-options"
                  disabled={busy || result?.correct}
                >
                  <legend className="s-visually-hidden">
                    {kk ? "Жауап нұсқалары" : "Варианты ответа"}
                  </legend>
                  {localized(data.step.options, language).map(
                    (option, index) => (
                      <label
                        key={index}
                        className={answer === index ? "selected" : ""}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={index}
                          checked={answer === index}
                          onChange={() => {
                            setAnswer(index);
                            setResult(null);
                          }}
                        />
                        <span className="s-option-letter">
                          {String.fromCharCode(65 + index)}
                        </span>
                        <span>{option}</span>
                      </label>
                    ),
                  )}
                </fieldset>
              )}
              {data.step.type === "order" && (
                <ol className="s-order">
                  {answer.map((value, index) => (
                    <li key={value}>
                      <span className="s-order-index">{index + 1}</span>
                      <span>
                        {localized(data.step.options, language)[value]}
                      </span>
                      <div>
                        <button
                          type="button"
                          className="s-icon"
                          title={kk ? "Жоғары" : "Выше"}
                          aria-label={`${kk ? "Жоғары" : "Выше"}: ${localized(data.step.options, language)[value]}`}
                          disabled={busy || result?.correct || index === 0}
                          onClick={() => move(index, -1)}
                        >
                          <ArrowUp size={17} />
                        </button>
                        <button
                          type="button"
                          className="s-icon"
                          title={kk ? "Төмен" : "Ниже"}
                          aria-label={`${kk ? "Төмен" : "Ниже"}: ${localized(data.step.options, language)[value]}`}
                          disabled={busy || result?.correct || index === 3}
                          onClick={() => move(index, 1)}
                        >
                          <ArrowDown size={17} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
              {result && (
                <div
                  className={`s-feedback ${result.correct ? "correct" : ""}`}
                  role="status"
                >
                  <strong>
                    {result.correct
                      ? kk
                        ? "Дұрыс!"
                        : "Верно!"
                      : kk
                        ? "Қайта байқап көр"
                        : "Попробуй ещё раз"}
                    {result.earned > 0 && ` +${result.earned} XP`}
                  </strong>
                  <p>{localized(result.feedback, language)}</p>
                </div>
              )}
              <div className="s-challenge-actions">
                {!result?.correct ? (
                  <button
                    className="s-button s-primary"
                    disabled={busy || answer === ""}
                  >
                    {busy
                      ? kk
                        ? "Тексерілуде…"
                        : "Проверяем…"
                      : kk
                        ? "Тексеру"
                        : "Проверить"}
                    <Check size={18} />
                  </button>
                ) : data.stepIndex < data.quest.steps - 1 ? (
                  <button
                    type="button"
                    className="s-button s-primary"
                    onClick={() => load(data.stepIndex + 1)}
                  >
                    {kk ? "Келесі кезең" : "Следующий этап"}
                    <ArrowRight size={17} />
                  </button>
                ) : (
                  <Link className="s-button s-primary" to="/student/dashboard">
                    <Trophy size={18} />
                    {kk ? "Картаға оралу" : "На карту"}
                  </Link>
                )}
                {done && (
                  <button
                    type="button"
                    className="s-button"
                    disabled={busy}
                    onClick={() => load(0)}
                  >
                    <RotateCcw size={16} />
                    {kk ? "Қайталау" : "Тренировка"}
                  </button>
                )}
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
