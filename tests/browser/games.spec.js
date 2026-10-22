import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

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

test("catalog creates persisted garden and word rooms with their own stages", async ({
  page,
  request,
  browser,
}, testInfo) => {
  const teacher = await teacherLogin(page, request);
  const created = [];
  const studentContext = await browser.newContext({
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
    await expect(catalog.locator("[data-game-mode]")).toHaveCount(3);
    for (const mode of ["arena", "garden", "word"])
      await expect(catalog.locator(`[data-game-mode="${mode}"]`)).toBeVisible();
    await noOverflow(page);

    await page.getByRole("button", { name: "Создать сад", exact: true }).click();
    await expect(page.locator(".game-create[data-game-mode='garden']")).toBeVisible();
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

    await student.goto(`http://127.0.0.1:4173/play/${gardenCode}`);
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
    await page.getByRole("button", { name: "Создать спринт", exact: true }).click();
    await expect(page.locator(".game-create[data-game-mode='word']")).toBeVisible();
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

    await student.goto(`http://127.0.0.1:4173/play/${wordCode}`);
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

test("teacher and phones complete an arena match, reconnect, retain scores and export results", async ({
  page,
  request,
  browser,
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
  await page.getByRole("button", { name: "Создать матч", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Секунд на вопрос", exact: true })
    .selectOption("60");
  await page
    .getByRole("button", { name: "Создать комнату", exact: true })
    .click();
  await expect(page).toHaveURL(/\/games\/host\/[A-F0-9]{6}/);
  const code = page.url().split("/").pop();
  const context = await browser.newContext({
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
    await phone.goto(`http://127.0.0.1:4173/play/${code}`);
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

test("AI questions are editable before creating a room and the join page fits a small phone", async ({
  page,
  request,
}, testInfo) => {
  await teacherLogin(page, request);
  await page.goto("/games");
  await page.getByRole("button", { name: "Создать матч", exact: true }).click();
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
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/${testInfo.project.name}-arena-join.png`,
    fullPage: true,
    animations: "disabled",
  });
});
