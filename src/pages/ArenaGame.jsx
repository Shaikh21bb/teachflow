import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Gamepad2,
  Play,
  Pause,
  SkipForward,
  Square,
  Copy,
  Check,
  X,
  Users,
  Zap,
  Swords,
  Footprints,
  Flame,
  Download,
  Maximize,
  Sparkles,
  Loader2,
  RefreshCw,
  Trophy,
  WifiOff,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import {
  gamesAPI,
  joinGame,
  savedPlayer,
  forgetPlayer,
  playerRequest,
  text,
  teamNames,
} from "../games/api";
import useArena from "../games/useArena";
import PixelArena from "../games/PixelArena";
import "../games/games.css";

function JoinForm({ code: initialCode = "" }) {
  const { language, toggleLanguage } = useLanguage(),
    t = text(language),
    navigate = useNavigate();
  const [code, setCode] = useState(initialCode),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const room = code.trim().toUpperCase();
      await joinGame(room, name);
      navigate(`/play/${room}`, { replace: true });
      window.dispatchEvent(new Event("arena:joined"));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="arena-shell arena-join">
      <header className="arena-top">
        <Link to="/" className="arena-brand">
          <img src="/logo.jpg" alt="" />
          Urpaq.ai
        </Link>
        <button
          className="arena-icon"
          onClick={toggleLanguage}
          title="Қазақша / Русский"
        >
          {language === "kk" ? "KAZ" : "RUS"}
        </button>
      </header>
      <div className="arena-join-content">
        <PixelArena motion={false} />
        <div className="arena-join-form">
          <Gamepad2 size={28} />
          <h1>{t("Войти в игру", "Ойынға кіру")}</h1>
          <form onSubmit={submit}>
            <label className="arena-label">
              {t("Код комнаты", "Бөлме коды")}
              <input
                name="roomCode"
                required
                pattern="[a-fA-F0-9]{6}"
                minLength={6}
                maxLength={6}
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </label>
            <label className="arena-label">
              {t("Твоё имя", "Сенің атың")}
              <input
                name="playerName"
                required
                minLength={2}
                maxLength={24}
                autoComplete="nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            {error && (
              <p className="arena-alert" role="alert">
                {error}
              </p>
            )}
            <button className="arena-button" disabled={busy}>
              {busy ? (
                <Loader2 className="arena-spin" size={18} />
              ) : (
                <Play size={18} />
              )}{" "}
              {t("Присоединиться", "Қосылу")}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

