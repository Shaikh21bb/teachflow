const { directory } = require("./setup.cjs");
const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { rmSync } = require("node:fs");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");
const jwt = require("jsonwebtoken");
const db = require("../db/database");
const arena = require("../utils/arena");
const providers = require("../utils/aiProviders");
let aiResponse = "invalid";
providers.chatWithAI = async () => aiResponse;
const app = require("../index");
let server, base, teacher, other;
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
async function create(options = {}) {
  const result = await request("/games", teacher, "POST", {
    demo: true,
    language: "ru",
    ...options,
  });
  assert.equal(result.status, 201, JSON.stringify(result.body));
  return result.body.code;
}
async function join(code, name, key = crypto.randomUUID()) {
  const result = await request(`/games/${code}/join`, null, "POST", {
    name,
    clientKey: key,
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return { ...result.body, key };
}
async function control(code, action, extra = {}) {
  const result = await request(`/games/${code}/control`, teacher, "POST", {
    action,
    ...extra,
  });
  assert.equal(result.status, 200, JSON.stringify(result.body));
}
before(async () => {
  await app.ready();
  for (const id of [1, 2])
    await db.runQuery(
      "INSERT INTO users (id,name,email,password_hash,credits) VALUES (?,?,?,?,5)",
      [id, `Teacher ${id}`, `arena${id}@test.example`, "unused"],
    );
  teacher = jwt.sign({ userId: 1, role: "teacher" }, process.env.JWT_SECRET);
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

test("arena validates questions and isolates teachers, rooms and player tokens", async () => {
  assert.throws(() => arena.normalizeQuestions([null, null]));
  assert.throws(() =>
    arena.normalizeQuestions([
      { question: "x", options: ["a", "b", "c", "d"], correct: "AB" },
      {},
    ]),
  );
  assert.equal(
    (await request("/games", null, "POST", { demo: true })).status,
    401,
  );
  assert.equal(
    (
      await request("/games", teacher, "POST", {
        demo: true,
        padding: "x".repeat(17000),
      })
    ).status,
    413,
  );
  const code = await create();
  const player = await join(code, "Ayan");
  assert.equal((await request(`/games/${code}/state`)).status, 401);
  assert.equal((await request(`/games/${code}/state`, other)).status, 404);
  assert.equal(
    (
      await request(`/games/${code}/control`, other, "POST", {
        action: "start",
      })
    ).status,
    404,
  );
  assert.equal(
    (await request(`/games/${code}/report`, player.token)).status,
    403,
  );
  assert.equal(
    (
      await request(`/games/${code}/control`, player.token, "POST", {
        action: "start",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("/games/FFFFFF/state", player.token)).status,
    403,
  );
  await control(code, "finish");
});

test("joining is balanced and idempotent, the lobby locks on start and hidden answers never leak", async () => {
  const code = await create(),
    key = crypto.randomUUID();
  const p = await join(code, "Ayan", key);
  await join(code, "Ayan", key);
  await join(code, "Aru");
  assert.equal(
    (
      await request(`/games/${code}/join`, null, "POST", {
        name: "Ayan",
        clientKey: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  const lobby = (await request(`/games/${code}/state`, teacher)).body;
  assert.equal(lobby.players.length, 2);
  assert.deepEqual(lobby.players.map((p) => p.team).sort(), [0, 1]);
  await control(code, "start");
  const state = (await request(`/games/${code}/state`, p.token)).body;
  assert.equal(state.question.options.length, 4);
  assert.equal(state.question.correct, undefined);
  assert.equal(state.questions, undefined);
  assert.equal(state.players[0].client_key, undefined);
  assert.equal(
    (
      await request(`/games/${code}/join`, null, "POST", {
        name: "Late student",
        clientKey: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  await join(code, "Ayan", key);
  await control(code, "finish");
});

test("parallel answers and strikes award points and damage once and survive a fresh snapshot", async () => {
  const code = await create();
  const p = await join(code, "Ayan"),
    q = await join(code, "Aru");
  await control(code, "start");
  const answers = await Promise.all(
    Array.from({ length: 8 }, () =>
      request(`/games/${code}/answer`, p.token, "POST", {
        roundIndex: 0,
        answerIndex: 0,
        score: 999999,
      }),
    ),
  );
  assert.ok(answers.every((r) => r.status === 200));
  const strikes = await Promise.all(
    Array.from({ length: 8 }, () =>
      request(`/games/${code}/attack`, p.token, "POST", {
        roundIndex: 0,
        kind: "burst",
        damage: 10000,
      }),
    ),
  );
  assert.equal(strikes.filter((r) => r.status === 200).length, 1);
  arena.invalidate(code);
  const state = (await request(`/games/${code}/state`, p.token)).body;
  assert.deepEqual(state.health, [100, 82]);
  assert.equal(state.me.attackReady, false);
  assert.equal(state.me.correct, true);
  assert.equal(state.players.find((x) => x.id === state.me.id).score, 120);
  await request(`/games/${code}/answer`, q.token, "POST", {
    roundIndex: 0,
    answerIndex: 3,
  });
  assert.equal(
    (
      await request(`/games/${code}/attack`, q.token, "POST", {
        roundIndex: 0,
        kind: "strike",
      })
    ).status,
    409,
  );
  await control(code, "next");
  assert.equal(
    (
      await request(`/games/${code}/control`, teacher, "POST", {
        action: "next",
        roundIndex: 0,
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/games/${code}/answer`, p.token, "POST", {
        roundIndex: 0,
        answerIndex: 3,
      })
    ).body.correct,
    true,
  );
  assert.equal(
    (
      await request(`/games/${code}/attack`, p.token, "POST", {
        roundIndex: 0,
        kind: "strike",
      })
    ).status,
    409,
  );
  await control(code, "finish");
  const report = (await request(`/games/${code}/report`, teacher)).body;
  assert.equal(report.players.find((x) => x.name === "Ayan").score, 120);
});

test("pause freezes the server timer, expiry advances once and the final question ends the match", async () => {
  const code = await create(),
    p = await join(code, "Ayan");
  await join(code, "Aru");
  await control(code, "start");
  await control(code, "pause");
  const paused = (await request(`/games/${code}/state`, p.token)).body;
  assert.equal(paused.status, "paused");
  assert.ok(paused.remainingMs > 0);
  assert.equal(
    (
      await request(`/games/${code}/answer`, p.token, "POST", {
        roundIndex: 0,
        answerIndex: 0,
      })
    ).status,
    409,
  );
  await control(code, "resume");
  await db.runQuery("UPDATE game_rooms SET deadline=? WHERE code=?", [
    Date.now() - 10,
    code,
  ]);
  arena.invalidate(code);
  const states = await Promise.all(
    Array.from({ length: 20 }, () => request(`/games/${code}/state`, p.token)),
  );
  assert.ok(states.every((s) => s.body.roundIndex === 1));
  await db.runQuery(
    "UPDATE game_rooms SET round_index=9,deadline=? WHERE code=?",
    [Date.now() - 10, code],
  );
  arena.invalidate(code);
  const result = (await request(`/games/${code}/state`, p.token)).body;
  assert.equal(result.status, "finished");
  assert.equal(result.winner, null);
});

test("excluded pupils cannot resume with old credentials", async () => {
  const code = await create(),
    p = await join(code, "Ayan");
  const state = (await request(`/games/${code}/state`, p.token)).body;
  await control(code, "kick", { playerId: state.me.id });
  assert.equal((await request(`/games/${code}/state`, p.token)).status, 403);
  assert.equal(
    (
      await request(`/games/${code}/join`, null, "POST", {
        name: "Ayan",
        clientKey: p.key,
      })
    ).status,
    403,
  );
  await control(code, "finish");
});

test("30 simultaneous classroom clients keep every answer, balanced damage and responsive snapshots", async () => {
  const code = await create();
  const start = performance.now();
  const players = await Promise.all(
    Array.from({ length: 30 }, (_, i) => join(code, `Student ${i + 1}`)),
  );
  await control(code, "start");
  const answers = await Promise.all(
    players.map((p) =>
      request(`/games/${code}/answer`, p.token, "POST", {
        roundIndex: 0,
        answerIndex: 0,
      }),
    ),
  );
  assert.ok(answers.every((a) => a.status === 200));
  const strikes = await Promise.all(
    players.map((p) =>
      request(`/games/${code}/attack`, p.token, "POST", {
        roundIndex: 0,
        kind: "strike",
      }),
    ),
  );
  assert.ok(strikes.every((a) => a.status === 200));
  const latencies = [];
  const snapshots = await Promise.all(
    Array.from({ length: 300 }, async (_, i) => {
      const before = performance.now();
      const r = await request(`/games/${code}/state`, players[i % 30].token);
      latencies.push(performance.now() - before);
      return r;
    }),
  );
  assert.ok(
    snapshots.every(
      (s) =>
        s.status === 200 &&
        s.body.players.length === 30 &&
        s.body.health[0] === 82 &&
        s.body.health[1] === 82,
    ),
  );
  const state = snapshots[0].body;
  assert.equal(state.events.length, 30);
  assert.equal(new Set(state.events.map((e) => e.id)).size, 30);
  assert.equal(
    state.players.reduce((n, p) => n + p.score, 0),
    3600,
  );
  latencies.sort((a, b) => a - b);
  console.log(
    JSON.stringify({
      arenaClassroom: {
        clients: 30,
        snapshotBurst: 300,
        localP95ms: Math.round(latencies[Math.floor(latencies.length * 0.95)]),
        totalMs: Math.round(performance.now() - start),
      },
    }),
  );
  await control(code, "finish");
});

test("malformed AI output is not charged and valid questions can be used in a game", async () => {
  const before = (await db.getOne("SELECT credits FROM users WHERE id=1"))
    .credits;
  assert.equal(
    (
      await request("/quizzes/ai-generate", teacher, "POST", {
        topic: "Fractions",
        question_count: 2,
      })
    ).status,
    500,
  );
  assert.equal(
    (await db.getOne("SELECT credits FROM users WHERE id=1")).credits,
    before,
  );
  const data = arena
    .demoQuestions("ru")
    .slice(0, 2)
    .map((q) => ({ ...q, correct: "ABCD"[q.correct] }));
  aiResponse = JSON.stringify(data);
  const generated = await request("/quizzes/ai-generate", teacher, "POST", {
    topic: "Fractions",
    question_count: 2,
  });
  assert.equal(generated.status, 200);
  assert.equal(
    (await db.getOne("SELECT credits FROM users WHERE id=1")).credits,
    before - 2,
  );
  const quiz = await request("/quizzes", teacher, "POST", {
    title: "Fractions",
    questions: generated.body.questions,
  });
  assert.equal(
    (await request("/games", other, "POST", { quizId: quiz.body.id })).status,
    404,
  );
  const room = await create({ demo: false, quizId: quiz.body.id });
  await control(room, "finish");
});

test("room creation is idempotent and caps active rooms without spending credits", async () => {
  const key = crypto.randomUUID();
  const first = await create({ requestKey: key });
  assert.equal(await create({ requestKey: key }), first);
  const rooms = [first, await create(), await create()];
  assert.equal(
    (await request("/games", teacher, "POST", { demo: true })).status,
    409,
  );
  for (const code of rooms) await control(code, "finish");
});

test("lobby capacity is enforced at forty and an odd class has balanced total damage", async () => {
  const code = await create();
  await Promise.all(
    Array.from({ length: 40 }, (_, i) => join(code, `Pupil ${i + 1}`)),
  );
  assert.equal(
    (
      await request(`/games/${code}/join`, null, "POST", {
        name: "Extra pupil",
        clientKey: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  await control(code, "finish");
  const odd = await create();
  const pupils = await Promise.all(
    Array.from({ length: 15 }, (_, i) => join(odd, `Pupil ${i + 1}`)),
  );
  await control(odd, "start");
  await Promise.all(
    pupils.map((p) =>
      request(`/games/${odd}/answer`, p.token, "POST", {
        roundIndex: 0,
        answerIndex: 0,
      }),
    ),
  );
  await Promise.all(
    pupils.map((p) =>
      request(`/games/${odd}/attack`, p.token, "POST", {
        roundIndex: 0,
        kind: "kick",
      }),
    ),
  );
  const state = (await request(`/games/${odd}/state`, pupils[0].token)).body;
  assert.deepEqual(state.health, [82, 82]);
  await control(odd, "finish");
});

test("a separate server process reopens the saved game and scores", async () => {
  const row = await db.getOne(
    "SELECT r.code FROM game_rooms r WHERE EXISTS(SELECT 1 FROM game_players p WHERE p.room_id=r.id AND p.score>0) ORDER BY r.id DESC LIMIT 1",
  );
  const output = execFileSync(
    process.execPath,
    [
      "-e",
      `(async()=>{const app=require('./server/index');await app.ready();const db=require('./server/db/database');const row=await db.getOne('SELECT status,(SELECT SUM(score) FROM game_players WHERE room_id=r.id) AS score FROM game_rooms r WHERE code=?',[${JSON.stringify(row.code)}]);console.log('PERSIST:'+JSON.stringify(row));(await db.getDatabase()).close();})().catch(e=>{console.error(e);process.exit(1)})`,
    ],
    {
      cwd: require("node:path").resolve(__dirname, "../.."),
      env: process.env,
      encoding: "utf8",
    },
  );
  assert.equal(
    JSON.parse(
      output
        .split("\n")
        .find((line) => line.startsWith("PERSIST:"))
        .slice(8),
    ).status,
    "finished",
  );
  const restored = JSON.parse(
    output
      .split("\n")
      .find((line) => line.startsWith("PERSIST:"))
      .slice(8),
  );
  assert.equal(restored.score, 1800);
});
