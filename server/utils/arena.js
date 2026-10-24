const { getOne, getAll, withTransaction } = require("../db/database");

const cache = new Map();
const reads = new Map();
const queues = new Map();
const MAX_PLAYERS = 40;
const MODE_RULES = Object.freeze({
  arena: Object.freeze({
    actions: Object.freeze(["strike", "kick", "burst"]),
    demoTitle: Object.freeze(["Математическая дуэль", "Математикалық дуэль"]),
    progress: "health",
    winner: "health",
  }),
  garden: Object.freeze({
    actions: Object.freeze(["water", "sun", "bloom"]),
    demoTitle: Object.freeze(["Сад знаний", "Білім бағы"]),
    progress: "hits",
    winner: "hits",
  }),
  word: Object.freeze({
    actions: Object.freeze([]),
    demoTitle: Object.freeze(["Словарный спринт", "Сөз жарысы"]),
    progress: "correct",
    winner: "correct",
  }),
  orbit: Object.freeze({
    actions: Object.freeze([]),
    demoTitle: Object.freeze(["Орбитальная гонка", "Орбиталық жарыс"]),
    progress: "correct",
    winner: "correct",
  }),
  tower: Object.freeze({
    actions: Object.freeze([]),
    demoTitle: Object.freeze(["Башня знаний", "Білім мұнарасы"]),
    progress: "correct",
    winner: "correct",
  }),
  circuit: Object.freeze({
    actions: Object.freeze(["charge", "connect", "sync"]),
    demoTitle: Object.freeze(["Энергосеть", "Энергия желісі"]),
    progress: "hits",
    winner: "hits",
  }),
  ocean: Object.freeze({
    actions: Object.freeze(["collect", "rescue", "restore"]),
    demoTitle: Object.freeze(["Спасение океана", "Мұхитты құтқару"]),
    progress: "hits",
    winner: "hits",
  }),
});
const modeRule = (mode) => MODE_RULES[mode] || MODE_RULES.arena;
const modeUsesActions = (mode) => modeRule(mode).actions.length > 0;
const boardTurnCount = (questionCount, team) =>
  Math.floor((questionCount + (team === 0 ? 1 : 0)) / 2);
const fail = (message, status = 400) => {
  throw Object.assign(new Error(message), { status });
};
const one = async (tx, sql, args = []) =>
  (await tx.execute({ sql, args })).rows[0];

function normalizeQuestions(input) {
  if (!Array.isArray(input) || input.length < 2 || input.length > 20)
    fail("Нужно от 2 до 20 вопросов / 2–20 сұрақ қажет");
  return input.map((q, i) => {
    if (!q || typeof q !== "object") fail(`Проверьте вопрос ${i + 1}`);
    const text = String(q.question || "").trim();
    const options = Array.isArray(q.options)
      ? q.options.map((s) =>
          String(s)
            .replace(/^[A-D][).]\s*/, "")
            .trim(),
        )
      : [];
    const correct = Number.isInteger(q.correct)
      ? q.correct
      : /^[ABCD]$/i.test(String(q.correct).trim())
        ? "ABCD".indexOf(String(q.correct).trim().toUpperCase())
        : -1;
    if (
      !text ||
      text.length > 700 ||
      options.length !== 4 ||
      options.some((s) => !s || s.length > 300) ||
      new Set(options).size !== 4 ||
      correct < 0 ||
      correct > 3
    ) {
      fail(
        `Проверьте вопрос ${i + 1}: нужны 4 разных ответа и правильный вариант`,
      );
    }
    return {
      question: text,
      options,
      correct,
      explanation: String(q.explanation || "").slice(0, 1200),
    };
  });
}

