import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Clock,
  Gamepad2,
  Library,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Sprout,
  Users,
  X,
  Play,
} from "lucide-react";
import { quizzesAPI } from "../api";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { gamesAPI, text } from "../games/api";
import { GameCover } from "../games/GameStage";
import { gameModeIds, getGameMode } from "../games/modes";
import "../games/games.css";

const coverIcons = { arena: Gamepad2, garden: Sprout, word: BookOpen };

export function buildWordQuestions(raw, language = "ru") {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 4 || lines.length > 20)
    throw new Error(
      language === "kk"
        ? "4-тен 20-ға дейін сөз жұбын енгізіңіз"
        : "Введите от 4 до 20 пар слов",
    );
  const pairs = lines.map((line, index) => {
    const separator = line.indexOf("=");
    const term = separator < 0 ? "" : line.slice(0, separator).trim();
    const definition = separator < 0 ? "" : line.slice(separator + 1).trim();
    if (
      !term ||
      !definition ||
      term.length > 120 ||
      definition.length > 300
    )
      throw new Error(
        language === "kk"
          ? `${index + 1}-жолды «сөз = мағына» түрінде тексеріңіз`
          : `Проверьте строку ${index + 1}: слово = значение`,
      );
    return { term, definition };
  });
  const normalizedTerms = pairs.map(({ term }) => term.toLocaleLowerCase());
  const normalizedDefinitions = pairs.map(({ definition }) =>
    definition.toLocaleLowerCase(),
  );
  if (
    new Set(normalizedTerms).size !== pairs.length ||
    new Set(normalizedDefinitions).size !== pairs.length
  )
    throw new Error(
      language === "kk"
        ? "Сөздер мен мағыналар қайталанбауы керек"
        : "Слова и значения не должны повторяться",
    );
  const stableSlot = (value) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 4;
  };
  return pairs.map((pair, index) => {
    const distractors = [];
    for (let offset = 1; distractors.length < 3; offset += 1)
      distractors.push(pairs[(index + offset) % pairs.length].definition);
    const correct = stableSlot(`${pair.term}\u0000${pair.definition}\u0000${index}`);
    const options = [...distractors];
    options.splice(correct, 0, pair.definition);
    return {
      question:
        language === "kk"
          ? `«${pair.term}» сөзінің мағынасы қандай?`
          : `Что означает «${pair.term}»?`,
      options,
      correct,
      explanation: pair.definition,
    };
  });
}

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
    [selectedMode, setSelectedMode] = useState("arena"),
    [source, setSource] = useState("demo");
  const [quizId, setQuizId] = useState(""),
    [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false),
    [generating, setGenerating] = useState(false);
  const [topic, setTopic] = useState(""),
    [count, setCount] = useState(8),
    [grade, setGrade] = useState("7");
  const [questions, setQuestions] = useState([]),
    [wordTitle, setWordTitle] = useState(""),
    [wordPairs, setWordPairs] = useState("");
  const mode = getGameMode(selectedMode, language);
  const catalog = useMemo(
    () => gameModeIds.map((id) => getGameMode(id, language)),
    [language],
  );

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

  function openCreate(id) {
    requestKey.current = crypto.randomUUID();
    setSelectedMode(id);
    setSource(id === "word" ? "words" : "demo");
    setQuestions([]);
    setError("");
    setCreating(true);
  }

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
                  : q.options.map((item, j) => (j === option ? value : item)),
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
      const payload = {
        requestKey: requestKey.current,
        mode: selectedMode,
        roundSeconds: Number(seconds),
        language,
      };
      if (selectedMode === "word") {
        payload.title = wordTitle.trim();
        payload.questions = buildWordQuestions(wordPairs, language);
      } else {
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
        if (source === "demo") payload.demo = true;
        else payload.quizId = id;
      }
      const room = await gamesAPI.create(payload);
      navigate(`/games/host/${room.code}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const status = {
    lobby: t("Сбор участников", "Қатысушылар жиналуда"),
    running: t("Идёт игра", "Ойын жүріп жатыр"),
    paused: t("Пауза", "Үзіліс"),
    finished: t("Завершена", "Аяқталды"),
  };
  const wordLineCount = wordPairs.split(/\r?\n/).filter((line) => line.trim()).length;

  return (
    <div className="games-workspace">
      <div className="games-heading games-page-heading">
        <div>
          <span className="games-eyebrow">URPAQ PLAY</span>
          <h1 className="page-title">{t("Игровая лаборатория", "Ойын зертханасы")}</h1>
          <p className="page-subtitle">
            {t(
              "Запускайте интерактивный урок на экране, а ученики подключатся по QR-коду.",
              "Интерактивті сабақты экранда бастаңыз, оқушылар QR-кодпен қосылады.",
            )}
          </p>
        </div>
        <div className="games-heading-actions">
          <Link className="btn btn-secondary" to="/quests">
            <Sparkles size={17} /> {t("Квесты класса", "Сынып квесттері")}
          </Link>
          <Link className="btn btn-secondary" to="/play">
            <Gamepad2 size={17} /> {t("Войти по коду", "Кодпен кіру")}
          </Link>
        </div>
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
        <section
          className={`game-create mode-${selectedMode}`}
          data-game-mode={selectedMode}
        >
          <button
            type="button"
            className="arena-text-button"
            onClick={() => setCreating(false)}
          >
            <ArrowLeft size={17} /> {t("Все игры", "Барлық ойындар")}
          </button>
          <div className="game-create-heading">
            <span>{mode.brand}</span>
            <h2>{mode.name}</h2>
            <p>{mode.description}</p>
          </div>
          <form onSubmit={create}>
            {selectedMode === "word" ? (
              <div className="word-builder">
                <label className="arena-label">
                  {t("Название набора", "Жинақ атауы")}
                  <input
                    value={wordTitle}
                    required
                    minLength={2}
                    maxLength={120}
                    onChange={(e) => setWordTitle(e.target.value)}
                    placeholder={t("Например, Biology terms", "Мысалы, Biology terms")}
                  />
                </label>
                <label className="arena-label">
                  <span className="word-builder-label">
                    {t("Пары слов", "Сөз жұптары")}
                    <small>{wordLineCount}/20</small>
                  </span>
                  <textarea
                    aria-label={t("Пары слов", "Сөз жұптары")}
                    value={wordPairs}
                    required
                    onChange={(e) => setWordPairs(e.target.value)}
                    placeholder={t(
                      "cell = клетка\norgan = орган\ntissue = ткань\ngene = ген",
                      "cell = жасуша\norgan = мүше\ntissue = ұлпа\ngene = ген",
                    )}
                  />
                </label>
                <p className="word-builder-hint">
                  {t(
                    "Одна строка — одна пара в формате «слово = значение». Нужно 4–20 уникальных пар.",
                    "Бір жол — «сөз = мағына» форматындағы бір жұп. 4–20 бірегей жұп қажет.",
                  )}
                </p>
              </div>
            ) : (
              <>
                <fieldset className="game-source">
                  <legend>{t("Источник вопросов", "Сұрақ көзі")}</legend>
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
                      <Icon size={17} /> {label}
                    </button>
                  ))}
                </fieldset>
                {source === "demo" && (
                  <div className="game-demo-summary">
                    {selectedMode === "garden" ? <Sprout size={25} /> : <Gamepad2 size={25} />}
                    <div>
                      <strong>
                        {selectedMode === "garden"
                          ? t("Сад знаний", "Білім бағы")
                          : t("Математическая дуэль", "Математикалық дуэль")}
                      </strong>
                      <span>{t("10 вопросов · Без AI-кредитов", "10 сұрақ · AI кредитсіз")}</span>
                    </div>
                  </div>
                )}
                {source === "quiz" && (
                  <label className="arena-label">
                    {t("Тест", "Тест")}
                    <select value={quizId} required onChange={(e) => setQuizId(e.target.value)}>
                      <option value="">{t("Выберите тест", "Тестті таңдаңыз")}</option>
                      {quizzes.map((quiz) => (
                        <option key={quiz.id} value={quiz.id}>
                          {quiz.title} ({quiz.questions?.length || 0})
                        </option>
                      ))}
                    </select>
                    {quizzes.length === 0 && (
                      <Link to="/quizzes">
                        {t("Создать тест", "Тест жасау")} <ArrowRight size={15} />
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
                      <select value={grade} onChange={(e) => setGrade(e.target.value)}>
                        {Array.from({ length: 11 }, (_, index) => (
                          <option key={index + 1} value={index + 1}>{index + 1}</option>
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
                        generating || busy || topic.trim().length < 3 ||
                        Number(count) < 2 || Number(count) > 20
                      }
                      onClick={generate}
                    >
                      {generating ? <Loader2 className="arena-spin" size={17} /> : <Sparkles size={17} />}
                      {t("Создать вопросы", "Сұрақтарды жасау")} · {user?.creditCosts?.quiz_generation ?? 2} {t("кр.", "кр.")}
                    </button>
                  </div>
                )}
                {source === "ai" && questions.length > 0 && (
                  <div className="game-question-editor">
                    <h3>{t("Проверка вопросов", "Сұрақтарды тексеру")} <span>{questions.length}</span></h3>
                    {questions.map((question, index) => (
                      <fieldset key={index}>
                        <legend>{t("Вопрос", "Сұрақ")} {index + 1}</legend>
                        <textarea
                          aria-label={`${t("Вопрос", "Сұрақ")} ${index + 1}`}
                          required
                          maxLength={700}
                          value={question.question}
                          onChange={(e) => editQuestion(index, "question", e.target.value)}
                        />
                        <div className="game-editor-options">
                          {question.options.map((option, optionIndex) => (
                            <label key={optionIndex}>
                              <input
                                type="radio"
                                name={`correct-${index}`}
                                aria-label={`${t("Правильный ответ", "Дұрыс жауап")} ${index + 1} ${"ABCD"[optionIndex]}`}
                                checked={question.correct === "ABCD"[optionIndex]}
                                onChange={() => editQuestion(index, "correct", "ABCD"[optionIndex])}
                              />
                              <input
                                aria-label={`${index + 1} ${"ABCD"[optionIndex]}`}
                                required
                                maxLength={300}
                                value={option}
                                onChange={(e) => editQuestion(index, "options", e.target.value, optionIndex)}
                              />
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                )}
              </>
            )}
            <div className="game-form-footer">
              <label className="arena-label">
                {t("Секунд на вопрос", "Бір сұраққа секунд")}
                <select value={seconds} onChange={(e) => setSeconds(e.target.value)}>
                  {[15, 20, 30, 45, 60, 90, 120].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </label>
              <button
                className="arena-button"
                disabled={
                  busy || generating || loading ||
                  (selectedMode === "word" &&
                    (wordLineCount < 4 ||
                      wordLineCount > 20 ||
                      wordTitle.trim().length < 2)) ||
                  (source === "quiz" && !quizId) ||
                  (source === "ai" && !questions.length)
                }
              >
                {busy ? <Loader2 size={18} className="arena-spin" /> : <Plus size={18} />}
                {t("Создать комнату", "Бөлме жасау")}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <div className="game-catalog" data-testid="game-catalog">
            {catalog.map((item) => {
              const Icon = coverIcons[item.id];
              const buttonLabel = item.id === "arena"
                ? t("Создать матч", "Матч жасау")
                : item.id === "garden"
                  ? t("Создать сад", "Бақ жасау")
                  : t("Создать спринт", "Жарыс жасау");
              return (
                <article className={`game-catalog-item mode-${item.id}`} data-game-mode={item.id} key={item.id}>
                  <div className="game-cover">
                    <GameCover mode={item.id} />
                    <span className="game-cover-tag"><Icon size={13} /> {item.brand}</span>
                  </div>
                  <div className="game-catalog-body">
                    <div>
                      <span className="game-category">{item.category}</span>
                      <h2>{item.name}</h2>
                      <p>{item.description}</p>
                      <div className="game-meta">
                        <span><Users size={15} /> 2–40</span>
                        <span><Clock size={15} /> {t("15–120 сек / вопрос", "15–120 сек / сұрақ")}</span>
                      </div>
                    </div>
                    <button
                      className="arena-button"
                      onClick={() => openCreate(item.id)}
                      disabled={loading}
                    >
                      <Plus size={18} /> {buttonLabel}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <section className="game-history">
            <div className="games-heading">
              <div>
                <span className="games-eyebrow">LIVE & SAVED</span>
                <h2>{t("Мои игры", "Менің ойындарым")}</h2>
              </div>
              <button className="arena-icon" onClick={load} disabled={loading} title={t("Обновить", "Жаңарту")}>
                <RefreshCw size={18} className={loading ? "arena-spin" : ""} />
              </button>
            </div>
            {loading ? (
              <div className="game-empty" role="status"><Loader2 size={22} className="arena-spin" /></div>
            ) : rooms.length === 0 ? (
              <div className="game-empty"><Gamepad2 size={30} /><p>{t("Игр пока нет", "Ойындар әлі жоқ")}</p></div>
            ) : (
              <div className="game-room-list">
                {rooms.map((room) => {
                  const roomMode = getGameMode(room.mode, language);
                  return (
                    <Link
                      key={room.code}
                      to={`/games/host/${room.code}`}
                      data-room-code={room.code}
                      data-game-mode={roomMode.id}
                    >
                      <span className={`game-mode-mark mode-${roomMode.id}`}>{roomMode.name}</span>
                      <div>
                        <strong>{room.title}</strong>
                        <span>{room.code} · {room.player_count} {t("участников", "қатысушы")}</span>
                      </div>
                      <span className={`game-status ${room.status}`}>{status[room.status]}</span>
                      <ArrowRight size={17} />
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
