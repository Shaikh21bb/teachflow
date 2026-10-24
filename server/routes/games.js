const express = require("express");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { authenticateToken } = require("../middleware/auth");
const { getAll, getOne, withTransaction } = require("../db/database");
const arena = require("../utils/arena");
const router = express.Router();
const secret = process.env.JWT_SECRET;
const MODES = new Set(Object.keys(arena.MODE_RULES));
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res)).catch(next);
const codeOf = (req) => String(req.params.code || "").toUpperCase();
const signPlayer = (room, player) =>
  jwt.sign(
    { purpose: "arena-player", room: room.code, playerId: player.id },
    secret,
    { expiresIn: "24h" },
  );

// A school can share one public IP. Polling has its own bounded budget, not the login/API budget.
router.use(
  rateLimit({
    windowMs: 60000,
    limit: Math.min(
      60000,
      Math.max(5000, Number(process.env.GAME_IP_REQUEST_LIMIT) || 15000),
    ),
    standardHeaders: true,
    legacyHeaders: false,
  }),
);
const joinLimiter = rateLimit({
  windowMs: 60000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${rateLimit.ipKeyGenerator(req.ip)}:${codeOf(req)}`,
});
const actionLimiter = rateLimit({
  windowMs: 60000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${rateLimit.ipKeyGenerator(req.ip)}:${codeOf(req)}`,
});

function viewer(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  try {
    const payload = jwt.verify(token || "", secret, { algorithms: ["HS256"] });
    if (
      payload.purpose === "arena-player" &&
      payload.room === codeOf(req) &&
      typeof payload.playerId === "string"
    ) {
      req.viewer = { playerId: payload.playerId };
      return next();
    }
  } catch {
    return res
      .status(401)
      .json({ error: "Войдите в игру снова / Ойынға қайта кіріңіз" });
  }
  authenticateToken(req, res, () => {
    req.viewer = { userId: req.user.userId };
    next();
  });
}

router.get(
  "/",
  authenticateToken,
  wrap(async (req, res) => {
    const rooms = await getAll(
      `SELECT code,title,mode,status,created_at,winner,
        (SELECT COUNT(*) FROM game_players WHERE room_id=game_rooms.id AND active=1) AS player_count
        FROM game_rooms WHERE teacher_id=? ORDER BY id DESC LIMIT 20`,
      [req.user.userId],
    );
    res.json(rooms);
  }),
);

