import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const gameModes = [
  { id: "arena", name: "Арена знаний", stage: ".pixel-arena" },
  {
    id: "garden",
    name: "Сад знаний",
    stage: "[data-testid='garden-stage']",
  },
  {
    id: "word",
    name: "Словарный спринт",
    stage: "[data-testid='word-stage']",
  },
  {
    id: "orbit",
    name: "Орбитальная гонка",
    stage: "[data-testid='orbit-stage']",
  },
  {
    id: "tower",
    name: "Башня знаний",
    stage: "[data-testid='tower-stage']",
  },
  {
    id: "circuit",
    name: "Энергосеть",
    stage: "[data-testid='circuit-stage']",
  },
  {
    id: "ocean",
    name: "Хранители океана",
    stage: "[data-testid='ocean-stage']",
  },
];

const expandedModes = [
  {
    id: "orbit",
    createLabel: "Запустить миссию",
    title: "Орбитальная гонка",
  },
  {
    id: "tower",
    createLabel: "Построить башню",
    title: "Башня знаний",
  },
  {
    id: "circuit",
    createLabel: "Запустить сеть",
    title: "Энергосеть",
    action: "charge",
  },
  {
    id: "ocean",
    createLabel: "Спасти океан",
    title: "Спасение океана",
    action: "collect",
  },
];

async function teacherLogin(page, request) {
  const response = await request.post("/api/auth/login", {
    data: { email: "teacher@test.example", password: "Testing12345" },
  });
  expect(response.ok()).toBeTruthy();
  const credentials = await response.json();
  await page.addInitScript((credentials) => {
    localStorage.setItem("auth_token", credentials.token);
    localStorage.setItem("auth_refresh_token", credentials.refreshToken);
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
    localStorage.setItem("urpaq_welcome_seen", "true");
  }, credentials);
  return credentials;
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(2);
}

async function finishRoom(request, teacher, code) {
  if (!code) return;
  await request.post(`/api/games/${code}/control`, {
    headers: { Authorization: `Bearer ${teacher.token}` },
    data: { action: "finish" },
  });
}

async function openCreateFor(page, mode, playMode = "multiplayer") {
  const catalog = page.getByTestId("game-catalog");
  const card = catalog.locator(`[data-game-mode="${mode}"]`);
  await card
    .getByRole("button", {
      name: playMode === "board" ? "Играть на доске" : "С телефонами",
      exact: true,
    })
    .click();
  const form = page.locator(`.game-create[data-game-mode="${mode}"]`);
  await expect(form).toBeVisible();
  await expect(
    form.getByRole("button", {
      name:
        playMode === "board"
          ? /На электронной доске/
          : /С телефонами/,
    }),
  ).toHaveAttribute("aria-pressed", "true");
  return form;
}

