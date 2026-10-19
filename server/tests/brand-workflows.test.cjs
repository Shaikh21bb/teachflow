const { directory } = require("./setup.cjs");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { rmSync } = require("node:fs");
const jwt = require("jsonwebtoken");
process.env.APP_TIMEZONE = "Asia/Almaty";
const { getTodayDow } = require("../utils/calendar");
const db = require("../db/database");
const app = require("../index");
let server, base, token, other;
before(async () => {
  await app.ready();
  for (const id of [1, 2]) {
    await db.runQuery(
      "INSERT INTO users (id,name,email,password_hash) VALUES (?,?,?,?)",
      [id, "Teacher", `brand${id}@test.example`, "unused"],
    );
    await db.runQuery("INSERT INTO classes (id,name,user_id) VALUES (?,?,?)", [
      id,
      `Class ${id}`,
      id,
    ]);
  }
  for (const id of [1, 2, 3])
    await db.runQuery(
      "INSERT INTO students (id,name,class_id) VALUES (?,?,?)",
      [id, `Pupil ${id}`, id === 3 ? 2 : 1],
    );
  for (const id of [1, 2, 3])
    await db.runQuery(
      "INSERT INTO assignments (id,title,user_id,class_id,status) VALUES (?,?,?,?,?)",
      [
        id,
        `Task ${id}`,
        id === 3 ? 2 : 1,
        id === 3 ? 2 : 1,
        id === 2 ? "completed" : "active",
      ],
    );
  for (const id of [1, 2, 3])
    await db.runQuery(
      "INSERT INTO assignment_submissions (assignment_id,student_id,answer_text,status) VALUES (?,?,?,?)",
      [id === 3 ? 3 : 1, id, "Answer", "pending"],
    );
  for (const [uid, day] of [
    [1, getTodayDow()],
    [1, (getTodayDow() + 1) % 7],
    [2, getTodayDow()],
  ])
    await db.runQuery(
      "INSERT INTO lesson_schedule (user_id,title,day_of_week,start_time) VALUES (?,?,?,?)",
      [uid, "Scheduled", day, "10:00"],
    );
  for (const title of ["Saved A", "Saved B"])
    await db.runQuery("INSERT INTO lessons (user_id,title) VALUES (1,?)", [
      title,
    ]);
  token = jwt.sign({ userId: 1, role: "teacher" }, process.env.JWT_SECRET);
  other = jwt.sign({ userId: 2, role: "teacher" }, process.env.JWT_SECRET);
  server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.on("listening", r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => {
  await new Promise((r) => server.close(r));
  (await db.getDatabase()).close();
  rmSync(directory, { recursive: true, force: true });
});
async function get(path, auth = token) {
  const response = await fetch(base + path, {
    headers: { Authorization: `Bearer ${auth}` },
  });
  assert.equal(response.status, 200);
  return response.json();
}
test("dashboard counts actual pending submissions and scheduled lessons, isolated by teacher", async () => {
  const stats = await get("/dashboard/stats");
  assert.equal(stats.pendingReviews, 2);
  assert.equal(stats.lessonsToday, 1);
  assert.equal(stats.totalLessons, 2);
  assert.equal(stats.totalStudents, 2);
  const assignments = await get("/assignments");
  assert.equal(assignments.find((a) => a.id === 1).pending_count, 2);
  assert.equal(assignments.find((a) => a.id === 2).pending_count, 0);
  assert.equal((await get("/dashboard/stats", other)).pendingReviews, 1);
  await db.runQuery(
    "UPDATE assignment_submissions SET status='graded', score=8 WHERE student_id=1",
  );
  assert.equal((await get("/dashboard/stats")).pendingReviews, 1);
  assert.equal(getTodayDow(new Date("2026-10-18T21:00:00Z")), 1);
  assert.equal(getTodayDow(new Date("2026-10-18T18:00:00Z")), 0);
});
test("teacher return paths preserve internal destinations and reject external redirects", async () => {
  const { teacherReturnPath } = await import("../../src/lib/navigation.js");
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "/login",
    "javascript:alert(1)",
    "/dashboard/../login",
    "/dashboardevil",
    null,
  ])
    assert.equal(teacherReturnPath(value), "/dashboard");
  assert.equal(teacherReturnPath("/builder?edit=7"), "/builder?edit=7");
  assert.equal(teacherReturnPath("/quizzes/1/report"), "/quizzes/1/report");
});
