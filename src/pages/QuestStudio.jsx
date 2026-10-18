import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Map,
  Eye,
  X,
  RefreshCw,
  Download,
  Check,
  Copy,
  KeyRound,
} from "lucide-react";
import { requestAPI } from "../lib/http";
import { localized } from "../student/api";
import { useLanguage } from "../contexts/LanguageContext";
import "./quest-studio.css";

export default function QuestStudio() {
  const dialog = useRef(null);
  const currentClass = useRef("");
  const [copied, setCopied] = useState("");
  const { language } = useLanguage(),
    kk = language === "kk";
  const [data, setData] = useState(null),
    [classId, setClassId] = useState(""),
    [report, setReport] = useState(null),
    [preview, setPreview] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      const result = await requestAPI("/quest-classes");
      setData(result);
      setClassId((old) => old || String(result.classes[0]?.id || ""));
    } catch (e) {
      setError(e.message);
    }
  }
  async function loadReport() {
    if (!classId) return;
    const target = classId;
    setReport(null);
    try {
      const next = await requestAPI(`/quest-classes/${target}`);
      if (currentClass.current === target) setReport(next);
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    currentClass.current = classId;
    let cancelled = false;
    setReport(null);
    if (classId)
      requestAPI(`/quest-classes/${classId}`)
        .then((result) => {
          if (!cancelled) setReport(result);
        })
        .catch((e) => {
          if (!cancelled) setError(e.message);
        });
    return () => {
      cancelled = true;
    };
  }, [classId]);
  useEffect(() => {
    if (!preview) return;
    dialog.current?.showModal();
    const onKey = (event) => {
      if (event.key === "Escape") setPreview(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [preview]);
  async function assign(id, checked) {
    setBusy(true);
    setError("");
    const previous = data;
    setData((current) => ({
      ...current,
      assignments: checked
        ? [...current.assignments, { class_id: Number(classId), quest_id: id }]
        : current.assignments.filter(
            (a) => !(String(a.class_id) === classId && a.quest_id === id),
          ),
    }));
    try {
      await requestAPI(`/quest-classes/${classId}/${id}`, {
        method: checked ? "POST" : "DELETE",
      });
      await load();
    } catch (e) {
      setData(previous);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function showPreview(id) {
    setError("");
    try {
      setPreview(await requestAPI(`/quest-classes/preview/${id}`));
    } catch (e) {
      setError(e.message);
    }
  }
  async function invite() {
    setBusy(true);
    setError("");
    try {
      const result = await requestAPI(`/quest-classes/${classId}/invite`, {
        method: "POST",
      });
      setData((current) => ({
        ...current,
        classes: current.classes.map((c) =>
          String(c.id) === classId ? { ...c, invite_code: result.code } : c,
        ),
      }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function copyInvite() {
    const code = data.classes.find(
      (c) => String(c.id) === classId,
    )?.invite_code;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/student/register?class=${encodeURIComponent(code)}`,
      );
      setCopied(classId);
    } catch {
      setError(
        kk
          ? "Сілтемені көшіру мүмкін болмады."
          : "Не удалось скопировать приглашение.",
      );
    }
  }
  function exportCSV() {
    const rows = [
      [
        kk ? "Оқушы" : "Ученик",
        ...data.quests.map((q) => localized(q.title, language)),
        "XP",
      ],
      ...report.students.map((student) => [
        student.name,
        ...data.quests.map(
          (q) =>
            `${report.progress.find((p) => p.student_id === student.id && p.quest_id === q.id)?.current_index || 0}/${q.steps}`,
        ),
        student.xp,
      ]),
    ];
    const escape = (value) =>
      `"${String(value)
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""')}"`;
    const url = URL.createObjectURL(
      new Blob(
        ["\uFEFF" + rows.map((row) => row.map(escape).join(",")).join("\r\n")],
        { type: "text/csv;charset=utf-8" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `quests-class-${classId}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="quest-studio">
      <header className="qs-header">
        <div>
          <h1 className="page-title">
            {kk ? "Сынып квесттері" : "Квесты класса"}
          </h1>
          <p className="text-muted">
            {kk ? "Математика · Логика · Ғылым" : "Математика · Логика · Наука"}
          </p>
        </div>
        <Link className="btn btn-secondary" to="/games">
          <Map size={17} />
          {kk ? "Ойындар" : "Игры"}
        </Link>
      </header>
      {error && (
        <div className="qs-error" role="alert">
          {error}
          <button className="btn btn-secondary" onClick={load}>
            <RefreshCw size={16} />
            {kk ? "Қайталау" : "Повторить"}
          </button>
        </div>
      )}
      {!data ? (
        <p role="status">{kk ? "Жүктелуде…" : "Загрузка…"}</p>
      ) : (
        <>
          <section className="qs-class-bar">
            <label htmlFor="quest-class">{kk ? "Сынып" : "Класс"}</label>
            <select
              id="quest-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
            >
              {!data.classes.length && (
                <option value="">{kk ? "Сынып жоқ" : "Нет классов"}</option>
              )}
              {data.classes.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {classId && (
              <span className="text-muted">
                {kk ? "Қосылу коды" : "Код подключения"}:{" "}
                <strong>
                  {data.classes.find((c) => String(c.id) === classId)
                    ?.invite_code || "—"}
                </strong>
              </span>
            )}
            {classId &&
              (data.classes.find((c) => String(c.id) === classId)
                ?.invite_code ? (
                <button
                  className="btn btn-secondary"
                  onClick={copyInvite}
                  title={
                    kk ? "Шақыру сілтемесін көшіру" : "Копировать приглашение"
                  }
                  aria-label={
                    kk ? "Шақыру сілтемесін көшіру" : "Копировать приглашение"
                  }
                >
                  {copied === classId ? (
                    <Check size={17} />
                  ) : (
                    <Copy size={17} />
                  )}
                </button>
              ) : (
                <button
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={invite}
                >
                  <KeyRound size={17} />
                  {kk ? "Код жасау" : "Создать код"}
                </button>
              ))}
            <Link to="/student/login" className="qs-student-link">
              {kk ? "Оқушы кіруі" : "Вход для школьников"}
            </Link>
          </section>
          {!data.classes.length && (
            <p className="qs-empty">
              <Link to="/classes">{kk ? "Сынып құру" : "Создать класс"}</Link>
            </p>
          )}
          <section className="qs-catalog">
            {data.quests.map((q) => {
              const assigned = data.assignments.some(
                (a) => String(a.class_id) === classId && a.quest_id === q.id,
              );
              return (
                <article key={q.id} className={`qs-quest qs-${q.track}`}>
                  <div>
                    <span className="qs-track">
                      {q.track === "math"
                        ? "Математика"
                        : q.track === "logic"
                          ? "Логика"
                          : kk
                            ? "Ғылым"
                            : "Наука"}
                    </span>
                    <h2>{localized(q.title, language)}</h2>
                    <p>{localized(q.description, language)}</p>
                    <span className="text-muted">
                      {q.steps} {kk ? "кезең" : "этапа"} · +{q.reward} XP
                    </span>
                  </div>
                  <footer>
                    <button
                      className="btn btn-secondary"
                      onClick={() => showPreview(q.id)}
                    >
                      <Eye size={16} />
                      {kk ? "Көру" : "Просмотр"}
                    </button>
                    <label>
                      <input
                        type="checkbox"
                        disabled={!classId || busy}
                        checked={assigned}
                        onChange={(e) => assign(q.id, e.target.checked)}
                      />
                      {kk ? "Сыныпқа" : "Классу"}
                    </label>
                  </footer>
                </article>
              );
            })}
          </section>
          <section className="qs-report">
            <div className="qs-header">
              <h2>{kk ? "Сыныптың ілгерілеуі" : "Прогресс класса"}</h2>
              <div className="qs-actions">
                <button
                  className="btn btn-secondary"
                  disabled={!classId}
                  onClick={loadReport}
                  title={kk ? "Жаңарту" : "Обновить"}
                  aria-label={kk ? "Жаңарту" : "Обновить"}
                >
                  <RefreshCw size={17} />
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={!report?.students.length}
                  onClick={exportCSV}
                >
                  <Download size={17} />
                  CSV
                </button>
              </div>
            </div>
            {!classId ? (
              <p>{kk ? "Сыныпты таңдаңыз" : "Выберите класс"}</p>
            ) : !report ? (
              <p role="status">{kk ? "Жүктелуде…" : "Загрузка…"}</p>
            ) : !report.students.length ? (
              <p>
                {kk ? "Сыныпта оқушылар әлі жоқ" : "В классе пока нет учеников"}
              </p>
            ) : (
              <div className="qs-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>{kk ? "Оқушы" : "Ученик"}</th>
                      {data.quests.map((q) => (
                        <th key={q.id}>{localized(q.title, language)}</th>
                      ))}
                      <th>XP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students.map((student) => (
                      <tr key={student.id}>
                        <th>{student.name}</th>
                        {data.quests.map((q) => {
                          const p = report.progress.find(
                            (row) =>
                              row.student_id === student.id &&
                              row.quest_id === q.id,
                          );
                          const attempts =
                            report.attempts.find(
                              (row) =>
                                row.student_id === student.id &&
                                row.quest_id === q.id,
                            )?.attempts || 0;
                          return (
                            <td
                              key={q.id}
                              title={`${kk ? "Әрекеттер" : "Попыток"}: ${attempts}`}
                            >
                              <span
                                className={p?.completed_at ? "qs-complete" : ""}
                              >
                                {p?.completed_at && <Check size={13} />}
                                {p?.current_index || 0}/{q.steps}
                              </span>
                            </td>
                          );
                        })}
                        <td>{student.xp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
      {preview && (
        <dialog
          ref={dialog}
          onCancel={() => setPreview(null)}
          className="qs-preview"
          aria-labelledby="qs-preview-title"
        >
          <header>
            <h2 id="qs-preview-title">{localized(preview.title, language)}</h2>
            <button
              className="btn btn-secondary"
              aria-label={kk ? "Жабу" : "Закрыть"}
              onClick={() => setPreview(null)}
              autoFocus
            >
              <X size={19} />
            </button>
          </header>
          <ol>
            {preview.steps.map((step, i) => (
              <li key={i}>
                <h3>{localized(step.question, language)}</h3>
                {step.options && (
                  <p>{localized(step.options, language).join(" · ")}</p>
                )}
                <strong>
                  {kk ? "Жауабы" : "Ответ"}:{" "}
                  {step.type === "choice"
                    ? localized(step.options, language)[step.answer]
                    : step.type === "order"
                      ? step.answer
                          .map(
                            (index) => localized(step.options, language)[index],
                          )
                          .join(" → ")
                      : step.answer}
                </strong>
                <p>{localized(step.explanation, language)}</p>
              </li>
            ))}
          </ol>
        </dialog>
      )}
    </div>
  );
}