function demoQuestions(language) {
  const kk = language === "kk";
  return normalizeQuestions([
    { question: "6 × 7 = ?", options: ["42", "36", "48", "49"], correct: 0 },
    { question: "144 ÷ 12 = ?", options: ["10", "11", "12", "14"], correct: 2 },
    {
      question: kk
        ? "80 санының 25%-ы қанша?"
        : "Сколько составляет 25% от 80?",
      options: ["15", "20", "25", "40"],
      correct: 1,
    },
    { question: "3² + 4² = ?", options: ["7", "14", "49", "25"], correct: 3 },
    {
      question: "2x + 6 = 18. x = ?",
      options: ["6", "8", "9", "12"],
      correct: 0,
    },
    {
      question: kk
        ? "Үшбұрыш бұрыштарының қосындысы?"
        : "Сумма углов треугольника?",
      options: ["90°", "180°", "270°", "360°"],
      correct: 1,
    },
    {
      question: "0,5 + 0,25 = ?",
      options: ["0,30", "0,55", "0,75", "0,80"],
      correct: 2,
    },
    {
      question: kk ? "Қай сан жай сан?" : "Какое число простое?",
      options: ["9", "15", "21", "17"],
      correct: 3,
    },
    { question: "√81 = ?", options: ["9", "8", "18", "27"], correct: 0 },
    {
      question: kk
        ? "Қабырғасы 5 см шаршының ауданы?"
        : "Площадь квадрата со стороной 5 см?",
      options: ["10 см²", "25 см²", "20 см²", "15 см²"],
      correct: 1,
    },
  ]);
}

function invalidate(code) {
  cache.delete(code);
}

// Transactions are authoritative; the local queue also avoids needless SQLite lock contention.
async function mutate(code, work) {
  const previous = queues.get(code) || Promise.resolve();
  const pending = previous
    .catch(() => {})
    .then(() =>
      withTransaction(async (tx) => {
        const room = await one(tx, "SELECT * FROM game_rooms WHERE code = ?", [
          code,
        ]);
        if (!room) fail("Игра не найдена / Ойын табылмады", 404);
        return work(tx, room);
      }),
    );
  queues.set(code, pending);
  try {
    return await pending;
  } finally {
    invalidate(code);
    if (queues.get(code) === pending) queues.delete(code);
  }
}

async function finish(tx, room) {
  const mode = room.mode || "arena";
  const rules = modeRule(mode);
  const questionCount = JSON.parse(room.questions).length;
  const board = room.play_mode === "board";
  let winner;
  if (rules.winner === "health") {
    winner =
      Math.abs(room.cyan_health - room.coral_health) < 5
        ? null
        : room.cyan_health > room.coral_health
          ? 0
          : 1;
  } else {
    const totals = (
      await tx.execute({
        sql: "SELECT team,COUNT(*) AS n,SUM(hits) AS hits,SUM(correct_count) AS correct FROM game_players WHERE room_id=? AND active=1 GROUP BY team",
        args: [room.id],
      })
    ).rows;
    const teams = [0, 1].map(
      (team) => totals.find((row) => row.team === team) || { n: 0, hits: 0, correct: 0 },
    );
    if (!teams[0].n || !teams[1].n) winner = null;
    else {
      const field = rules.winner;
      const left =
        teams[0][field] *
        teams[1].n *
        (board ? boardTurnCount(questionCount, 1) : 1);
      const right =
        teams[1][field] *
        teams[0].n *
        (board ? boardTurnCount(questionCount, 0) : 1);
      winner = left === right ? null : left > right ? 0 : 1;
    }
  }
  await tx.execute({
    sql: "UPDATE game_rooms SET status='finished', winner=?, deadline=NULL, ended_at=CURRENT_TIMESTAMP, revision=revision+1 WHERE id=?",
    args: [winner, room.id],
  });
}

async function nextRound(tx, room) {
  if (room.round_index + 1 >= JSON.parse(room.questions).length)
    return finish(tx, room);
  await tx.execute({
    sql: "UPDATE game_rooms SET round_index=round_index+1, deadline=?, revision=revision+1 WHERE id=?",
    args: [Date.now() + room.round_seconds * 1000, room.id],
  });
  await tx.execute({
    sql: "UPDATE game_players SET attack_ready=0 WHERE room_id=?",
    args: [room.id],
  });
}

