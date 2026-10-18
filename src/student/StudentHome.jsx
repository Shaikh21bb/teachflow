import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowRight,
  Check,
  LockKeyhole,
  Trophy,
  Flame,
  Calculator,
  Brain,
  FlaskConical,
  Users,
  RefreshCw,
  BookOpen,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { localized, studentAPI } from "./api";
import QuestMap from "./QuestMap";

const tracks = [
  { id: "math", ru: "Математика", kk: "Математика", Icon: Calculator },
  { id: "logic", ru: "Логика", kk: "Логика", Icon: Brain },
  { id: "science", ru: "Наука", kk: "Ғылым", Icon: FlaskConical },
];
export default function StudentHome({ classroomOnly = false }) {
  const generation = useRef(0);
  const { student, quests, achievements, reload } = useOutletContext();
  const { language } = useLanguage(),
    kk = language === "kk";
  const [portal, setPortal] = useState(null),
    [error, setError] = useState(""),
    [joinError, setJoinError] = useState(""),
    [busy, setBusy] = useState(false);
  async function loadPortal() {
    const version = ++generation.current;
    setError("");
    try {
      const next = await studentAPI("/student-portal/dashboard");
      if (version === generation.current) setPortal(next);
    } catch (e) {
      if (version === generation.current) setError(e.message);
    }
  }
  useEffect(() => {
    loadPortal();
    return () => {
      generation.current++;
    };
  }, [student.class_id]);
  const completed = quests.filter((q) => q.progress === q.steps).length;
  const active =
    quests.find((q) => q.progress > 0 && q.progress < q.steps) ||
    quests.find((q) => q.unlocked && q.progress < q.steps);
  async function join(event) {
    event.preventDefault();
    setBusy(true);
    setJoinError("");
    try {
      await studentAPI("/student/class", {
        method: "POST",
        body: JSON.stringify(
          Object.fromEntries(new FormData(event.currentTarget)),
        ),
      });
      await reload();
    } catch (e) {
      setJoinError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {!classroomOnly && (
        <>
          <section className="student-intro">
            <div>
              <p className="s-kicker">
                {kk ? "Бүгінгі саяхат" : "Твоё путешествие"}
              </p>
              <h1>
                {kk ? `Сәлем, ${student.name}!` : `Привет, ${student.name}!`}
              </h1>
              <p className="s-muted">
                {student.class_name ||
                  (kk ? "Еркін зерттеуші" : "Самостоятельный исследователь")}
              </p>
            </div>
            <div className="student-stats">
              <span>
                <Flame size={20} />
                <b>{student.xp}</b> XP
              </span>
              <span>
                <Trophy size={20} />
                <b>{student.level}</b> {kk ? "деңгей" : "уровень"}
              </span>
              <span>
                <Check size={20} />
                <b>{completed}/9</b> {kk ? "квест" : "квестов"}
              </span>
            </div>
          </section>
          {active && (
            <section className="student-continue">
              <div className="s-section-heading">
                <div>
                  <p className="s-kicker">
                    {active.progress
                      ? kk
                        ? "Жалғастыр"
                        : "Продолжай путь"
                      : kk
                        ? "Алғашқы қадам"
                        : "Первый шаг"}
                  </p>
                  <h2>{localized(active.title, language)}</h2>
                </div>
                <Link
                  className="s-button s-primary"
                  to={`/student/quests/${active.id}`}
                >
                  {kk ? "Ойнау" : "Играть"}
                  <ArrowRight size={17} />
                </Link>
              </div>
              <QuestMap
                track={active.track}
                progress={active.progress}
                label={
                  kk
                    ? `${active.progress} кезең аяқталды`
                    : `Завершено этапов: ${active.progress}`
                }
              />
            </section>
          )}
          <section className="student-tracks">
            <div className="s-section-heading">
              <h2>{kk ? "Квесттер әлемі" : "Мир квестов"}</h2>
              <span className="s-muted">
                {kk ? "3 бағыт · 36 тапсырма" : "3 направления · 36 заданий"}
              </span>
            </div>
            <div className="s-track-grid">
              {tracks.map(({ id, Icon, ...title }) => (
                <section className={`s-track track-${id}`} key={id}>
                  <h3>
                    <Icon size={20} />
                    {localized(title, language)}
                  </h3>
                  <div className="s-quest-list">
                    {quests
                      .filter((q) => q.track === id)
                      .map((quest, index) => (
                        <article
                          className={`s-quest-card ${!quest.unlocked ? "is-locked" : ""}`}
                          key={quest.id}
                        >
                          <div className="s-quest-top">
                            <span className="s-quest-number">0{index + 1}</span>
                            {quest.progress === quest.steps ? (
                              <Check
                                size={18}
                                aria-label={kk ? "Аяқталды" : "Завершено"}
                              />
                            ) : !quest.unlocked ? (
                              <LockKeyhole
                                size={17}
                                aria-label={kk ? "Жабық" : "Закрыто"}
                              />
                            ) : (
                              <span className="s-xp">+{quest.reward} XP</span>
                            )}
                          </div>
                          <h4>{localized(quest.title, language)}</h4>
                          <p>{localized(quest.description, language)}</p>
                          {quest.assigned && (
                            <span className="s-assigned">
                              {kk
                                ? "Мұғалім тағайындады"
                                : "Назначено учителем"}
                            </span>
                          )}
                          <progress
                            max={quest.steps}
                            value={quest.progress}
                            aria-label={localized(quest.title, language)}
                          />
                          <div className="s-quest-footer">
                            <span>
                              {quest.progress}/{quest.steps}
                            </span>
                            {quest.unlocked ? (
                              <Link to={`/student/quests/${quest.id}`}>
                                {quest.progress === quest.steps
                                  ? kk
                                    ? "Жаттығу"
                                    : "Тренировка"
                                  : quest.progress
                                    ? kk
                                      ? "Жалғастыру"
                                      : "Продолжить"
                                    : kk
                                      ? "Бастау"
                                      : "Начать"}
                                <ArrowRight size={16} />
                              </Link>
                            ) : (
                              <span>
                                {kk
                                  ? "Алдыңғы квесттен кейін"
                                  : "После предыдущего квеста"}
                              </span>
                            )}
                          </div>
                        </article>
                      ))}
                  </div>
                </section>
              ))}
            </div>
          </section>
          <section className="student-achievements">
            <h2>{kk ? "Жетістіктер" : "Достижения"}</h2>
            <div className="s-badges">
              {[
                ["first", "Первый финиш", "Алғашқы мәре"],
                ["math", "Мастер чисел", "Сандар шебері"],
                ["logic", "Стратег", "Стратег"],
                ["science", "Исследователь", "Зерттеуші"],
                ["explorer", "Все маршруты", "Барлық бағыт"],
              ].map(([id, ru, kz]) => (
                <span
                  className={achievements[id] ? "earned" : ""}
                  key={id}
                  title={
                    achievements[id]
                      ? kk
                        ? "Ашылды"
                        : "Открыто"
                      : kk
                        ? "Әлі ашылмаған"
                        : "Пока не открыто"
                  }
                >
                  <Trophy size={22} />
                  {kk ? kz : ru}
                  {achievements[id] && <Check size={14} />}
                </span>
              ))}
            </div>
          </section>
        </>
      )}
      {classroomOnly && <h1>{kk ? "Сынып тапсырмалары" : "Задания класса"}</h1>}
      <section className="student-class">
        <div className="s-section-heading">
          <h2>
            <Users size={21} />
            {kk ? "Менің сыныбым" : "Мой класс"}
          </h2>
          {student.class_name && <span>{student.class_name}</span>}
        </div>
        {!student.class_id && (
          <form className="s-join-class" onSubmit={join}>
            <label htmlFor="class-code">
              {kk ? "Сынып коды" : "Код класса"}
            </label>
            <input
              id="class-code"
              name="invite_code"
              required
              maxLength={100}
            />
            <button className="s-button" disabled={busy}>
              {kk ? "Қосылу" : "Присоединиться"}
            </button>
            {joinError && (
              <p className="s-error" role="alert">
                {joinError}
              </p>
            )}
          </form>
        )}
        {error ? (
          <div role="alert">
            <p>{error}</p>
            <button className="s-button" onClick={loadPortal}>
              <RefreshCw size={16} />
              {kk ? "Қайталау" : "Повторить"}
            </button>
          </div>
        ) : !portal ? (
          <p role="status">{kk ? "Жүктелуде…" : "Загрузка…"}</p>
        ) : (
          <>
            <div className="s-homework-list">
              {portal.homeworkAssignments.map((task) => (
                <Link key={task.id} to={`/student/assignment/${task.id}`}>
                  <BookOpen size={19} />
                  <div>
                    <strong>{task.title}</strong>
                    <span>
                      {task.score != null
                        ? `${task.score}/${task.submitted_max_score || task.max_score}`
                        : task.submission_status === "pending_review"
                          ? kk
                            ? "Тексеруді күтуде"
                            : "Ожидает проверки"
                          : kk
                            ? "Үй тапсырмасы"
                            : "Домашнее задание"}
                    </span>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))}
              {portal.upcomingQuizzes.map((quiz) => (
                <Link
                  key={`quiz-${quiz.quiz_id}`}
                  to={`/student/quiz/${quiz.quiz_id}`}
                >
                  <Brain size={19} />
                  <div>
                    <strong>{quiz.title}</strong>
                    <span>{kk ? "Викторина" : "Викторина"}</span>
                  </div>
                  <ArrowRight size={17} />
                </Link>
              ))}
            </div>
            {!portal.homeworkAssignments.length &&
              !portal.upcomingQuizzes.length && (
                <p className="s-muted">
                  {kk
                    ? "Әзірше жаңа сынып тапсырмалары жоқ."
                    : "Новых заданий класса пока нет."}
                </p>
              )}
            {portal.recentAttempts.length > 0 && (
              <Link className="s-text-link" to="/student/history">
                {kk ? "Өткен викториналар" : "Пройденные викторины"}
                <ArrowRight size={16} />
              </Link>
            )}
          </>
        )}
      </section>
    </>
  );
}
