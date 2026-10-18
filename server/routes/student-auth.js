const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { runQuery, getOne } = require("../db/database");
const { authenticateStudent } = require("../middleware/studentAuth");
const { authLimiter } = require("../middleware/rateLimiter");

function session(student) {
  const token = jwt.sign(
    {
      studentId: student.id,
      classId: student.class_id,
      role: "student",
      username: student.username,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" },
  );
  return {
    token,
    student: {
      id: student.id,
      name: student.name,
      username: student.username,
      avatar_color: student.avatar_color,
      xp: student.xp,
      level: student.level,
    },
  };
}
const findClass = (code) =>
  getOne(
    "SELECT id, name FROM classes WHERE telegram_invite_code = ? COLLATE NOCASE",
    [code.trim()],
  );

router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { password, name, invite_code = "" } = req.body;
    const username =
      typeof req.body.username === "string"
        ? req.body.username.trim().toLowerCase()
        : "";
    if (
      !/^[a-z0-9_.-]{3,32}$/.test(username) ||
      typeof name !== "string" ||
      name.trim().length < 2 ||
      name.length > 100 ||
      typeof password !== "string" ||
      password.length < 8 ||
      password.length > 128 ||
      typeof invite_code !== "string" ||
      invite_code.length > 100
    ) {
      return res.status(400).json({
        error:
          "Проверьте имя, логин (3–32 латинских символа) и пароль (8–128 символов).",
      });
    }
    const classRow = invite_code.trim() ? await findClass(invite_code) : null;
    if (invite_code.trim() && !classRow)
      return res.status(404).json({ error: "Неверный код класса" });
    if (
      await getOne(
        "SELECT id FROM students WHERE username = ? COLLATE NOCASE",
        [username],
      )
    )
      return res.status(409).json({ error: "Логин уже занят" });
    const result = await runQuery(
      "INSERT INTO students (name, username, password_hash, class_id, avatar_color) VALUES (?, ?, ?, ?, ?)",
      [
        name.trim(),
        username,
        await bcrypt.hash(password, 10),
        classRow?.id ?? null,
        "#14836b",
      ],
    );
    const student = await getOne("SELECT * FROM students WHERE id = ?", [
      Number(result.lastInsertRowid),
    ]);
    res.status(201).json({ success: true, ...session(student) });
  } catch (error) {
    if (/UNIQUE constraint/i.test(error.message))
      return res.status(409).json({ error: "Логин уже занят" });
    next(error);
  }
});

router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (
      typeof username !== "string" ||
      username.length > 64 ||
      typeof password !== "string" ||
      password.length > 128
    )
      return res.status(400).json({ error: "Введите логин и пароль" });
    // Legacy exact-case logins remain valid.
    const student =
      (await getOne("SELECT * FROM students WHERE username = ?", [
        username.trim(),
      ])) ||
      (await getOne(
        "SELECT * FROM students WHERE username = ? COLLATE NOCASE",
        [username.trim()],
      ));
    if (
      !student?.password_hash ||
      !(await bcrypt.compare(password, student.password_hash))
    )
      return res.status(401).json({ error: "Неверный логин или пароль" });
    res.json(session(student));
  } catch (error) {
    next(error);
  }
});

router.get("/me", authenticateStudent, async (req, res, next) => {
  try {
    const student = await getOne(
      "SELECT s.id, s.name, s.username, s.avatar_color, s.xp, s.level, s.class_id, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?",
      [req.student.studentId],
    );
    res.json({ student });
  } catch (error) {
    next(error);
  }
});

router.post("/class", authenticateStudent, async (req, res, next) => {
  try {
    if (
      typeof req.body.invite_code !== "string" ||
      !req.body.invite_code.trim() ||
      req.body.invite_code.length > 100
    )
      return res.status(400).json({ error: "Введите код класса" });
    const target = await findClass(req.body.invite_code);
    if (!target) return res.status(404).json({ error: "Неверный код класса" });
    await runQuery(
      "UPDATE students SET class_id = ? WHERE id = ? AND class_id IS NULL",
      [target.id, req.student.studentId],
    );
    const current = await getOne("SELECT class_id FROM students WHERE id = ?", [
      req.student.studentId,
    ]);
    if (current.class_id !== target.id)
      return res.status(409).json({
        error: "Вы уже состоите в другом классе. Обратитесь к учителю.",
      });
    res.json({ class: target });
  } catch (error) {
    next(error);
  }
});
module.exports = router;