router.post(
  "/",
  authenticateToken,
  wrap(async (req, res) => {
    const language = req.body.language === "ru" ? "ru" : "kk";
    const mode = typeof req.body.mode === "string" ? req.body.mode : "arena";
    if (!MODES.has(mode)) arena.fail("Неизвестный режим игры");
    const seconds = Number(req.body.roundSeconds ?? 30);
    if (!Number.isInteger(seconds) || seconds < 15 || seconds > 120)
      arena.fail("Время на вопрос: 15–120 секунд");
    let questions, title;
    const demo = req.body.demo === true;
    const quizId = Number(req.body.quizId) || 0;
    const direct = Array.isArray(req.body.questions);
    if (mode === "word") {
      if (!direct || demo || quizId)
        arena.fail("Добавьте от 4 до 20 пар слов / 4–20 сөз жұбын қосыңыз");
      try {
        questions = arena.normalizeQuestions(req.body.questions);
      } catch (error) {
        arena.fail(error.status ? error.message : "Некорректные пары слов");
      }
      if (questions.length < 4)
        arena.fail("Добавьте от 4 до 20 пар слов / 4–20 сөз жұбын қосыңыз");
      title = typeof req.body.title === "string" ? req.body.title.trim() : "";
      if (
        title.length < 2 ||
        title.length > 120 ||
        /[\u0000-\u001f<>]/.test(title)
      )
        arena.fail("Название: 2–120 символов / Атауы: 2–120 таңба");
    } else if (direct || (demo && quizId) || (!demo && !quizId)) {
      arena.fail("Выберите один источник вопросов / Бір сұрақ көзін таңдаңыз");
    } else if (demo) {
      questions = arena.demoQuestions(language);
      title = arena.modeRule(mode).demoTitle[language === "kk" ? 1 : 0];
    } else {
      const quiz = await getOne(
        "SELECT * FROM quizzes WHERE id=? AND user_id=?",
        [quizId, req.user.userId],
      );
      if (!quiz) arena.fail("Выберите свой тест / Өз тестіңізді таңдаңыз", 404);
      try {
        questions = arena.normalizeQuestions(JSON.parse(quiz.questions));
      } catch (error) {
        arena.fail(error.status ? error.message : "Некорректный тест");
      }
      title = quiz.title.slice(0, 120);
    }
    const requestKey = req.body.requestKey || null;
    if (
      requestKey !== null &&
      (typeof requestKey !== "string" ||
        !/^[a-zA-Z0-9-]{32,80}$/.test(requestKey))
    )
      arena.fail("Неверный идентификатор запроса");
    const payloadHash = JSON.stringify({
      mode,
      language,
      seconds,
      title,
      questions,
    });
    const roomResult = await withTransaction(async (tx) => {
      if (requestKey) {
        const existing = await arena.one(
          tx,
          "SELECT code,mode,language,title,questions,round_seconds FROM game_rooms WHERE teacher_id=? AND request_key=?",
          [req.user.userId, requestKey],
        );
        if (existing) {
          const existingHash = JSON.stringify({
            mode: existing.mode || "arena",
            language: existing.language,
            seconds: existing.round_seconds,
            title: existing.title,
            questions: JSON.parse(existing.questions),
          });
          if (existingHash !== payloadHash)
            arena.fail("Этот запрос уже создал другую игру", 409);
          return { code: existing.code, mode: existing.mode || "arena" };
        }
      }
      const active = await arena.one(
        tx,
        "SELECT COUNT(*) AS n FROM game_rooms WHERE teacher_id=? AND status!='finished' AND expires_at>?",
        [req.user.userId, Date.now()],
      );
      if (active.n >= 3) arena.fail("Завершите одну из открытых игр", 409);
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidate = crypto.randomBytes(3).toString("hex").toUpperCase();
        const result = await tx.execute({
          sql: "INSERT OR IGNORE INTO game_rooms (code,teacher_id,title,mode,language,questions,round_seconds,expires_at,request_key) VALUES (?,?,?,?,?,?,?,?,?)",
          args: [
            candidate,
            req.user.userId,
            title,
            mode,
            language,
            JSON.stringify(questions),
            seconds,
            Date.now() + 24 * 3600000,
            requestKey,
          ],
        });
        if (result.rowsAffected) return { code: candidate, mode };
      }
      arena.fail("Не удалось создать комнату. Повторите запрос", 503);
    });
    res.status(201).json(roomResult);
  }),
);

router.post(
  "/:code/join",
  joinLimiter,
  wrap(async (req, res) => {
    const name =
      typeof req.body.name === "string"
        ? req.body.name.trim().replace(/\s+/g, " ")
        : "";
    const key = req.body.clientKey;
    if (name.length < 2 || name.length > 24 || /[\u0000-\u001f<>]/.test(name))
      arena.fail("Имя: 2–24 символа / Аты: 2–24 таңба");
    if (typeof key !== "string" || !/^[a-zA-Z0-9-]{32,80}$/.test(key))
      arena.fail("Обновите страницу / Бетті жаңартыңыз");
    const code = codeOf(req);
    const data = await arena.mutate(code, async (tx, room) => {
      if (room.expires_at < Date.now()) arena.fail("Срок игры истёк", 410);
      const existing = await arena.one(
        tx,
        "SELECT * FROM game_players WHERE room_id=? AND client_key=?",
        [room.id, key],
      );
      if (existing) {
        if (!existing.active) arena.fail("Участник исключён", 403);
        return { token: signPlayer(room, existing) };
      }
      if (room.status !== "lobby")
        arena.fail("Игра уже началась / Ойын басталды", 409);
      const players = (
        await tx.execute({
          sql: "SELECT name,team FROM game_players WHERE room_id=? AND active=1",
          args: [room.id],
        })
      ).rows;
      if (players.length >= arena.MAX_PLAYERS)
        arena.fail("В комнате уже 40 участников", 409);
      if (
        players.some(
          (p) => p.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      )
        arena.fail("Это имя занято / Бұл ат бос емес", 409);
      const team =
        players.filter((p) => p.team === 0).length <=
        players.filter((p) => p.team === 1).length
          ? 0
          : 1;
      const id = crypto.randomUUID();
      await tx.execute({
        sql: "INSERT INTO game_players (id,room_id,client_key,name,team) VALUES (?,?,?,?,?)",
        args: [id, room.id, key, name, team],
      });
      await tx.execute({
        sql: "UPDATE game_rooms SET revision=revision+1 WHERE id=?",
        args: [room.id],
      });
      return { token: signPlayer(room, { id }) };
    });
    res.json(data);
  }),
);

router.get(
  "/:code/state",
  viewer,
  wrap(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json(arena.project(await arena.readRoom(codeOf(req)), req.viewer));
  }),
);