test("board play starts immediately, keeps turns on reload, and leaves multiplayer available", async ({
  page,
  request,
}) => {
  test.setTimeout(75000);
  const teacher = await teacherLogin(page, request);
  const created = [];

  try {
    await page.goto("/games");
    await page
      .getByRole("button", { name: "Быстрый старт", exact: true })
      .click();
    await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
    const quickCode = page.url().split("/").pop();
    created.push(quickCode);
    await expect(
      page.locator("main[data-game-mode='arena'][data-play-mode='board']"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "6 × 7 = ?", exact: true }),
    ).toBeVisible();

    await page.goto("/games");
    const form = await openCreateFor(page, "arena", "board");
    await expect(
      form.getByRole("button", { name: /На электронной доске/ }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(
      form.getByRole("button", { name: /С телефонами/ }),
    ).toHaveAttribute("aria-pressed", "false");
    await expect(form.getByRole("note")).toContainText(
      "Один экран — две команды",
    );
    await form
      .getByRole("combobox", { name: "Секунд на вопрос", exact: true })
      .selectOption("120");
    await form
      .getByRole("button", { name: "Играть на доске", exact: true })
      .click();

    await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
    const boardCode = page.url().split("/").pop();
    created.push(boardCode);
    const board = page.locator(
      "main[data-game-mode='arena'][data-play-mode='board']",
    );
    await expect(board).toBeVisible();
    await expect(board.locator(".arena-board-badge")).toContainText(
      "Электронная доска",
    );
    await expect(
      board.getByRole("heading", { name: "6 × 7 = ?", exact: true }),
    ).toBeVisible();
    await expect(board.locator(".arena-board-turn-title strong")).toHaveText(
      "Бірлік",
    );
    await expect(board.locator(".arena-room-code")).toHaveCount(0);
    await expect(board.locator(".arena-qr")).toHaveCount(0);
    await expect(board.locator(".arena-lobby")).toHaveCount(0);

    const initialState = await request.get(`/api/games/${boardCode}/state`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
    });
    expect(initialState.ok()).toBeTruthy();
    expect(await initialState.json()).toMatchObject({
      playMode: "board",
      status: "running",
      roundIndex: 0,
      activeTeam: 0,
    });

    await page.keyboard.press("1");
    await expect(board.getByText("Верно! Выберите действие")).toBeVisible();
    await board.getByRole("button", { name: "Пауза", exact: true }).click();
    await expect(
      board.getByRole("button", { name: "Продолжить", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("q");
    const pausedState = await request.get(`/api/games/${boardCode}/state`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
    });
    expect(pausedState.ok()).toBeTruthy();
    expect(await pausedState.json()).toMatchObject({
      status: "paused",
      health: [100, 100],
      boardTeams: [{ actionReady: true }, { actionReady: false }],
    });
    await board
      .getByRole("button", { name: "Продолжить", exact: true })
      .click();
    await expect(
      board.getByRole("button", { name: "Пауза", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("q");
    await expect(board.getByText("Верно! Команда продвинулась")).toBeVisible();
    await expect(
      board.getByRole("progressbar", { name: "Жалын HP" }),
    ).toHaveAttribute("aria-valuenow", "82");

    await page.reload();
    await expect(
      page.locator(".arena-option[data-answer-index='0']"),
    ).toHaveClass(/correct/);
    await expect(
      page.getByRole("progressbar", { name: "Жалын HP" }),
    ).toHaveAttribute("aria-valuenow", "82");
    await expect(page.getByText("Верно! Команда продвинулась")).toBeVisible();

    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("heading", { name: "144 ÷ 12 = ?", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".arena-board-turn-title strong")).toHaveText(
      "Жалын",
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "144 ÷ 12 = ?", exact: true }),
    ).toBeVisible();
    await expect(page.locator(".arena-board-turn-title strong")).toHaveText(
      "Жалын",
    );

    await page.goto("/games");
    const history = page.locator(`[data-room-code="${boardCode}"]`);
    await expect(history).toBeVisible();
    await expect(history).toContainText("Электронная доска · 2 команды");

    const multiplayerForm = await openCreateFor(
      page,
      "arena",
      "multiplayer",
    );
    await multiplayerForm
      .getByRole("button", { name: "Создать комнату", exact: true })
      .click();
    await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
    const multiplayerCode = page.url().split("/").pop();
    created.push(multiplayerCode);
    const multiplayer = page.locator(
      "main[data-game-mode='arena'][data-play-mode='multiplayer']",
    );
    await expect(multiplayer.locator(".arena-lobby")).toBeVisible();
    await expect(
      multiplayer.getByRole("heading", {
        name: "Ожидаем участников",
        exact: true,
      }),
    ).toBeVisible();
    await expect(multiplayer.locator(".arena-room-code")).toContainText(
      multiplayerCode,
    );
  } finally {
    await Promise.all(
      created.map((code) => finishRoom(request, teacher, code)),
    );
  }
});

test("catalog creates persisted garden and word rooms with their own stages", async ({
  page,
  request,
  browser,
  baseURL,
}, testInfo) => {
  const teacher = await teacherLogin(page, request);
  const created = [];
  const studentContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  await studentContext.addInitScript(() => {
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
  });
  const student = await studentContext.newPage();
  try {
    await page.goto("/games");
    const catalog = page.getByTestId("game-catalog");
    await expect(catalog.locator("[data-game-mode]")).toHaveCount(gameModes.length);
    for (const mode of gameModes) {
      const card = catalog.locator(`[data-game-mode="${mode.id}"]`);
      await expect(card).toBeVisible();
      await expect(
        card.getByRole("heading", { name: mode.name, exact: true }),
      ).toBeVisible();
      await expect(card.locator(mode.stage)).toBeVisible();
    }
    await noOverflow(page);

    await openCreateFor(page, "garden");
    await page.getByRole("button", { name: "Создать комнату", exact: true }).click();
    await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
    const gardenCode = page.url().split("/").pop();
    created.push(gardenCode);
    await expect(page.locator("main[data-game-mode='garden']")).toBeVisible();
    await expect(page.getByTestId("garden-stage")).toBeVisible();
    const gardenState = await request.get(`/api/games/${gardenCode}/state`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
    });
    expect(gardenState.ok()).toBeTruthy();
    expect((await gardenState.json()).mode).toBe("garden");

    await student.goto(`/play/${gardenCode}`);
    await student.getByLabel("Твоё имя").fill("Garden A");
    await student
      .getByRole("button", { name: "Присоединиться", exact: true })
      .click();
    const gardenOther = await request.post(`/api/games/${gardenCode}/join`, {
      data: { name: "Garden B", clientKey: crypto.randomUUID() },
    });
    expect(gardenOther.ok()).toBeTruthy();
    await expect(
      page.getByRole("button", { name: "Начать игру", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Начать игру", exact: true })
      .click();
    await expect(student.getByTestId("garden-stage")).toBeVisible();
    await student.locator(".arena-option").nth(0).click();
    await student.getByRole("button", { name: "Полить", exact: true }).click();
    await expect(
      page.getByRole("progressbar", { name: "Солнце рост" }),
    ).toHaveAttribute("aria-valuenow", "10");
    await noOverflow(student);
    await student.screenshot({
      path: `test-results/${testInfo.project.name}-garden-player.png`,
      fullPage: true,
      animations: "disabled",
    });

    await request.post(`/api/games/${gardenCode}/control`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
      data: { action: "finish" },
    });
    await page.goto("/games");
    await openCreateFor(page, "word");
    await page.getByLabel("Название набора", { exact: true }).fill("Biology words");
    await page.getByLabel("Пары слов", { exact: false }).fill(
      "cell = клетка\norgan = орган\ntissue = ткань\ngene = ген",
    );
    await page.getByRole("button", { name: "Создать комнату", exact: true }).click();
    await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
    const wordCode = page.url().split("/").pop();
    created.push(wordCode);
    await expect(page.locator("main[data-game-mode='word']")).toBeVisible();
    await expect(page.getByTestId("word-stage")).toBeVisible();
    const wordState = await request.get(`/api/games/${wordCode}/state`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
    });
    expect(wordState.ok()).toBeTruthy();
    const wordBody = await wordState.json();
    expect(wordBody.mode).toBe("word");
    expect(wordBody.questionCount).toBe(4);

    await student.goto(`/play/${wordCode}`);
    await student.getByLabel("Твоё имя").fill("Word A");
    await student
      .getByRole("button", { name: "Присоединиться", exact: true })
      .click();
    const wordOther = await request.post(`/api/games/${wordCode}/join`, {
      data: { name: "Word B", clientKey: crypto.randomUUID() },
    });
    expect(wordOther.ok()).toBeTruthy();
    await expect(
      page.getByRole("button", { name: "Начать игру", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Начать игру", exact: true })
      .click();
    await expect(student.getByTestId("word-stage")).toBeVisible();
    await student.getByRole("button", { name: /клетка/ }).click();
    await expect(
      page.getByRole("progressbar", { name: "Сапфир путь" }),
    ).toHaveAttribute("aria-valuenow", "25");
    await expect(student.locator(".arena-attack-buttons")).toHaveCount(0);
    await student.reload();
    await expect(student.getByTestId("word-stage")).toBeVisible();
    await expect(
      student.getByRole("progressbar", { name: "Сапфир путь" }),
    ).toHaveAttribute("aria-valuenow", "25");
    await noOverflow(student);
    await student.screenshot({
      path: `test-results/${testInfo.project.name}-word-player.png`,
      fullPage: true,
      animations: "disabled",
    });

    await page.goto("/games");
    await expect(
      page.locator(`[data-room-code="${wordCode}"][data-game-mode="word"]`),
    ).toBeVisible();
    await noOverflow(page);
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-game-catalog-modes.png`,
      fullPage: true,
      animations: "disabled",
    });
  } finally {
    await studentContext.close();
    await Promise.all(
      created.map((code) =>
        request.post(`/api/games/${code}/control`, {
          headers: { Authorization: `Bearer ${teacher.token}` },
          data: { action: "finish" },
        }),
      ),
    );
  }
});

test("all seven catalog modes preserve their exact stage and mechanics", async ({
  page,
  request,
}, testInfo) => {
  test.setTimeout(120000);
  const teacher = await teacherLogin(page, request);
  const created = [];
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    for (const mode of expandedModes) {
      await page.goto("/games");
      const card = page
        .getByTestId("game-catalog")
        .locator(`[data-game-mode="${mode.id}"]`);
      await expect(card).toBeVisible();
      await openCreateFor(page, mode.id);
      await page
        .getByRole("button", { name: "Создать комнату", exact: true })
        .click();
      await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);

      const code = page.url().split("/").pop();
      created.push(code);
      await expect(
        page.locator(`main[data-game-mode="${mode.id}"]`),
      ).toBeVisible();
      await expect(
        page.locator(`[data-testid="${mode.id}-stage"]`),
      ).toBeVisible();

      const stateResponse = await request.get(`/api/games/${code}/state`, {
        headers: { Authorization: `Bearer ${teacher.token}` },
      });
      expect(stateResponse.ok()).toBeTruthy();
      const initialState = await stateResponse.json();
      expect(initialState.mode).toBe(mode.id);
      expect(initialState.title).toBe(mode.title);

      const firstKey = crypto.randomUUID();
      const firstJoin = await request.post(`/api/games/${code}/join`, {
        data: { name: `${mode.id} Alpha`, clientKey: firstKey },
      });
      const secondJoin = await request.post(`/api/games/${code}/join`, {
        data: { name: `${mode.id} Beta`, clientKey: crypto.randomUUID() },
      });
      expect(firstJoin.ok()).toBeTruthy();
      expect(secondJoin.ok()).toBeTruthy();
      const first = await firstJoin.json();

      const started = await request.post(`/api/games/${code}/control`, {
        headers: { Authorization: `Bearer ${teacher.token}` },
        data: { action: "start" },
      });
      expect(started.ok()).toBeTruthy();
      const answered = await request.post(`/api/games/${code}/answer`, {
        headers: { Authorization: `Bearer ${first.token}` },
        data: { roundIndex: 0, answerIndex: 0 },
      });
      expect(answered.ok()).toBeTruthy();
      expect((await answered.json()).correct).toBe(true);

      if (mode.action) {
        const acted = await request.post(`/api/games/${code}/action`, {
          headers: { Authorization: `Bearer ${first.token}` },
          data: { roundIndex: 0, kind: mode.action },
        });
        expect(acted.ok()).toBeTruthy();
      } else {
        const rejected = await request.post(`/api/games/${code}/action`, {
          headers: { Authorization: `Bearer ${first.token}` },
          data: { roundIndex: 0, kind: "strike" },
        });
        expect(rejected.status()).toBe(409);
      }

      const playerStateResponse = await request.get(
        `/api/games/${code}/state`,
        { headers: { Authorization: `Bearer ${first.token}` } },
      );
      expect(playerStateResponse.ok()).toBeTruthy();
      const playerState = await playerStateResponse.json();
      expect(playerState.mode).toBe(mode.id);
      expect(playerState.progress[0]).toBe(10);
      expect(playerState.me.attackReady).toBe(false);
      if (mode.action) expect(playerState.lastEvent.kind).toBe(mode.action);

      await expect(
        page.locator(
          ".arena-team-score.team-0 [role='progressbar']",
        ),
      ).toHaveAttribute("aria-valuenow", "10", { timeout: 10000 });
      if (mode.id === "circuit") {
        await expect(page.locator(".game-stage-event")).toBeVisible();
        await page.reload();
        await expect(page.getByTestId("circuit-stage")).toBeVisible();
        await expect(page.locator(".game-stage-event")).toHaveCount(0);
        const advanced = await request.post(`/api/games/${code}/control`, {
          headers: { Authorization: `Bearer ${teacher.token}` },
          data: { action: "next", roundIndex: 0 },
        });
        expect(advanced.ok()).toBeTruthy();
        await page.reload();
        await expect(page.getByTestId("circuit-stage")).toBeVisible();
        await expect(page.locator(".game-stage-event")).toHaveCount(0);
      }
      await noOverflow(page);

      if (testInfo.project.name === "desktop") {
        await page.screenshot({
          path: `test-results/${mode.id}-host.png`,
          fullPage: true,
          animations: "disabled",
        });
      }
      await finishRoom(request, teacher, code);
      if (!mode.action) {
        await expect(
          page.getByRole("button", { name: "CSV", exact: true }),
        ).toBeVisible({ timeout: 10000 });
        const downloading = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "CSV", exact: true })
          .click();
        const download = await downloading;
        expect(download.suggestedFilename()).toBe(`${mode.id}-${code}.csv`);
        const csv = await readFile(await download.path(), "utf8");
        const columnCounts = csv
          .trim()
          .split(/\r?\n/)
          .map((row) => (row.match(/;/g) || []).length + 1);
        expect(columnCounts.length).toBeGreaterThan(1);
        expect(new Set(columnCounts).size).toBe(1);
        expect(columnCounts[0]).toBe(5);
      }
      await page.goto("/games");
      await expect(
        page.locator(
          `[data-room-code="${code}"][data-game-mode="${mode.id}"]`,
        ),
      ).toBeVisible();
    }
    expect(errors).toEqual([]);
  } finally {
    await Promise.all(
      created.map((code) => finishRoom(request, teacher, code)),
    );
  }
});

test("teacher and phones complete an arena match, reconnect, retain scores and export results", async ({
  page,
  request,
  browser,
  baseURL,
}, testInfo) => {
  test.setTimeout(90000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const teacher = await teacherLogin(page, request);
  await page.goto("/games");
  await expect(
    page.getByRole("heading", { name: "Арена знаний", exact: true }),
  ).toBeVisible();
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-games.png`,
    fullPage: true,
    animations: "disabled",
  });
  await openCreateFor(page, "arena");
  await page
    .getByRole("combobox", { name: "Секунд на вопрос", exact: true })
    .selectOption("60");
  await page
    .getByRole("button", { name: "Создать комнату", exact: true })
    .click();
  await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
  const code = page.url().split("/").pop();
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    serviceWorkers: "block",
  });
  await context.addInitScript(() => {
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
  });
  const phone = await context.newPage();
  phone.on("pageerror", (e) => errors.push(e.message));
  try {
    await phone.goto(`/play/${code}`);
    await phone.getByLabel("Твоё имя").fill("Ayan");
    await phone
      .getByRole("button", { name: "Присоединиться", exact: true })
      .click();
    await expect(
      phone.getByRole("heading", { name: "Ожидаем участников" }),
    ).toBeVisible();
    const other = await request.post(`/api/games/${code}/join`, {
      data: { name: "Aru", clientKey: crypto.randomUUID() },
    });
    expect(other.ok()).toBeTruthy();
    await expect(
      page.getByRole("button", { name: "Начать матч", exact: true }),
    ).toBeEnabled();
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-arena-lobby.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Начать матч", exact: true })
      .click();
    await expect(
      phone.getByRole("heading", { name: "6 × 7 = ?" }),
    ).toBeVisible();
    const colors = await phone.locator("canvas").evaluate((canvas) => {
      const c = canvas.getContext("2d");
      const data = c.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 64)
        colors.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
      return colors.size;
    });
    expect(colors).toBeGreaterThan(25);
    const initial = await phone
      .locator("canvas")
      .evaluate((c) => c.toDataURL());
    await expect
      .poll(() => phone.locator("canvas").evaluate((c) => c.toDataURL()), {
        timeout: 3000,
      })
      .not.toBe(initial);
    const motionToggle = phone.getByRole("button", {
      name: "Анимация",
      exact: true,
    });
    await expect(motionToggle).toHaveAttribute("aria-pressed", "true");
    await motionToggle.click();
    await expect(motionToggle).toHaveAttribute("aria-pressed", "false");
    await phone.waitForTimeout(200);
    const pausedFrame = await phone
      .locator("canvas")
      .evaluate((canvas) => canvas.toDataURL());
    await phone.waitForTimeout(450);
    expect(
      await phone.locator("canvas").evaluate((canvas) => canvas.toDataURL()),
    ).toBe(pausedFrame);
    expect(
      await phone.locator(".arena-shell *").evaluateAll((elements) =>
        elements
          .map((element) => getComputedStyle(element).animationName)
          .filter((name) => name && name !== "none"),
      ),
    ).toEqual([]);
    await motionToggle.click();
    await expect(motionToggle).toHaveAttribute("aria-pressed", "true");
    await phone.locator(".arena-option").nth(0).click();
    await expect(phone.getByText("Правильно!", { exact: false })).toBeVisible();
    const attackBox = await phone
      .getByRole("button", { name: "Импульс", exact: true })
      .boundingBox();
    expect(attackBox.y + attackBox.height).toBeLessThanOrEqual(844);
    await phone.screenshot({
      path: `test-results/${testInfo.project.name}-arena-attack.png`,
      fullPage: false,
      animations: "disabled",
    });
    await phone.getByRole("button", { name: "Импульс", exact: true }).click();
    await expect(
      phone.getByText("Атака выполнена", { exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("progressbar", { name: "Жалын HP" }),
    ).toHaveAttribute("aria-valuenow", "82");
    await noOverflow(phone);
    await noOverflow(page);
    await phone.screenshot({
      path: `test-results/${testInfo.project.name}-arena-phone.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-arena-host.png`,
      fullPage: true,
      animations: "disabled",
    });
    if (testInfo.project.name === "desktop") {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
      try {
        const ms = await page.evaluate(async () => {
          const { renderArena } = await import("/src/games/PixelArena.jsx");
          const canvas = document.createElement("canvas");
          canvas.width = 960;
          canvas.height = 444;
          const ctx = canvas.getContext("2d");
          const start = performance.now();
          for (let i = 0; i < 100; i++) renderArena(ctx, i * 33);
          return (performance.now() - start) / 100;
        });
        console.log(
          JSON.stringify({
            arenaRenderer: {
              cpuThrottle: 4,
              averageFrameMs: Math.round(ms * 100) / 100,
            },
          }),
        );
        expect(ms).toBeLessThan(15);
      } finally {
        await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
        await cdp.detach();
      }
    }
    await page.getByRole("button", { name: "Пауза", exact: true }).click();
    await expect(phone.locator(".arena-stage-notice")).toContainText("Пауза");
    await context.setOffline(true);
    await expect(
      phone.getByText("Восстанавливаем связь…", { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("button", { name: "Продолжить", exact: true }).click();
    await context.setOffline(false);
    await expect(
      phone.getByText("Восстанавливаем связь…", { exact: true }),
    ).not.toBeVisible({ timeout: 15000 });
    await phone.reload();
    await expect(
      phone.getByText("Атака выполнена", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Следующий вопрос", exact: true })
      .click();
    await expect(
      phone.getByRole("heading", { name: "144 ÷ 12 = ?" }),
    ).toBeVisible();
    await phone.locator(".arena-option").nth(0).click();
    await expect(
      phone.getByText("Ответ принят. Следующий вопрос скоро!", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Завершить матч", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Завершить", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Бірлік побеждает!" }),
    ).toBeVisible();
    await expect(
      phone.getByRole("heading", { name: "Бірлік побеждает!" }),
    ).toBeVisible();
    const downloading = page.waitForEvent("download");
    await page.getByRole("button", { name: "CSV", exact: true }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(`arena-${code}.csv`);
    const csv = await readFile(await download.path(), "utf8");
    expect(csv).toContain("Ayan");
    expect(csv).toContain("120");
    await noOverflow(phone);
    await noOverflow(page);
    await page.screenshot({
      path: `test-results/${testInfo.project.name}-arena-results.png`,
      fullPage: true,
      animations: "disabled",
    });
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await request.post(`/api/games/${code}/control`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
      data: { action: "finish" },
    });
  }
});

test("arena remains playable on small screens with reduced motion", async ({
  request,
  browser,
  baseURL,
}) => {
  test.setTimeout(60000);
  const login = await request.post("/api/auth/login", {
    data: { email: "teacher@test.example", password: "Testing12345" },
  });
  expect(login.ok()).toBeTruthy();
  const teacher = await login.json();
  const created = await request.post("/api/games", {
    headers: { Authorization: `Bearer ${teacher.token}` },
    data: {
      demo: true,
      language: "ru",
      mode: "arena",
      requestKey: crypto.randomUUID(),
      roundSeconds: 60,
    },
  });
  expect(created.ok()).toBeTruthy();
  const { code } = await created.json();
  const errors = [];
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 320, height: 568 },
    reducedMotion: "reduce",
    serviceWorkers: "block",
  });
  await context.addInitScript(() => {
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
  });
  const phone = await context.newPage();
  phone.on("pageerror", (error) => errors.push(error.message));

  try {
    await phone.goto(`/play/${code}`);
    await phone.getByLabel("Твоё имя").fill("Reduced A");
    await phone
      .getByRole("button", { name: "Присоединиться", exact: true })
      .click();
    const other = await request.post(`/api/games/${code}/join`, {
      data: { name: "Reduced B", clientKey: crypto.randomUUID() },
    });
    expect(other.ok()).toBeTruthy();
    const started = await request.post(`/api/games/${code}/control`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
      data: { action: "start" },
    });
    expect(started.ok()).toBeTruthy();

    await expect(
      phone.getByRole("heading", { name: "6 × 7 = ?" }),
    ).toBeVisible({ timeout: 10000 });
    await expect(
      phone.getByRole("button", { name: "Анимация", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await noOverflow(phone);

    const canvas = phone.locator("canvas");
    await expect(canvas).toBeVisible();
    await phone.waitForTimeout(200);
    const stillFrame = await canvas.evaluate((element) => element.toDataURL());
    await phone.waitForTimeout(450);
    expect(await canvas.evaluate((element) => element.toDataURL())).toBe(
      stillFrame,
    );
    const activeAnimations = await phone
      .locator(".arena-shell *")
      .evaluateAll((elements) =>
        elements
          .map((element) => getComputedStyle(element).animationName)
          .filter((name) => name && name !== "none"),
      );
    expect(activeAnimations).toEqual([]);

    await phone.locator(".arena-option").nth(0).click();
    await expect(
      phone.getByRole("button", { name: "Импульс", exact: true }),
    ).toBeVisible();
    const portraitAction = await phone
      .getByRole("button", { name: "Импульс", exact: true })
      .boundingBox();
    expect(portraitAction).not.toBeNull();
    expect(portraitAction.y + portraitAction.height).toBeLessThanOrEqual(568);

    await phone.setViewportSize({ width: 844, height: 390 });
    await noOverflow(phone);
    const landscapeButton = phone.getByRole("button", {
      name: "Импульс",
      exact: true,
    });
    await landscapeButton.scrollIntoViewIfNeeded();
    const landscapeAction = await landscapeButton.boundingBox();
    expect(landscapeAction).not.toBeNull();
    expect(landscapeAction.y).toBeGreaterThanOrEqual(0);
    expect(landscapeAction.y + landscapeAction.height).toBeLessThanOrEqual(
      390,
    );
    await landscapeButton.click();
    await expect(
      phone.getByText("Атака выполнена", { exact: false }),
    ).toBeVisible();

    await expect
      .poll(async () => {
        const state = await request.get(`/api/games/${code}/state`, {
          headers: { Authorization: `Bearer ${teacher.token}` },
        });
        return (await state.json()).health[1];
      })
      .toBe(82);
    expect(errors).toEqual([]);
  } finally {
    await context.close();
    await finishRoom(request, teacher, code);
  }
});

test("AI questions are editable before creating a room and the join page fits a small phone", async ({
  page,
  request,
}, testInfo) => {
  const teacher = await teacherLogin(page, request);
  await page.goto("/games");
  await openCreateFor(page, "arena");
  await page.getByRole("button", { name: "AI по теме", exact: true }).click();
  await page.getByLabel("Тема", { exact: true }).fill("Fractions");
  await page.getByLabel("Количество вопросов", { exact: true }).fill("2");
  await page
    .getByRole("button", { name: "Создать вопросы", exact: false })
    .click();
  await expect(
    page.getByRole("heading", { name: "Проверка вопросов", exact: false }),
  ).toBeVisible();
  await page.getByLabel("Вопрос 1", { exact: true }).fill("Reviewed question");
  await page
    .getByRole("button", { name: "Создать комнату", exact: true })
    .click();
  await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
  const code = page.url().split("/").pop();
  await page.goto("/games");
  await page
    .getByRole("link", { name: "Fractions", exact: false })
    .first()
    .click();
  await expect(page.locator(".arena-room-code")).toContainText(code);
  if (testInfo.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/play");
  const joinPreviews = page.locator(".game-join-preview-item");
  await expect(joinPreviews).toHaveCount(4);
  for (const mode of ["arena", "orbit", "garden", "ocean"])
    await expect(
      page.locator(`.game-join-preview-item.mode-${mode}`),
    ).toHaveCount(1);
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-arena-join.png`,
    fullPage: true,
    animations: "disabled",
  });
  await finishRoom(request, teacher, code);
});