function QR({ url }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let cancelled = false;
    import("qrcode")
      .then((m) =>
        (m.default || m).toDataURL(url, {
          width: 180,
          margin: 3,
          errorCorrectionLevel: "M",
        }),
      )
      .then((data) => {
        if (!cancelled) setSrc(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);
  return src ? (
    <img className="arena-qr" src={src} alt="QR" width="180" height="180" />
  ) : null;
}

function Results({ game, host, t, onExport }) {
  const answered = game.players.reduce((n, p) => n + p.answered, 0),
    correct = game.players.reduce((n, p) => n + p.correct, 0);
  return (
    <section className="arena-results">
      <div className="arena-result-title">
        <Trophy size={28} />
        <h1>
          {game.winner === null
            ? t("Ничья!", "Тең ойын!")
            : `${teamNames[game.winner]} ${t("побеждает!", "жеңді!")}`}
        </h1>
      </div>
      <div className="arena-result-summary">
        <div>
          <strong>{game.players.length}</strong>
          <span>{t("Участников", "Қатысушы")}</span>
        </div>
        <div>
          <strong>
            {correct}/{answered}
          </strong>
          <span>{t("Правильных ответов", "Дұрыс жауап")}</span>
        </div>
        <div>
          <strong>
            {answered ? Math.round((correct / answered) * 100) : 0}%
          </strong>
          <span>{t("Точность", "Дәлдік")}</span>
        </div>
      </div>
      <div className="games-heading">
        <h2>{t("Результаты", "Нәтижелер")}</h2>
        {host && (
          <button className="arena-button secondary" onClick={onExport}>
            <Download size={17} />
            CSV
          </button>
        )}
      </div>
      <div className="arena-results-table">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t("Участник", "Қатысушы")}</th>
              <th>{t("Ответы", "Жауаптар")}</th>
              <th>{t("Очки", "Ұпай")}</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((p, i) => (
              <tr key={p.id}>
                <td>{i + 1}</td>
                <td>
                  <span className={`arena-team-dot team-${p.team}`} />
                  {p.name}
                </td>
                <td>
                  {p.correct}/{p.answered}
                </td>
                <td>{p.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ArenaGame({ host = false }) {
  const { code: rawCode = "" } = useParams(),
    code = rawCode.toUpperCase();
  const { language } = useLanguage();
  const [player, setPlayer] = useState(() => savedPlayer(code));
  useEffect(() => {
    const sync = () => setPlayer(savedPlayer(code));
    sync();
    window.addEventListener("arena:joined", sync);
    return () => window.removeEventListener("arena:joined", sync);
  }, [code]);
  const {
    game,
    connection,
    error: loadError,
    refresh,
  } = useArena(code, player?.token, host);
  const t = text(game?.language || language);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [copied, setCopied] = useState(false),
    [motion, setMotion] = useState(true),
    [confirmEnd, setConfirmEnd] = useState(false);
  const [now, setNow] = useState(Date.now());
  const actionLock = useRef(false),
    endDialog = useRef(null);
  useEffect(() => {
    if (confirmEnd) endDialog.current?.showModal();
  }, [confirmEnd]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setError("");
  }, [game?.roundIndex, game?.status]);
  if (!host && (!code || !player?.token)) return <JoinForm code={code} />;
  const shell = (children) => (
    <main
      className={`arena-shell ${!host && game?.me?.attackReady ? "arena-has-attack" : ""}`}
    >
      <header className="arena-top">
        <Link to={host ? "/games" : "/play"} className="arena-back">
          <ArrowLeft size={18} />
          <span>{host ? t("Игры", "Ойындар") : "Urpaq.ai"}</span>
        </Link>
        <span className="arena-top-title">BILIM ARENA</span>
        <div className="arena-top-tools">
          <button
            className="arena-icon"
            aria-pressed={motion}
            onClick={() => setMotion((v) => !v)}
            title={t("Анимация", "Анимация")}
          >
            <Sparkles size={18} />
          </button>
          <button
            className="arena-icon"
            title={t("Полный экран", "Толық экран")}
            onClick={async () => {
              try {
                if (document.fullscreenElement) await document.exitFullscreen();
                else await document.documentElement.requestFullscreen();
              } catch {
                setError(
                  t("Полный экран недоступен", "Толық экран қолжетімсіз"),
                );
              }
            }}
          >
            <Maximize size={18} />
          </button>
        </div>
      </header>
      {children}
    </main>
  );
  if (loadError)
    return shell(
      <div className="arena-loading" role="alert">
        <WifiOff size={30} />
        <p>{loadError}</p>
        {!host && (
          <button
            className="arena-button"
            onClick={() => {
              forgetPlayer(code);
              setPlayer(null);
            }}
          >
            {t("Войти заново", "Қайта кіру")}
          </button>
        )}
        <Link to={host ? "/games" : "/play"}>{t("Назад", "Артқа")}</Link>
      </div>,
    );
  if (!game)
    return shell(
      <div className="arena-loading" role="status">
        <Loader2 size={30} className="arena-spin" />
        {t("Подключение к игре…", "Ойынға қосылу…")}
        {connection === "reconnecting" && (
          <button className="arena-button secondary" onClick={refresh}>
            <RefreshCw size={17} />
            {t("Повторить", "Қайталау")}
          </button>
        )}
      </div>,
    );
  // The server owns deadlines; local clocks may differ.
  const seconds =
    game.status === "paused"
      ? Math.ceil((game.remainingMs || 0) / 1000)
      : Math.max(
          0,
          Math.ceil(
            (game.deadline -
              game.serverTime -
              Math.max(0, now - game.receivedAt)) /
              1000,
          ),
        );
  const online = connection === "online",
    answered = game.players.filter((p) => p.hasAnswered).length;
  const joinURL = `${window.location.origin}/play/${code}`;
  async function act(action, body) {
    if (actionLock.current) return;
    actionLock.current = true;
    setBusy(true);
    setError("");
    try {
      if (host) await gamesAPI.control(code, action, body, game.roundIndex);
      else await playerRequest(code, player.token, action, body);
      refresh();
    } catch (e) {
      setError(e.message);
      refresh();
    } finally {
      actionLock.current = false;
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(joinURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("Ссылка: ", "Сілтеме: ") + joinURL);
    }
  }
  async function exportCSV() {
    try {
      const data = await gamesAPI.report(code);
      const cell = (value) =>
        `"${String(value)
          .replace(/^[=+@-]/, "'$&")
          .replace(/"/g, '""')}"`;
      const rows = [
        [
          t("Имя", "Аты"),
          t("Команда", "Команда"),
          t("Очки", "Ұпай"),
          t("Ответы", "Жауаптар"),
          t("Правильно", "Дұрыс"),
          t("Удары", "Соққы"),
        ],
        ...data.players.map((p) => [
          p.name,
          teamNames[p.team],
          p.score,
          p.answer_count,
          p.correct_count,
          p.hits,
        ]),
      ];
      const url = URL.createObjectURL(
        new Blob(
          ["\uFEFF" + rows.map((row) => row.map(cell).join(";")).join("\r\n")],
          { type: "text/csv;charset=utf-8" },
        ),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `arena-${code}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(e.message);
    }
  }
  return shell(
    <>
      {connection === "reconnecting" && (
        <div className="arena-connection" role="status">
          <WifiOff size={16} />
          {t("Восстанавливаем связь…", "Байланыс қалпына келтірілуде…")}
          <button
            className="arena-icon"
            onClick={refresh}
            title={t("Повторить", "Қайталау")}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="arena-alert" role="alert">
          {error}
          <button
            className="arena-icon"
            onClick={() => setError("")}
            title={t("Закрыть", "Жабу")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="arena-match-heading">
        <div>
          <h2>{game.title}</h2>
          <span>
            {game.status === "lobby"
              ? t("Сбор участников", "Қатысушылар жиналуда")
              : game.status === "finished"
                ? t("Матч завершён", "Матч аяқталды")
                : `${t("Вопрос", "Сұрақ")} ${game.roundIndex + 1} / ${game.questionCount}`}
          </span>
        </div>
        <div className="arena-room-code">
          <span>{t("Код", "Код")}</span>
          <strong>{code}</strong>
          {host && (
            <button
              className="arena-icon"
              onClick={copy}
              title={t("Копировать ссылку", "Сілтемені көшіру")}
            >
              {copied ? <Check size={17} /> : <Copy size={17} />}
            </button>
          )}
        </div>
      </div>
      <section className="arena-stage" aria-label={t("Арена", "Арена")}>
        <div className="arena-scoreboard">
          {[0, 1].map((team) => (
            <div className={`arena-team-score team-${team}`} key={team}>
              <div>
                <strong>{teamNames[team]}</strong>
                <span>{game.health[team]} HP</span>
              </div>
              <div
                className="arena-health"
                role="progressbar"
                aria-label={`${teamNames[team]} HP`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={game.health[team]}
              >
                <span style={{ width: `${game.health[team]}%` }} />
              </div>
            </div>
          ))}
        </div>
        <PixelArena
          responsive
          event={game.lastEvent}
          events={game.events}
          round={game.roundIndex}
          winner={game.status === "finished" ? game.winner : null}
          motion={motion && game.status !== "paused"}
        />
        {game.status === "paused" && (
          <div className="arena-stage-notice">
            <Pause size={24} />
            {t("Пауза", "Үзіліс")}
          </div>
        )}
      </section>
      {game.status === "lobby" ? (
        <section className="arena-lobby">
          <div className="arena-lobby-main">
            <div className="games-heading">
              <h1>{t("Ожидаем участников", "Қатысушыларды күтеміз")}</h1>
              <span className="arena-count">
                <Users size={17} />
                {game.players.length}/40
              </span>
            </div>
            {!host && game.me && (
              <div className={`arena-your-team team-${game.me.team}`}>
                {game.me.name} · {teamNames[game.me.team]}
              </div>
            )}
            <div className="arena-rosters">
              {[0, 1].map((team) => (
                <div key={team}>
                  <h3>
                    <span className={`arena-team-dot team-${team}`} />
                    {teamNames[team]}
                  </h3>
                  <ul>
                    {game.players
                      .filter((p) => p.team === team)
                      .map((p) => (
                        <li key={p.id}>
                          <span>{p.name}</span>
                          {host && (
                            <button
                              className="arena-icon"
                              title={`${t("Убрать", "Шығару")} ${p.name}`}
                              disabled={busy || !online}
                              onClick={() => act("kick", p.id)}
                            >
                              <X size={15} />
                            </button>
                          )}
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
            {host && (
              <button
                className="arena-button"
                disabled={
                  busy ||
                  !online ||
                  !game.players.some((p) => p.team === 0) ||
                  !game.players.some((p) => p.team === 1)
                }
                onClick={() => act("start")}
              >
                <Play size={18} />
                {t("Начать матч", "Матчты бастау")}
              </button>
            )}
          </div>
          {host && (
            <aside className="arena-invite">
              <QR url={joinURL} />
              <strong>{code}</strong>
              <button className="arena-button secondary" onClick={copy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}{" "}
                {t("Пригласить", "Шақыру")}
              </button>
            </aside>
          )}
        </section>
      ) : game.status === "finished" ? (
        <Results game={game} host={host} t={t} onExport={exportCSV} />
      ) : (
        <section className="arena-question-section">
          <div className="arena-question-heading">
            <span>
              {host
                ? `${answered}/${game.players.length} ${t("ответили", "жауап берді")}`
                : game.me
                  ? `${game.me.name} · ${teamNames[game.me.team]}`
                  : ""}
            </span>
            <span
              className={`arena-timer ${seconds <= 5 ? "urgent" : ""}`}
              role="timer"
            >
              {seconds}
              <small>{t("сек", "сек")}</small>
            </span>
          </div>
          <h1>{game.question?.text}</h1>
          <div className="arena-options">
            {game.question?.options.map((option, index) => (
              <button
                key={`${game.roundIndex}-${index}`}
                className={`arena-option ${game.me?.answer === index ? (game.me.correct ? "correct" : "incorrect") : ""}`}
                disabled={
                  host ||
                  busy ||
                  !online ||
                  game.status !== "running" ||
                  seconds === 0 ||
                  game.me?.answer !== null
                }
                onClick={() =>
                  act("answer", {
                    roundIndex: game.roundIndex,
                    answerIndex: index,
                  })
                }
              >
                <span>{"ABCD"[index]}</span>
                <span>{option}</span>
                {game.me?.answer === index &&
                  (game.me.correct ? <Check size={21} /> : <X size={21} />)}
              </button>
            ))}
          </div>
          {!host && (
            <div className="arena-player-action" aria-live="polite">
              {game.me?.answer === null ? (
                <span>{t("Выбери ответ", "Жауапты таңда")}</span>
              ) : game.me?.correct ? (
                <>
                  <span className="arena-correct">
                    <Check size={18} />
                    {t("Правильно!", "Дұрыс!")} +100
                  </span>
                  {game.me.attackReady ? (
                    <div className="arena-attack-buttons">
                      {[
                        ["strike", Swords, t("Удар", "Соққы")],
                        ["kick", Footprints, t("Удар ногой", "Аяқпен соғу")],
                        ["burst", Flame, t("Импульс", "Импульс")],
                      ].map(([kind, Icon, label]) => (
                        <button
                          className="arena-button"
                          key={kind}
                          disabled={
                            busy ||
                            !online ||
                            game.status !== "running" ||
                            !seconds
                          }
                          onClick={() =>
                            act("attack", { roundIndex: game.roundIndex, kind })
                          }
                        >
                          <Icon size={18} />
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <strong>
                      <Zap size={18} />
                      {t("Атака выполнена", "Шабуыл орындалды")}
                    </strong>
                  )}
                </>
              ) : (
                <span>
                  {t(
                    "Ответ принят. Следующий вопрос скоро!",
                    "Жауап қабылданды. Келесі сұрақ жақында!",
                  )}
                </span>
              )}
            </div>
          )}
        </section>
      )}
      {host && game.status !== "finished" && (
        <footer className="arena-host-controls">
          {game.status !== "lobby" && (
            <>
              <button
                className="arena-button secondary"
                disabled={busy || !online}
                onClick={() =>
                  act(game.status === "paused" ? "resume" : "pause")
                }
              >
                {game.status === "paused" ? (
                  <Play size={17} />
                ) : (
                  <Pause size={17} />
                )}{" "}
                {game.status === "paused"
                  ? t("Продолжить", "Жалғастыру")
                  : t("Пауза", "Үзіліс")}
              </button>
              <button
                className="arena-button"
                disabled={busy || !online || game.status === "paused"}
                onClick={() => act("next")}
              >
                <SkipForward size={17} />
                {game.roundIndex + 1 === game.questionCount
                  ? t("К итогам", "Қорытынды")
                  : t("Следующий вопрос", "Келесі сұрақ")}
              </button>
            </>
          )}
          <button
            className="arena-icon danger"
            disabled={busy || !online}
            onClick={() => setConfirmEnd(true)}
            title={t("Завершить матч", "Матчты аяқтау")}
          >
            <Square size={18} />
          </button>
        </footer>
      )}
      {confirmEnd && (
        <dialog
          ref={endDialog}
          onCancel={() => setConfirmEnd(false)}
          className="arena-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="arena-end-title"
        >
          <h2 id="arena-end-title">
            {t("Завершить матч?", "Матчты аяқтау керек пе?")}
          </h2>
          <div>
            <button
              className="arena-button secondary"
              onClick={() => setConfirmEnd(false)}
            >
              {t("Отмена", "Бас тарту")}
            </button>
            <button
              className="arena-button"
              onClick={() => {
                setConfirmEnd(false);
                act("finish");
              }}
            >
              {t("Завершить", "Аяқтау")}
            </button>
          </div>
        </dialog>
      )}
    </>,
  );
}
