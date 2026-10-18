import { test, expect } from "@playwright/test";

async function pupil(page, request, name) {
  const response = await request.post("/api/student/register", {
    data: { name: "Quest Explorer", username: name, password: "Testing12345" },
  });
  expect(response.status()).toBe(201);
  const { token } = await response.json();
  await page.addInitScript((token) => {
    localStorage.setItem("studentToken", token);
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
  }, token);
  return token;
}
async function noOverflow(page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(2);
}

test("a pupil registers without a class and switches safely between pupil and teacher access", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("urpaq_language", "ru"));
  await page.goto("/student/register");
  await page.getByLabel("Имя или ник").fill("Player");
  await page
    .getByLabel("Логин", { exact: true })
    .fill(`web_${info.project.name}_${Date.now()}`);
  await page.getByLabel("Пароль", { exact: true }).fill("Testing12345");
  await page
    .getByRole("button", { name: "Создать аккаунт", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Мир квестов" }),
  ).toBeVisible();
  await expect(
    page.getByText("Самостоятельный исследователь", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".s-quest-card")).toHaveCount(9);
  await page.getByLabel("Код класса", { exact: true }).fill("TEST-CLASS");
  await page
    .getByRole("button", { name: "Присоединиться", exact: true })
    .click();
  await expect(page.getByText("Homework task", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Задания", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Задания класса" }),
  ).toBeVisible();
  await expect(page.getByText("Homework task", { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/login/);
  await page.getByRole("link", { name: "Учитель", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByRole("link", { name: "Я школьник", exact: false }).click();
  await expect(page).toHaveURL(/\/student\/login$/);
  expect(errors).toEqual([]);
});

test("quest checks numeric, choice and ordering answers, animates progress and persists completion", async ({
  page,
  request,
}, info) => {
  const token = await pupil(
    page,
    request,
    `campaign_${info.project.name}_${Date.now()}`,
  );
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/student/quests/math-1");
  await expect(
    page.getByRole("heading", { name: "Мост чисел", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".quest-map")).toBeVisible();
  const pixels = await page.locator(".quest-map").evaluate((canvas) => {
    const values = canvas
      .getContext("2d")
      .getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    for (let i = 0; i < values.length; i += 4)
      colors.add(`${values[i]},${values[i + 1]},${values[i + 2]}`);
    return colors.size;
  });
  expect(pixels).toBeGreaterThan(10);
  await page.getByLabel("Твой ответ").fill("1");
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(
    page.getByText("Попробуй ещё раз", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Твой ответ").fill("42");
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("+20 XP");
  await expect
    .poll(() =>
      page.locator(".quest-map").evaluate((canvas) => {
        const pixels = canvas.getContext("2d").getImageData(0, 72, 384, 1).data;
        const xs = [];
        for (let x = 0; x < 384; x++)
          if (
            pixels[x * 4] === 246 &&
            pixels[x * 4 + 1] === 190 &&
            pixels[x * 4 + 2] === 75
          )
            xs.push(x);
        return xs.reduce((sum, x) => sum + x, 0) / xs.length;
      }),
    )
    .toBeGreaterThan(100);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Чему равно 6 + 4 × 3?", exact: true }),
  ).toBeVisible();
  await page.locator(".s-options label").nth(1).click();
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await page.getByRole("button", { name: "Следующий этап" }).click();
  await page.getByRole("button", { name: "Выше: 8", exact: true }).click();
  await page.getByRole("button", { name: "Выше: 19", exact: true }).click();
  await page.getByRole("button", { name: "Выше: 19", exact: true }).click();
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Верно!");
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/${info.project.name}-quest-order.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Следующий этап" }).click();
  await page.getByLabel("Твой ответ").fill("8");
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("+60 XP");
  await page.getByRole("link", { name: "На карту", exact: true }).click();
  await expect(page.locator(".student-stats")).toContainText("120");
  await expect(
    page
      .locator(".s-quest-card")
      .filter({ hasText: "Башня дробей" })
      .getByRole("link", { name: "Начать" }),
  ).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-student-quests.png`,
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("link", { name: "Результаты", exact: true }).click();
  await expect(page.getByText("4/4 · 120 XP", { exact: true })).toBeVisible();
  await page.goto("/student/quests/math-1");
  await page.getByLabel("Твой ответ").fill("8");
  await page.getByRole("button", { name: "Проверить", exact: true }).click();
  await expect(page.getByRole("status")).not.toContainText("+60 XP");
  const me = await request.get("/api/student/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect((await me.json()).student.xp).toBe(120);
  expect(errors).toEqual([]);
});

test("teacher assigns a quest, previews solutions and exports class progress", async ({
  page,
  request,
}, info) => {
  const credentials = await (
    await request.post("/api/auth/login", {
      data: { email: "teacher@test.example", password: "Testing12345" },
    })
  ).json();
  await page.addInitScript((credentials) => {
    localStorage.setItem("auth_token", credentials.token);
    localStorage.setItem("auth_refresh_token", credentials.refreshToken);
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
  }, credentials);
  await page.goto("/quests");
  await expect(
    page.getByRole("heading", { name: "Квесты класса" }),
  ).toBeVisible();
  await expect(page.locator(".qs-quest")).toHaveCount(9);
  const quest = page
    .locator(".qs-quest")
    .filter({ hasText: "Лаборатория открытий" });
  await quest.getByRole("checkbox").check();
  await expect(quest.getByRole("checkbox")).toBeChecked();
  await quest.getByRole("button", { name: "Просмотр" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Плавление");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("quests-class-1.csv");
  await noOverflow(page);
  await page.screenshot({
    path: `test-results/${info.project.name}-quest-studio.png`,
    fullPage: true,
    animations: "disabled",
  });
  await quest.getByRole("checkbox").uncheck();
  await expect(quest.getByRole("checkbox")).toBeEnabled();
});

test("temporary server errors retain the pupil session and mobile forms remain usable at 320px", async ({
  page,
  request,
}) => {
  const token = await pupil(page, request, `offline_${Date.now()}`);
  await page.route("**/api/student-quests", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Временно недоступно" }),
    }),
  );
  await page.goto("/student/dashboard");
  await expect(page.getByRole("alert")).toContainText("Временно недоступно");
  expect(await page.evaluate(() => localStorage.getItem("studentToken"))).toBe(
    token,
  );
  await page.unroute("**/api/student-quests");
  await page.getByRole("button", { name: "Повторить" }).click();
  await expect(
    page.getByRole("heading", { name: "Мир квестов" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 700 });
  await page.screenshot({
    path: "test-results/quests-320.png",
    fullPage: true,
  });
  await noOverflow(page);
  await page.goto("/student/login");
  await noOverflow(page);
});

test("Kazakh pupil login resumes a protected quest and an expired session returns to the requested page", async ({
  page,
  request,
}, info) => {
  const username = `kaz_${info.project.name}_${Date.now()}`;
  expect(
    (
      await request.post("/api/student/register", {
        data: { name: "Зерттеуші", username, password: "Testing12345" },
      })
    ).status(),
  ).toBe(201);
  await page.addInitScript(() => localStorage.setItem("urpaq_language", "kk"));
  await page.goto("/student/quests/math-1");
  await expect(page).toHaveURL(/\/student\/login\?next=/);
  await page.getByLabel("Логин", { exact: true }).fill(username);
  await page.getByLabel("Құпиясөз", { exact: true }).fill("Testing12345");
  await page.getByRole("button", { name: "Кіру", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Сандар көпірі", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Жауабың").fill("42");
  await page.getByRole("button", { name: "Тексеру", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Дұрыс!");
  await page.evaluate(() =>
    localStorage.setItem("studentToken", "expired-token"),
  );
  await page.getByRole("link", { name: "Нәтижелер", exact: true }).click();
  await expect(page).toHaveURL(/\/student\/login\?next=.*history/);
  await page.getByLabel("Логин", { exact: true }).fill(username);
  await page.getByLabel("Құпиясөз", { exact: true }).fill("Testing12345");
  await page.getByRole("button", { name: "Кіру", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Менің нәтижелерім", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1/4 · 20 XP", { exact: true })).toBeVisible();
  await page.screenshot({
    path: `test-results/${info.project.name}-student-kazakh.png`,
    fullPage: true,
    animations: "disabled",
  });
  await noOverflow(page);
});

test("a new teacher creates a classroom invitation without Telegram and the pupil form accepts it", async ({
  page,
  request,
}, info) => {
  const response = await request.post("/api/auth/register", {
    data: {
      name: "Quest Teacher",
      email: `quest-${info.project.name}-${Date.now()}@test.example`,
      password: "Testing12345",
    },
  });
  expect(response.status()).toBe(201);
  const credentials = await response.json();
  const headers = { Authorization: `Bearer ${credentials.token}` };
  await page.addInitScript((credentials) => {
    localStorage.setItem("auth_token", credentials.token);
    localStorage.setItem("auth_refresh_token", credentials.refreshToken);
    localStorage.setItem("urpaq_language", "ru");
    localStorage.setItem("urpaq_theme", "light");
  }, credentials);
  const created = await request.post("/api/classes", {
    headers,
    data: { name: "Quest invitations", subject: "Math", grade: 5 },
  });
  expect(created.status()).toBe(201);
  const classroom = await created.json();
  try {
    await page.goto("/quests");
    await page
      .getByRole("button", { name: "Создать код", exact: true })
      .click();
    await expect(page.locator(".qs-class-bar strong")).toHaveText(
      /^[A-F0-9]{16}$/,
    );
    const code = await page.locator(".qs-class-bar strong").innerText();
    await page.goto(`/student/register?class=${code}`);
    await expect(page.getByLabel("Код класса (необязательно)")).toHaveValue(
      code,
    );
    await noOverflow(page);
  } finally {
    expect(
      (
        await request.delete(`/api/classes/${classroom.id}`, { headers })
      ).status(),
    ).toBe(200);
  }
});
