const { directory } = require("./setup.cjs");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { rmSync } = require("node:fs");
const jwt = require("jsonwebtoken");
const db = require("../db/database");
const { quests, matches } = require("../data/quests");
// Exercise real classroom rate limits while keeping storage/providers isolated.
process.env.NODE_ENV = "production";
const app = require("../index");
let server, base, teacher, other, student, studentId;
async function request(path, token, method = "GET", body) {
  const response = await fetch(base + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() };
}
before(async () => {
  await app.ready();
  for (const id of [1, 2]) {
    await db.runQuery(
      "INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)",
      [id, "Teacher", `quest${id}@test.example`, "unused"],
    );
    await db.runQuery(
      "INSERT INTO classes (id, user_id, name, telegram_invite_code) VALUES (?, ?, ?, ?)",
      [id, id, `Class ${id}`, `QUEST-${id}`],
    );
  }
  teacher = jwt.sign({ userId: 1, role: "teacher" }, process.env.JWT_SECRET);
  other = jwt.sign({ userId: 2, role: "teacher" }, process.env.JWT_SECRET);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.on("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  (await db.getDatabase()).close();
  rmSync(directory, { recursive: true, force: true });
});

test("standalone registration returns a session and supports optional, safe class membership", async () => {
  const body = {
    name: "Explorer",
    username: "Quest_Student",
    password: "Testing12345",
  };
  const created = await request("/student/register", null, "POST", body);
  assert.equal(created.status, 201);
  student = created.body.token;
  studentId = created.body.student.id;
  assert.equal(created.body.student.username, "quest_student");
  assert.equal(created.body.student.xp, 0);
  assert.equal(
    (await request("/student/me", student)).body.student.class_id,
    null,
  );
  assert.equal(
    (await request("/student/register", null, "POST", body)).status,
    409,
  );
  assert.equal(
    (
      await request("/student/register", null, "POST", {
        ...body,
        username: "quest_new",
        invite_code: "wrong",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request("/student/login", null, "POST", {
        username: "QUEST_STUDENT",
        password: body.password,
      })
    ).status,
    200,
  );
  assert.equal((await request("/student-quests", teacher)).status, 403);
  assert.equal((await request("/quest-classes", student)).status, 403);
  assert.equal(
    (
      await request("/student/class", student, "POST", {
        invite_code: "QUEST-1",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/student/class", student, "POST", {
        invite_code: "QUEST-1",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/student/class", student, "POST", {
        invite_code: "QUEST-2",
      })
    ).status,
    409,
  );
  assert.equal(
    (await request("/student/me", student)).body.student.class_id,
    1,
  );
});
test("catalog never leaks answers, locks future stages, rejects invalid input, and counts wrong attempts", async () => {
  const catalog = await request("/student-quests", student);
  assert.equal(catalog.body.quests.length, 9);
  assert.equal(catalog.body.quests.filter((q) => q.unlocked).length, 3);
  assert.equal(JSON.stringify(catalog.body).includes("explanation"), false);
  assert.equal((await request("/student-quests/math-2", student)).status, 403);
  assert.equal(
    (await request("/student-quests/math-1?step=1", student)).status,
    409,
  );
  assert.equal(
    (
      await request("/student-quests/math-1/check", student, "POST", {
        stepIndex: 1,
        answer: 1,
      })
    ).status,
    409,
  );
  const stage = (await request("/student-quests/math-1", student)).body;
  assert.equal("answer" in stage.step, false);
  assert.equal("explanation" in stage.step, false);
  for (const answer of ["40+2", "42<script>", 42, null, {}, "Infinity", ""]) {
    const checked = await request(
      "/student-quests/math-1/check",
      student,
      "POST",
      { stepIndex: 0, answer },
    );
    assert.equal(checked.body.correct, false);
    assert.equal(checked.body.earned, 0);
    assert.equal(checked.body.progress, 0);
  }
  const results = await db.getOne(
    "SELECT attempts FROM quest_step_results WHERE student_id = ? AND quest_id = ? AND step_index = 0",
    [studentId, "math-1"],
  );
  assert.equal(results.attempts, 7);
});
test("concurrent replay awards XP once, completion unlocks next quest, and progress survives a fresh session", async () => {
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      request("/student-quests/math-1/check", student, "POST", {
        stepIndex: 0,
        answer: "42",
      }),
    ),
  );
  assert.deepEqual(
    results.map((r) => r.status),
    [200, 200, 200, 200, 200],
  );
  assert.equal(
    results.reduce((n, r) => n + r.body.earned, 0),
    20,
  );
  for (const [stepIndex, answer] of [
    [1, 1],
    [2, [1, 3, 0, 2]],
    [3, "8"],
  ]) {
    const result = await request(
      "/student-quests/math-1/check",
      student,
      "POST",
      { stepIndex, answer },
    );
    assert.equal(result.body.correct, true);
  }
  const profile = (await request("/student/me", student)).body.student;
  assert.equal(profile.xp, 120);
  assert.equal(profile.level, 2);
  const fresh = (
    await request("/student/login", null, "POST", {
      username: "quest_student",
      password: "Testing12345",
    })
  ).body.token;
  const catalog = (await request("/student-quests", fresh)).body;
  assert.equal(catalog.quests[0].progress, 4);
  assert.equal(catalog.quests[1].unlocked, true);
  assert.equal(catalog.achievements.first, true);
  const replay = await request("/student-quests/math-1/check", fresh, "POST", {
    stepIndex: 3,
    answer: "8",
  });
  assert.equal(replay.body.practice, true);
  assert.equal(replay.body.earned, 0);
  const sibling = await request("/student/register", null, "POST", {
    name: "Other pupil",
    username: "quest_other",
    password: "Testing12345",
  });
  assert.equal(
    (await request("/student-quests", sibling.body.token)).body.quests[0]
      .progress,
    0,
  );
});
test("teacher assignment and reports are restricted to own classes and preserve student privacy", async () => {
  assert.equal(
    (await request("/quest-classes/1/science-3", other, "POST")).status,
    404,
  );
  assert.equal(
    (await request("/quest-classes/1/science-3", teacher, "POST")).status,
    200,
  );
  assert.equal(
    (await request("/student-quests/science-3", student)).status,
    200,
  );
  const catalog = (await request("/quest-classes", other)).body;
  assert.equal(catalog.classes.length, 1);
  assert.equal(catalog.classes[0].id, 2);
  assert.equal(catalog.assignments.length, 0);
  assert.equal((await request("/quest-classes/1", other)).status, 404);
  const report = (await request("/quest-classes/1", teacher)).body;
  assert.equal(report.students[0].id, studentId);
  assert.equal(report.progress[0].current_index, 4);
  assert.equal(JSON.stringify(report).includes("password"), false);
  assert.equal(
    (await request("/quest-classes/preview/math-1", teacher)).body.steps[0]
      .answer,
    42,
  );
  assert.equal(
    (await request("/quest-classes/1/science-3", teacher, "DELETE")).status,
    200,
  );
  assert.equal(
    (await request("/student-quests/science-3", student)).status,
    403,
  );
});
test("every authored quest is solvable and strict matching rejects reordered or malformed answers", async () => {
  assert.equal(
    quests.reduce((sum, q) => sum + q.steps.length, 0),
    36,
  );
  for (const quest of quests)
    for (const step of quest.steps) {
      assert.equal(
        matches(
          step,
          step.type === "number" ? String(step.answer) : step.answer,
        ),
        true,
        quest.id,
      );
      assert.ok(
        step.question.ru &&
          step.question.kk &&
          step.explanation.ru &&
          step.explanation.kk,
      );
      if (step.options)
        assert.equal(step.options.ru.length, step.options.kk.length);
    }
  assert.equal(matches(quests[0].steps[2], [1, 3, 0, "2"]), false);
  assert.equal(matches(quests[0].steps[2], [1, 3, 0, 2, 2]), false);
  assert.equal(matches(quests[0].steps[1], "1"), false);
  assert.equal(matches(quests[8].steps[1], "0,0"), true);
});

test("all nine campaigns can be completed through the API without farming XP", async () => {
  for (const quest of quests) {
    const stage = await request(`/student-quests/${quest.id}`, student);
    assert.equal(stage.status, 200);
    for (
      let stepIndex = stage.body.progress;
      stepIndex < quest.steps.length;
      stepIndex++
    ) {
      const step = quest.steps[stepIndex];
      const result = await request(
        `/student-quests/${quest.id}/check`,
        student,
        "POST",
        {
          stepIndex,
          answer: step.type === "number" ? String(step.answer) : step.answer,
        },
      );
      assert.equal(result.status, 200);
      assert.equal(result.body.correct, true);
    }
  }
  const catalog = (await request("/student-quests", student)).body;
  assert.equal(catalog.student.xp, 1080);
  assert.equal(catalog.student.level, 11);
  assert.equal(
    catalog.quests.every((q) => q.progress === q.steps),
    true,
  );
  assert.equal(Object.values(catalog.achievements).every(Boolean), true);
  assert.deepEqual(
    (await request("/student-quests/history", student)).body.attempts,
    [],
  );
});

test("removing a pupil or deleting a class never destroys a registered pupil account or quest progress", async () => {
  assert.equal(
    (await request(`/classes/1/students/${studentId}`, teacher, "DELETE"))
      .status,
    200,
  );
  assert.equal(
    (await request("/student/me", student)).body.student.class_id,
    null,
  );
  assert.equal(
    (await request("/student-quests", student)).body.student.xp,
    1080,
  );
  await request("/student/class", student, "POST", { invite_code: "QUEST-1" });
  assert.equal((await request("/classes/1", teacher, "DELETE")).status, 200);
  assert.equal(
    (await request("/student/me", student)).body.student.class_id,
    null,
  );
  assert.equal(
    (await request("/student-quests", student)).body.quests[0].progress,
    4,
  );
});

test("30 pupils sharing one IP can register and answer together under production rate limits", async () => {
  const results = await Promise.all(
    Array.from({ length: 30 }, async (_, index) => {
      const registered = await request("/student/register", null, "POST", {
        name: `Pupil ${index}`,
        username: `classroom_${index}`,
        password: "Testing12345",
      });
      assert.equal(registered.status, 201, JSON.stringify(registered.body));
      const token = registered.body.token;
      const catalog = await request("/student-quests", token);
      assert.equal(catalog.status, 200);
      const result = await request(
        "/student-quests/math-1/check",
        token,
        "POST",
        { stepIndex: 0, answer: "42" },
      );
      assert.equal(result.status, 200);
      return result.body.earned;
    }),
  );
  assert.deepEqual(results, Array(30).fill(20));
});

test("classroom invitation works without Telegram and concurrent creation keeps one code", async () => {
  await db.runQuery(
    "INSERT INTO classes (id, user_id, name) VALUES (3, 1, ?)",
    ["New class"],
  );
  assert.equal(
    (await request("/quest-classes/3/invite", other, "POST")).status,
    404,
  );
  const results = await Promise.all(
    Array.from({ length: 5 }, () =>
      request("/quest-classes/3/invite", teacher, "POST"),
    ),
  );
  assert.equal(
    results.every((r) => r.status === 200),
    true,
  );
  const code = results[0].body.code;
  assert.match(code, /^[A-F0-9]{16}$/);
  assert.equal(
    results.every((r) => r.body.code === code),
    true,
  );
  const registered = await request("/student/register", null, "POST", {
    name: "Invited pupil",
    username: "invited_pupil",
    password: "Testing12345",
    invite_code: code.toLowerCase(),
  });
  assert.equal(registered.status, 201);
  assert.equal(
    (await request("/student/me", registered.body.token)).body.student.class_id,
    3,
  );
});
