const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { authenticateStudent } = require("../middleware/studentAuth");
const { getOne, getAll, withTransaction } = require("../db/database");
const { quests, metadata, publicStep, matches } = require("../data/quests");

router.use(
  rateLimit({
    windowMs: 60000,
    limit: 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Слишком много запросов. Подождите минуту." },
  }),
);
router.use(authenticateStudent);
router.use(
  rateLimit({
    windowMs: 60000,
    limit: 120,
    keyGenerator: (req) => String(req.student.studentId),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Слишком много ответов. Подождите минуту." },
  }),
);
const failure = (status, message) =>
  Object.assign(new Error(message), { status });
async function access(studentId, quest, execute) {
  const rows = (
    await execute({
      sql: "SELECT quest_id, current_index FROM quest_progress WHERE student_id = ?",
      args: [studentId],
    })
  ).rows;
  const profile = (
    await execute({
      sql: "SELECT class_id FROM students WHERE id = ?",
      args: [studentId],
    })
  ).rows[0];
  const assignments = (
    await execute({
      sql: "SELECT quest_id FROM quest_assignments WHERE class_id = ?",
      args: [profile.class_id],
    })
  ).rows;
  const branch = quests.filter((item) => item.track === quest.track);
  const prior = branch[branch.indexOf(quest) - 1];
  return (
    !prior ||
    rows.some(
      (row) =>
        row.quest_id === prior.id && row.current_index >= prior.steps.length,
    ) ||
    rows.some((row) => row.quest_id === quest.id && row.current_index > 0) ||
    assignments.some((row) => row.quest_id === quest.id)
  );
}

router.get("/", async (req, res, next) => {
  try {
    const id = req.student.studentId;
    const student = await getOne(
      "SELECT s.id, s.name, s.username, s.xp, s.level, s.class_id, s.avatar_color, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?",
      [id],
    );
    const progress = await getAll(
      "SELECT * FROM quest_progress WHERE student_id = ?",
      [id],
    );
    const assigned = await getAll(
      "SELECT quest_id FROM quest_assignments WHERE class_id = ?",
      [student.class_id],
    );
    const catalog = quests.map((quest) => {
      const index =
        progress.find((row) => row.quest_id === quest.id)?.current_index || 0;
      const branch = quests.filter((item) => item.track === quest.track);
      const prior = branch[branch.indexOf(quest) - 1];
      const isAssigned = assigned.some((row) => row.quest_id === quest.id);
      return {
        ...metadata(quest),
        progress: index,
        assigned: isAssigned,
        unlocked:
          !prior ||
          index > 0 ||
          isAssigned ||
          progress.some(
            (row) =>
              row.quest_id === prior.id &&
              row.current_index >= prior.steps.length,
          ),
      };
    });
    const completed = catalog.filter((item) => item.progress === item.steps);
    res.json({
      student,
      quests: catalog,
      achievements: {
        first: completed.length > 0,
        math: completed.filter((q) => q.track === "math").length === 3,
        logic: completed.filter((q) => q.track === "logic").length === 3,
        science: completed.filter((q) => q.track === "science").length === 3,
        explorer: completed.length === quests.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const attempts = await getAll(
      "SELECT a.id, a.score, a.max_score, a.taken_at, q.title FROM quiz_attempts a JOIN quizzes q ON q.id = a.quiz_id WHERE a.student_id = ? ORDER BY a.taken_at DESC LIMIT 100",
      [req.student.studentId],
    );
    res.json({ attempts });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const quest = quests.find((item) => item.id === req.params.id);
    if (!quest) throw failure(404, "Квест не найден");
    const { getDatabase } = require("../db/database");
    const db = await getDatabase();
    if (
      !(await access(req.student.studentId, quest, (query) =>
        db.execute(query),
      ))
    )
      throw failure(403, "Сначала завершите предыдущий квест");
    const progress = await getOne(
      "SELECT current_index FROM quest_progress WHERE student_id = ? AND quest_id = ?",
      [req.student.studentId, quest.id],
    );
    const current = progress?.current_index || 0;
    const stepIndex =
      req.query.step === undefined
        ? Math.min(current, quest.steps.length - 1)
        : Number(req.query.step);
    if (
      !Number.isInteger(stepIndex) ||
      stepIndex < 0 ||
      stepIndex >= quest.steps.length ||
      stepIndex > current
    )
      throw failure(409, "Этот этап ещё не открыт");
    res.json({
      quest: metadata(quest),
      progress: current,
      stepIndex,
      step: publicStep(quest.steps[stepIndex]),
    });
  } catch (error) {
    next(error);
  }
});

// The write transaction is authoritative across processes: replay never grants XP twice.
router.post("/:id/check", async (req, res, next) => {
  try {
    const quest = quests.find((item) => item.id === req.params.id);
    if (!quest) throw failure(404, "Квест не найден");
    const { stepIndex, answer } = req.body;
    if (
      !Number.isInteger(stepIndex) ||
      stepIndex < 0 ||
      stepIndex >= quest.steps.length
    )
      throw failure(400, "Неверный этап");
    const result = await withTransaction(async (transaction) => {
      const execute = (query) => transaction.execute(query);
      const studentId = req.student.studentId;
      if (!(await access(studentId, quest, execute)))
        throw failure(403, "Сначала завершите предыдущий квест");
      await execute({
        sql: "INSERT OR IGNORE INTO quest_progress (student_id, quest_id) VALUES (?, ?)",
        args: [studentId, quest.id],
      });
      const row = (
        await execute({
          sql: "SELECT current_index FROM quest_progress WHERE student_id = ? AND quest_id = ?",
          args: [studentId, quest.id],
        })
      ).rows[0];
      if (stepIndex > row.current_index)
        throw failure(409, "Этот этап ещё не открыт");
      const correct = matches(quest.steps[stepIndex], answer);
      const practice = stepIndex < row.current_index;
      let earned = 0,
        progress = row.current_index;
      if (!practice) {
        await execute({
          sql: "INSERT INTO quest_step_results (student_id, quest_id, step_index, attempts, completed_at) VALUES (?, ?, ?, 1, CASE WHEN ? THEN CURRENT_TIMESTAMP END) ON CONFLICT(student_id, quest_id, step_index) DO UPDATE SET attempts = attempts + 1, completed_at = excluded.completed_at",
          args: [studentId, quest.id, stepIndex, Number(correct)],
        });
        if (correct) {
          progress++;
          earned = 20 + (progress === quest.steps.length ? 40 : 0);
          await execute({
            sql: "UPDATE quest_progress SET current_index = ?, updated_at = CURRENT_TIMESTAMP, completed_at = CASE WHEN ? THEN CURRENT_TIMESTAMP END WHERE student_id = ? AND quest_id = ?",
            args: [
              progress,
              Number(progress === quest.steps.length),
              studentId,
              quest.id,
            ],
          });
          await execute({
            sql: "UPDATE students SET xp = COALESCE(xp, 0) + ?, level = CAST((COALESCE(xp, 0) + ?) / 100 AS INTEGER) + 1 WHERE id = ?",
            args: [earned, earned, studentId],
          });
        }
      }
      return {
        correct,
        practice,
        earned,
        progress,
        completed: progress === quest.steps.length,
        feedback: correct
          ? quest.steps[stepIndex].explanation
          : {
              ru: "Пока не сходится. Проверь условие и попробуй ещё раз.",
              kk: "Әзірше сәйкес емес. Шартты тексеріп, қайта байқап көр.",
            },
      };
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
});
module.exports = router;