router.post(
  "/:code/control",
  authenticateToken,
  actionLimiter,
  wrap(async (req, res) => {
    await arena.mutate(codeOf(req), async (tx, room) => {
      if (room.teacher_id !== req.user.userId)
        arena.fail("Игра не найдена", 404);
      if (
        room.status !== "finished" &&
        room.expires_at <= Date.now() &&
        req.body.action !== "finish"
      )
        arena.fail("Срок игры истёк", 410);
      const action = req.body.action;
      if (action === "finish" && room.status !== "finished")
        return arena.finish(tx, room);
      if (action === "start" && room.status === "lobby") {
        const counts = (
          await tx.execute({
            sql: "SELECT team,COUNT(*) AS n FROM game_players WHERE room_id=? AND active=1 GROUP BY team",
            args: [room.id],
          })
        ).rows;
        if (counts.length !== 2)
          arena.fail(
            "Нужны участники в обеих командах / Екі командада да ойыншы қажет",
          );
        await tx.execute({
          sql: "UPDATE game_rooms SET status='running', deadline=?, revision=revision+1 WHERE id=?",
          args: [Date.now() + room.round_seconds * 1000, room.id],
        });
      } else if (action === "pause" && room.status === "running") {
        await tx.execute({
          sql: "UPDATE game_rooms SET status='paused', remaining_ms=?, deadline=NULL, revision=revision+1 WHERE id=?",
          args: [Math.max(0, room.deadline - Date.now()), room.id],
        });
      } else if (action === "resume" && room.status === "paused") {
        await tx.execute({
          sql: "UPDATE game_rooms SET status='running', deadline=?, remaining_ms=NULL, revision=revision+1 WHERE id=?",
          args: [Date.now() + room.remaining_ms, room.id],
        });
      } else if (action === "next" && room.status === "running") {
        if (
          req.body.roundIndex !== undefined &&
          req.body.roundIndex !== room.round_index
        )
          arena.fail("Вопрос уже сменился / Сұрақ ауысты", 409);
        await arena.nextRound(tx, room);
      } else if (action === "kick" && room.status === "lobby") {
        const player = await arena.one(
          tx,
          "SELECT * FROM game_players WHERE id=? AND room_id=?",
          [req.body.playerId || "", room.id],
        );
        if (!player) arena.fail("Участник не найден", 404);
        await tx.execute({
          sql: "UPDATE game_players SET active=0 WHERE id=?",
          args: [player.id],
        });
      } else arena.fail("Действие недоступно / Әрекет қолжетімсіз", 409);
    });
    res.json({ ok: true });
  }),
);

router.post(
  "/:code/answer",
  viewer,
  actionLimiter,
  wrap(async (req, res) => {
    const { roundIndex, answerIndex } = req.body;
    if (
      !Number.isInteger(roundIndex) ||
      !Number.isInteger(answerIndex) ||
      answerIndex < 0 ||
      answerIndex > 3
    )
      arena.fail("Неверный ответ");
    if (!req.viewer.playerId)
      arena.fail("Отвечать могут только участники", 403);
    const result = await arena.mutate(codeOf(req), async (tx, room) => {
      const player = await arena.one(
        tx,
        "SELECT * FROM game_players WHERE id=? AND room_id=? AND active=1",
        [req.viewer.playerId, room.id],
      );
      if (!player) arena.fail("Участник не найден", 403);
      const saved = await arena.one(
        tx,
        "SELECT * FROM game_answers WHERE room_id=? AND player_id=? AND round_index=?",
        [room.id, player.id, roundIndex],
      );
      if (saved)
        return { correct: !!saved.is_correct, answerIndex: saved.answer_index };
      if (
        room.status !== "running" ||
        room.round_index !== roundIndex ||
        room.deadline <= Date.now()
      )
        arena.fail("Вопрос закрыт или игра на паузе / Сұрақ жабық", 409);
      const correct =
        JSON.parse(room.questions)[roundIndex].correct === answerIndex;
      await tx.execute({
        sql: "INSERT INTO game_answers (room_id,player_id,round_index,answer_index,is_correct) VALUES (?,?,?,?,?)",
        args: [room.id, player.id, roundIndex, answerIndex, correct ? 1 : 0],
      });
      await tx.execute({
        sql: "UPDATE game_players SET last_round=?,last_answer=?,last_correct=?,attack_ready=?,score=score+?,correct_count=correct_count+?,answer_count=answer_count+1 WHERE id=?",
        args: [
          roundIndex,
          answerIndex,
          correct ? 1 : 0,
          correct && arena.modeUsesActions(room.mode || "arena") ? 1 : 0,
          correct ? 100 : 0,
          correct ? 1 : 0,
          player.id,
        ],
      });
      return { correct, answerIndex };
    });
    res.json(result);
  }),
);

