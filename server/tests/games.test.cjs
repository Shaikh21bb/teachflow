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
let server, base, teacher, other, persistedModeCode;
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
  await new Promise((resolve, reject) => {
    server = app.listen(0, "127.0.0.1", resolve);
    server.once("error", reject);
  });
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
        padding: "x".repeat(70000),
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

test("board mode starts immediately with two local teams and host-only alternating play", async () => {
  assert.equal(
    (
      await request("/games", teacher, "POST", {
        demo: true,
        language: "ru",
        playMode: "couch",
      })
    ).status,
    400,
  );

  const requestKey = crypto.randomUUID();
  const payload = {
    demo: true,
    mode: "arena",
    language: "ru",
    playMode: "board",
    requestKey,
  };
  const created = await request("/games", teacher, "POST", payload);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.playMode, "board");
  const code = created.body.code;
  const replayed = await request("/games", teacher, "POST", payload);
  assert.equal(replayed.status, 201, JSON.stringify(replayed.body));
  assert.deepEqual(replayed.body, created.body);

  const initial = (await request(`/games/${code}/state`, teacher)).body;
  assert.equal(initial.playMode, "board");
  assert.equal(initial.status, "running");
  assert.equal(initial.activeTeam, 0);
  assert.equal(initial.players.length, 2);
  assert.deepEqual(
    initial.boardTeams.map((team) => team.team).sort(),
    [0, 1],
  );
  assert.ok(initial.boardTeams.every((team) => !team.hasAnswered));
  assert.equal(
    (await db.getOne("SELECT COUNT(*) AS n FROM game_players WHERE room_id=(SELECT id FROM game_rooms WHERE code=?)", [code])).n,
    2,
  );
  assert.equal(
    (
      await request(`/games/${code}/join`, null, "POST", {
        name: "Remote pupil",
        clientKey: crypto.randomUUID(),
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/games/${code}/board-answer`, other, "POST", {
        team: 0,
        roundIndex: 0,
        answerIndex: 0,
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await request(`/games/${code}/board-answer`, teacher, "POST", {
        team: 1,
        roundIndex: 0,
        answerIndex: 0,
      })
    ).status,
    409,
  );

  const answered = await request(
    `/games/${code}/board-answer`,
    teacher,
    "POST",
    { team: 0, roundIndex: 0, answerIndex: 0 },
  );
  assert.equal(answered.status, 200, JSON.stringify(answered.body));
  assert.equal(answered.body.correct, true);
  const replayedAnswer = await request(
    `/games/${code}/board-answer`,
    teacher,
    "POST",
    { team: 0, roundIndex: 0, answerIndex: 3 },
  );
  assert.deepEqual(replayedAnswer.body, { correct: true, answerIndex: 0 });
  arena.invalidate(code);
  const afterAnswer = (await request(`/games/${code}/state`, teacher)).body;
  assert.equal(afterAnswer.boardTeams.find((team) => team.team === 0).correct, true);
  assert.equal(
    afterAnswer.boardTeams.find((team) => team.team === 0).actionReady,
    true,
  );

  const action = await request(
    `/games/${code}/board-action`,
    teacher,
    "POST",
    { team: 0, roundIndex: 0, kind: "burst" },
  );
  assert.equal(action.status, 200, JSON.stringify(action.body));
  arena.invalidate(code);
  assert.deepEqual(
    (await request(`/games/${code}/state`, teacher)).body.health,
    [100, 82],
  );
  assert.equal(
    (
      await request(`/games/${code}/board-action`, teacher, "POST", {
        team: 0,
        roundIndex: 0,
        kind: "burst",
      })
    ).status,
    409,
  );

  await control(code, "next", { roundIndex: 0 });
  arena.invalidate(code);
  const secondRound = (await request(`/games/${code}/state`, teacher)).body;
  assert.equal(secondRound.roundIndex, 1);
  assert.equal(secondRound.activeTeam, 1);
  assert.ok(secondRound.boardTeams.every((team) => !team.hasAnswered));
  const delayedRetry = await request(
    `/games/${code}/board-answer`,
    teacher,
    "POST",
    { team: 0, roundIndex: 0, answerIndex: 3 },
  );
  assert.equal(delayedRetry.status, 200, JSON.stringify(delayedRetry.body));
  assert.deepEqual(delayedRetry.body, { correct: true, answerIndex: 0 });
  assert.equal(
    (
      await request(`/games/${code}/board-answer`, teacher, "POST", {
        team: 0,
        roundIndex: 1,
        answerIndex: 2,
      })
    ).status,
    409,
  );
  const secondAnswer = await request(
    `/games/${code}/board-answer`,
    teacher,
    "POST",
    { team: 1, roundIndex: 1, answerIndex: 2 },
  );
  assert.equal(secondAnswer.status, 200, JSON.stringify(secondAnswer.body));
  assert.equal(secondAnswer.body.correct, true);

  const listed = (await request("/games", teacher)).body;
  assert.equal(listed.find((room) => room.code === code).playMode, "board");
  const report = (await request(`/games/${code}/report`, teacher)).body;
  assert.equal(report.playMode, "board");
  await control(code, "finish");

  const multiplayer = await create();
  assert.equal(
    (await request(`/games/${multiplayer}/state`, teacher)).body.playMode,
    "multiplayer",
  );
  assert.equal(
    (
      await request(`/games/${multiplayer}/board-answer`, teacher, "POST", {
        team: 0,
        roundIndex: 0,
        answerIndex: 0,
      })
    ).status,
    409,
  );
  await control(multiplayer, "finish");
});

test("odd board quizzes normalize passive, action and Arena opportunities", async () => {
  const questions = Array.from({ length: 5 }, (_, index) => ({
    question: `Board question ${index + 1}`,
    options: ["Correct", "Wrong A", "Wrong B", "Wrong C"],
    correct: 0,
  }));
  const quiz = await request("/quizzes", teacher, "POST", {
    title: "Odd board quiz",
    questions,
  });
  assert.equal(quiz.status, 201, JSON.stringify(quiz.body));

  const cases = [
    { mode: "arena", action: "strike", progress: [90, 90] },
    { mode: "circuit", action: "charge", progress: [100, 100] },
    { mode: "word", action: null, progress: [100, 100] },
  ];
  for (const scenario of cases) {
    const payload =
      scenario.mode === "word"
        ? {
            mode: "word",
            playMode: "board",
            language: "ru",
            title: "Odd board words",
            questions,
          }
        : {
            mode: scenario.mode,
            playMode: "board",
            language: "ru",
            demo: false,
            quizId: quiz.body.id,
          };
    const created = await request("/games", teacher, "POST", payload);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const code = created.body.code;
    for (let roundIndex = 0; roundIndex < questions.length; roundIndex += 1) {
      const team = roundIndex % 2;
      const answer = await request(
        `/games/${code}/board-answer`,
        teacher,
        "POST",
        { team, roundIndex, answerIndex: 0 },
      );
      assert.equal(answer.status, 200, JSON.stringify(answer.body));
      assert.equal(answer.body.correct, true);
      if (scenario.action) {
        const action = await request(
          `/games/${code}/board-action`,
          teacher,
          "POST",
          { team, roundIndex, kind: scenario.action },
        );
        assert.equal(action.status, 200, JSON.stringify(action.body));
      }
      if (roundIndex + 1 < questions.length)
        await control(code, "next", { roundIndex });
    }
    arena.invalidate(code);
    const beforeFinish = (await request(`/games/${code}/state`, teacher)).body;
    assert.deepEqual(beforeFinish.progress, scenario.progress);
    if (scenario.mode === "arena") assert.deepEqual(beforeFinish.health, [10, 10]);
    await control(code, "next", { roundIndex: questions.length - 1 });
    arena.invalidate(code);
    const finished = (await request(`/games/${code}/state`, teacher)).body;
    assert.equal(finished.status, "finished");
    assert.equal(finished.winner, null);
  }
});

test("arena, garden and word keep distinct validated mechanics and persisted modes", async () => {
  const wordQuestions = ["cell", "organ", "tissue", "gene"].map(
    (term, index, terms) => ({
      question: `What is ${term}?`,
      options: terms.map((value) => `${value} definition`),
      correct: index,
    }),
  );
  assert.equal(
    (
      await request("/games", teacher, "POST", {
        demo: true,
        mode: "unknown",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/games", teacher, "POST", {
        demo: true,
        quizId: 999,
        mode: "arena",
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/games", teacher, "POST", {
        mode: "arena",
        questions: wordQuestions,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/games", teacher, "POST", {
        demo: false,
        mode: "word",
        title: "Too short",
        questions: wordQuestions.slice(0, 3),
      })
    ).status,
    400,
  );

  const garden = await create({ mode: "garden" });
  const gardenA = await join(garden, "Garden A");
  await join(garden, "Garden B");
  await control(garden, "start");
  await request(`/games/${garden}/answer`, gardenA.token, "POST", {
    roundIndex: 0,
    answerIndex: 0,
  });
  assert.equal(
    (
      await request(`/games/${garden}/action`, gardenA.token, "POST", {
        roundIndex: 0,
        kind: "water",
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(`/games/${garden}/action`, gardenA.token, "POST", {
        roundIndex: 0,
        kind: "water",
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request(`/games/${garden}/attack`, gardenA.token, "POST", {
        roundIndex: 0,
        kind: "strike",
      })
    ).status,
    409,
  );
  arena.invalidate(garden);
  const gardenState = (
    await request(`/games/${garden}/state`, gardenA.token)
  ).body;
  assert.equal(gardenState.mode, "garden");
  assert.deepEqual(gardenState.health, [100, 100]);
  assert.deepEqual(gardenState.progress, [10, 0]);
  await control(garden, "finish");
  assert.equal(
    (await request(`/games/${garden}/state`, gardenA.token)).body.winner,
    0,
  );

  const wordCreated = await request("/games", teacher, "POST", {
    demo: false,
    mode: "word",
    title: "Biology words",
    language: "ru",
    questions: wordQuestions,
  });
  assert.equal(wordCreated.status, 201, JSON.stringify(wordCreated.body));
  assert.equal(wordCreated.body.mode, "word");
  const word = wordCreated.body.code;
  persistedModeCode = word;
  const wordA = await join(word, "Word A");
  await join(word, "Word B");
  await control(word, "start");
  await request(`/games/${word}/answer`, wordA.token, "POST", {
    roundIndex: 0,
    answerIndex: 0,
  });
  arena.invalidate(word);
  const wordState = (await request(`/games/${word}/state`, wordA.token)).body;
  assert.equal(wordState.mode, "word");
  assert.deepEqual(wordState.progress, [25, 0]);
  assert.equal(wordState.me.attackReady, false);
  assert.equal(wordState.question.correct, undefined);
  assert.equal(
    (
      await request(`/games/${word}/action`, wordA.token, "POST", {
        roundIndex: 0,
        kind: "boost",
      })
    ).status,
    409,
  );
  await control(word, "finish");
  const wordReport = (await request(`/games/${word}/report`, teacher)).body;
  assert.equal(wordReport.mode, "word");
  assert.equal(
    (await request(`/games/${word}/state`, wordA.token)).body.winner,
    0,
  );

  const listed = (await request("/games", teacher)).body;
  assert.equal(listed.find((room) => room.code === garden).mode, "garden");
  assert.equal(listed.find((room) => room.code === word).mode, "word");

  const requestKey = crypto.randomUUID();
  const arenaCode = await create({ requestKey });
  assert.equal(
    (
      await request("/games", teacher, "POST", {
        demo: true,
        mode: "garden",
        language: "ru",
        requestKey,
      })
    ).status,
    409,
  );
  await control(arenaCode, "finish");
});

test("new game modes use the registered passive and action-progress rules", async () => {
  assert.deepEqual(Object.keys(arena.MODE_RULES), [
    "arena",
    "garden",
    "word",
    "orbit",
    "tower",
    "circuit",
    "ocean",
  ]);

  for (const mode of ["orbit", "tower"]) {
    const code = await create({ mode });
    const left = await join(code, `${mode} left`);
    await join(code, `${mode} right`);
    await control(code, "start");
    const answer = await request(`/games/${code}/answer`, left.token, "POST", {
      roundIndex: 0,
      answerIndex: 0,
    });
    assert.equal(answer.status, 200, JSON.stringify(answer.body));
    assert.equal(answer.body.correct, true);
    assert.equal(
      (
        await request(`/games/${code}/action`, left.token, "POST", {
          roundIndex: 0,
          kind: "boost",
        })
      ).status,
      409,
    );
    arena.invalidate(code);
    const state = (await request(`/games/${code}/state`, left.token)).body;
    assert.equal(state.mode, mode);
    assert.deepEqual(state.health, [100, 100]);
    assert.deepEqual(state.progress, [10, 0]);
    assert.equal(state.me.attackReady, false);
    await control(code, "finish");
    assert.equal(
      (await request(`/games/${code}/state`, left.token)).body.winner,
      0,
    );
  }

  const actionModes = {
    circuit: ["charge", "connect", "sync"],
    ocean: ["collect", "rescue", "restore"],
  };
  const demoAnswers = arena.demoQuestions("ru").map((question) => question.correct);
  for (const [mode, actions] of Object.entries(actionModes)) {
    const code = await create({ mode });
    const left = await join(code, `${mode} left`);
    await join(code, `${mode} right`);
    await control(code, "start");
    for (let roundIndex = 0; roundIndex < actions.length; roundIndex += 1) {
      const answer = await request(`/games/${code}/answer`, left.token, "POST", {
        roundIndex,
        answerIndex: demoAnswers[roundIndex],
      });
      assert.equal(answer.status, 200, JSON.stringify(answer.body));
      arena.invalidate(code);
      assert.equal(
        (await request(`/games/${code}/state`, left.token)).body.me.attackReady,
        true,
      );
      const action = await request(
        `/games/${code}/action`,
        left.token,
        "POST",
        { roundIndex, kind: actions[roundIndex] },
      );
      assert.equal(action.status, 200, JSON.stringify(action.body));
      if (roundIndex + 1 < actions.length) await control(code, "next");
    }
    assert.equal(
      (
        await request(`/games/${code}/action`, left.token, "POST", {
          roundIndex: actions.length - 1,
          kind: mode === "circuit" ? "collect" : "charge",
        })
      ).status,
      400,
    );
    arena.invalidate(code);
    const state = (await request(`/games/${code}/state`, left.token)).body;
    assert.equal(state.mode, mode);
    assert.deepEqual(state.health, [100, 100]);
    assert.deepEqual(state.progress, [30, 0]);
    assert.equal(state.me.attackReady, false);
    assert.deepEqual(
      state.events.map((event) => event.kind),
      actions,
    );
    await control(code, "finish");
    assert.equal(
      (await request(`/games/${code}/state`, left.token)).body.winner,
      0,
    );
  }
});

test("action progress keeps a non-zero tenth-percent step for forty players and twenty questions", async () => {
  const questions = Array.from({ length: 20 }, (_, index) => ({
    question: `Scale question ${index + 1}`,
    options: ["Correct", "Wrong A", "Wrong B", "Wrong C"],
    correct: 0,
  }));
  const quiz = await request("/quizzes", teacher, "POST", {
    title: "Action progress scale",
    questions,
  });
  assert.equal(quiz.status, 201, JSON.stringify(quiz.body));
  const code = await create({
    demo: false,
    mode: "circuit",
    quizId: quiz.body.id,
  });
  const players = await Promise.all(
    Array.from({ length: 40 }, (_, index) =>
      join(code, `Scale ${index + 1}`),
    ),
  );
  await control(code, "start");
  const answer = await request(
    `/games/${code}/answer`,
    players[0].token,
    "POST",
    { roundIndex: 0, answerIndex: 0 },
  );
  assert.equal(answer.status, 200, JSON.stringify(answer.body));
  const action = await request(
    `/games/${code}/action`,
    players[0].token,
    "POST",
    { roundIndex: 0, kind: "charge" },
  );
  assert.equal(action.status, 200, JSON.stringify(action.body));
  arena.invalidate(code);
  const state = (await request(`/games/${code}/state`, players[0].token)).body;
  assert.equal(state.lastEvent.damage, 0.3);
  assert.deepEqual(state.progress, [0.3, 0]);
  await control(code, "finish");
});

test("word accepts a twenty-pair payload near the UI field limits", async () => {
  const definitions = Array.from({ length: 20 }, (_, index) =>
    `${"определение".repeat(20)} ${index}`.slice(0, 240),
  );
  const questions = Array.from({ length: 20 }, (_, index) => {
    const term = `${"термин".repeat(16)} ${index}`.slice(0, 112);
    return {
      question: `Что означает «${term}»?`,
      options: [0, 1, 2, 3].map(
        (offset) => definitions[(index + offset) % definitions.length],
      ),
      correct: 0,
      explanation: definitions[index],
    };
  });
  const payload = {
    mode: "word",
    language: "ru",
    title: "Большой словарь",
    questions,
  };
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) > 45 * 1024);
  const created = await request("/games", teacher, "POST", payload);
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const state = (
    await request(`/games/${created.body.code}/state`, teacher)
  ).body;
  assert.equal(state.mode, "word");
  assert.equal(state.questionCount, 20);
  await control(created.body.code, "finish");
});

test("word auto-finish normalizes unequal teams and preserves ties", async () => {
  const questions = ["cell", "organ", "tissue", "gene"].map(
    (term, index, terms) => ({
      question: `What is ${term}?`,
      options: terms.map((value) => `${value} definition`),
      correct: index,
    }),
  );
  async function createWord(title) {
    const created = await request("/games", teacher, "POST", {
      mode: "word",
      language: "ru",
      title,
      questions,
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    return created.body.code;
  }
  async function expireFinalRound(code, token) {
    await db.runQuery(
      "UPDATE game_rooms SET round_index=3,deadline=? WHERE code=?",
      [Date.now() - 10, code],
    );
    arena.invalidate(code);
    return (await request(`/games/${code}/state`, token)).body;
  }

  const unequal = await createWord("Unequal word teams");
  const leftA = await join(unequal, "Left A");
  const right = await join(unequal, "Right");
  const leftB = await join(unequal, "Left B");
  await control(unequal, "start");
  for (const [player, answerIndex] of [
    [leftA, 0],
    [right, 0],
    [leftB, 1],
  ]) {
    const answered = await request(
      `/games/${unequal}/answer`,
      player.token,
      "POST",
      { roundIndex: 0, answerIndex },
    );
    assert.equal(answered.status, 200, JSON.stringify(answered.body));
  }
  const unequalResult = await expireFinalRound(unequal, leftA.token);
  assert.equal(unequalResult.status, "finished");
  assert.deepEqual(unequalResult.progress, [12.5, 25]);
  assert.equal(unequalResult.winner, 1);

  const tied = await createWord("Tied word teams");
  const tieLeft = await join(tied, "Tie Left");
  const tieRight = await join(tied, "Tie Right");
  await control(tied, "start");
  for (const player of [tieLeft, tieRight]) {
    const answered = await request(
      `/games/${tied}/answer`,
      player.token,
      "POST",
      { roundIndex: 0, answerIndex: 0 },
    );
    assert.equal(answered.status, 200, JSON.stringify(answered.body));
  }
  const tiedResult = await expireFinalRound(tied, tieLeft.token);
  assert.equal(tiedResult.status, "finished");
  assert.deepEqual(tiedResult.progress, [25, 25]);
  assert.equal(tiedResult.winner, null);
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
      `(async()=>{const app=require('./server/index');await app.ready();const db=require('./server/db/database');const row=await db.getOne('SELECT status,(SELECT SUM(score) FROM game_players WHERE room_id=r.id) AS score FROM game_rooms r WHERE code=?',[${JSON.stringify(row.code)}]);const mode=await db.getOne('SELECT mode FROM game_rooms WHERE code=?',[${JSON.stringify(persistedModeCode)}]);console.log('PERSIST:'+JSON.stringify(row));console.log('MODE:'+JSON.stringify(mode));(await db.getDatabase()).close();})().catch(e=>{console.error(e);process.exit(1)})`,
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
  assert.equal(
    JSON.parse(
      output
        .split("\n")
        .find((line) => line.startsWith("MODE:"))
        .slice(5),
    ).mode,
    "word",
  );
});
