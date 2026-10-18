const router = require("express").Router();
const { authenticateToken } = require("../middleware/auth");
const { getOne, getAll, runQuery } = require("../db/database");
const { quests, metadata } = require("../data/quests");
const crypto = require("node:crypto");
router.use(authenticateToken);

router.get("/", async (req, res, next) => {
  try {
    const classes = await getAll(
      "SELECT id, name, telegram_invite_code AS invite_code FROM classes WHERE user_id = ?",
      [req.user.userId],
    );
    const assignments = await getAll(
      "SELECT qa.* FROM quest_assignments qa JOIN classes c ON c.id = qa.class_id WHERE c.user_id = ?",
      [req.user.userId],
    );
    res.json({ classes, assignments, quests: quests.map(metadata) });
  } catch (error) {
    next(error);
  }
});
router.get("/preview/:id", (req, res) => {
  const quest = quests.find((q) => q.id === req.params.id);
  if (!quest) return res.status(404).json({ error: "Квест не найден" });
  res.json(quest);
});
router.get("/:classId", async (req, res, next) => {
  try {
    if (
      !(await getOne("SELECT id FROM classes WHERE id = ? AND user_id = ?", [
        req.params.classId,
        req.user.userId,
      ]))
    )
      return res.status(404).json({ error: "Класс не найден" });
    const students = await getAll(
      "SELECT id, name, username, xp, level FROM students WHERE class_id = ? ORDER BY name",
      [req.params.classId],
    );
    const progress = await getAll(
      "SELECT p.*, s.name FROM quest_progress p JOIN students s ON s.id = p.student_id WHERE s.class_id = ?",
      [req.params.classId],
    );
    const attempts = await getAll(
      "SELECT r.student_id, r.quest_id, SUM(r.attempts) AS attempts FROM quest_step_results r JOIN students s ON s.id = r.student_id WHERE s.class_id = ? GROUP BY r.student_id, r.quest_id",
      [req.params.classId],
    );
    res.json({ students, progress, attempts });
  } catch (error) {
    next(error);
  }
});
router.post("/:classId/invite", async (req, res, next) => {
  try {
    if (
      !(await getOne("SELECT id FROM classes WHERE id = ? AND user_id = ?", [
        req.params.classId,
        req.user.userId,
      ]))
    )
      return res.status(404).json({ error: "Класс не найден" });
    const code = crypto.randomBytes(8).toString("hex").toUpperCase();
    await runQuery(
      "UPDATE classes SET telegram_invite_code = ? WHERE id = ? AND user_id = ? AND (telegram_invite_code IS NULL OR TRIM(telegram_invite_code) = '')",
      [code, req.params.classId, req.user.userId],
    );
    const row = await getOne(
      "SELECT telegram_invite_code AS code FROM classes WHERE id = ? AND user_id = ?",
      [req.params.classId, req.user.userId],
    );
    if (!row) return res.status(404).json({ error: "Класс не найден" });
    res.json(row);
  } catch (error) {
    next(error);
  }
});
router.post("/:classId/:questId", async (req, res, next) => {
  try {
    if (!quests.some((q) => q.id === req.params.questId))
      return res.status(404).json({ error: "Квест не найден" });
    if (
      !(await getOne("SELECT id FROM classes WHERE id = ? AND user_id = ?", [
        req.params.classId,
        req.user.userId,
      ]))
    )
      return res.status(404).json({ error: "Класс не найден" });
    await runQuery(
      "INSERT OR IGNORE INTO quest_assignments (class_id, quest_id) VALUES (?, ?)",
      [req.params.classId, req.params.questId],
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
router.delete("/:classId/:questId", async (req, res, next) => {
  try {
    if (
      !(await getOne("SELECT id FROM classes WHERE id = ? AND user_id = ?", [
        req.params.classId,
        req.user.userId,
      ]))
    )
      return res.status(404).json({ error: "Класс не найден" });
    await runQuery(
      "DELETE FROM quest_assignments WHERE class_id = ? AND quest_id = ?",
      [req.params.classId, req.params.questId],
    );
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
module.exports = router;