async function readRoom(code) {
  const cached = cache.get(code);
  if (cached && Date.now() - cached.at < 700) return cached;
  if (reads.has(code)) return reads.get(code);
  const pending = (async () => {
    let room = await getOne("SELECT * FROM game_rooms WHERE code = ?", [code]);
    if (!room) fail("Игра не найдена / Ойын табылмады", 404);
    if (
      (room.status === "running" && room.deadline <= Date.now()) ||
      (room.status !== "finished" && room.expires_at <= Date.now())
    ) {
      await mutate(code, async (tx, fresh) => {
        if (fresh.status === "finished") return;
        if (fresh.expires_at <= Date.now()) return finish(tx, fresh);
        if (fresh.status === "running" && fresh.deadline <= Date.now())
          await nextRound(tx, fresh);
      });
      room = await getOne("SELECT * FROM game_rooms WHERE code = ?", [code]);
    }
    const players = await getAll(
      "SELECT * FROM game_players WHERE room_id=? AND active=1 ORDER BY score DESC, name ASC",
      [room.id],
    );
    const value = { room, players, at: Date.now() };
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    cache.set(code, value);
    return value;
  })();
  reads.set(code, pending);
  try {
    return await pending;
  } finally {
    if (reads.get(code) === pending) reads.delete(code);
  }
}

function project({ room, players }, viewer) {
  const questions = JSON.parse(room.questions);
  const mode = room.mode || "arena";
  const playMode = room.play_mode || "multiplayer";
  const rules = modeRule(mode);
  const me = viewer.playerId
    ? players.find((p) => p.id === viewer.playerId)
    : null;
  if (viewer.playerId && !me)
    fail("Участник исключён из игры / Қатысушы шығарылды", 403);
  if (!viewer.playerId && room.teacher_id !== viewer.userId)
    fail("Игра не найдена", 404);
  const question = questions[room.round_index];
  const progress =
    rules.progress === "health"
      ? [100 - room.coral_health / 100, 100 - room.cyan_health / 100]
      : [0, 1].map((team) => {
          const members = players.filter((player) => player.team === team);
          if (!members.length) return 0;
          const value = members.reduce(
            (sum, player) =>
              sum +
                (rules.progress === "hits"
                  ? player.hits
                  : player.correct_count),
            0,
          );
          const opportunities =
            playMode === "board"
              ? boardTurnCount(questions.length, team)
              : questions.length;
          return Number(
            Math.min(100, (value / (members.length * opportunities)) * 100).toFixed(1),
          );
        });
  return {
    code: room.code,
    title: room.title,
    mode,
    playMode,
    activeTeam: playMode === "board" ? room.round_index % 2 : null,
    boardTeams:
      playMode === "board"
        ? [...players].sort((a, b) => a.team - b.team).map((player) => ({
            team: player.team,
            name: player.name,
            hasAnswered: player.last_round === room.round_index,
            answer:
              player.last_round === room.round_index
                ? player.last_answer
                : null,
            correct:
              player.last_round === room.round_index
                ? !!player.last_correct
                : null,
            actionReady:
              player.last_round === room.round_index && !!player.attack_ready,
            score: player.score,
          }))
        : undefined,
    language: room.language,
    status: room.status,
    roundIndex: room.round_index,
    questionCount: questions.length,
    roundSeconds: room.round_seconds,
    deadline: room.deadline,
    remainingMs: room.remaining_ms,
    serverTime: Date.now(),
    health: [room.cyan_health, room.coral_health].map((h) =>
      Number((h / 100).toFixed(1)),
    ),
    progress,
    revision: room.revision,
    winner: room.winner,
    lastEvent: room.last_event ? JSON.parse(room.last_event) : null,
    events: JSON.parse(room.events),
    question:
      room.status === "running" || room.status === "paused"
        ? { text: question.question, options: question.options }
        : null,
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      score: p.score,
      correct: p.correct_count,
      answered: p.answer_count,
      hits: p.hits,
      hasAnswered: p.last_round === room.round_index,
    })),
    me: me
      ? {
          id: me.id,
          name: me.name,
          team: me.team,
          answer: me.last_round === room.round_index ? me.last_answer : null,
          correct:
            me.last_round === room.round_index ? !!me.last_correct : null,
          attackReady: me.last_round === room.round_index && !!me.attack_ready,
        }
      : null,
  };
}

module.exports = {
  MAX_PLAYERS,
  MODE_RULES,
  modeRule,
  modeUsesActions,
  boardTurnCount,
  fail,
  one,
  normalizeQuestions,
  demoQuestions,
  invalidate,
  mutate,
  finish,
  nextRound,
  readRoom,
  project,
};