const gameAction = (legacyAttack = false) =>
  wrap(async (req, res) => {
    if (!req.viewer.playerId) arena.fail("Только для участников", 403);
    await arena.mutate(codeOf(req), async (tx, room) => {
      const mode = room.mode || "arena";
      const rules = arena.modeRule(mode);
      if (!rules.actions.length)
        arena.fail("В этом режиме команда движется после ответа", 409);
      if (legacyAttack && mode !== "arena")
        arena.fail("Используйте игровое действие / Ойын әрекетін қолданыңыз", 409);
      if (!rules.actions.includes(req.body.kind))
        arena.fail("Неизвестное игровое действие");
      if (
        room.status !== "running" ||
        room.round_index !== req.body.roundIndex ||
        room.deadline <= Date.now()
      )
        arena.fail("Действие недоступно / Әрекет қолжетімсіз", 409);
      const player = await arena.one(
        tx,
        "SELECT * FROM game_players WHERE id=? AND room_id=? AND active=1",
        [req.viewer.playerId, room.id],
      );
      if (
        !player ||
        player.last_round !== room.round_index ||
        !player.attack_ready
      )
        arena.fail(
          "Сначала ответьте правильно / Алдымен дұрыс жауап беріңіз",
          409,
        );
      const size = await arena.one(
        tx,
        "SELECT COUNT(*) AS n FROM game_players WHERE room_id=? AND team=? AND active=1",
        [room.id, player.team],
      );
      const damage = Math.max(1, Math.round(1800 / size.n));
      const questionCount = JSON.parse(room.questions).length;
      const health = player.team === 0 ? "coral_health" : "cyan_health";
      const event = {
        id: room.revision + 1,
        round: room.round_index,
        team: player.team,
        kind: req.body.kind,
        name: player.name,
        damage:
          mode === "arena"
            ? damage / 100
            : Number((100 / (size.n * questionCount)).toFixed(1)),
        at: Date.now(),
      };
      await tx.execute({
        sql: "UPDATE game_players SET attack_ready=0,hits=hits+1,score=score+20 WHERE id=?",
        args: [player.id],
      });
      const events = JSON.stringify([...JSON.parse(room.events), event].slice(-40));
      if (mode === "arena") {
        await tx.execute({
          sql: `UPDATE game_rooms SET ${health}=MAX(0,${health}-?),revision=revision+1,last_event=?,events=? WHERE id=?`,
          args: [damage, JSON.stringify(event), events, room.id],
        });
        const updated = await arena.one(
          tx,
          "SELECT * FROM game_rooms WHERE id=?",
          [room.id],
        );
        if (!updated.cyan_health || !updated.coral_health)
          await arena.finish(tx, updated);
      } else {
        await tx.execute({
          sql: "UPDATE game_rooms SET revision=revision+1,last_event=?,events=? WHERE id=?",
          args: [JSON.stringify(event), events, room.id],
        });
      }
    });
    res.json({ ok: true });
  });

router.post("/:code/action", viewer, actionLimiter, gameAction(false));
// Kept for old Arena clients and links created before game modes were introduced.
router.post("/:code/attack", viewer, actionLimiter, gameAction(true));

router.get(
  "/:code/report",
  authenticateToken,
  wrap(async (req, res) => {
    const room = await getOne(
      "SELECT * FROM game_rooms WHERE code=? AND teacher_id=?",
      [codeOf(req), req.user.userId],
    );
    if (!room) arena.fail("Игра не найдена", 404);
    const rows = await getAll(
      `SELECT p.name,p.team,p.score,p.answer_count,p.correct_count,p.hits
        FROM game_players p WHERE room_id=? AND active=1 ORDER BY score DESC,name`,
      [room.id],
    );
    res.json({
      title: room.title,
      mode: room.mode || "arena",
      questions: JSON.parse(room.questions).length,
      players: rows,
    });
  }),
);

router.use((error, req, res, next) => {
  if (!error.status) return next(error);
  res.status(error.status).json({ error: error.message });
});
module.exports = router;
